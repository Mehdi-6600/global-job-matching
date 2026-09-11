import { neutralizeInstructionish } from "@/lib/ai-sanitize";

export const RESUME_TONES = ["professional", "confident", "concise"] as const;
export type ResumeTone = (typeof RESUME_TONES)[number];

export function normalizeTone(raw: unknown): ResumeTone {
  const t = String(raw || "professional").toLowerCase().trim();
  if (t === "confident" || t === "concise" || t === "professional") return t;
  return "professional";
}

export function toneInstruction(tone: ResumeTone): string {
  switch (tone) {
    case "confident":
      return "Tone: confident and achievement-oriented, still truthful and professional.";
    case "concise":
      return "Tone: concise and dense — short bullets, no fluff.";
    default:
      return "Tone: professional, clear, and neutral.";
  }
}

export function isWeakResumeOutput(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 40) return true;
  // Obvious refusal / empty generation
  if (/^(i'?m sorry|as an ai|cannot|can't help)/i.test(t)) return true;
  return false;
}

/** Detect crude invention signals when user left experience empty */
export function looksHallucinated(
  text: string,
  input: { experience?: string; education?: string }
): boolean {
  const exp = (input.experience || "").trim();
  const edu = (input.education || "").trim();
  const lower = text.toLowerCase();

  if (!exp) {
    // Model invented job history markers without user experience
    if (
      /\b(20\d{2}\s*[-–]\s*(20\d{2}|present))\b/i.test(text) &&
      /\b(senior|manager|engineer at|worked at|company)\b/i.test(lower)
    ) {
      return true;
    }
  }
  if (!edu && /\b(bachelor|master|ph\.?d|university of)\b/i.test(lower)) {
    // Soft signal only if education section is substantial
    if (/education[\s\S]{40,}/i.test(text)) return true;
  }
  return false;
}

export function scrubResumeText(text: string): string {
  return neutralizeInstructionish(text)
    .replace(/<[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();
}

export function buildResumeSystemPrompt(tone: ResumeTone): string {
  return `You are a professional resume writer for ATS-friendly plain text resumes.

Hard rules:
- Return plain text only (no HTML, no markdown code fences).
- Use clear section headings: SUMMARY, EXPERIENCE, EDUCATION, SKILLS, LANGUAGES (omit empty sections).
- NEVER invent employers, job titles, degrees, dates, certifications, or languages the user did not provide.
- NEVER invent achievements or metrics not implied by the user notes.
- Improve wording and structure only from user facts.
- Keep target role consistent with the user's target role when provided.
- ${toneInstruction(tone)}
- Be concise. Prefer bullet lines starting with "- " for experience.`;
}

export function buildResumeUserPrompt(data: {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  targetRole?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  languages?: string;
  tone: ResumeTone;
}): string {
  return `Tone: ${data.tone}
Full name: ${data.fullName}
Email: ${data.email || "n/a"}
Phone: ${data.phone || "n/a"}
Location: ${data.location || "n/a"}
Target role: ${data.targetRole || "n/a"}
Summary notes: ${data.summary || "n/a"}
Experience (user facts only): ${data.experience || "n/a"}
Education (user facts only): ${data.education || "n/a"}
Skills: ${data.skills || "n/a"}
Languages: ${data.languages || "n/a"}`;
}
