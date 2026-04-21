import type {
  ChainProviderRow,
  ProviderMarketplaceMetrics,
} from "@/hooks/useMarketplaceProviders";

const REGIONS = ["us-east-1", "eu-west-1", "ap-southeast-1", "us-west-2"] as const;
const FORMATS = [
  "OpenAI-compatible",
  "Anthropic Messages",
  "Custom JSON-RPC",
] as const;

function hashSeed(row: ChainProviderRow): number {
  const modelId = row.modelId ?? "";
  let h = row.id | 0;
  for (let i = 0; i < modelId.length; i++) {
    h = Math.imul(31, h) + modelId.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Prefer explicit `metrics`; otherwise derive stable demo stats from row identity. */
export function resolveProviderMetrics(
  row: ChainProviderRow,
): ProviderMarketplaceMetrics {
  if (row.metrics) return row.metrics;
  const s = hashSeed(row);
  const mod = (n: number) => (s % n) + 1;
  return {
    latencyP50Ms: 95 + mod(420),
    latencyP99Ms: 380 + mod(2200),
    throughputRpm: 35 + mod(240),
    uptimePct: 99.2 + mod(80) / 100,
    requests24h: 800 + mod(48_000),
    successRatePct: 97.5 + mod(250) / 100,
    region: REGIONS[s % REGIONS.length],
    apiFormat: FORMATS[s % FORMATS.length],
    contextWindow: `${8 + (s % 6) * 8}k`,
  };
}
