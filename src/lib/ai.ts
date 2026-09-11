/**
 * Shared AI helper — OpenRouter primary, OpenAI secondary.
 * Timeout + limited retries. Never logs API keys.
 */

import { neutralizeInstructionish } from "@/lib/ai-sanitize";

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
  failureReason?: string;
};

export type ChatCompletionResult = {
  text: string | null;
  meta: AiCallMeta;
};

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_PROVIDER_ATTEMPTS = 2;

function openRouterModels(): string[] {
  const preferred = (process.env.OPENROUTER_MODEL || "").trim();
  const fallback = (
    process.env.OPENROUTER_FALLBACK_MODEL || "openrouter/auto"
  ).trim();
  const list = preferred
    ? [preferred, fallback].filter((m, i, a) => m && a.indexOf(m) === i)
    : [fallback || "openrouter/auto"];
  return list.slice(0, 2);
}

function withTimeout(
  ms: number
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

async function callOpenRouterOnce(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<{ text: string | null; reason?: string }> {
  const { signal, clear } = withTimeout(timeoutMs);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenRouter error:", model, res.status, errText.slice(0, 200));
      return {
        text: null,
        reason: `openrouter_http_${res.status}`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return { text: null, reason: "empty_content" };
    }
    return { text: text.trim() };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    if (name === "AbortError") {
      return { text: null, reason: "timeout" };
    }
    console.error("OpenRouter threw:", model, name);
    return { text: null, reason: "network" };
  } finally {
    clear();
  }
}

async function callOpenAIOnce(
  apiKey: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<{ text: string | null; model: string; reason?: string }> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const { signal, clear } = withTimeout(timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI error:", res.status, errText.slice(0, 200));
      return { text: null, model, reason: `openai_http_${res.status}` };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return { text: null, model, reason: "empty_content" };
    }
    return { text: text.trim(), model };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    if (name === "AbortError") {
      return { text: null, model, reason: "timeout" };
    }
    console.error("OpenAI threw:", name);
    return { text: null, model, reason: "network" };
  } finally {
    clear();
  }
}

function scrubMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) => ({
    role: m.role,
    content:
      m.role === "system"
        ? m.content.slice(0, 12_000)
        : neutralizeInstructionish(m.content).slice(0, 12_000),
  }));
}

/**
 * Full result with metadata (preferred for new code).
 */
export async function chatCompletionWithMeta(
  messages: ChatMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
  }
): Promise<ChatCompletionResult> {
  const maxTokens = options?.maxTokens ?? 2000;
  const temperature = options?.temperature ?? 0.6;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const safeMessages = scrubMessages(messages);

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const started = Date.now();
  let attempt = 0;

  if (openRouterKey) {
    for (const model of openRouterModels()) {
      for (let i = 0; i < MAX_PROVIDER_ATTEMPTS; i++) {
        attempt += 1;
        const { text, reason } = await callOpenRouterOnce(
          openRouterKey,
          model,
          safeMessages,
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
        // Retry only transient failures
        if (reason !== "timeout" && reason !== "network") {
          break;
        }
      }
    }
  }

  if (openAiKey) {
    for (let i = 0; i < MAX_PROVIDER_ATTEMPTS; i++) {
      attempt += 1;
      const { text, model, reason } = await callOpenAIOnce(
        openAiKey,
        safeMessages,
        maxTokens,
        temperature,
        timeoutMs
      );
      if (text) {
        return {
          text,
          meta: {
            provider: "openai",
            model,
            latencyMs: Date.now() - started,
            attempt,
            success: true,
          },
        };
      }
      if (reason !== "timeout" && reason !== "network") {
        break;
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
      failureReason: !openRouterKey && !openAiKey ? "no_api_key" : "all_failed",
    },
  };
}

/** Backward-compatible: returns text only */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number }
): Promise<string | null> {
  const result = await chatCompletionWithMeta(messages, options);
  return result.text;
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
