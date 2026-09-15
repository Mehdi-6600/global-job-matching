/**
 * Minimum confirmations per asset (configurable via env overrides).
 * Used by future amount/recipient checks; presence verifier can surface counts.
 */

export type ConfirmableAsset =
  | "BTC"
  | "DOGE"
  | "ETH"
  | "BNB"
  | "USDC"
  | "USDT";

const DEFAULTS: Record<ConfirmableAsset, number> = {
  BTC: 2,
  DOGE: 6,
  ETH: 12,
  BNB: 15,
  USDC: 12,
  USDT: 19,
};

function envInt(key: string): number | null {
  const raw = process.env[key]?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function minConfirmations(asset: string): number {
  const a = asset.toUpperCase() as ConfirmableAsset;
  const fromEnv =
    envInt(`CRYPTO_MIN_CONF_${a}`) ??
    envInt("CRYPTO_MIN_CONFIRMATIONS");
  if (fromEnv != null) return fromEnv;
  return DEFAULTS[a] ?? 12;
}
