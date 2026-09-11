/**
 * Shared AI helper — OpenRouter first, then OpenAI.
 * Timeout + limited retries. Failures return null (caller handles fallback).
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

const DEFAULT_OPENROUTER_MODELS = [
  "meta-llama/llama-3.2-3b-instruct:free",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "openrouter/auto",
];

function openRouterModelList(): string[] {
  const preferred = (process.env.OPENROUTER_MODEL || "").trim();
  const fallback = (process.env.OPENROUTER_FALLBACK_MODEL || "").trim();
  const list = [
    ...(preferred ? [preferred] : []),
    ...DEFAULT_OPENROUTER_MODELS,
    ...(fallback ? [fallback] : []),
  ];
  return Array.from(new Set(list.filter(Boolean)));
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

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<string | null> {
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
    console.error("OpenRouter error:", model, res.status, errText.slice(0, 300));
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : null;
}

async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<string | null> {
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    },
    timeoutMs
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("OpenAI error:", res.status, errText.slice(0, 300));
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text.trim() : null;
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
  const maxTokens = options?.maxTokens ?? 2000;
  const temperature = options?.temperature ?? 0.6;
  const timeoutMs = options?.timeoutMs ?? 25_000;
  const maxAttempts = Math.min(Math.max(options?.maxAttempts ?? 2, 1), 3);

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const started = Date.now();
  let attempt = 0;
  let lastError: string | undefined;

  if (openRouterKey) {
    for (const model of openRouterModelList()) {
      for (let a = 0; a < maxAttempts; a++) {
        attempt += 1;
        try {
          const text = await callOpenRouter(
            openRouterKey,
            model,
            messages,
            maxTokens,
            temperature,
            timeoutMs
          );
          if (text) {
            return {
              text,
              meta: {
                provider: "openrouter",
                model,
                latencyMs: Date.now() - started,
                attempt,
                success: true,
              },
            };
          }
          lastError = `empty_or_http_fail:${model}`;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.error("OpenRouter call threw:", model, err);
        }
      }
    }
  }

  if (openAiKey) {
    for (let a = 0; a < maxAttempts; a++) {
      attempt += 1;
      try {
        const text = await callOpenAI(
          openAiKey,
          messages,
          maxTokens,
          temperature,
          timeoutMs
        );
        if (text) {
          return {
            text,
            meta: {
              provider: "openai",
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              latencyMs: Date.now() - started,
              attempt,
              success: true,
            },
          };
        }
        lastError = "openai_empty_or_http_fail";
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error("OpenAI call threw:", err);
      }
    }
  }

  return {
    text: null,
    meta: {
      provider: "none",
      model: null,
      latencyMs: Date.now() - started,
      attempt,
      success: false,
      error: lastError || "no_provider_or_all_failed",
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
