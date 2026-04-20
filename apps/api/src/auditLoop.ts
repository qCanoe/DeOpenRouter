import {
  createWalletClient,
  defineChain,
  http,
  keccak256,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { canonicalStringify } from "./canonicalJson.js";

const marketplaceAbi = [
  {
    type: "function",
    name: "recordAudit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "providerId", type: "uint256" },
      { name: "reportHash", type: "bytes32" },
      { name: "riskLevel", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordAuditWithUri",
    stateMutability: "nonpayable",
    inputs: [
      { name: "providerId", type: "uint256" },
      { name: "reportHash", type: "bytes32" },
      { name: "riskLevel", type: "uint8" },
      { name: "reportUri", type: "string" },
    ],
    outputs: [],
  },
] as const;

type AuditResponseJson = {
  ok?: boolean;
  overall?: { level?: string };
  [key: string]: unknown;
};

function riskLevelToUint8(level: string | undefined): number {
  const u = (level ?? "").toUpperCase();
  if (u === "HIGH") return 2;
  if (u === "MEDIUM") return 1;
  if (u === "LOW") return 0;
  return 1;
}

function chainForRpc(chainId: number, rpcUrl: string) {
  return defineChain({
    id: chainId,
    name: "deopenrouter",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

/** Optional: POST canonical JSON to receive a public URI (IPFS gateway URL, etc.). */
async function publishCanonicalReport(canonicalBody: string): Promise<string | null> {
  const url = process.env.AUDIT_REPORT_PUBLISH_URL?.trim();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: canonicalBody,
    });
    if (!res.ok) {
      console.warn("[audit] publish URL HTTP", res.status);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = (await res.json()) as { uri?: string; url?: string; cid?: string };
      if (typeof j.uri === "string" && j.uri.length > 0) return j.uri;
      if (typeof j.url === "string" && j.url.length > 0) return j.url;
      if (typeof j.cid === "string" && j.cid.length > 0) {
        return j.cid.startsWith("ipfs://") ? j.cid : `ipfs://${j.cid}`;
      }
      return null;
    }
    const text = (await res.text()).trim();
    return text.length > 0 ? text : null;
  } catch (e) {
    console.warn("[audit] publish report failed:", e);
    return null;
  }
}

export type AuditLoopConfig = {
  auditServerUrl: string;
  auditRelayBaseUrl: string;
  openrouterApiKey: string;
  openrouterModel: string;
  providerId: bigint;
  marketplaceAddress: Address;
  rpcUrl: string;
  chainId: number;
  privateKey: Hex;
  intervalMs: number;
  auditTimeoutSec: number;
};

export function startAuditLoop(cfg: AuditLoopConfig): void {
  let running = false;

  const account = privateKeyToAccount(cfg.privateKey);
  const client = createWalletClient({
    account,
    chain: chainForRpc(cfg.chainId, cfg.rpcUrl),
    transport: http(cfg.rpcUrl),
  });

  async function runOnce(): Promise<void> {
    const body: Record<string, unknown> = {
      base_url: cfg.auditRelayBaseUrl,
      api_key: cfg.openrouterApiKey,
      model: cfg.openrouterModel,
      timeout: cfg.auditTimeoutSec,
      warmup: 0,
      profile: "general",
      skip_infra: true,
    };

    let res: Response;
    try {
      res = await fetch(`${cfg.auditServerUrl.replace(/\/$/, "")}/v1/audit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.error("[audit] fetch audit server failed:", e);
      return;
    }

    const text = await res.text();
    let json: AuditResponseJson;
    try {
      json = JSON.parse(text) as AuditResponseJson;
    } catch {
      console.error("[audit] invalid JSON from audit server:", text.slice(0, 200));
      return;
    }

    if (!res.ok) {
      console.error("[audit] audit HTTP", res.status, text.slice(0, 300));
      return;
    }

    const canonical = canonicalStringify(json);
    const reportHash = keccak256(stringToHex(canonical)) as Hex;
    const riskU8 = riskLevelToUint8(json.overall?.level);
    const reportUri = (await publishCanonicalReport(canonical)) ?? "";

    try {
      const hash =
        reportUri.length > 0
          ? await client.writeContract({
              address: cfg.marketplaceAddress,
              abi: marketplaceAbi,
              functionName: "recordAuditWithUri",
              args: [cfg.providerId, reportHash, riskU8, reportUri],
            })
          : await client.writeContract({
              address: cfg.marketplaceAddress,
              abi: marketplaceAbi,
              functionName: "recordAudit",
              args: [cfg.providerId, reportHash, riskU8],
            });
      console.log(
        `[audit] anchored tx=${hash} risk=${riskU8} (${json.overall?.level ?? "?"}) hash=${reportHash}${reportUri ? ` uri=${reportUri}` : ""}`,
      );
    } catch (e) {
      console.error("[audit] recordAudit failed:", e);
    }
  }

  console.log(
    `[audit] scheduler every ${cfg.intervalMs}ms → ${cfg.auditServerUrl} → provider ${cfg.providerId} on ${cfg.marketplaceAddress} (chain ${cfg.chainId})`,
  );

  void runOnce();
  setInterval(() => {
    if (running) {
      console.warn("[audit] previous run still in progress; skip tick");
      return;
    }
    running = true;
    void runOnce().finally(() => {
      running = false;
    });
  }, cfg.intervalMs);
}
