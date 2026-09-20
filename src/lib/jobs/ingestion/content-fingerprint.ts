/**
 * Lightweight content fingerprint for no-op update detection.
 * Only ingestion-owned fields; no timestamps.
 */
import type { IngestJobDraft } from "./types";

function norm(s: string | null | undefined): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function contentFingerprint(
  draft: Pick<
    IngestJobDraft,
    | "title"
    | "description"
    | "location"
    | "applyUrl"
    | "externalUrl"
    | "employmentType"
    | "remote"
    | "salaryText"
    | "company"
  >,
): string {
  const parts = [
    norm(draft.title),
    norm(draft.company),
    norm(draft.location),
    norm(draft.description).slice(0, 4000),
    norm(draft.applyUrl),
    norm(draft.externalUrl),
    norm(draft.employmentType),
    draft.remote ? "1" : "0",
    norm(draft.salaryText),
  ];
  // FNV-1a 32-bit — fast, no crypto dependency
  let h = 0x811c9dc5;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
