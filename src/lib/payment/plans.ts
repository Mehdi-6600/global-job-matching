/**
 * Single source of truth for plans + crypto wallets.
 * Wallet addresses come from environment variables (not hardcoded secrets,
 * but avoids redeploy mistakes and keeps prod/test separate).
 */

export const PLAN_IDS = ["free", "pro", "business", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  pro: 9,
  business: 29,
  enterprise: 99,
};

/** Monthly price, or yearly = 10× monthly (~2 months free) */
export function getPlanAmount(
  planId: PlanId,
  billing: "monthly" | "yearly" = "monthly"
): number {
  const monthly = PLAN_PRICES[planId];
  if (billing === "yearly") return monthly * 10;
  return monthly;
}

export const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: PLAN_PRICES.free,
    description: "Get started and explore the job board",
    features: [
      "Browse jobs",
      "Apply to jobs",
      "Save jobs",
      "Basic profile",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: PLAN_PRICES.pro,
    description: "For active job seekers",
    features: [
      "Everything in Free",
      "Priority applications",
      "AI resume tools",
      "Career risk insights",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: PLAN_PRICES.business,
    description: "For growing teams",
    features: [
      "Post more jobs",
      "Applicant management",
      "Company profile",
      "Email outreach tools",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: PLAN_PRICES.enterprise,
    description: "For larger hiring needs",
    features: [
      "Everything in Business",
      "Priority support",
      "Advanced analytics",
      "Custom limits",
    ],
  },
] as const;

const WALLET_DEFS = [
  { type: "BTC", name: "Bitcoin", env: "CRYPTO_BTC_ADDRESS" },
  { type: "ETH", name: "Ethereum", env: "CRYPTO_ETH_ADDRESS" },
  { type: "BNB", name: "BNB (BSC)", env: "CRYPTO_BNB_ADDRESS" },
  { type: "USDT", name: "USDT (TRC20)", env: "CRYPTO_USDT_ADDRESS" },
  { type: "USDC", name: "USDC", env: "CRYPTO_USDC_ADDRESS" },
  { type: "DOGE", name: "Dogecoin", env: "CRYPTO_DOGE_ADDRESS" },
  { type: "TON", name: "TON", env: "CRYPTO_TON_ADDRESS" },
] as const;

export type CryptoType = (typeof WALLET_DEFS)[number]["type"];

export type CryptoWallet = {
  type: CryptoType;
  name: string;
  address: string;
};

function readEnvAddress(key: string): string | null {
  const raw = process.env[key];
  if (!raw) return null;
  const address = raw.trim();
  if (address.length < 8) return null;
  return address;
}

/**
 * Only wallets with a non-empty env address are exposed.
 * Safe to call from Server Components / API routes.
 */
export function getCryptoWallets(): CryptoWallet[] {
  const list: CryptoWallet[] = [];
  for (const def of WALLET_DEFS) {
    const address = readEnvAddress(def.env);
    if (!address) continue;
    list.push({
      type: def.type,
      name: def.name,
      address,
    });
  }
  return list;
}

export function getCryptoWallet(
  type: string
): CryptoWallet | null {
  const t = type.toUpperCase();
  return getCryptoWallets().find((w) => w.type === t) || null;
}

export function isSupportedCryptoType(type: string): boolean {
  return getCryptoWallet(type) !== null;
}

/**
 * @deprecated Prefer getCryptoWallets() so empty env keys are hidden.
 * Kept as a name some UI may still import — resolves at runtime from env.
 */
export const CRYPTO_WALLETS = {
  get list() {
    return getCryptoWallets();
  },
};
