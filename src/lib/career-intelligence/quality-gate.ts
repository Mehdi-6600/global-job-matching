/**
 * Quality gate for career-intelligence outputs.
 *
 * Three independent validators, all pure and deterministic:
 *
 *   1. validateOutputQuality  — checks length, structure, locale sanity
 *   2. detectRepetition       — flags adjacent or duplicate sentences
 *   3. validateEvidence       — ensures no fabricated facts appear
 *
 * These validators are ADVISORY. They return reports, they do not
 * throw, and they never mutate their input. Callers may choose to:
 *   - log the report
 *   - downgrade a response's confidence
 *   - strip offending sentences
 *
 * They are intentionally conservative: a "false positive" is a missed
 * sentence, not a broken response.
 */
import type { CareerRiskLocale } from "@/types/career-risk";
import type { NormalizedCareerProfile } from "./normalize-profile";

/* ------------------------------------------------------------------ */
/* Public types                                                       */
/* ------------------------------------------------------------------ */

export type QualityReport = {
  ok: boolean;
  /** 0..1 — higher is better. */
  score: number;
  issues: string[];
  metrics: {
    length: number;
    sentenceCount: number;
    hasLocaleChars: boolean;
    placeholderLeak: boolean;
  };
};

export type RepetitionReport = {
  /** True when no adjacent or duplicate sentences were found. */
  ok: boolean;
  duplicateSentences: string[];
  /** Pairs of adjacent sentences that are too similar. */
  nearDuplicates: Array<{ a: string; b: string; similarity: number }>;
};

export type EvidenceReport = {
  ok: boolean;
  issues: string[];
};

/* ------------------------------------------------------------------ */
/* Locale sanity                                                      */
/* ------------------------------------------------------------------ */

const ARABIC_BLOCK_RE = /[\u0600-\u06FF]/;
const DEVANAGARI_RE = /[\u0900-\u097F]/;
const LATIN_RE = /[A-Za-z]/;

/**
 * A coarse check that the output actually contains characters from the
 * expected script. It is NOT a full language detector — it only catches
 * obvious mismatches (e.g. all-English output for a Persian request).
 */
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
/* Sentence splitting                                                 */
/* ------------------------------------------------------------------ */

/**
 * Split text into sentences using locale-aware punctuation.
 * Persian/Arabic use "؟" for questions and "،" for commas; we keep
 * sentence-final punctuation only.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?؟।])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/* ------------------------------------------------------------------ */
/* Validator 1 — output quality                                       */
/* ------------------------------------------------------------------ */

const MIN_LENGTH = 40;
const MAX_LENGTH = 8_000;

/**
 * Validate the basic quality of a generated text.
 *
 * Checks:
 *  - length is within [MIN_LENGTH, MAX_LENGTH]
 *  - at least one sentence
 *  - no unresolved {placeholder} leaks
 *  - script matches locale
 */
export function validateOutputQuality(
  text: string,
  locale: CareerRiskLocale,
): QualityReport {
  const issues: string[] = [];

  const length = text.length;
  if (length < MIN_LENGTH) issues.push("too_short");
  if (length > MAX_LENGTH) issues.push("too_long");

  const sentences = splitSentences(text);
  if (sentences.length === 0) issues.push("no_sentences");

  // Placeholder leak: an unresolved {xxx} would look like a bug.
  const placeholderLeak = /\{\w+\}/.test(text);
  if (placeholderLeak) issues.push("placeholder_leak");

  const scriptOk = hasExpectedScript(text, locale);
  if (!scriptOk) issues.push("script_mismatch");

  // Compute a soft score. Each issue subtracts 0.2, floored at 0.
  let score = 1;
  score -= issues.length * 0.2;
  score = Math.max(0, Math.min(1, score));

  return {
    ok: issues.length === 0,
    score,
    issues,
    metrics: {
      length,
      sentenceCount: sentences.length,
      hasLocaleChars: scriptOk,
      placeholderLeak,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Validator 2 — repetition                                           */
/* ------------------------------------------------------------------ */

function normSentence(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "") // strip Arabic diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Jaccard similarity over word sets. Returns 0..1.
 * Cheap, deterministic, and good enough for detecting near-duplicates.
 */
function jaccard(a: string, b: string): number {
  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 1;
  let intersect = 0;
  for (const w of sa) if (sb.has(w)) intersect += 1;
  const union = sa.size + sb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

/**
 * Detect adjacent or duplicate sentences in a list of lines.
 *
 * - "duplicateSentences": exact matches after normalization
 * - "nearDuplicates": adjacent lines with Jaccard >= 0.9
 */
export function detectRepetition(lines: string[]): RepetitionReport {
  const normalized = lines.map(normSentence);

  // Exact duplicates
  const counts = new Map<string, number>();
  for (const n of normalized) {
    if (!n) continue;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  const duplicateSentences: string[] = [];
  for (const [key, count] of counts.entries()) {
    if (count >= 2) {
      const original = lines.find((l) => normSentence(l) === key);
      if (original) duplicateSentences.push(original);
    }
  }

  // Near duplicates among adjacent lines
  const nearDuplicates: Array<{ a: string; b: string; similarity: number }> = [];
  for (let i = 1; i < normalized.length; i++) {
    const a = normalized[i - 1];
    const b = normalized[i];
    if (!a || !b) continue;
    const sim = jaccard(a, b);
    if (sim >= 0.9) {
      nearDuplicates.push({ a: lines[i - 1], b: lines[i], similarity: sim });
    }
  }

  return {
    ok: duplicateSentences.length === 0 && nearDuplicates.length === 0,
    duplicateSentences,
    nearDuplicates,
  };
}

/* ------------------------------------------------------------------ */
/* Validator 3 — evidence                                             */
/* ------------------------------------------------------------------ */

/**
 * Marker patterns that must never appear unless the user supplied the
 * corresponding fact. These are deliberately conservative: they catch
 * obvious fabrications, not subtle paraphrases.
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; tag: string }> = [
  // Invented credentials
  { pattern: /\b(PhD|MBA)\b/i, tag: "credential" },
  { pattern: /\b(BSc|MSc|Bachelor|Master)\b/i, tag: "degree" },
  // Invented C-level titles
  { pattern: /\b(CEO|CTO|CFO|COO|CIO)\b/, tag: "executive_title" },
  // Invented employer claims
  { pattern: /\bworked at [A-Z][A-Za-z]+\b/, tag: "employer" },
  { pattern: /\bat Google\b|\bat Microsoft\b|\bat Amazon\b|\bat Meta\b/i, tag: "employer" },
  // Invented awards
  { pattern: /\baward-winning\b/i, tag: "award" },
  // Invented revenue metrics
  { pattern: /\b\$?\d+(\.\d+)?\s?(million|billion|M|B)\b/i, tag: "revenue" },
];

/**
 * Validate that the output does not contain fabricated facts.
 *
 * The caller passes the profile so we can distinguish between:
 *  - "user actually mentioned a PhD" → allowed
 *  - "output invented a PhD"          → forbidden
 *
 * For simplicity we treat presence of the tag in the profile text as
 * permission. This is deliberately permissive on the profile side so
 * we do not flag legitimate facts.
 */
export function validateEvidence(
  text: string,
  profile: NormalizedCareerProfile | null,
): EvidenceReport {
  const issues: string[] = [];

  // Gather a searchable blob of user-supplied evidence.
  const userBlob = profile
    ? [
        profile.currentRole,
        profile.education ?? "",
        profile.industry ?? "",
        profile.skills.join(" "),
        profile.evidence.responsibilities.join(" "),
        profile.evidence.achievements.join(" "),
        profile.evidence.certifications.join(" "),
        profile.evidence.metrics.join(" "),
      ]
        .join(" ")
        .toLowerCase()
    : "";

  for (const { pattern, tag } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const matched = match[0].toLowerCase();
    if (userBlob.includes(matched)) continue; // user actually said this
    issues.push(`possible_fabrication:${tag}`);
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

/* ------------------------------------------------------------------ */
/* Combined helper                                                    */
/* ------------------------------------------------------------------ */

export type CombinedQualityReport = {
  quality: QualityReport;
  repetition: RepetitionReport;
  evidence: EvidenceReport;
  /** True only if all three validators are happy. */
  ok: boolean;
};

/**
 * Run all three validators at once.
 *
 * `lines` is optional; when omitted we only run quality + evidence.
 */
export function runQualityGate(
  text: string,
  locale: CareerRiskLocale,
  profile: NormalizedCareerProfile | null,
  lines?: string[],
): CombinedQualityReport {
  const quality = validateOutputQuality(text, locale);
  const repetition = lines
    ? detectRepetition(lines)
    : { ok: true, duplicateSentences: [], nearDuplicates: [] };
  const evidence = validateEvidence(text, profile);

  return {
    quality,
    repetition,
    evidence,
    ok: quality.ok && repetition.ok && evidence.ok,
  };
}
