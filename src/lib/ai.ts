/**
 * Shared AI helper — max 3 provider/model attempts total.
 * OpenRouter preferred → OpenRouter fallback → OpenAI.
 * Failures return null text; caller handles fallback.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCallMeta = {
  provider: "openrouter" | "openai" | "none";
  model: string | null;
  latencyMs: number;
  attempt: number;
  success: boolean;
  error?: string;
};

export type ChatCompletionResult = {
  text: string | null;
  meta: AiCallMeta;
};

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type ProviderAttempt = {
  provider: "openrouter" | "openai";
  model: string;
  apiKey: string;
};

/**
 * Build at most 3 attempts:
 * 1) OPENROUTER_MODEL (if set)
 * 2) OPENROUTER_FALLBACK_MODEL or openrouter/auto
 * 3) OpenAI (if key set)
 */
function buildAttemptPlan(): ProviderAttempt[] {
  const attempts: ProviderAttempt[] = [];
  const orKey = process.env.OPENROUTER_API_KEY?.trim();
  const oaKey = process.env.OPENAI_API_KEY?.trim();

  if (orKey) {
    const preferred = (process.env.OPENROUTER_MODEL || "").trim();
    if (preferred) {
      attempts.push({
        provider: "openrouter",
        model: preferred,
        apiKey: orKey,
      });
    }
    const fallback =
      (process.env.OPENROUTER_FALLBACK_MODEL || "").trim() ||
      "openrouter/auto";
    if (!attempts.some((a) => a.model === fallback)) {
      attempts.push({
        provider: "openrouter",
        model: fallback,
        apiKey: orKey,
      });
    }
  }

  if (oaKey) {
    attempts.push({
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: oaKey,
    });
  }

  return attempts.slice(0, 3);
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<{ text: string | null; error?: string; retryable: boolean }> {
  try {
    const res = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_APP_URL ||
            "https://global-job-matching.vercel.app",
          "X-Title": "Global Job Matching",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      },
      timeoutMs
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        "OpenRouter error:",
        model,
        res.status,
        errText.slice(0, 200)
      );
      return {
        text: null,
        error: `openrouter_http_${res.status}`,
        retryable: isTransientStatus(res.status),
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) {
      return { text: text.trim(), retryable: false };
    }
    return { text: null, error: "openrouter_empty", retryable: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OpenRouter threw:", model, msg.slice(0, 200));
    return {
      text: null,
      error: msg.includes("abort") ? "timeout" : "network",
      retryable: true,
    };
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<{ text: string | null; error?: string; retryable: boolean }> {
  try {
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      },
      timeoutMs
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI error:", res.status, errText.slice(0, 200));
      return {
        text: null,
        error: `openai_http_${res.status}`,
        retryable: isTransientStatus(res.status),
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === "string" && text.trim()) {
      return { text: text.trim(), retryable: false };
    }
    return { text: null, error: "openai_empty", retryable: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("OpenAI threw:", msg.slice(0, 200));
    return {
      text: null,
      error: msg.includes("abort") ? "timeout" : "network",
      retryable: true,
    };
  }
}

export async function chatCompletionWithMeta(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    maxAttempts?: number;
  }
): Promise<ChatCompletionResult> {
  const maxTokens = Math.min(Math.max(options?.maxTokens ?? 2000, 1), 4000);
  const temperature = options?.temperature ?? 0.6;
  const timeoutMs = Math.min(
    Math.max(options?.timeoutMs ?? 20_000, 5_000),
    25_000
  );
  // Hard cap: at most 3 real provider calls per user request
  const maxAttempts = Math.min(Math.max(options?.maxAttempts ?? 3, 1), 3);

  const plan = buildAttemptPlan().slice(0, maxAttempts);
  const started = Date.now();
  let lastError: string | undefined;
  let attempt = 0;

  if (plan.length === 0) {
    return {
      text: null,
      meta: {
        provider: "none",
        model: null,
        latencyMs: Date.now() - started,
        attempt: 0,
        success: false,
        error: "no_provider_configured",
      },
    };
  }

  for (const step of plan) {
    attempt += 1;
    const result =
      step.provider === "openrouter"
        ? await callOpenRouter(
            step.apiKey,
            step.model,
            messages,
            maxTokens,
            temperature,
            timeoutMs
          )
        : await callOpenAI(
            step.apiKey,
            step.model,
            messages,
            maxTokens,
            temperature,
            timeoutMs
          );

    if (result.text) {
      return {
        text: result.text,
        meta: {
          provider: step.provider,
          model: step.model,
          latencyMs: Date.now() - started,
          attempt,
          success: true,
        },
      };
    }

    lastError = result.error || "empty";
    // Non-retryable permanent client errors: still move to next provider once
    if (!result.retryable && attempt >= maxAttempts) break;
  }

  return {
    text: null,
    meta: {
      provider: "none",
      model: null,
      latencyMs: Date.now() - started,
      attempt,
      success: false,
      error: lastError || "all_attempts_failed",
    },
  };
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    maxAttempts?: number;
  }
): Promise<string | null> {
  const { text } = await chatCompletionWithMeta(messages, options);
  return text;
}

export function buildTemplateResume(input: {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  targetRole?: string;
  summary?: string;
  skills?: string;
  experience?: string;
  education?: string;
  languages?: string;
}): string {
  const lines: string[] = [];
  lines.push(input.fullName.toUpperCase());
  if (input.targetRole) lines.push(input.targetRole);
  const contact = [input.email, input.phone, input.location]
    .filter(Boolean)
    .join(" · ");
  if (contact) lines.push(contact);
  lines.push("");
  lines.push("PROFESSIONAL SUMMARY");
  lines.push(
    input.summary?.trim() ||
      `Motivated professional seeking opportunities as ${
        input.targetRole || "a specialist"
      }. Strong work ethic, clear communication, and continuous learning.`
  );
  lines.push("");
  if (input.skills?.trim()) {
    lines.push("SKILLS");
    lines.push(input.skills.trim());
    lines.push("");
  }
  if (input.experience?.trim()) {
    lines.push("EXPERIENCE");
    lines.push(input.experience.trim());
    lines.push("");
  }
  if (input.education?.trim()) {
    lines.push("EDUCATION");
    lines.push(input.education.trim());
    lines.push("");
  }
  if (input.languages?.trim()) {
    lines.push("LANGUAGES");
    lines.push(input.languages.trim());
  }
  return lines.join("\n").trim();
}
