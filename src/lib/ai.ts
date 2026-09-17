/**
 * Shared AI helper — OpenRouter preferred → OpenRouter fallback → OpenAI.
 * Failures return null text; caller must run heuristic/template fallback.
 *
 * Latency model:
 *  - `timeoutMs` is a TOTAL wall-clock budget for ALL attempts (not per call).
 *  - Each attempt uses min(PER_ATTEMPT_CAP, remaining budget).
 *  - Permanent errors (4xx except 408/429) skip remaining budget waste.
 *  - Default maxAttempts = 2 so worst-case stays under ~20s, not 3×25s.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiProvider = "openrouter" | "openai" | "none";

export type AiCallMeta = {
  provider: AiProvider;
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

export type ChatCompletionOptions = {
  maxTokens?: number;
  temperature?: number;
  /** Total wall-clock budget for ALL attempts (clamped). */
  timeoutMs?: number;
  maxAttempts?: number;
};

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

/** Max wall-clock budget for an entire chatCompletion (all attempts). */
export const AI_TOTAL_BUDGET_MS = 18_000;

/** Soft cap per single provider HTTP call. */
export const AI_PER_ATTEMPT_MS = 9_000;

/** Stop scheduling new attempts when less than this remains. */
const AI_MIN_REMAINING_MS = 2_500;

/** Hard floor / ceiling for the total budget. */
const AI_MIN_BUDGET_MS = 8_000;

/** Token limits. */
const AI_MIN_TOKENS = 1;
const AI_MAX_TOKENS = 4_000;

/** Attempt limits. */
const AI_MIN_ATTEMPTS = 1;
const AI_MAX_ATTEMPTS = 3;
const AI_DEFAULT_ATTEMPTS = 2;

/** Default OpenAI model when not configured. */
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

/** Default OpenRouter fallback when not configured. */
const DEFAULT_OPENROUTER_FALLBACK = "openrouter/auto";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** 408, 429, and 5xx are transient. Everything else is permanent. */
function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** True when the error string indicates a permanent auth/config problem. */
function isPermanentAuthError(error?: string): boolean {
  if (!error) return false;
  return /_http_(400|401|403)\b/.test(error);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Attempt planning                                                   */
/* ------------------------------------------------------------------ */

type ProviderAttempt = {
  provider: "openrouter" | "openai";
  model: string;
  apiKey: string;
};

/**
 * Build at most 3 attempts in priority order:
 *   1) OPENROUTER_MODEL          (if set)
 *   2) OPENROUTER_FALLBACK_MODEL or openrouter/auto
 *   3) OpenAI                    (if key set)
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
      DEFAULT_OPENROUTER_FALLBACK;

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
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      apiKey: oaKey,
    });
  }

  return attempts.slice(0, AI_MAX_ATTEMPTS);
}

/* ------------------------------------------------------------------ */
/* Provider calls                                                     */
/* ------------------------------------------------------------------ */

type ProviderCallResult = {
  text: string | null;
  error?: string;
  retryable: boolean;
};

type ProviderCallArgs = {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  /** Extra headers (e.g. OpenRouter attribution). */
  extraHeaders?: Record<string, string>;
  /** Error tag prefix for logs and meta (e.g. "openrouter"). */
  errorTag: string;
};

/**
 * Shared provider call implementation for OpenRouter and OpenAI.
 * Keeps error tagging and retryability logic in a single place.
 */
async function callProvider({
  url,
  apiKey,
  model,
  messages,
  maxTokens,
  temperature,
  timeoutMs,
  extraHeaders,
  errorTag,
}: ProviderCallArgs): Promise<ProviderCallResult> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(extraHeaders ?? {}),
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        }),
      },
      timeoutMs,
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(
        `${errorTag} error:`,
        model,
        res.status,
        errText.slice(0, 200),
      );
      return {
        text: null,
        error: `${errorTag}_http_${res.status}`,
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
    return { text: null, error: `${errorTag}_empty`, retryable: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${errorTag} threw:`, model, msg.slice(0, 200));
    return {
      text: null,
      error: msg.includes("abort") ? "timeout" : "network",
      retryable: true,
    };
  }
}

function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
): Promise<ProviderCallResult> {
  return callProvider({
    url: OPENROUTER_URL,
    apiKey,
    model,
    messages,
    maxTokens,
    temperature,
    timeoutMs,
    errorTag: "openrouter",
    extraHeaders: {
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://global-job-matching.vercel.app",
      "X-Title": "Global Job Matching",
    },
  });
}

function callOpenAI(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number,
): Promise<ProviderCallResult> {
  return callProvider({
    url: OPENAI_URL,
    apiKey,
    model,
    messages,
    maxTokens,
    temperature,
    timeoutMs,
    errorTag: "openai",
  });
}

/* ------------------------------------------------------------------ */
/* Main entry points                                                  */
/* ------------------------------------------------------------------ */

/**
 * Chat completion with full meta.
 *
 * Latency contract:
 *   - The entire call finishes within `timeoutMs` (clamped to [8s, 18s]).
 *   - Each attempt uses at most `AI_PER_ATTEMPT_MS` or whatever remains.
 *   - New attempts are skipped when remaining budget < AI_MIN_REMAINING_MS.
 *
 * Failure contract:
 *   - On success: { text, meta: { provider, model, success: true, ... } }
 *   - On total failure: { text: null, meta: { provider: "none", ... } }
 */
export async function chatCompletionWithMeta(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  const maxTokens = clamp(
    Math.trunc(options?.maxTokens ?? 2_000),
    AI_MIN_TOKENS,
    AI_MAX_TOKENS,
  );
  const temperature = options?.temperature ?? 0.6;

  // timeoutMs is the TOTAL budget, not per-attempt.
  const totalBudgetMs = clamp(
    Math.trunc(options?.timeoutMs ?? AI_TOTAL_BUDGET_MS),
    AI_MIN_BUDGET_MS,
    AI_TOTAL_BUDGET_MS,
  );

  const maxAttempts = clamp(
    Math.trunc(options?.maxAttempts ?? AI_DEFAULT_ATTEMPTS),
    AI_MIN_ATTEMPTS,
    AI_MAX_ATTEMPTS,
  );

  const plan = buildAttemptPlan().slice(0, maxAttempts);
  const started = Date.now();

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

  let lastError: string | undefined;
  let attempt = 0;

  for (const step of plan) {
    const elapsed = Date.now() - started;
    const remaining = totalBudgetMs - elapsed;

    if (remaining < AI_MIN_REMAINING_MS) {
      lastError = lastError || "budget_exhausted";
      break;
    }

    const attemptTimeout = Math.min(AI_PER_ATTEMPT_MS, remaining);
    attempt += 1;

    const result =
      step.provider === "openrouter"
        ? await callOpenRouter(
            step.apiKey,
            step.model,
            messages,
            maxTokens,
            temperature,
            attemptTimeout,
          )
        : await callOpenAI(
            step.apiKey,
            step.model,
            messages,
            maxTokens,
            temperature,
            attemptTimeout,
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

    // Permanent auth/config errors: try the next provider, but do not
    // repeatedly burn budget on the same class of failure.
    if (!result.retryable && isPermanentAuthError(result.error)) {
      continue;
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
      error: lastError || "all_attempts_failed",
    },
  };
}

/**
 * Convenience wrapper that returns only the text (or null).
 * Use `chatCompletionWithMeta` when you need provider/latency info.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string | null> {
  const { text } = await chatCompletionWithMeta(messages, options);
  return text;
}

/* ------------------------------------------------------------------ */
/* Deterministic template fallback                                    */
/* ------------------------------------------------------------------ */

/**
 * Deterministic plain-text resume builder used when AI fails or is disabled.
 * Pure function: same input → same output.
 */
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

  lines.push((input.fullName || "").trim().toUpperCase());
  if (input.targetRole?.trim()) lines.push(input.targetRole.trim());

  const contact = [input.email, input.phone, input.location]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(" · ");
  if (contact) lines.push(contact);

  lines.push("");
  lines.push("PROFESSIONAL SUMMARY");
  lines.push(
    input.summary?.trim() ||
      `Motivated professional seeking opportunities as ${
        input.targetRole?.trim() || "a specialist"
      }. Strong work ethic, clear communication, and continuous learning.`,
  );

  if (input.skills?.trim()) {
    lines.push("");
    lines.push("SKILLS");
    lines.push(input.skills.trim());
  }

  if (input.experience?.trim()) {
    lines.push("");
    lines.push("EXPERIENCE");
    lines.push(input.experience.trim());
  }

  if (input.education?.trim()) {
    lines.push("");
    lines.push("EDUCATION");
    lines.push(input.education.trim());
  }

  if (input.languages?.trim()) {
    lines.push("");
    lines.push("LANGUAGES");
    lines.push(input.languages.trim());
  }

  return lines.join("\n").trim();
}
