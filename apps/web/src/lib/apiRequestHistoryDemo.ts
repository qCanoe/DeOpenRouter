/**
 * Off-chain style API usage / billing rows (demo UI). Mirrors common provider receipts:
 * request id, route, cache-related token counts, per-million pricing, multiplier, estimated USD.
 */
export type ApiRequestPricingSheet = {
  /** $ / 1M input tokens */
  inputPerMUsd: number;
  /** $ / 1M output tokens */
  outputPerMUsd: number;
  /** $ / 1M cache read tokens */
  cacheReadPerMUsd: number;
  /** $ / 1M “5m cache creation” tokens */
  cacheCreate5mPerMUsd: number;
  /** Applied to the summed usage cost (before or as in formula — here: whole subtotal × multiplier). */
  groupMultiplier: number;
};

export type ApiRequestHistoryRow = {
  id: string;
  requestId: string;
  route: string;
  /** Display time (localizable string). */
  recordedAtLabel: string;
  modelId?: string;
  promptTokens: number;
  completionTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  pricing: ApiRequestPricingSheet;
  /** One-line human summary (log detail). */
  logSummary: string;
  /** Step-by-step billing lines. */
  billingLines: string[];
  /** Final line, e.g. subtotal × multiplier = total */
  billingTotalLine: string;
  estimatedTotalUsd: number;
};

export const API_REQUEST_DISCLAIMER =
  "For reference only; actual billing may differ. Estimates are illustrative for this demo.";

export const DEMO_API_REQUEST_HISTORY: readonly ApiRequestHistoryRow[] = [
  {
    id: "api-1",
    requestId: "202604170328424421589520DGSY1NQ",
    route: "/v1/messages",
    recordedAtLabel: "Apr 17, 2026, 11:28:42",
    modelId: "demo/anthropic-style",
    promptTokens: 1,
    completionTokens: 239,
    cacheReadTokens: 81472,
    cacheCreationTokens: 333,
    pricing: {
      inputPerMUsd: 5,
      outputPerMUsd: 25,
      cacheReadPerMUsd: 0.5,
      cacheCreate5mPerMUsd: 6.25,
      groupMultiplier: 2.2,
    },
    logSummary:
      "Input $5.000000 / 1M tokens, output $25.000000 / 1M, cache read $0.500000 / 1M, 5m cache create $6.250000 / 1M, group multiplier 2.2x",
    billingLines: [
      "Input price: $5.000000 / 1M tokens",
      "Output price: $25.000000 / 1M tokens",
      "Cache read price: $0.500000 / 1M tokens",
      "5m cache create price: $6.250000 / 1M tokens",
    ],
    billingTotalLine:
      "Prompt 1 / 1M × $5.000000 + cache read 81472 / 1M × $0.500000 + 5m cache create 333 / 1M × $6.250000 + completion 239 / 1M × $25.000000; subtotal × group multiplier 2.2 ≈ $0.107354",
    estimatedTotalUsd: 0.107354,
  },
  {
    id: "api-2",
    requestId: "202604181201558812345678ABCD2XY",
    route: "/v1/chat/completions",
    recordedAtLabel: "Apr 18, 2026, 20:01:55",
    modelId: "demo/openai-style",
    promptTokens: 412,
    completionTokens: 156,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    pricing: {
      inputPerMUsd: 0.15,
      outputPerMUsd: 0.6,
      cacheReadPerMUsd: 0.03,
      cacheCreate5mPerMUsd: 0.12,
      groupMultiplier: 1,
    },
    logSummary:
      "No cache hits; input $0.150000 / 1M, output $0.600000 / 1M, group multiplier 1.0x",
    billingLines: [
      "Input price: $0.150000 / 1M tokens",
      "Output price: $0.600000 / 1M tokens",
      "Cache read price: $0.030000 / 1M tokens (unused)",
      "5m cache create price: $0.120000 / 1M tokens (unused)",
    ],
    billingTotalLine:
      "Prompt 412 / 1M × $0.150000 + completion 156 / 1M × $0.600000 × 1.0 ≈ $0.155400",
    estimatedTotalUsd: 0.1554,
  },
  {
    id: "api-3",
    requestId: "202604190845229998877665EEF3ZZ",
    route: "/v1/messages",
    recordedAtLabel: "Apr 19, 2026, 16:45:22",
    modelId: "demo/local-llm",
    promptTokens: 2048,
    completionTokens: 512,
    cacheReadTokens: 12000,
    cacheCreationTokens: 64,
    pricing: {
      inputPerMUsd: 0.02,
      outputPerMUsd: 0.08,
      cacheReadPerMUsd: 0.005,
      cacheCreate5mPerMUsd: 0.04,
      groupMultiplier: 1.15,
    },
    logSummary:
      "Input $0.020000 / 1M, output $0.080000 / 1M, cache read $0.005000 / 1M, 5m create $0.040000 / 1M, group multiplier 1.15x",
    billingLines: [
      "Input price: $0.020000 / 1M tokens",
      "Output price: $0.080000 / 1M tokens",
      "Cache read price: $0.005000 / 1M tokens",
      "5m cache create price: $0.040000 / 1M tokens",
    ],
    billingTotalLine:
      "(Prompt 2048 + completion 512 + cache read 12000 + 5m create 64 at list prices) × 1.15 ≈ $0.089200",
    estimatedTotalUsd: 0.0892,
  },
];
