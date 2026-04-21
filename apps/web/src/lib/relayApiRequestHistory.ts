import type { ChatResult } from "@/lib/chatClient";
import type { ApiRequestHistoryRow } from "@/lib/apiRequestHistoryDemo";

function fallbackRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase();
  }
  return `REQ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function formatCostDetails(details: Record<string, unknown> | undefined): string[] {
  if (!details || typeof details !== "object") return [];
  const lines: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (v === undefined || v === null) continue;
    lines.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
  }
  return lines.slice(0, 6);
}

/** Build a receipt row after `POST /v1/chat` using relay-forwarded OpenRouter fields when present. */
export function apiRequestHistoryRowFromRelayChat(input: {
  providerId: number;
  providerModelId: string;
  prompt: string;
  result: ChatResult;
}): ApiRequestHistoryRow {
  const { providerId, providerModelId, prompt, result } = input;
  const u = result.usage;
  const totalFromResult = Number(result.usageUnits);

  const promptTokens = u?.promptTokens ?? Math.max(0, Math.ceil(prompt.length / 4));
  const completionTokens =
    u?.completionTokens ?? Math.max(0, Math.ceil(result.response.length / 4));
  const totalTokens = u?.totalTokens ?? promptTokens + completionTokens;

  const costUsd = u?.costUsd;
  const hasAccurateSplit = u !== undefined;
  const hasAccurateCost = typeof costUsd === "number" && Number.isFinite(costUsd);

  const usdPerM = 0.5;
  const roughUsd =
    ((promptTokens + completionTokens) / 1_000_000) * usdPerM * 2;
  const estimatedTotalUsd = hasAccurateCost ? costUsd : roughUsd;

  const now = new Date();
  const id = `relay-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const requestId = result.upstreamId?.trim() || fallbackRequestId();

  const detailLines = formatCostDetails(u?.costDetails);
  const billingLines: string[] = [
    hasAccurateSplit
      ? `Upstream tokens — prompt: ${promptTokens}, completion: ${completionTokens}, total: ${totalTokens}`
      : `Token counts estimated from text length (relay did not return structured usage).`,
    `Route POST /v1/chat → model ${result.model || "unknown"}`,
  ];
  if (hasAccurateCost) {
    billingLines.push(`OpenRouter usage.cost (USD): ${costUsd.toFixed(8)}`);
  }
  billingLines.push(...detailLines.map((l) => `cost_details · ${l}`));

  const billingTotalLine = hasAccurateCost
    ? `Billed (OpenRouter usage.cost): ${formatUsd(costUsd)}`
    : `Illustrative only ≈ ${formatUsd(roughUsd)} (no usage.cost in relay response)`;

  const logSummary = [
    `Playground relay · provider #${providerId} (${providerModelId})`,
    hasAccurateSplit
      ? `tokens ${totalTokens} (prompt ${promptTokens} + completion ${completionTokens})`
      : `tokens ≈ ${totalFromResult || totalTokens} (estimated)`,
    result.upstreamId ? `id ${result.upstreamId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id,
    requestId,
    route: "/v1/chat",
    recordedAtLabel: now.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }),
    modelId: result.model || providerModelId,
    promptTokens,
    completionTokens,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    pricing: {
      inputPerMUsd: usdPerM,
      outputPerMUsd: usdPerM * 1.2,
      cacheReadPerMUsd: 0.1,
      cacheCreate5mPerMUsd: 0.15,
      groupMultiplier: 1,
    },
    logSummary,
    billingLines,
    billingTotalLine,
    estimatedTotalUsd,
  };
}

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
}
