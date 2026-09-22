/**
 * AI resume prompt builders + output validators.
 *
 * Phase 5+: locale-aware.
 *
 *   - The system prompt now instructs the model to produce all
 *     human-readable text in the user's chosen language, and to use the
 *     exact same section headings that the offline `writer.ts` uses
 *     (single source of truth via `SECTION_LABELS`).
 *   - The user prompt explicitly states the reply language so the model
 *     never mixes English into Persian/Arabic/Hindi/etc. output.
 *   - Weak / hallucinated output detection is script-aware so that a
 *     non-Latin answer that is short but valid is not flagged as weak,
 *     and fabricated degrees/employers are caught in every locale.
 */
import { neutralizeInstructionish } from "@/lib/ai-sanitize";
import type { CareerRiskLocale } from "@/types/career-risk";
import { normalizeCareerLocale } from "@/lib/career-risk";
import { SECTION_LABELS } from "@/lib/resume/writer";

/* ------------------------------------------------------------------ */
/* Tones                                                              */
/* ------------------------------------------------------------------ */

export const RESUME_TONES = ["professional", "confident", "concise"] as const;
export type ResumeTone = (typeof RESUME_TONES)[number];

export function normalizeTone(raw: unknown): ResumeTone {
  const t = String(raw || "professional").toLowerCase().trim();
  if (t === "confident" || t === "concise" || t === "professional") return t;
  return "professional";
}

function toneInstruction(tone: ResumeTone, locale: CareerRiskLocale): string {
  switch (tone) {
    case "confident":
      return "Tone: confident and achievement-oriented, still truthful and professional.";
    case "concise":
      return "Tone: concise and dense — short bullets, no fluff.";
    default:
      return locale === "en"
        ? "Tone: professional, clear, and neutral."
        : "Tone: professional, clear, and neutral (respect the target language's natural register).";
  }
}

/* ------------------------------------------------------------------ */
/* Language names                                                     */
/* ------------------------------------------------------------------ */

function languageNameForPrompt(locale: CareerRiskLocale): string {
  switch (locale) {
    case "fa":
      return "Persian (Farsi)";
    case "ar":
      return "Arabic";
    case "es":
      return "Spanish";
    case "fr":
      return "French";
    case "de":
      return "German";
    case "hi":
      return "Hindi";
    default:
      return "English";
  }
}

/* ------------------------------------------------------------------ */
/* Script checks (for weak/hallucinated detection)                    */
/* ------------------------------------------------------------------ */

const ARABIC_BLOCK_RE = /[\u0600-\u06FF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_RE = /[A-Za-z]/;

function hasExpectedScript(text: string, locale: CareerRiskLocale): boolean {
  switch (locale) {
    case "fa":
    case "ar":
      return ARABIC_BLOCK_RE.test(text);
    case "hi":
      return DEVANAGARI_RE.test(text);
    case "en":
    case "es":
    case "fr":
    case "de":
      return LATIN_RE.test(text);
    default:
      return true;
  }
}

/* ------------------------------------------------------------------ */
/* Output validators                                                  */
/* ------------------------------------------------------------------ */

/**
 * A "weak" resume is one that is too short, obviously refuses, or is
 * obviously written in the wrong script for the requested language.
 *
 * Length thresholds are tightened for non-Latin scripts where a
 * 40-character block can still carry meaningful content.
 */
export function isWeakResumeOutput(
  text: string,
  locale: CareerRiskLocale = "en",
): boolean {
  const t = text.replace(/\s+/g, " ").trim();

  // Non-Latin scripts: the visual density is higher, so we lower the
  // minimum length to 30 characters instead of 40.
  const minLength =
    locale === "fa" || locale === "ar" || locale === "hi" ? 30 : 40;
  if (t.length < minLength) return true;

  // Obvious refusal / empty generation — matched in any language.
  if (
    /^(i'?m sorry|as an ai|cannot|can't help|متأسف|عذرًا|لا أستطيع|माफ़|क्षमा)/i.test(
      t,
    )
  ) {
    return true;
  }

  // Wrong script: Latin text for a non-Latin locale is a red flag.
  if (!hasExpectedScript(t, locale)) return true;

  return false;
}

/**
 * Detect crude invention signals in the AI output.
 *
 * Fabrication markers are language-agnostic where possible:
 *   - Degrees: BSc, MSc, PhD, Bachelor, Master, Bachelorarbeit, Licence,
 *     Licenciatura, Diplom, Magister, ماجستير, دکترا, کارشناسی, स्नातक
 *   - Employers: patterns like "at <Capitalized>", "worked at", "bei <X>",
 *     "chez <X>", "en <X>" (the last two are soft signals).
 *   - Executive titles: CEO, CTO, CFO, COO, CIO, Geschäftsführer, مدیرعامل
 */
export function looksHallucinated(
  text: string,
  input: { experience?: string; education?: string },
  locale: CareerRiskLocale = "en",
): boolean {
  const exp = (input.experience || "").trim();
  const edu = (input.education || "").trim();
  const lower = text.toLowerCase();

  // ---- Education fabrication ----------------------------------------
  if (!edu) {
    const degreeRe =
      /\b(bachelor|master|ph\.?d|bsc|msc|mba|licence|licenciatura|diplom|magister|majistr)\b/i;
    const degreeReNonLatin =
      /(کارشناسی|کارشناس|ماجستیر|ماجستير|دکترا|دکتری|स्नातक|परास्नातक|डॉक्टरेट)/;
    const universityRe =
      /\b(university of|universidad de|université de|universität|institut|college)\b/i;
    const universityReNonLatin = /(دانشگاه|جامعة|جامعه|विश्वविद्यालय|महाविद्यालय)/;

    const hasDegree = degreeRe.test(lower) || degreeReNonLatin.test(text);
    const hasUniversity =
      universityRe.test(lower) || universityReNonLatin.test(text);

    // Only flag if the education section actually looks substantial.
    if (
      (hasDegree || hasUniversity) &&
      /education[\s\S]{40,}/i.test(text)
    ) {
      return true;
    }
    // Even without an "education" heading, a claimed degree when the user
    // supplied none is suspicious.
    if (hasDegree && hasUniversity) return true;
  }

  // ---- Experience fabrication ---------------------------------------
  if (!exp) {
    // A date range like "2019 – Present" plus a job-history verb is a
    // strong signal that the model invented a role.
    const dateRange = /\b(20\d{2}|19\d{2})\s*[-–—]\s*((20\d{2})|present|heute|aujourd'hui|actualidad|حالياً|अब तक)/i;
    const jobHistoryVerb =
      /\b(senior|manager|engineer at|worked at|company|empleado en|chez|bei|arbeitete bei|trabajó en|कंपनी में|काम किया)/i;
    if (dateRange.test(text) && jobHistoryVerb.test(lower)) {
      return true;
    }
  }

  return false;
}

/**
 * Remove prompt-injection noise, HTML tags, and code fences from the
 * model output.
 */
export function scrubResumeText(text: string): string {
  return neutralizeInstructionish(text)
    .replace(/<[^>]+>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Prompt builders                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build the system prompt for the resume writer.
 *
 * @param tone    Tone hint for the model.
 * @param locale  The user's locale — determines the target language and
 *                the section headings the model should emit.
 */
export function buildResumeSystemPrompt(
  tone: ResumeTone,
  locale: CareerRiskLocale = "en",
): string {
  const languageName = languageNameForPrompt(locale);
  const labels = SECTION_LABELS[locale];

  const headingList = [
    `"${labels.summary}"`,
    `"${labels.competencies}"`,
    `"${labels.experience}"`,
    `"${labels.education}"`,
    `"${labels.skills}"`,
    `"${labels.languages}"`,
  ].join(", ");

  return `You are a professional resume writer producing ATS-friendly plain-text resumes.

CRITICAL LANGUAGE RULE:
- Write ALL human-readable text ENTIRELY in ${languageName}. Never mix English into non-English output.
- Section headings must use EXACTLY these localized labels (and only the ones present in the input): ${headingList}.
- Do not translate the section headings into English.
- User-provided skill names, tool names, and proper nouns may stay in their original form.

Hard rules:
- Return plain text only (no HTML, no markdown code fences).
- Omit any section the user did not provide data for.
- NEVER invent employers, job titles, degrees, dates, certifications, or languages the user did not provide.
- NEVER invent achievements or metrics not implied by the user notes.
- Improve wording and structure only from user facts.
- Keep target role consistent with the user's target role when provided.
- ${toneInstruction(tone, locale)}
- Prefer bullet lines starting with "- " for experience and achievements.
- Contact line format: Email · Phone · Location (omit missing fields).`;
}

/**
 * Build the user prompt for the resume writer.
 */
export function buildResumeUserPrompt(
  data: {
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
  },
  locale: CareerRiskLocale = "en",
): string {
  const languageName = languageNameForPrompt(locale);

  return `Reply language: ${languageName} (do not switch to English).
Tone: ${data.tone}
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

/* ------------------------------------------------------------------ */
/* Convenience wrapper                                                */
/* ------------------------------------------------------------------ */

/**
 * Convenience helper: resolves locale from a raw string and delegates
 * to the prompt builders. Callers that already have a normalized
 * locale can call the individual builders directly.
 */
export function buildResumePrompts(
  tone: ResumeTone,
  data: Parameters<typeof buildResumeUserPrompt>[0],
  rawLocale: string | null | undefined,
): { system: string; user: string; locale: CareerRiskLocale } {
  const locale = normalizeCareerLocale(rawLocale);
  return {
    system: buildResumeSystemPrompt(tone, locale),
    user: buildResumeUserPrompt(data, locale),
    locale,
  };
}
