/**
 * Compatibility shim.
 * Authoritative matching engine: @/lib/matching/score
 * Do not add a second scoring algorithm here.
 */

export {
  computeMatchScore,
  type MatchProfileInput,
  type MatchJobInput,
  type MatchBreakdown,
  type MatchResult,
} from "@/lib/matching/score";
