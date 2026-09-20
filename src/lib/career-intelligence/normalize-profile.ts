/**
 * Extended profile normalization layer.
 *
 * This module ADDS fields to the existing CareerProfile without
 * changing its type or breaking callers. All extensions are optional
 * and default to null/false when the input is not provided.
 *
 * The goal is to expose a single rich profile that Career Risk,
 * Resume Writer, and Migration Advisor can all consume — so the three
 * systems reason from the same evidence rather than each one
 * re-parsing inputs.
 *
 * Nothing here changes runtime behavior of existing callers:
 *  - buildCareerProfile() is still authoritative for the base fields.
 *  - normalizeCareerProfile() composes it and layers the extras.
 */
import type { CareerRiskLocale } from "@/types/career-risk";
import {
  buildCareerProfile,
  type CareerProfile,
  type ProfileInput,
} from "./profile";
import { normalizeCareerLocale } from "@/lib/career-risk";

/* ------------------------------------------------------------------ */
/* Extended input                                                     */
/* ------------------------------------------------------------------ */

export type ExtendedProfileInput = ProfileInput & {
  /** Explicit age (null when unknown). */
  age?: number | null;
  /** Current nationality / passport country (free text). */
  nationality?: string | null;
  /** Financial constraint for study/relocation decisions. */
  financialConstraint?: "low" | "medium" | "high" | null;
  /** Family situation (free text: "single", "married with 2 kids", …). */
  familySituation?: string | null;
  /** Whether the user is open to formal study/training. */
  willingnessToStudy?: boolean | null;
  /** Existing concrete offers/sponsorships the user mentioned. */
  existingOffers?: string[] | null;
  /** Certifications the user listed. */
  certifications?: string[] | null;
  /** Free-text achievements the user listed. */
  achievements?: string[] | null;
  /** Explicit measurable metrics the user provided (e.g. "80 orders/day"). */
  metrics?: string[] | null;
};

/* ------------------------------------------------------------------ */
/* Evidence                                                           */
/* ------------------------------------------------------------------ */

export type CareerEvidence = {
  /** True when the user supplied at least one measurable metric. */
  hasMetrics: boolean;
  /** Raw metric strings from the user (never invented). */
  metrics: string[];
  /** Achievement strings provided or safely reworded from responsibilities. */
  achievements: string[];
  /** Raw responsibility lines. */
  responsibilities: string[];
  /** Certifications explicitly listed. */
  certifications: string[];
};

/* ------------------------------------------------------------------ */
/* Career transition                                                  */
/* ------------------------------------------------------------------ */

export type CareerTransition = {
  fromFamily: CareerProfile["roleFamily"];
  toFamily: CareerProfile["targetRoleFamily"];
  fromRole: string;
  toRole: string | null;
  /** Skills the user already has that transfer to the target family. */
  bridgeSkills: string[];
  /** Skills the target family needs that the user lacks. */
  gapSkills: string[];
};

/* ------------------------------------------------------------------ */
/* Normalized profile                                                 */
/* ------------------------------------------------------------------ */

/**
 * Rich, shared profile used by all three systems.
 *
 * It EXTENDS CareerProfile — never replaces it. Any existing code
 * that expects a CareerProfile can still receive one by destructuring
 * or by using the base builder directly.
 */
export type NormalizedCareerProfile = CareerProfile & {
  /** Raw extended inputs (echoed for downstream use). */
  age: number | null;
  nationality: string | null;
  financialConstraint: "low" | "medium" | "high" | null;
  familySituation: string | null;
  willingnessToStudy: boolean | null;
  existingOffers: string[];

  /** Extracted evidence. */
  evidence: CareerEvidence;

  /** Career-transition reasoning, when target differs from current. */
  transition: CareerTransition | null;

  /** Simple numeric signals useful to all three systems. */
  signals: {
    /** 0–100: how senior the user looks given title + years. */
    seniorityScore: number;
    /** 0–100: strength of evidence (metrics + achievements + skills). */
    evidenceStrength: number;
    /** 0–100: geographic flexibility (remote + willingness to relocate + offers). */
    mobilityScore: number;
    /** 0–100: how well the profile matches its own target role. */
    targetReadiness: number;
  };
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function toTrimmedArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter((s) => s.length > 0)
    .slice(0, max);
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function seniorityScoreFrom(profile: CareerProfile): number {
  const y = profile.yearsExperience ?? 0;
  const base =
    profile.seniority === "lead" || profile.seniority === "manager"
      ? 80
      : profile.seniority === "senior"
        ? 65
        : profile.seniority === "mid"
          ? 45
          : profile.seniority === "junior"
            ? 25
            : 30;
  // Years add up to +20, capped.
  const yearBonus = Math.min(20, y * 2);
  return clamp(base + yearBonus);
}

function evidenceStrengthFrom(evidence: CareerEvidence): number {
  let score = 20;
  score += Math.min(30, evidence.metrics.length * 10);
  score += Math.min(25, evidence.achievements.length * 5);
  score += Math.min(15, evidence.certifications.length * 5);
  score += Math.min(10, evidence.responsibilities.length * 2);
  return clamp(score);
}

function mobilityScoreFrom(input: ExtendedProfileInput): number {
  let score = 40;
  if (input.financialConstraint === "high") score += 20;
  else if (input.financialConstraint === "medium") score += 10;
  else if (input.financialConstraint === "low") score -= 10;

  if (input.willingnessToStudy === true) score += 15;
  if (Array.isArray(input.existingOffers) && input.existingOffers.length > 0) {
    score += 20;
  }
  if (input.familySituation) {
    // Any family situation slightly reduces pure mobility.
    score -= 5;
  }
  return clamp(score);
}

function targetReadinessFrom(
  profile: CareerProfile,
  transition: CareerTransition | null,
): number {
  if (!profile.targetRole) return 30; // No target → cannot be ready
  let score = 40;
  if (transition) {
    // Some bridge skills, some gaps.
    score += Math.min(25, transition.bridgeSkills.length * 5);
    score -= Math.min(20, transition.gapSkills.length * 3);
  } else {
    // Same-family target.
    score += 20;
  }
  // Existing transferable skills help.
  score += Math.min(20, profile.transferableSkills.length * 3);
  return clamp(score);
}

function buildTransition(
  profile: CareerProfile,
): CareerTransition | null {
  if (!profile.targetRole || !profile.targetRoleFamily) return null;
  if (profile.targetRoleFamily === profile.roleFamily) return null;

  // Bridge = current transferable skills that are relevant to the target
  // family's growth skills (a soft signal, not a claim of competence).
  const targetFamilyGaps = new Set(profile.missingSkills);
  const bridgeSkills = profile.transferableSkills.filter(
    (s) => !targetFamilyGaps.has(s),
  );

  return {
    fromFamily: profile.roleFamily,
    toFamily: profile.targetRoleFamily,
    fromRole: profile.currentRole,
    toRole: profile.targetRole,
    bridgeSkills: Array.from(new Set(bridgeSkills)).slice(0, 8),
    gapSkills: profile.missingSkills.slice(0, 8),
  };
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Build a NormalizedCareerProfile from extended input.
 *
 * Never throws on malformed extended fields — every extended value is
 * optional and defaults to null/false/[].
 */
export function normalizeCareerProfile(
  input: ExtendedProfileInput,
): NormalizedCareerProfile {
  const base = buildCareerProfile(input);
  const locale: CareerRiskLocale = normalizeCareerLocale(input.locale);

  const achievements = toTrimmedArray(input.achievements, 20);
  const metrics = toTrimmedArray(input.metrics, 20);
  const certifications = toTrimmedArray(input.certifications, 20);
  const responsibilities = base.responsibilities;

  const evidence: CareerEvidence = {
    hasMetrics: metrics.length > 0,
    metrics,
    achievements,
    responsibilities,
    certifications,
  };

  const transition = buildTransition(base);

  const age =
    typeof input.age === "number" &&
    Number.isFinite(input.age) &&
    input.age > 0 &&
    input.age < 120
      ? Math.floor(input.age)
      : null;

  const financialConstraint =
    input.financialConstraint === "low" ||
    input.financialConstraint === "medium" ||
    input.financialConstraint === "high"
      ? input.financialConstraint
      : null;

  const willingnessToStudy =
    typeof input.willingnessToStudy === "boolean"
      ? input.willingnessToStudy
      : null;

  const nationality = input.nationality?.trim() || null;
  const familySituation = input.familySituation?.trim() || null;
  const existingOffers = toTrimmedArray(input.existingOffers, 10);

  return {
    ...base,
    locale,
    age,
    nationality,
    financialConstraint,
    familySituation,
    willingnessToStudy,
    existingOffers,
    evidence,
    transition,
    signals: {
      seniorityScore: seniorityScoreFrom(base),
      evidenceStrength: evidenceStrengthFrom(evidence),
      mobilityScore: mobilityScoreFrom(input),
      targetReadiness: targetReadinessFrom(base, transition),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Re-exports for convenience                                         */
/* ------------------------------------------------------------------ */

export type { CareerProfile, ProfileInput } from "./profile";
