/**
 * Canonical deterministic matching engine (single source of truth).
 * Unicode-safe tokenization for en / fa / ar and mixed text.
 *
 * Design goals:
 *  - Deterministic: same inputs → same output, always.
 *  - Unicode-aware: correct handling of Latin, Arabic, Persian, digits.
 *  - Explainable: every score decomposes into weighted parts.
 *  - Conservative: avoids false positives from substring or calendar years.
 */

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type MatchProfileInput = {
  skills?: string | null;
  title?: string | null;
  bio?: string | null;
  experience?: string | null;
  education?: string | null;
  location?: string | null;
};

export type MatchJobInput = {
  title: string;
  description: string;
  location: string;
  remote?: boolean | null;
  experience?: string | null;
  requirements?: string[] | null;
  tags?: string[] | null;
  type?: string | null;
};

export type MatchBreakdown = {
  skills: number;
  location: number;
  experience: number;
  keywords: number;
};

export type MatchLevel = "low" | "medium" | "high" | "excellent";

export type MatchResult = {
  score: number;
  level: MatchLevel;
  breakdown: MatchBreakdown;
  matchedSkills: string[];
  missingFromRequirements: string[];
};

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const STOP = new Set([
  // English
  "and", "or", "the", "a", "an", "to", "of", "in", "for", "with", "on", "at",
  "by", "from", "as", "is", "are", "be", "this", "that", "your", "you", "we",
  "our", "job", "role", "work", "years", "year", "experience",
  // Persian / Arabic
  "و", "در", "به", "از", "که", "را", "با", "برای",
]);

const MAX_MATCHED_SKILLS = 20;
const MAX_MISSING_REQUIREMENTS = 12;

/**
 * Shared year-unit pattern covering English, Persian, and Arabic variants.
 * Used by `yearsIn` for plain, range, and floor forms.
 */
const YEAR_UNIT =
  "(?:years?|yrs?|year|yr|سال|سنوات|سنة|سنه)";

/* ------------------------------------------------------------------ */
/* Normalization                                                      */
/* ------------------------------------------------------------------ */

/** Normalize common Arabic/Persian letter variants. */
export function normalizeScript(text: string): string {
  return text
    .replace(/\u064A/g, "\u06CC") // ي → ی
    .replace(/\u0643/g, "\u06A9") // ك → ک
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u200C/g, " ")      // ZWNJ → space
    .replace(/\u0640/g, "");      // tatweel
}

/** Convert Persian/Arabic digits to ASCII digits. */
function toAsciiDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/* ------------------------------------------------------------------ */
/* Tokenization                                                       */
/* ------------------------------------------------------------------ */

/**
 * Unicode-aware tokenizer: keeps Latin, digits, and Arabic block letters.
 * Drops stopwords and tokens shorter than 2 characters.
 */
export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  const normalized = normalizeScript(text.toLowerCase());
  return normalized
    .replace(/[^\p{L}\p{N}+#.\s\-]/gu, " ")
    .split(/[\s,;/|·•]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

function unique(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

/* ------------------------------------------------------------------ */
/* Overlap scoring                                                    */
/* ------------------------------------------------------------------ */

function overlapRatio(
  a: string[],
  b: string[],
): { ratio: number; matched: string[] } {
  if (a.length === 0 || b.length === 0) return { ratio: 0, matched: [] };

  const setB = new Set(b);
  const matched = a.filter((t) => setB.has(t));

  // Requirement coverage: share of job tokens covered by the candidate.
  const coverage = matched.length / Math.max(b.length, 1);

  // Jaccard softens "one job skill, huge candidate bag → perfect score".
  const union = new Set([...a, ...b]).size;
  const jaccard = matched.length / Math.max(union, 1);

  const ratio = Math.min(1, coverage * 0.7 + jaccard * 0.3);
  return { ratio, matched: unique(matched) };
}

/* ------------------------------------------------------------------ */
/* Location                                                           */
/* ------------------------------------------------------------------ */

function locationScore(
  profileLoc: string | null | undefined,
  jobLoc: string | null | undefined,
  remote?: boolean | null,
): number {
  // Remote jobs are location-flexible; do not award a perfect 1.0 so location
  // weight cannot alone push overall score into "excellent".
  if (remote) return 0.9;

  const p = normalizeScript((profileLoc ?? "").toLowerCase().trim());
  const j = normalizeScript((jobLoc ?? "").toLowerCase().trim());
  if (!p || !j) return 0.35;
  if (p === j) return 1;

  // Token overlap handles "Tehran" vs "Tehran, Iran" without raw substring traps
  // like matching a short city name inside an unrelated longer string.
  const pTok = tokenize(p);
  const jTok = tokenize(j);
  if (pTok.length && jTok.length) {
    const setJ = new Set(jTok);
    const hits = pTok.filter((t) => setJ.has(t) && t.length >= 2);
    if (hits.length > 0) {
      const coverage =
        hits.length / Math.max(Math.min(pTok.length, jTok.length), 1);
      if (coverage >= 0.5) return 0.9;
      return 0.7;
    }
  }

  // Conservative substring only when the shorter side is long enough (≥4).
  const shorter = p.length <= j.length ? p : j;
  const longer = p.length <= j.length ? j : p;
  if (shorter.length >= 4 && longer.includes(shorter)) return 0.8;

  return 0.15;
}

/* ------------------------------------------------------------------ */
/* Experience                                                         */
/* ------------------------------------------------------------------ */

/**
 * Parse years-of-experience from free text.
 *
 * Supported forms (en / fa / ar):
 *   - "3 years", "3+ years", "3 yrs", "3 yr"
 *   - "3 years of experience"
 *   - "5 years minimum", "min. 4 years"
 *   - "at least 3 years", "more than 3 years"
 *   - "2-4 years", "2 to 4 years", "1.5-2.5 years"
 *   - "۳ سال", "۳+ سال", "حداقل ۳ سال", "بیش از ۳ سال"
 *   - "۲ تا ۴ سال", "۲–۴ سال", "۵ سال سابقه", "۵ سال سابقه کار"
 *   - "٣ سنوات", "٣ سنة", "٣ سنه"
 *   - "٢-٤ سنوات", "2 to 4 سنوات"
 *   - "٣ سنوات على الأقل" / "٣ سنوات علي الأقل"
 *
 * Rejects:
 *   - Calendar years ("2026")
 *   - Money amounts ("5000 USD")
 *   - Unrelated counts ("2 projects")
 *   - Absurd values above 50
 */
export function yearsIn(s: string): number | null {
  const t = toAsciiDigits(s);

  // Ranges with unit: "2-4 years", "2 to 4 years", "۲ تا ۴ سال", "٢-٤ سنوات"
  const range = t.match(
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*(?:to|تا|[-–—])\\s*(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*${YEAR_UNIT}`,
      "i",
    ),
  );
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return (a + b) / 2;
  }

  // Floor forms: at least / more than / minimum / حداقل / بیش از / على الأقل
  const floor = t.match(
    new RegExp(
      `(?:at\\s+least|more\\s+than|minimum|min\\.?|حداقل|بیش\\s+از|على\\s+الأقل|علي\\s+الأقل)\\s*(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*${YEAR_UNIT}`,
      "i",
    ),
  );
  if (floor) {
    const n = Number(floor[1]);
    return Number.isFinite(n) ? n : null;
  }

  // Plain forms: "N years" / "N سال" / "N سنوات" / "N سال سابقه"
  const plain = t.match(
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*\\+?\\s*${YEAR_UNIT}(?:\\s*(?:of\\s+experience|سابقه(?:\\s*کار)?))?`,
      "i",
    ),
  );
  if (plain) {
    const n = Number(plain[1]);
    // Reject calendar years and absurd values.
    if (!Number.isFinite(n) || n > 50) return null;
    return n;
  }

  // Level taxonomy → approximate years (deterministic).
  if (
    /\b(intern|trainee|entry[- ]?level|junior|associate)\b/i.test(t) ||
    /مبتدی|تازه.?کار|کارآموز|جونیور/.test(t)
  ) {
    return 1;
  }
  if (
    /\b(mid[- ]?level|intermediate)\b/i.test(t) ||
    /میان.?سطح/.test(t)
  ) {
    return 3;
  }
  if (
    /\b(senior|lead|principal|staff|expert)\b/i.test(t) ||
    /ارشد|خبره|متخصص|کارشناس\s*ارشد/.test(t)
  ) {
    return 6;
  }
  if (
    /\b((senior|executive)\s+)?(manager|director|head)\b/i.test(t) ||
    /مدیر\s*(ارشد|عامل|فنی)/.test(t)
  ) {
    return 8;
  }

  return null;
}

function experienceScore(
  profileExp: string | null | undefined,
  jobExp: string | null | undefined,
): number {
  if (!jobExp) return 0.55;
  if (!profileExp) return 0.3;

  const p = normalizeScript(toAsciiDigits(profileExp.toLowerCase()));
  const j = normalizeScript(toAsciiDigits(jobExp.toLowerCase()));

  if (p.includes(j) || j.includes(p)) return 0.9;

  const py = yearsIn(p);
  const jy = yearsIn(j);
  if (py != null && jy != null) {
    if (py >= jy) return 1;
    if (py >= jy - 1) return 0.75;
    if (py >= jy - 2) return 0.5;
    return 0.25;
  }

  const { ratio } = overlapRatio(tokenize(p), tokenize(j));
  return Math.max(0.25, ratio);
}

/* ------------------------------------------------------------------ */
/* Level mapping                                                      */
/* ------------------------------------------------------------------ */

function levelFromScore(score: number): MatchLevel {
  if (score >= 85) return "excellent";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Canonical score 0–100. Same inputs always produce the same output.
 *
 * Weights:
 *   skills     45%
 *   location   20%
 *   keywords   20%
 *   experience 15%
 *   + optional title boost (≤ 8%)
 */
export function computeMatchScore(
  profile: MatchProfileInput,
  job: MatchJobInput,
): MatchResult {
  const profileSkillTokens = unique(
    tokenize(
      [
        profile.skills,
        profile.title,
        profile.bio,
        profile.experience,
        profile.education,
      ]
        .filter(Boolean)
        .join(" "),
    ),
  );

  const requirementTokens = unique(
    [...(job.requirements ?? []), ...(job.tags ?? [])].flatMap((s) =>
      tokenize(s),
    ),
  );

  const jobTextTokens = unique(
    tokenize(`${job.title} ${job.description || ""} ${job.type || ""}`),
  );

  const skillPool =
    requirementTokens.length > 0 ? requirementTokens : jobTextTokens;

  const skillOverlap = overlapRatio(profileSkillTokens, skillPool);
  const keywordOverlap = overlapRatio(profileSkillTokens, jobTextTokens);

  // Optional title affinity (only when profile has a real title).
  let titleBoost = 0;
  if (profile.title && profile.title.trim().length >= 2) {
    const titleTokens = tokenize(profile.title);
    const jobTitleTokens = tokenize(job.title);
    const { ratio } = overlapRatio(titleTokens, jobTitleTokens);
    titleBoost = ratio * 0.08;
  }

  const skillsPart = skillOverlap.ratio;
  const locPart = locationScore(profile.location, job.location, job.remote);
  const expPart = experienceScore(profile.experience, job.experience);
  const kwPart = keywordOverlap.ratio;

  const raw =
    skillsPart * 0.45 +
    locPart * 0.2 +
    expPart * 0.15 +
    kwPart * 0.2 +
    titleBoost;

  const score = Math.max(
    0,
    Math.min(100, Math.round(Number.isFinite(raw) ? raw * 100 : 0)),
  );

  const missingFromRequirements = requirementTokens
    .filter((t) => !skillOverlap.matched.includes(t))
    .slice(0, MAX_MISSING_REQUIREMENTS);

  return {
    score,
    level: levelFromScore(score),
    breakdown: {
      skills: Math.round(skillsPart * 100),
      location: Math.round(locPart * 100),
      experience: Math.round(expPart * 100),
      keywords: Math.round(kwPart * 100),
    },
    matchedSkills: skillOverlap.matched.slice(0, MAX_MATCHED_SKILLS),
    missingFromRequirements,
  };
}
