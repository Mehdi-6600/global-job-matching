/**
 * Crypto tx helpers for payment review.
 * - Format validation
 * - On-chain presence via public explorers / RPC
 * - Never mutates process.env
 * - Fail-closed when explorer/RPC unavailable
 * - Never auto-activates plans
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
  source?: string;
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
    if (/^(0x)?[a-fA-F0-9]{64}$/.test(h)) return true;
    if (a === "USDT" && /^[a-fA-F0-9]{64}$/.test(h)) return true;
    return false;
  }
  if (a === "TON") {
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
      status?: { confirmed?: boolean };
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

async function verifyEvm(
  txHash: string,
  label: string,
  rpcUrl: string
): Promise<TxVerificationResult> {
  if (!rpcUrl) {
    return {
      status: "verification_unavailable",
      found: false,
      note: `Set RPC URL for ${label} on-chain checks`,
      source: "evm_rpc",
    };
  }

  const hash = normalizeEvmTxHash(txHash);
  try {
    const res = await fetchWithTimeout(rpcUrl, {
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
      result?: { status?: string } | null;
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
      const res2 = await fetchWithTimeout(rpcUrl, {
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
    if (json.result.status === "0x0") {
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

async function verifyTronUsdt(txHash: string): Promise<TxVerificationResult> {
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

  if (asset === "ETH" || asset === "USDC") {
    const rpc =
      process.env.CRYPTO_EVM_RPC_URL?.trim() ||
      process.env.CRYPTO_ETH_RPC_URL?.trim() ||
      "";
    return verifyEvm(txHash, asset, rpc);
  }

  if (asset === "BNB") {
    const rpc =
      process.env.CRYPTO_BSC_RPC_URL?.trim() ||
      process.env.CRYPTO_EVM_RPC_URL?.trim() ||
      "";
    return verifyEvm(txHash, "BNB/BSC", rpc);
  }

  if (asset === "USDT") {
    return verifyTronUsdt(txHash);
  }

  if (asset === "TON") {
    return {
      status: "verification_unavailable",
      found: false,
      note: "TON on-chain verification is disabled until a real verifier is integrated",
      source: "ton",
    };
  }

  return {
    status: "verification_unavailable",
    found: false,
    note: `No verifier for asset ${asset}`,
  };
}

/** @deprecated use verifyTxOnChain */
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
