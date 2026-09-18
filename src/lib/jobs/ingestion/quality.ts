import type { IngestJobDraft, QualityResult } from "./types";

const MIN_TITLE = 3;
const MIN_COMPANY = 2;
const MIN_DESC = 20;

function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Deterministic quality gate before persist.
 * Rejects empty/spam/invalid records; scores completeness for observability.
 */
export function assessJobQuality(job: IngestJobDraft): QualityResult {
  const reasons: string[] = [];
  let score = 0.4;

  if (!job.title || job.title.trim().length < MIN_TITLE) {
    reasons.push("title_too_short");
  } else {
    score += 0.15;
  }

  if (!job.company || job.company.trim().length < MIN_COMPANY) {
    reasons.push("company_invalid");
  } else {
    score += 0.1;
  }

  const desc = (job.description || "").trim();
  if (desc.length < MIN_DESC) {
    reasons.push("description_weak");
  } else {
    score += job.descriptionIsSnippet ? 0.05 : 0.15;
  }

  if (job.applyUrl && !isValidHttpUrl(job.applyUrl)) {
    reasons.push("apply_url_invalid");
  } else if (job.applyUrl) {
    score += 0.1;
  }

  if (job.externalUrl && !isValidHttpUrl(job.externalUrl)) {
    reasons.push("external_url_invalid");
  }

  if (!job.location?.trim()) {
    reasons.push("location_missing");
  } else {
    score += 0.05;
  }

  if (!job.externalId || !job.sourceKey) {
    reasons.push("identity_missing");
  }

  const spamHints = /work from home.*\$\d{4,}.*day|crypto airdrop|whatsapp only/i;
  if (spamHints.test(`${job.title} ${desc}`)) {
    reasons.push("spam_like");
  }

  const hardReject = reasons.some((r) =>
    [
      "title_too_short",
      "company_invalid",
      "identity_missing",
      "spam_like",
      "apply_url_invalid",
    ].includes(r)
  );

  return {
    ok: !hardReject,
    score: Math.max(0, Math.min(1, score)),
    reasons,
  };
}
