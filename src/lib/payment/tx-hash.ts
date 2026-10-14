/**
 * Canonical form of a submitted on-chain transaction id.
 *
 * Why this exists: a payment is recorded per transaction id, and duplicate
 * detection compares strings. `0xABC…`, `0xabc…`, `abc…` and ` 0xabc… ` are the
 * same transaction for every hex-encoded network, so without canonicalisation
 * one on-chain payment could back two payment intents.
 *
 * Rules (per asset, because the id format depends on the network):
 * - Hex ids (BTC, DOGE, ETH, BNB, USDC, USDT on Tron): ASCII letters are
 *   lower-cased. EVM assets (ETH, BNB, USDC) always carry the `0x` prefix.
 *   BTC, DOGE and USDT keep the caller's prefix presence, so the existing
 *   format check (which rejects a prefix for BTC/DOGE) still applies.
 * - TON ids are base64url and case-sensitive. They are only trimmed, never
 *   case-folded.
 * - Anything else (unknown asset, malformed digest) is only trimmed. The
 *   format check then rejects it, as before.
 *
 * This module has no dependencies, so it can be used from routes and tests
 * without loading the chain verifiers.
 */

const HEX_DIGEST = /^(0x)?([a-fA-F0-9]{64})$/;

/** Assets whose transaction ids are hex. */
const HEX_ASSETS: ReadonlySet<string> = new Set([
  "BTC",
  "DOGE",
  "ETH",
  "BNB",
  "USDT",
  "USDC",
]);

/** Assets on EVM chains: the canonical form always has the 0x prefix. */
const EVM_ASSETS: ReadonlySet<string> = new Set(["ETH", "BNB", "USDC"]);

/** Canonical stored and verified form of the submitted hash. */
export function canonicalTxHash(asset: string, raw: string): string {
  const h = raw.trim();
  const a = asset.trim().toUpperCase();
  if (!HEX_ASSETS.has(a)) return h;

  const m = HEX_DIGEST.exec(h);
  if (!m) return h;

  const digest = m[2].toLowerCase();
  if (EVM_ASSETS.has(a)) return `0x${digest}`;
  return `${m[1] ? "0x" : ""}${digest}`;
}

/**
 * The 64-character lower-case digest for a hex id, without any prefix, or null
 * for ids that are not hex (TON, malformed input). Used to find rows that were
 * stored before canonicalisation, in any spelling.
 */
export function hexDigestOf(asset: string, raw: string): string | null {
  const a = asset.trim().toUpperCase();
  if (!HEX_ASSETS.has(a)) return null;
  const m = HEX_DIGEST.exec(raw.trim());
  return m ? m[2].toLowerCase() : null;
}

/**
 * Prisma `where` clause that matches any stored spelling of the same digest:
 * with or without the 0x prefix, in any letter case. Returns null when the id
 * is not hex, in which case only the exact canonical value applies.
 */
export function legacyHashWhere(
  digest: string | null,
): { OR: Array<{ txHash: { equals: string; mode: "insensitive" } }> } | null {
  if (!digest) return null;
  return {
    OR: [
      { txHash: { equals: digest, mode: "insensitive" } },
      { txHash: { equals: `0x${digest}`, mode: "insensitive" } },
    ],
  };
}
