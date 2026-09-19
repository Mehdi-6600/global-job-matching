/**
 * Source-level vs canonical identity.
 * Source listing identity: (sourceKey, sourceJobId) — unique per provider.
 * Job.externalId is namespaced `${sourceKey}:${sourceJobId}` for imported jobs
 * so different providers never collide on the same raw id.
 * Canonical merge across sources uses URL / title+company+location (dedup),
 * not raw externalId equality across sources.
 */

export function makeNamespacedExternalId(
  sourceKey: string,
  sourceJobId: string,
): string {
  const sk = sourceKey.trim();
  const sj = sourceJobId.trim();
  if (!sk || !sj) return sj || sk;
  const prefix = `${sk}:`;
  if (sj.startsWith(prefix)) return sj;
  // already namespaced with this or another key
  if (sj.includes(":")) return sj;
  return `${sk}:${sj}`;
}

export function parseNamespacedExternalId(
  externalId: string | null | undefined,
): { sourceKey: string | null; sourceJobId: string } {
  if (!externalId) return { sourceKey: null, sourceJobId: "" };
  const i = externalId.indexOf(":");
  if (i <= 0) return { sourceKey: null, sourceJobId: externalId };
  return {
    sourceKey: externalId.slice(0, i),
    sourceJobId: externalId.slice(i + 1),
  };
}
