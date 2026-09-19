/**
 * Dedup scoring for imported jobs only.
 * L1–L3: identity/URL (pipeline queries).
 * L4+: title+company+location must not merge different cities lightly.
 */
import type { DedupMatch, IngestJobDraft } from "./types";

export type ExistingJobRef = {
  id: string;
  externalId: string | null;
  externalUrl?: string | null;
  applyUrl?: string | null;
  title: string;
  location: string;
  postedById: string | null;
  companyName?: string | null;
};

function norm(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function locationKey(loc: string): string {
  const n = norm(loc);
  if (!n || n === "remote") return "remote";
  const parts = n.split(" ").filter(Boolean);
  return parts.slice(-2).join(" ") || n;
}

/** Score existing candidate against draft. Employer refs should never be passed. */
export function scoreDedup(
  draft: IngestJobDraft,
  existing: ExistingJobRef,
): DedupMatch | null {
  if (existing.postedById) return null;

  const draftExt = draft.externalId?.trim();
  if (draftExt && existing.externalId && draftExt === existing.externalId) {
    return {
      jobId: existing.id,
      confidence: 1,
      level: 1,
      reason: "external_id",
    };
  }

  const dUrl = (draft.externalUrl || "").trim();
  const eUrl = (existing.externalUrl || "").trim();
  if (dUrl && eUrl && dUrl === eUrl) {
    return {
      jobId: existing.id,
      confidence: 0.98,
      level: 2,
      reason: "external_url",
    };
  }

  const dApply = (draft.applyUrl || "").trim();
  const eApply = (existing.applyUrl || "").trim();
  if (dApply && eApply && dApply === eApply) {
    return {
      jobId: existing.id,
      confidence: 0.95,
      level: 3,
      reason: "apply_url",
    };
  }

  const sameCompany =
    norm(draft.company) &&
    norm(existing.companyName) &&
    norm(draft.company) === norm(existing.companyName);
  const sameTitle = norm(draft.title) === norm(existing.title);
  const sameLoc =
    locationKey(draft.location) === locationKey(existing.location);

  if (sameCompany && sameTitle && sameLoc) {
    return {
      jobId: existing.id,
      confidence: 0.9,
      level: 4,
      reason: "company_title_location",
    };
  }

  if (sameCompany && sameTitle && !sameLoc) {
    return null;
  }

  return null;
}
