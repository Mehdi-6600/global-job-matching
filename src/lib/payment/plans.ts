/**
 * Single source of truth for plans + crypto wallets.
 * Feature copy MUST match src/lib/plan-limits.ts quotas.
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
      "Up to 20 applications / month",
      "Up to 20 saved jobs",
      "Up to 3 job alerts",
      "2 AI generations / month",
      "1 active employer job post",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: PLAN_PRICES.pro,
    description: "For active job seekers",
    features: [
      "Up to 500 applications / month",
      "Up to 500 saved jobs",
      "Up to 20 job alerts",
      "30 AI generations / month",
      "Career risk + AI resume tools",
    ],
  },
  {
    id: "business" as const,
    name: "Business",
    price: PLAN_PRICES.business,
    description: "For growing teams",
    features: [
      "Up to 10 active job posts",
      "Applicant management",
      "Company profile",
      "50 AI generations / month",
      "Email outreach tools",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: PLAN_PRICES.enterprise,
    description: "For larger hiring needs",
    features: [
      "Up to 50 active job posts",
      "Everything in Business",
      "200 AI generations / month",
      "Advanced analytics",
      "Priority support",
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
  const raw = process.env[key]?.trim();
  if (!raw || raw.length < 8) return null;
  return raw;
}

export function getCryptoWallets(): CryptoWallet[] {
  const list: CryptoWallet[] = [];
  for (const def of WALLET_DEFS) {
    const address = readEnvAddress(def.env);
    if (address) {
      list.push({ type: def.type, name: def.name, address });
    }
  }
  return list;
}

export function getCryptoWallet(type: string): CryptoWallet | null {
  const wallets = getCryptoWallets();
  return wallets.find((w) => w.type === type) || null;
}

/** @deprecated use getCryptoWallets() */
export const CRYPTO_WALLETS = {
  get list() {
    return getCryptoWallets();
  },
};
