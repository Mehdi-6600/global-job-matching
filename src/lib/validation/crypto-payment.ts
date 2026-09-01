import { z } from "zod";

export const cryptoPaymentSchema = z
  .object({
    planId: z.enum(["pro", "business", "enterprise"]),
    txHash: z.string().trim().min(10).max(200),
    cryptoType: z.enum([
      "BTC",
      "ETH",
      "BNB",
      "USDT",
      "DOGE",
      "TON",
      "USDC",
    ]),
    amount: z.number().optional(),
    currency: z.string().trim().max(10).optional(),
  })
  .strict();

export type CryptoPaymentInput = z.infer<typeof cryptoPaymentSchema>;
