/**
 * USD spot rates for crypto payment quotes.
 * Fail-closed: never invent rates; reject if source fails or rate is invalid.
 */

export type RateQuote = {
  asset: string;
  rateUsd: number;
  source: string;
  fetchedAt: Date;
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  USDT: "tether",
  USDC: "usd-coin",
  DOGE: "dogecoin",
};

const cache = new Map<string, { quote: RateQuote; expiresAt: number }>();
const CACHE_MS = 60_000;
const MAX_RATE_AGE_MS = 5 * 60_000;

export function isRateFresh(fetchedAt: Date, now = new Date()): boolean {
  return now.getTime() - fetchedAt.getTime() <= MAX_RATE_AGE_MS;
}

export async function fetchUsdRate(asset: string): Promise<RateQuote> {
  const a = asset.toUpperCase();
  const id = COINGECKO_IDS[a];
  if (!id) {
    throw Object.assign(new Error(`No rate source for ${a}`), {
      code: "RATE_UNSUPPORTED",
    });
  }

  const cached = cache.get(a);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw Object.assign(new Error(`Rate API HTTP ${res.status}`), {
        code: "RATE_FETCH_FAILED",
      });
    }
    const json = (await res.json()) as Record<string, { usd?: number }>;
    const rate = json[id]?.usd;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      throw Object.assign(new Error("Invalid rate value"), {
        code: "RATE_INVALID",
      });
    }

    const quote: RateQuote = {
      asset: a,
      rateUsd: rate,
      source: "coingecko",
      fetchedAt: new Date(),
    };
    cache.set(a, { quote, expiresAt: Date.now() + CACHE_MS });
    return quote;
  } finally {
    clearTimeout(t);
  }
}

/** expected crypto amount for a USD plan price */
export function expectedCryptoFromUsd(
  amountUsd: number,
  rateUsd: number
): number {
  if (!(amountUsd > 0) || !(rateUsd > 0)) {
    throw Object.assign(new Error("Invalid amount or rate"), {
      code: "RATE_INVALID",
    });
  }
  // 8 decimal places for most assets
  const raw = amountUsd / rateUsd;
  return Math.ceil(raw * 1e8) / 1e8;
}
