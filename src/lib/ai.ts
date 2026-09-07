/**
 * Shared AI helper — OpenRouter first (with free-model fallbacks), then OpenAI.
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
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
  const list = preferred
    ? [preferred, ...DEFAULT_OPENROUTER_MODELS.filter((m) => m !== preferred)]
    : DEFAULT_OPENROUTER_MODELS;
  return Array.from(new Set(list));
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number
): Promise<string | null> {
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
  });

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
  temperature: number
): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });

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

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const maxTokens = options?.maxTokens ?? 2000;
  const temperature = options?.temperature ?? 0.6;

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();

  if (openRouterKey) {
    for (const model of openRouterModelList()) {
      try {
        const text = await callOpenRouter(
          openRouterKey,
          model,
          messages,
          maxTokens,
          temperature
        );
        if (text) {
          console.info("OpenRouter success with model:", model);
          return text;
        }
      } catch (err) {
        console.error("OpenRouter call threw:", model, err);
      }
    }
  }

  if (openAiKey) {
    try {
      return await callOpenAI(openAiKey, messages, maxTokens, temperature);
    } catch (err) {
      console.error("OpenAI call threw:", err);
    }
  }

  return null;
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
