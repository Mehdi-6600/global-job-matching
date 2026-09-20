/**
 * Shared AI helper — OpenRouter preferred → OpenRouter fallback → OpenAI.
 * Failures return null text; caller must run heuristic/template fallback.
 *
 * Latency model:
 *  - `timeoutMs` is a TOTAL wall-clock budget for ALL attempts (not per call).
 *  - Each attempt uses min(PER_ATTEMPT_CAP, remaining budget).
 *  - Permanent errors (4xx except 408/429) skip remaining budget waste.
 *  - Default maxAttempts = 2 so worst-case stays under ~20s, not 3×25s.
 *
 * The template resume fallback now lives in @/lib/resume/writer.
 * A thin wrapper (`buildTemplateResume`) is kept here for backwards
 * compatibility with existing callers.
 */

import { buildResume } from "@/lib/resume/writer";

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
  extraHeaders?: Record<string, string>;
  errorTag: string;
};

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

export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions,
): Promise<string | null> {
  const { text } = await chatCompletionWithMeta(messages, options);
  return text;
}

/* ------------------------------------------------------------------ */
/* Template resume — backwards-compatible wrapper                     */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Use `buildResume` from `@/lib/resume/writer` directly.
 *
 * Kept for backwards compatibility with existing callers that import
 * `buildTemplateResume` from this module. New code should call
 * `buildResume` to access the returned metadata.
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
  return buildResume(input).text;
}
