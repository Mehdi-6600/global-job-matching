/**
 * Optional helpers for crypto payment review.
 * Production still uses admin confirm; these helpers support future auto-check.
 * Never auto-activate a plan from client-supplied amount alone.
 */

export type CryptoAsset = "BTC" | "ETH" | "USDT" | "USDC" | "BNB" | "DOGE" | "TON";

export function isPlausibleTxHash(asset: string, hash: string): boolean {
  const h = hash.trim();
  if (h.length < 10 || h.length > 200) return false;
  if (!/^[a-zA-Z0-9:_-]+$/.test(h)) return false;

  const a = asset.toUpperCase();
  if (a === "BTC" || a === "DOGE") {
    // txids are 64 hex
    return /^[a-fA-F0-9]{64}$/.test(h);
  }
  if (a === "ETH" || a === "BNB" || a === "USDT" || a === "USDC") {
    // EVM tx hash 0x + 64 hex OR plain 64 hex
    return /^(0x)?[a-fA-F0-9]{64}$/.test(h);
  }
  return true;
}

/**
 * Placeholder for explorer integration.
 * Returns null when no API key / not configured — admin must verify manually.
 */
export async function tryFetchTxPresence(_params: {
  asset: CryptoAsset | string;
  txHash: string;
}): Promise<{ found: boolean; note: string } | null> {
  if (!process.env.CRYPTO_EXPLORER_API_KEY) {
    return null;
  }
  // Wire Blockchair / TronGrid / Etherscan here later.
  return {
    found: false,
    note: "Explorer integration not fully configured",
  };
}
