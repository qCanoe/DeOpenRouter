import { createWalletClient, http, keccak256, stringToHex, } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
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
];
function riskLevelToUint8(level) {
    const u = (level ?? "").toUpperCase();
    if (u === "HIGH")
        return 2;
    if (u === "MEDIUM")
        return 1;
    if (u === "LOW")
        return 0;
    return 1;
}
export function startAuditLoop(cfg) {
    let running = false;
    const account = privateKeyToAccount(cfg.privateKey);
    const client = createWalletClient({
        account,
        chain: anvil,
        transport: http(cfg.rpcUrl),
    });
    async function runOnce() {
        const body = {
            base_url: cfg.auditRelayBaseUrl,
            api_key: cfg.openrouterApiKey,
            model: cfg.openrouterModel,
            timeout: cfg.auditTimeoutSec,
            warmup: 0,
            profile: "general",
            skip_infra: true,
        };
        let res;
        try {
            res = await fetch(`${cfg.auditServerUrl.replace(/\/$/, "")}/v1/audit`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
        }
        catch (e) {
            console.error("[audit] fetch audit server failed:", e);
            return;
        }
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        }
        catch {
            console.error("[audit] invalid JSON from audit server:", text.slice(0, 200));
            return;
        }
        if (!res.ok) {
            console.error("[audit] audit HTTP", res.status, text.slice(0, 300));
            return;
        }
        const reportHash = keccak256(stringToHex(JSON.stringify(json)));
        const riskU8 = riskLevelToUint8(json.overall?.level);
        try {
            const hash = await client.writeContract({
                address: cfg.marketplaceAddress,
                abi: marketplaceAbi,
                functionName: "recordAudit",
                args: [cfg.providerId, reportHash, riskU8],
            });
            console.log(`[audit] recordAudit tx=${hash} risk=${riskU8} (${json.overall?.level ?? "?"})`);
        }
        catch (e) {
            console.error("[audit] recordAudit failed:", e);
        }
    }
    console.log(`[audit] scheduler every ${cfg.intervalMs}ms → ${cfg.auditServerUrl} → provider ${cfg.providerId} on ${cfg.marketplaceAddress}`);
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
