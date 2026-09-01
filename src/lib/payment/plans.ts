/**
 * Single source of truth for plans + crypto wallets.
 * Used by pricing UI and payment APIs.
 */

export const PLAN_IDS = ["free", "pro", "business", "enterprise"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  pro: 9,
  business: 29,
  enterprise: 99,
};

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
];

/** Display wallets — verify these are yours before launch */
export const CRYPTO_WALLETS = [
  {
    type: "BTC",
    name: "Bitcoin",
    address: "bc1qd8pz8kh8ghh5dzlz4y5t8fgzyhe6y8y67j33m3",
  },
  {
    type: "ETH",
    name: "Ethereum",
    address: "0x0CAF488206AC367C37Cd6a56C71d9b1BC9D7Be5c",
  },
  {
    type: "BNB",
    name: "BNB (BSC)",
    address: "bnb1da7gyaynhqwz3yf6aq5u2x4vy2k6c5futd84z5",
  },
  {
    type: "USDT",
    name: "USDT (TRC20)",
    address: "TU3QBM4VnypRobQHh1w1n7QXdFQ8yPqRex",
  },
  {
    type: "USDC",
    name: "USDC",
    address: "0x0CAF488206AC367C37Cd6a56C71d9b1BC9D7Be5c",
  },
  {
    type: "DOGE",
    name: "Dogecoin",
    address: "DJyuoTooAZYdC8NPpuAbUBKhjmeoWSBnFS",
  },
  {
    type: "TON",
    name: "TON",
    address: "UQDol0GBbL3km5-9F4rEQO8UQnUo6XJbsG_LwBcG_6cPs1oh",
  },
] as const;

export type CryptoType = (typeof CRYPTO_WALLETS)[number]["type"];
