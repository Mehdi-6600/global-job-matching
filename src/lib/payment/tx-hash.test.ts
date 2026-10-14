import { describe, expect, it } from "vitest";
import {
  canonicalTxHash,
  hexDigestOf,
  legacyHashWhere,
} from "@/lib/payment/tx-hash";
import { isPlausibleTxHash } from "@/lib/payment/verify-crypto";

const DIGEST = "abcdef0123456789".repeat(4); // 64 hex characters
const DIGEST_UP = DIGEST.toUpperCase();

describe("canonicalTxHash: EVM assets (ETH, BNB, USDC)", () => {
  it("maps every spelling of one transaction to the same value", () => {
    const variants = [
      `0x${DIGEST}`,
      `0x${DIGEST_UP}`,
      DIGEST,
      DIGEST_UP,
      `  0x${DIGEST_UP}\n`,
      `\t${DIGEST}  `,
    ];
    for (const asset of ["ETH", "BNB", "USDC", "eth"]) {
      const canon = new Set(variants.map((v) => canonicalTxHash(asset, v)));
      expect([...canon]).toEqual([`0x${DIGEST}`]);
    }
  });

  it("keeps the canonical value plausible for the existing format check", () => {
    expect(isPlausibleTxHash("ETH", canonicalTxHash("ETH", DIGEST_UP))).toBe(true);
  });
});

describe("canonicalTxHash: Bitcoin and Dogecoin (no prefix)", () => {
  it("lower-cases the digest and adds no prefix", () => {
    expect(canonicalTxHash("BTC", DIGEST_UP)).toBe(DIGEST);
    expect(canonicalTxHash("DOGE", `  ${DIGEST_UP} `)).toBe(DIGEST);
  });

  it("does not turn a prefixed value into a valid BTC hash", () => {
    // BTC/DOGE reject a 0x prefix. Canonicalisation must not remove it, or a
    // malformed submission would become acceptable.
    const canon = canonicalTxHash("BTC", `0x${DIGEST_UP}`);
    expect(canon).toBe(`0x${DIGEST}`);
    expect(isPlausibleTxHash("BTC", canon)).toBe(false);
  });
});

describe("canonicalTxHash: USDT on Tron (prefix presence kept)", () => {
  it("lower-cases a bare Tron digest", () => {
    expect(canonicalTxHash("USDT", DIGEST_UP)).toBe(DIGEST);
  });

  it("keeps a 0x prefix as given rather than inventing one", () => {
    expect(canonicalTxHash("USDT", `0x${DIGEST_UP}`)).toBe(`0x${DIGEST}`);
  });
});

describe("canonicalTxHash: TON (base64url, case-sensitive)", () => {
  const TON_A = "AbCdEf_ghiJKL-mnop1234567890";
  const TON_B = "abcdef_GHIJKL-MNOP1234567890";

  it("only trims, never case-folds", () => {
    expect(canonicalTxHash("TON", `  ${TON_A}  `)).toBe(TON_A);
  });

  it("treats two TON ids that differ only in case as different transactions", () => {
    expect(canonicalTxHash("TON", TON_A)).not.toBe(canonicalTxHash("TON", TON_A.toLowerCase()));
    expect(canonicalTxHash("TON", TON_A)).not.toBe(canonicalTxHash("TON", TON_B));
  });

  it("has no hex digest, so no legacy case-insensitive lookup is made", () => {
    expect(hexDigestOf("TON", TON_A)).toBeNull();
    expect(legacyHashWhere(hexDigestOf("TON", TON_A))).toBeNull();
  });
});

describe("canonicalTxHash: inputs that are not valid hashes stay invalid", () => {
  it("leaves malformed hex unchanged (only trimmed)", () => {
    expect(canonicalTxHash("ETH", "  0xZZZZ  ")).toBe("0xZZZZ");
    expect(canonicalTxHash("ETH", `0x${DIGEST}00`)).toBe(`0x${DIGEST}00`);
    expect(isPlausibleTxHash("ETH", canonicalTxHash("ETH", `0x${DIGEST}00`))).toBe(false);
  });

  it("does not canonicalise an unknown asset", () => {
    expect(canonicalTxHash("XRP", `  ${DIGEST_UP}  `)).toBe(DIGEST_UP);
  });

  it("keeps an inner space, which the format check then rejects", () => {
    const withSpace = `0x${DIGEST.slice(0, 10)} ${DIGEST.slice(10)}`;
    expect(canonicalTxHash("ETH", withSpace)).toBe(withSpace);
    expect(isPlausibleTxHash("ETH", canonicalTxHash("ETH", withSpace))).toBe(false);
  });
});

describe("hexDigestOf and legacyHashWhere", () => {
  it("returns the lower-case digest without prefix for any hex spelling", () => {
    expect(hexDigestOf("ETH", `0x${DIGEST_UP}`)).toBe(DIGEST);
    expect(hexDigestOf("BTC", DIGEST_UP)).toBe(DIGEST);
  });

  it("matches the digest with and without prefix, in any letter case", () => {
    expect(legacyHashWhere(DIGEST)).toEqual({
      OR: [
        { txHash: { equals: DIGEST, mode: "insensitive" } },
        { txHash: { equals: `0x${DIGEST}`, mode: "insensitive" } },
      ],
    });
  });
});
