/**
 * Crypto tx helpers for payment review.
 *
 * - Format validation (always)
 * - Optional on-chain presence checks via public explorers / RPC
 * - NEVER auto-activates a plan; admin confirm remains the gate for activation
 * - Fail-closed when explorer/RPC is unavailable (returns status verification_unavailable)
 */

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
  /** Explorer / RPC source used */
  source?: string;
  /** Raw confirmations if known */
  confirmations?: number;
};

export function isPlausibleTxHash(asset: string, hash: string): boolean {
  const h = hash.trim();
  if (h.length < 10 || h.length > 200) return false;
  if (!/^[a-zA-Z0-9:_-]+$/.test(h)) return false;

  const a = asset.toUpperCase();
  if (a === "BTC" || a === "DOGE") {
    return /^[a-fA-F0-9]{64}$/.test(h);
  }
  if (a === "ETH" || a === "BNB" || a === "USDT" || a === "USDC") {
    // EVM-style; USDT may be TRC20 (64 hex without 0x) — accept both shapes
    if (/^(0x)?[a-fA-F0-9]{64}$/.test(h)) return true;
    // TRON tx id is 64 hex
    if (a === "USDT" && /^[a-fA-F0-9]{64}$/.test(h)) return true;
    return false;
  }
  if (a === "TON") {
    // BOC base64-ish or hex — keep permissive length check already done
    return h.length >= 16;
  }
  return true;
}

function normalizeEvmTxHash(hash: string): string {
  const h = hash.trim();
  return h.startsWith("0x") ? h : `0x${h}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 12_000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Bitcoin mainnet via Blockstream (public, no key) */
async function verifyBtc(txHash: string): Promise<TxVerificationResult> {
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
    const data = (await res.json()) as {
      status?: { confirmed?: boolean; block_height?: number };
    };
    const confirmed = Boolean(data?.status?.confirmed);
    return {
      status: confirmed ? "confirmed" : "pending",
      found: true,
      note: confirmed ? "Confirmed on Bitcoin mainnet" : "Seen but unconfirmed",
      source: "blockstream",
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

/** Dogecoin via Blockchair public API (rate-limited) */
async function verifyDoge(txHash: string): Promise<TxVerificationResult> {
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
      data?: Record<string, { transaction?: { block_id?: number } }>;
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
    return {
      status: confirmed ? "confirmed" : "pending",
      found: true,
      note: confirmed ? "Confirmed on Dogecoin" : "Unconfirmed on Dogecoin",
      source: "blockchair",
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

/** EVM (ETH / BNB / USDC-ERC20) via JSON-RPC when CRYPTO_EVM_RPC_URL is set */
async function verifyEvm(
  txHash: string,
  label: string
): Promise<TxVerificationResult> {
  const rpc =
    process.env.CRYPTO_EVM_RPC_URL?.trim() ||
    process.env.CRYPTO_ETH_RPC_URL?.trim() ||
    "";
  if (!rpc) {
    return {
      status: "verification_unavailable",
      found: false,
      note: "Set CRYPTO_EVM_RPC_URL (or CRYPTO_ETH_RPC_URL) for on-chain EVM checks",
      source: "evm_rpc",
    };
  }

  const hash = normalizeEvmTxHash(txHash);
  try {
    const res = await fetchWithTimeout(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [hash],
      }),
    });
    if (!res.ok) {
      return {
        status: "verification_unavailable",
        found: false,
        note: `RPC HTTP ${res.status}`,
        source: "evm_rpc",
      };
    }
    const json = (await res.json()) as {
      result?: { status?: string; blockNumber?: string } | null;
      error?: { message?: string };
    };
    if (json.error) {
      return {
        status: "verification_unavailable",
        found: false,
        note: json.error.message || "RPC error",
        source: "evm_rpc",
      };
    }
    if (json.result == null) {
      // try getTransaction for pending
      const res2 = await fetchWithTimeout(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "eth_getTransactionByHash",
          params: [hash],
        }),
      });
      const j2 = (await res2.json()) as { result?: unknown };
      if (j2.result) {
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
    const statusHex = json.result.status;
    if (statusHex === "0x0") {
      return {
        status: "failed",
        found: true,
        note: `Transaction reverted on ${label}`,
        source: "evm_rpc",
      };
    }
    return {
      status: "confirmed",
      found: true,
      note: `Receipt status success on ${label}`,
      source: "evm_rpc",
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

/** USDT TRC20 via TronGrid (optional API key) */
async function verifyTronUsdt(txHash: string): Promise<TxVerificationResult> {
  const key = process.env.TRONGRID_API_KEY?.trim() || "";
  const base =
    process.env.TRONGRID_API_URL?.trim() || "https://api.trongrid.io";
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
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
    const json = (await res.json()) as {
      data?: Array<{ ret?: Array<{ contractRet?: string }> }>;
    };
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
    return {
      status: "confirmed",
      found: true,
      note: "Found on TRON (TronGrid)",
      source: "trongrid",
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

/**
 * Attempt on-chain presence check. Never invents success.
 * Amount / recipient matching is left to admin + optional future enrichment
 * (requires reliable token-transfer decoding per chain).
 */
export async function verifyTxOnChain(params: {
  asset: CryptoAsset | string;
  txHash: string;
}): Promise<TxVerificationResult> {
  const asset = String(params.asset || "").toUpperCase();
  const txHash = params.txHash.trim();

  if (!isPlausibleTxHash(asset, txHash)) {
    return {
      status: "not_found",
      found: false,
      note: "Tx hash format invalid for asset",
    };
  }

  if (asset === "BTC") return verifyBtc(txHash);
  if (asset === "DOGE") return verifyDoge(txHash);
  if (asset === "ETH" || asset === "USDC") return verifyEvm(txHash, asset);
  if (asset === "BNB") {
    // Prefer dedicated BSC RPC if set
    const prev = process.env.CRYPTO_EVM_RPC_URL;
    if (process.env.CRYPTO_BSC_RPC_URL?.trim()) {
      process.env.CRYPTO_EVM_RPC_URL = process.env.CRYPTO_BSC_RPC_URL.trim();
    }
    try {
      return await verifyEvm(txHash, "BNB/BSC");
    } finally {
      if (prev === undefined) delete process.env.CRYPTO_EVM_RPC_URL;
      else process.env.CRYPTO_EVM_RPC_URL = prev;
    }
  }
  if (asset === "USDT") {
    // Project labels USDT as TRC20 in plans.ts
    return verifyTronUsdt(txHash);
  }
  if (asset === "TON") {
    return {
      status: "verification_unavailable",
      found: false,
      note: "TON on-chain check not configured (set integration later)",
      source: "ton",
    };
  }

  return {
    status: "verification_unavailable",
    found: false,
    note: `No verifier for asset ${asset}`,
  };
}

/**
 * @deprecated use verifyTxOnChain
 */
export async function tryFetchTxPresence(params: {
  asset: CryptoAsset | string;
  txHash: string;
}): Promise<{ found: boolean; note: string } | null> {
  const result = await verifyTxOnChain(params);
  if (result.status === "verification_unavailable") {
    return null;
  }
  return { found: result.found, note: result.note };
}
