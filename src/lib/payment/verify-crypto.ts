/**
 * On-chain verification helpers.
 * - No process.env mutation
 * - Optional expectedRecipient / expectedCryptoAmount checks
 * - Fail-closed when explorer/RPC unavailable
 *
 * Design principles:
 * - Never trust client-supplied amounts or recipients.
 * - A "confirmed" status requires: correct recipient, sufficient amount, mined success.
 * - Any explorer/RPC failure → verification_unavailable (fail-closed).
 */

import { minConfirmations } from "@/lib/payment/confirmations";

export type CryptoAsset =
  | "BTC"
  | "ETH"
  | "USDT"
  | "USDC"
  | "BNB"
  | "DOGE"
  | "TON";

export type TxVerificationStatus =
  | "confirmed"
  | "pending"
  | "failed"
  | "not_found"
  | "verification_unavailable";

export type TxVerificationResult = {
  status: TxVerificationStatus;
  found: boolean;
  note: string;
  source?: string;
  confirmations?: number;
  receivedAmount?: number;
  recipientMatched?: boolean;
  amountMatched?: boolean;
};

/** Tolerance for fee/rounding: accept 2% under, 4% over. */
const AMOUNT_TOLERANCE_UNDER = 0.02;
const AMOUNT_TOLERANCE_OVER = 0.04;

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const DEFAULT_FETCH_TIMEOUT_MS = 12_000;

const TRON_USDT_DECIMALS = 6;
const EVM_USDT_DECIMALS = 6;
const EVM_USDC_DECIMALS = 6;
const EVM_NATIVE_DECIMALS = 18;
const BTC_DECIMALS = 8;
const DOGE_DECIMALS = 8;

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

/**
 * Cheap structural check for a tx hash before hitting any network.
 * Not a proof of validity — just filters obvious garbage.
 *
 * Fail-closed: unknown assets are rejected, so verifyTxOnChain() cannot
 * accidentally treat an unsupported asset as plausible.
 */
export function isPlausibleTxHash(asset: string, hash: string): boolean {
  const h = hash.trim();
  if (h.length < 10 || h.length > 200) return false;
  if (!/^[a-zA-Z0-9:_-]+$/.test(h)) return false;

  const a = asset.toUpperCase();
  switch (a) {
    case "BTC":
    case "DOGE":
      return /^[a-fA-F0-9]{64}$/.test(h);
    case "ETH":
    case "BNB":
      return /^(0x)?[a-fA-F0-9]{64}$/.test(h);
    case "USDT":
      // Tron (hex) or EVM-style
      return /^[a-fA-F0-9]{64}$/.test(h) || /^(0x)?[a-fA-F0-9]{64}$/.test(h);
    case "USDC":
      return /^(0x)?[a-fA-F0-9]{64}$/.test(h);
    case "TON":
      return h.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(h);
    default:
      // Fail-closed: unknown asset → reject (do not pretend valid).
      return false;
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function normalizeEvmTxHash(hash: string): string {
  const h = hash.trim();
  return h.startsWith("0x") ? h : `0x${h}`;
}

function addrEq(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Trim and lowercase a 20-byte address extracted from a padded topic. */
function topicToAddress(topic: string): string {
  return `0x${topic.slice(-40).toLowerCase()}`;
}

function amountCloseEnough(
  received: number,
  expected: number,
  under = AMOUNT_TOLERANCE_UNDER,
  over = AMOUNT_TOLERANCE_OVER
): boolean {
  if (!(expected > 0) || !(received > 0)) return false;
  const ratio = received / expected;
  return ratio >= 1 - under && ratio <= 1 + over;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_FETCH_TIMEOUT_MS, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function rpcCall<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
  id = 1
): Promise<{ result?: T; error?: { message?: string } }> {
  const res = await fetchWithTimeout(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  return (await res.json()) as { result?: T; error?: { message?: string } };
}

// ---------------------------------------------------------------------------
// BTC
// ---------------------------------------------------------------------------

type BlockstreamTx = {
  status?: { confirmed?: boolean; block_height?: number };
  vout?: Array<{ value?: number; scriptpubkey_address?: string }>;
};

async function verifyBtc(
  txHash: string,
  expectedRecipient?: string,
  expectedAmount?: number
): Promise<TxVerificationResult> {
  try {
    const res = await fetchWithTimeout(
      `https://blockstream.info/api/tx/${encodeURIComponent(txHash)}`
    );
    if (res.status === 404) {
      return {
        status: "not_found",
        found: false,
        note: "Transaction not found on Bitcoin mainnet",
        source: "blockstream",
      };
    }
    if (!res.ok) {
      return {
        status: "verification_unavailable",
        found: false,
        note: `Blockstream HTTP ${res.status}`,
        source: "blockstream",
      };
    }

    const data = (await res.json()) as BlockstreamTx;
    const confirmed = Boolean(data?.status?.confirmed);
    const need = minConfirmations("BTC");

    let confirmations = 0;
    if (confirmed && data.status?.block_height) {
      try {
        const tipRes = await fetchWithTimeout(
          "https://blockstream.info/api/blocks/tip/height"
        );
        if (tipRes.ok) {
          const tip = Number(await tipRes.text());
          if (Number.isFinite(tip) && tip >= data.status.block_height) {
            confirmations = tip - data.status.block_height + 1;
          }
        }
      } catch {
        /* fall back to 0 confirmations → will be treated as pending */
      }
    }

    let receivedAmount = 0;
    let recipientMatched: boolean | undefined;
    if (expectedRecipient) {
      recipientMatched = false;
      for (const o of data.vout ?? []) {
        if (o.scriptpubkey_address && addrEq(o.scriptpubkey_address, expectedRecipient)) {
          recipientMatched = true;
          receivedAmount += Number(o.value || 0) / 10 ** BTC_DECIMALS;
        }
      }
    }

    const amountMatched =
      expectedAmount != null && receivedAmount > 0
        ? amountCloseEnough(receivedAmount, expectedAmount)
        : expectedAmount != null
          ? false
          : undefined;

    if (recipientMatched === false) {
      return {
        status: "failed",
        found: true,
        note: "No output pays expected recipient",
        source: "blockstream",
        recipientMatched: false,
        amountMatched,
        receivedAmount: receivedAmount || undefined,
        confirmations,
      };
    }
    if (amountMatched === false) {
      return {
        status: "failed",
        found: true,
        note: `Amount mismatch: got ${receivedAmount}, expected ~${expectedAmount}`,
        source: "blockstream",
        recipientMatched,
        amountMatched: false,
        receivedAmount,
        confirmations,
      };
    }
    if (confirmed && confirmations < need) {
      return {
        status: "pending",
        found: true,
        note: `Need ${need} confirmations (have ${confirmations})`,
        source: "blockstream",
        confirmations,
        recipientMatched,
        amountMatched,
        receivedAmount: receivedAmount || undefined,
      };
    }

    return {
      status: confirmed ? "confirmed" : "pending",
      found: true,
      note: confirmed
        ? `Confirmed on Bitcoin mainnet (${confirmations} confs)`
        : "Seen but unconfirmed",
      source: "blockstream",
      confirmations,
      recipientMatched,
      amountMatched,
      receivedAmount: receivedAmount || undefined,
    };
  } catch (err) {
    return {
      status: "verification_unavailable",
      found: false,
      note: err instanceof Error ? err.message : "BTC explorer error",
      source: "blockstream",
    };
  }
}

// ---------------------------------------------------------------------------
// DOGE
// ---------------------------------------------------------------------------

async function verifyDoge(
  txHash: string,
  expectedRecipient?: string,
  expectedAmount?: number
): Promise<TxVerificationResult> {
  try {
    const res = await fetchWithTimeout(
      `https://api.blockchair.com/dogecoin/dashboards/transaction/${encodeURIComponent(txHash)}`
    );
    if (res.status === 404) {
      return {
        status: "not_found",
        found: false,
        note: "Transaction not found on Dogecoin",
        source: "blockchair",
      };
    }
    if (!res.ok) {
      return {
        status: "verification_unavailable",
        found: false,
        note: `Blockchair HTTP ${res.status}`,
        source: "blockchair",
      };
    }

    const json = (await res.json()) as {
      data?: Record<
        string,
        {
          transaction?: { block_id?: number; output_total?: number };
          outputs?: Array<{ recipient?: string; value?: number }>;
        }
      >;
    };
    const entry = json.data?.[txHash];
    if (!entry) {
      return {
        status: "not_found",
        found: false,
        note: "No data for tx",
        source: "blockchair",
      };
    }

    const blockId = entry.transaction?.block_id ?? 0;
    const confirmed = blockId > 0;
    const outputs = entry.outputs ?? [];

    let receivedAmount = 0;
    let recipientMatched: boolean | undefined;
    if (expectedRecipient) {
      recipientMatched = false;
      for (const o of outputs) {
        const addr = (o.recipient || "").trim();
        if (addr && addrEq(addr, expectedRecipient)) {
          recipientMatched = true;
          receivedAmount += Number(o.value || 0) / 10 ** DOGE_DECIMALS;
        }
      }
    } else if (outputs.length) {
      receivedAmount = outputs.reduce(
        (s, o) => s + Number(o.value || 0) / 10 ** DOGE_DECIMALS,
        0
      );
    }

    const amountMatched =
      expectedAmount != null && receivedAmount > 0
        ? amountCloseEnough(receivedAmount, expectedAmount)
        : expectedAmount != null
          ? false
          : undefined;

    if (recipientMatched === false) {
      return {
        status: "failed",
        found: true,
        note: "Recipient address does not match expected wallet",
        source: "blockchair",
        recipientMatched: false,
        amountMatched,
        receivedAmount: receivedAmount || undefined,
      };
    }
    if (amountMatched === false) {
      return {
        status: "failed",
        found: true,
        note: `Amount mismatch: got ${receivedAmount}, expected ~${expectedAmount}`,
        source: "blockchair",
        recipientMatched: true,
        amountMatched: false,
        receivedAmount,
      };
    }

    return {
      status: confirmed ? "confirmed" : "pending",
      found: true,
      note: confirmed ? "Confirmed on Dogecoin" : "Unconfirmed on Dogecoin",
      source: "blockchair",
      recipientMatched,
      amountMatched,
      receivedAmount: receivedAmount || undefined,
    };
  } catch (err) {
    return {
      status: "verification_unavailable",
      found: false,
      note: err instanceof Error ? err.message : "DOGE explorer error",
      source: "blockchair",
    };
  }
}

// ---------------------------------------------------------------------------
// EVM (ETH / BNB / USDC)
// ---------------------------------------------------------------------------

type EvmReceipt = {
  status?: string;
  to?: string | null;
  logs?: Array<{ address?: string; topics?: string[]; data?: string }>;
};

async function verifyEvm(
  txHash: string,
  label: string,
  rpcUrl: string,
  expectedRecipient?: string,
  expectedAmount?: number,
  assetHint?: string
): Promise<TxVerificationResult> {
  if (!rpcUrl) {
    return {
      status: "verification_unavailable",
      found: false,
      note: `Set RPC URL for ${label}`,
      source: "evm_rpc",
    };
  }

  const hash = normalizeEvmTxHash(txHash);
  try {
    const receiptResp = await rpcCall<EvmReceipt | null>(
      rpcUrl,
      "eth_getTransactionReceipt",
      [hash]
    );

    if (receiptResp.error) {
      return {
        status: "verification_unavailable",
        found: false,
        note: receiptResp.error.message || "RPC error",
        source: "evm_rpc",
      };
    }

    if (receiptResp.result == null) {
      const txResp = await rpcCall<unknown>(rpcUrl, "eth_getTransactionByHash", [hash], 2);
      if (txResp.result) {
        return {
          status: "pending",
          found: true,
          note: `Pending on ${label}`,
          source: "evm_rpc",
        };
      }
      return {
        status: "not_found",
        found: false,
        note: `Not found on ${label}`,
        source: "evm_rpc",
      };
    }

    if (receiptResp.result.status === "0x0") {
      return {
        status: "failed",
        found: true,
        note: `Transaction reverted on ${label}`,
        source: "evm_rpc",
      };
    }

    const receipt = receiptResp.result;
    const isTokenish = assetHint === "USDC" || assetHint === "USDT";

    let tokenTransferTo: string | undefined;
    let tokenRawValue: bigint | undefined;
    for (const log of receipt.logs ?? []) {
      const topics = log.topics ?? [];
      if (topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
      if (topics.length >= 3) {
        tokenTransferTo = topicToAddress(topics[2]);
      }
      if (log.data?.startsWith("0x")) {
        try {
          tokenRawValue = BigInt(log.data);
        } catch {
          /* ignore */
        }
      }
      break;
    }

    const effectiveToken = isTokenish || Boolean(tokenTransferTo);

    let recipientMatched: boolean | undefined;
    if (expectedRecipient) {
      const exp = expectedRecipient.trim();
      if (effectiveToken && tokenTransferTo) {
        recipientMatched = addrEq(tokenTransferTo, exp);
      } else if (receipt.to) {
        recipientMatched = addrEq(receipt.to, exp);
      } else {
        recipientMatched = false;
      }
    }

    let receivedAmount: number | undefined;
    if (expectedAmount != null) {
      if (effectiveToken && tokenRawValue != null) {
        const decimals = isTokenish ? EVM_USDT_DECIMALS : 18;
        receivedAmount = Number(tokenRawValue) / 10 ** decimals;
      } else if (!effectiveToken) {
        const txResp = await rpcCall<{ value?: string }>(
          rpcUrl,
          "eth_getTransactionByHash",
          [hash],
          3
        );
        const hexVal = txResp.result?.value;
        if (hexVal) {
          receivedAmount = Number(BigInt(hexVal)) / 10 ** EVM_NATIVE_DECIMALS;
        }
      }
    }

    const amountMatched =
      expectedAmount != null
        ? receivedAmount != null && amountCloseEnough(receivedAmount, expectedAmount)
        : undefined;

    if (recipientMatched === false) {
      return {
        status: "failed",
        found: true,
        note: "Recipient does not match expected wallet",
        source: "evm_rpc",
        recipientMatched: false,
        amountMatched,
        receivedAmount,
      };
    }
    if (expectedAmount != null && amountMatched !== true) {
      return {
        status: "failed",
        found: true,
        note: `Amount mismatch or unavailable: got ${receivedAmount ?? "n/a"}, expected ~${expectedAmount}`,
        source: "evm_rpc",
        recipientMatched,
        amountMatched: false,
        receivedAmount,
      };
    }

    return {
      status: "confirmed",
      found: true,
      note: `Receipt status success on ${label}`,
      source: "evm_rpc",
      recipientMatched,
      amountMatched,
      receivedAmount,
    };
  } catch (err) {
    return {
      status: "verification_unavailable",
      found: false,
      note: err instanceof Error ? err.message : "EVM RPC error",
      source: "evm_rpc",
    };
  }
}

// ---------------------------------------------------------------------------
// TRON (USDT-TRC20)
// ---------------------------------------------------------------------------

type TronGridTx = {
  ret?: Array<{ contractRet?: string }>;
  raw_data?: {
    contract?: Array<{
      parameter?: {
        value?: {
          to_address?: string;
          amount?: number;
          data?: string;
          owner_address?: string;
        };
      };
    }>;
  };
};

async function verifyTronUsdt(
  txHash: string,
  expectedRecipient?: string,
  expectedAmount?: number
): Promise<TxVerificationResult> {
  const key = process.env.TRONGRID_API_KEY?.trim() || "";
  const base =
    process.env.TRONGRID_API_URL?.trim() || "https://api.trongrid.io";

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (key) headers["TRON-PRO-API-KEY"] = key;

    const res = await fetchWithTimeout(
      `${base.replace(/\/$/, "")}/v1/transactions/${encodeURIComponent(txHash)}`,
      { headers }
    );
    if (res.status === 404) {
      return {
        status: "not_found",
        found: false,
        note: "Not found on TRON",
        source: "trongrid",
      };
    }
    if (!res.ok) {
      return {
        status: "verification_unavailable",
        found: false,
        note: `TronGrid HTTP ${res.status}`,
        source: "trongrid",
      };
    }

    const json = (await res.json()) as { data?: TronGridTx[] };
    const row = json.data?.[0];
    if (!row) {
      return {
        status: "not_found",
        found: false,
        note: "Empty TronGrid data",
        source: "trongrid",
      };
    }

    const ret = row.ret?.[0]?.contractRet;
    if (ret && ret !== "SUCCESS") {
      return {
        status: "failed",
        found: true,
        note: `TRON contractRet=${ret}`,
        source: "trongrid",
      };
    }

    let recipientMatched: boolean | undefined;
    let receivedAmount: number | undefined;

    for (const c of row.raw_data?.contract ?? []) {
      const val = c.parameter?.value;
      if (!val) continue;

      const data = val.data;
      if (data && data.length >= 8 + 64 + 64) {
        try {
          const toWord = data.slice(8, 8 + 64);
          const amountWord = data.slice(8 + 64, 8 + 128);
          const toHex = "41" + toWord.slice(-40);
          const recipientHex = `0x${toHex.toLowerCase()}`;
          const rawAmount = BigInt(`0x${amountWord}`);
          receivedAmount = Number(rawAmount) / 10 ** TRON_USDT_DECIMALS;

          if (expectedRecipient) {
            const exp = expectedRecipient.trim().toLowerCase();
            recipientMatched =
              exp === recipientHex || exp === toHex.toLowerCase();
          }
        } catch {
          /* ignore malformed data */
        }
      } else if (val.to_address) {
        const toAddr = val.to_address.trim();
        if (expectedRecipient) {
          recipientMatched = addrEq(toAddr, expectedRecipient);
        }
        if (typeof val.amount === "number" && Number.isFinite(val.amount)) {
          receivedAmount = val.amount / 1e6;
        }
      }
    }

    const amountMatched =
      expectedAmount != null
        ? receivedAmount != null && amountCloseEnough(receivedAmount, expectedAmount)
        : undefined;

    if (expectedRecipient && recipientMatched === false) {
      return {
        status: "failed",
        found: true,
        note: "TRON recipient does not match expected wallet",
        source: "trongrid",
        recipientMatched: false,
        amountMatched,
        receivedAmount,
      };
    }
    if (expectedAmount != null && amountMatched !== true) {
      return {
        status: "failed",
        found: true,
        note: `TRON amount mismatch or unavailable: got ${receivedAmount ?? "n/a"}, expected ~${expectedAmount}`,
        source: "trongrid",
        recipientMatched,
        amountMatched: false,
        receivedAmount,
      };
    }

    return {
      status: "confirmed",
      found: true,
      note: "Found on TRON (TronGrid)",
      source: "trongrid",
      recipientMatched,
      amountMatched,
      receivedAmount,
    };
  } catch (err) {
    return {
      status: "verification_unavailable",
      found: false,
      note: err instanceof Error ? err.message : "TronGrid error",
      source: "trongrid",
    };
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export async function verifyTxOnChain(params: {
  asset: CryptoAsset | string;
  txHash: string;
  expectedRecipient?: string | null;
  expectedCryptoAmount?: number | null;
}): Promise<TxVerificationResult> {
  const asset = String(params.asset || "").toUpperCase();
  const txHash = params.txHash.trim();
  const expectedRecipient = params.expectedRecipient?.trim() || undefined;
  const expectedAmount =
    params.expectedCryptoAmount != null &&
    Number.isFinite(Number(params.expectedCryptoAmount))
      ? Number(params.expectedCryptoAmount)
      : undefined;

  if (!isPlausibleTxHash(asset, txHash)) {
    return {
      status: "not_found",
      found: false,
      note: "Tx hash format invalid for asset",
    };
  }

  switch (asset) {
    case "BTC":
      return verifyBtc(txHash, expectedRecipient, expectedAmount);

    case "DOGE":
      return verifyDoge(txHash, expectedRecipient, expectedAmount);

    case "ETH":
    case "USDC": {
      const rpc =
        process.env.CRYPTO_EVM_RPC_URL?.trim() ||
        process.env.CRYPTO_ETH_RPC_URL?.trim() ||
        "";
      return verifyEvm(txHash, asset, rpc, expectedRecipient, expectedAmount, asset);
    }

    case "BNB": {
      const rpc =
        process.env.CRYPTO_BSC_RPC_URL?.trim() ||
        process.env.CRYPTO_EVM_RPC_URL?.trim() ||
        "";
      return verifyEvm(txHash, "BNB/BSC", rpc, expectedRecipient, expectedAmount, "BNB");
    }

    case "USDT":
      return verifyTronUsdt(txHash, expectedRecipient, expectedAmount);

    case "TON":
      return {
        status: "verification_unavailable",
        found: false,
        note: "TON on-chain verification is disabled",
        source: "ton",
      };

    default:
      return {
        status: "verification_unavailable",
        found: false,
        note: `No verifier for asset ${asset}`,
      };
  }
}

/** @deprecated Use `verifyTxOnChain` directly. */
export async function tryFetchTxPresence(params: {
  asset: CryptoAsset | string;
  txHash: string;
}): Promise<{ found: boolean; note: string } | null> {
  const result = await verifyTxOnChain(params);
  if (result.status === "verification_unavailable") return null;
  return { found: result.found, note: result.note };
}
