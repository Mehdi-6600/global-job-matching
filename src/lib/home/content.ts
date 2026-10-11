/**
 * Pure presentational helpers for the home page.
 *
 * These were previously defined inline inside `src/app/page.tsx`. They are
 * extracted here so the rendering rules (headline splitting, salary ranges,
 * relative timestamps, avatar initials) can be unit tested without a DOM.
 *
 * No network, no React, no side effects.
 */

export type HomeJob = {
  id: string;
  title: string;
  description?: string;
  location?: string | null;
  salary?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  type?: string | null;
  remote?: boolean;
  experience?: string | null;
  tags?: string[];
  createdAt?: string;
  company?: {
    id?: string;
    name?: string | null;
    logo?: string | null;
    location?: string | null;
  } | null;
  category?: {
    id?: string;
    name?: string | null;
    slug?: string | null;
    color?: string | null;
  } | null;
};

export type JobsResponse = {
  jobs: HomeJob[];
  pagination?: {
    total?: number;
    totalPages?: number;
  };
};

/** Up to two initials from a company name, falling back to the brand mark. */
export function initials(value?: string | null): string {
  if (!value) return "GJ";

  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase()).join("");

  return letters || "GJ";
}

/** Compact age label, e.g. "12m ago", "3h ago", "5d ago". */
export function relativeTime(date?: string, now: number = Date.now()): string {
  if (!date) return "";

  const created = new Date(date).getTime();
  if (Number.isNaN(created)) return "";

  const diff = Math.max(0, now - created);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Salary label, in priority order: a free-text salary wins, then a range,
 * then a floor, then a ceiling. Returns null when nothing is published, so
 * the caller can render an honest "not listed" state instead of a guess.
 */
export function salaryLabel(
  job: HomeJob,
  locale?: string,
  upToLabel = "Up to",
): string | null {
  if (job.salary) return job.salary;

  const currency = job.currency || "USD";
  const format = (amount: number) => amount.toLocaleString(locale);

  if (job.salaryMin != null && job.salaryMax != null) {
    return `${currency} ${format(job.salaryMin)}–${format(job.salaryMax)}`;
  }

  if (job.salaryMin != null) {
    return `${currency} ${format(job.salaryMin)}+`;
  }

  if (job.salaryMax != null) {
    return `${upToLabel} ${currency} ${format(job.salaryMax)}`;
  }

  return null;
}

export type HeroTitle = {
  /** First sentence — rendered in full ink for maximum contrast. */
  line1: string;
  /** Remainder — rendered with a restrained brand accent. Empty when one sentence. */
  line2: string;
};

/**
 * Split a localized headline into up to two display lines.
 *
 * The design puts the gradient on the tail sentence, so the split must never
 * break a word or reorder text — it only slices at an existing sentence
 * boundary (period, question mark, Arabic question mark, Devanagari danda).
 *
 * English keeps its historical split at "opportunity" so the emphasised
 * clause stays stable across releases.
 */
export function splitHeroTitle(full: string): HeroTitle {
  const trimmed = full.trim();
  if (!trimmed) return { line1: "", line2: "" };

  const lower = trimmed.toLowerCase();
  const opportunityIndex = lower.indexOf("opportunity");
  const worldIndex = lower.indexOf("world");

  if (opportunityIndex >= 0 && worldIndex > opportunityIndex) {
    let end = opportunityIndex + "opportunity".length;
    if (trimmed[end] === ".") end += 1;

    const line1 = trimmed.slice(0, end).trim();
    let rest = trimmed.slice(end).trim();
    if (rest.startsWith(".")) rest = rest.slice(1).trim();

    return { line1, line2: rest };
  }

  const match = trimmed.match(/^([\s\S]*?[.!?؟।])\s+([\s\S]+)$/);
  if (match) {
    return { line1: match[1].trim(), line2: match[2].trim() };
  }

  return { line1: trimmed, line2: "" };
}
