/**
 * Single source of truth for plans + crypto wallets.
 * Feature copy MUST match src/lib/plan-limits.ts quotas.
 * TON is listed only for future use — never returned by getCryptoWallets.
 */

export const PLAN_IDS = ["free", "pro", "business", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  pro: 9,
  business: 29,
  enterprise: 99,
};

// One-time featured job boost (crypto-only, impulse purchase for employers)
export const FEATURED_JOB_PRICES = {
  weekly: 19, // 7 days
  monthly: 39, // 30 days
} as const;
export type FeaturedDuration = keyof typeof FEATURED_JOB_PRICES;

export const ALL_PLAN_IDS = [...PLAN_IDS, "featured_weekly", "featured_monthly"] as const;
export type AllPlanId = PlanId | "featured_weekly" | "featured_monthly";

export function isFeaturedPlan(planId: string): boolean {
  return planId === "featured_weekly" || planId === "featured_monthly";
}

export function getFeaturedDuration(planId: string): FeaturedDuration | null {
  if (planId === "featured_weekly") return "weekly";
  if (planId === "featured_monthly") return "monthly";
  return null;
}

/** Monthly price, or yearly = 10× monthly (~2 months free) */
export function getPlanAmount(
  planId: string,
  billing: "monthly" | "yearly" = "monthly"
): number {
  if (planId === "featured_weekly") return FEATURED_JOB_PRICES.weekly;
  if (planId === "featured_monthly") return FEATURED_JOB_PRICES.monthly;
  const monthly = PLAN_PRICES[planId as PlanId];
  if (monthly === undefined) return 0;
  if (billing === "yearly") return monthly * 10;
  return monthly;
}

export function getFeaturedAmount(duration: FeaturedDuration): number {
  return FEATURED_JOB_PRICES[duration];
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

/** Sorted for crypto-only starter sites: cheapest fees first */
const WALLET_DEFS = [
  { type: "USDT", name: "USDT (TRC20)", env: "CRYPTO_USDT_ADDRESS", fee: "~$1", chain: "TRON", recommended: true },
  { type: "USDC", name: "USDC", env: "CRYPTO_USDC_ADDRESS", fee: "~$1", chain: "BSC/ETH" },
  { type: "BNB", name: "BNB (BSC)", env: "CRYPTO_BNB_ADDRESS", fee: "~$0.2", chain: "BSC" },
  { type: "BTC", name: "Bitcoin", env: "CRYPTO_BTC_ADDRESS", fee: "~$5-15", chain: "Bitcoin" },
  { type: "ETH", name: "Ethereum", env: "CRYPTO_ETH_ADDRESS", fee: "~$2-10", chain: "Ethereum" },
  { type: "DOGE", name: "Dogecoin", env: "CRYPTO_DOGE_ADDRESS", fee: "~$0.5", chain: "Dogecoin" },
] as const;

export type CryptoType = (typeof WALLET_DEFS)[number]["type"];

export type CryptoWallet = {
  type: CryptoType;
  name: string;
  address: string;
  fee: string;
  chain: string;
  recommended?: boolean;
};

export const WALLET_FEE_INFO: Record<string, { fee: string; note: string }> = {
  USDT: { fee: "~$1", note: "Cheapest • Recommended for $9-$39 payments" },
  USDC: { fee: "~$1", note: "Low fee • Stablecoin" },
  BNB: { fee: "~$0.2", note: "Cheapest • BSC network" },
  DOGE: { fee: "~$0.5", note: "Low fee" },
  BTC: { fee: "~$5-15", note: "High fee • Not recommended for small payments" },
  ETH: { fee: "~$2-10", note: "Variable fee • Use USDT on TRON instead" },
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
      list.push({ type: def.type, name: def.name, address, fee: def.fee, chain: def.chain, recommended: (def as any).recommended });
    }
  }
  return list;
}

export function getCryptoWallet(type: string): CryptoWallet | null {
  const upper = type.toUpperCase();
  if (upper === "TON") return null;
  const wallets = getCryptoWallets();
  return wallets.find((w) => w.type === upper) || null;
}

/** @deprecated use getCryptoWallets() */
export const CRYPTO_WALLETS = {
  get list() {
    return getCryptoWallets();
  },
};
