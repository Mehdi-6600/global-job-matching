/**
 * Strip HTML tags from untrusted text (job imports, bios, etc.).
 * Not a full HTML sanitizer — use only when you want plain text.
 */
export function stripHtmlToText(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reject javascript: and data: URL schemes in user-supplied links */
export function isSafeHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
