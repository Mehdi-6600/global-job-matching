/**
 * Shared AI helper — prefers OpenRouter (free models), falls back to OpenAI.
 * Returns null if no API key is configured (caller can use local template).
 */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Free OpenRouter model — change if one is rate-limited */
const OPENROUTER_FREE_MODEL =
  process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it:free";

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string | null> {
  const maxTokens = options?.maxTokens ?? 2000;
  const temperature = options?.temperature ?? 0.6;

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (openRouterKey) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://global-job-matching.vercel.app",
        "X-Title": "Global Job Matching",
      },
      body: JSON.stringify({
        model: OPENROUTER_FREE_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenRouter error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  }

  if (openAiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
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
      `Motivated professional seeking opportunities as ${input.targetRole || "a specialist"}. Strong work ethic, clear communication, and continuous learning.`
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
