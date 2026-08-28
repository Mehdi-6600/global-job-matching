/**
 * Clean job/company location strings:
 * "London, London" → "London"
 * "United Kingdom, United Kingdom" → "United Kingdom"
 * "Berlin, Germany, Germany" → "Berlin, Germany"
 */
export function normalizeLocation(
  location: string | null | undefined
): string | null {
  if (location == null) return null;
  const raw = String(location).trim();
  if (!raw) return null;

  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const part of parts) {
    const key = part.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(part);
  }

  return unique.join(", ");
}
