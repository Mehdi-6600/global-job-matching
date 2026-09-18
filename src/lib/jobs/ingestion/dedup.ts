import type { IngestJobDraft, DedupMatch } from "./types";

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    u.hash = "";
    // strip common tracking params
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach(
      (k) => u.searchParams.delete(k)
    );
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase().slice(0, 500);
  }
}

export type ExistingJobRef = {
  id: string;
  externalId: string | null;
  externalUrl: string | null;
  applyUrl?: string | null;
  title: string;
  location: string;
  companyName?: string | null;
  postedById: string | null;
};

/**
 * Multi-level dedup. Never merges solely on title.
 * Employer-owned jobs (postedById != null) are never returned as matches
 * for imported drafts — callers must also enforce this in SQL.
 */
export function scoreDedup(
  draft: IngestJobDraft,
  existing: ExistingJobRef
): DedupMatch | null {
  // Never treat employer jobs as import duplicates to update
  if (existing.postedById) return null;

  if (existing.externalId && existing.externalId === draft.externalId) {
    return {
      jobId: existing.id,
      confidence: 0.99,
      level: 1,
      reason: "source+sourceJobId",
    };
  }

  const draftUrl = normUrl(draft.externalUrl || draft.applyUrl);
  const existUrl = normUrl(existing.externalUrl || existing.applyUrl || null);
  if (draftUrl && existUrl && draftUrl === existUrl) {
    return {
      jobId: existing.id,
      confidence: 0.97,
      level: 2,
      reason: "canonical_url",
    };
  }

  const draftApply = normUrl(draft.applyUrl);
  const existApply = normUrl(existing.applyUrl || null);
  if (draftApply && existApply && draftApply === existApply) {
    return {
      jobId: existing.id,
      confidence: 0.95,
      level: 3,
      reason: "apply_url",
    };
  }

  const sameCompany =
    norm(draft.company) &&
    norm(existing.companyName || "") &&
    norm(draft.company) === norm(existing.companyName || "");
  const sameTitle = norm(draft.title) === norm(existing.title);
  const sameLocation = norm(draft.location) === norm(existing.location);

  if (sameCompany && sameTitle && sameLocation) {
    return {
      jobId: existing.id,
      confidence: 0.9,
      level: 4,
      reason: "company+title+location",
    };
  }

  // Same title different location → keep separate (explicit non-match)
  if (sameCompany && sameTitle && !sameLocation) {
    return null;
  }

  return null;
}

export function descriptionFingerprint(text: string): string {
  const n = norm(text).slice(0, 400);
  // simple stable hash
  let h = 0;
  for (let i = 0; i < n.length; i++) {
    h = (h * 31 + n.charCodeAt(i)) | 0;
  }
  return `fp:${h}`;
}
