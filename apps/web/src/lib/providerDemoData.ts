import {
  keccak256,
  parseEther,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";

/** Deterministic 32-byte field for demo forms and mock cards (keccak256 of a label). */
function labelHash(label: string): Hex {
  return keccak256(stringToHex(label)) as Hex;
}

export type RegisterPreset = {
  id: string;
  label: string;
  description: string;
  values: {
    modelId: string;
    modelVersion: string;
    endpointId: string;
    capabilityHash: string;
    pricePerCall: string;
    stake: string;
    stakeLockBlocks: string;
    metadataURI: string;
    identityHash: string;
  };
};

/**
 * One-click templates for Register_Provider — valid shapes for on-chain register().
 * Users can tweak any field after applying a preset.
 */
export const REGISTER_PRESETS: readonly RegisterPreset[] = [
  {
    id: "budget",
    label: "Budget",
    description: "Low price, small stake — good for first test.",
    values: {
      modelId: "demo/gpt-nano",
      modelVersion: "1.0.0",
      endpointId: "demo:openrouter/gpt-4o-mini",
      capabilityHash: labelHash("cap:openai-chat-completions:v1"),
      pricePerCall: "0.0005",
      stake: "0.05",
      stakeLockBlocks: "0",
      metadataURI: "https://example.com/metadata/demo-gpt-nano.json",
      identityHash: labelHash("id:demo-provider-budget"),
    },
  },
  {
    id: "standard",
    label: "Standard",
    description: "Mid-range pricing and a short stake lock window.",
    values: {
      modelId: "demo/llama-3-8b",
      modelVersion: "3.1.0",
      endpointId: "demo:router/llama-3-8b-instruct",
      capabilityHash: labelHash("cap:llama-chat:v1"),
      pricePerCall: "0.002",
      stake: "0.1",
      stakeLockBlocks: "100",
      metadataURI: "https://example.com/metadata/demo-llama-8b.json",
      identityHash: labelHash("id:demo-provider-standard"),
    },
  },
  {
    id: "premium",
    label: "Premium",
    description: "Higher stake and price — closer to a production-like row.",
    values: {
      modelId: "demo/claude-3-sonnet",
      modelVersion: "20240229",
      endpointId: "demo:anthropic/messages",
      capabilityHash: labelHash("cap:anthropic-messages:v1"),
      pricePerCall: "0.008",
      stake: "0.25",
      stakeLockBlocks: "0",
      metadataURI: "https://example.com/metadata/demo-claude-sonnet.json",
      identityHash: labelHash("id:demo-provider-premium"),
    },
  },
];

const DEMO_OWNER = "0xDe0000000000000000000000000000000000000001" as Address;

function mockRow(partial: Omit<ChainProviderRow, "id"> & { id: number }): ChainProviderRow {
  return { ...partial, demoCatalog: true };
}

/**
 * Sample catalog rows merged with on-chain providers in the user marketplace (demo UI).
 */
export const DEMO_MARKETPLACE_ROWS: readonly ChainProviderRow[] = [
  mockRow({
    id: 900_001,
    owner: DEMO_OWNER,
    modelId: "demo/openai-style",
    modelVersion: "1.0.0",
    endpointCommitment: labelHash("endpoint:demo/openai-style"),
    capabilityHash: labelHash("cap:demo-openai-chat"),
    pricePerCall: parseEther("0.001"),
    pendingPriceWei: 0n,
    pendingEffectiveBlock: 0n,
    effectivePriceWei: parseEther("0.001"),
    hasPendingPrice: false,
    pendingPriceDisplay: 0n,
    pendingAppliesAtBlock: 0n,
    stake: parseEther("0.12"),
    stakeLockBlocks: 0n,
    active: true,
    metadataURI: "https://example.com/meta/demo-openai.json",
    metadataHash: labelHash("meta:demo-openai"),
    identityHash: labelHash("id:demo-openai"),
    metrics: {
      latencyP50Ms: 210,
      latencyP99Ms: 890,
      throughputRpm: 180,
      uptimePct: 99.92,
      requests24h: 42_300,
      successRatePct: 99.4,
      region: "us-east-1",
      apiFormat: "OpenAI-compatible",
      contextWindow: "128k",
    },
  }),
  mockRow({
    id: 900_002,
    owner: DEMO_OWNER,
    modelId: "demo/anthropic-style",
    modelVersion: "20240307",
    endpointCommitment: labelHash("endpoint:demo/anthropic"),
    capabilityHash: labelHash("cap:demo-anthropic-messages"),
    pricePerCall: parseEther("0.004"),
    pendingPriceWei: 0n,
    pendingEffectiveBlock: 0n,
    effectivePriceWei: parseEther("0.004"),
    hasPendingPrice: false,
    pendingPriceDisplay: 0n,
    pendingAppliesAtBlock: 0n,
    stake: parseEther("0.2"),
    stakeLockBlocks: 50n,
    active: true,
    metadataURI: "https://example.com/meta/demo-anthropic.json",
    metadataHash: labelHash("meta:demo-anthropic"),
    identityHash: labelHash("id:demo-anthropic"),
    metrics: {
      latencyP50Ms: 340,
      latencyP99Ms: 1200,
      throughputRpm: 95,
      uptimePct: 99.88,
      requests24h: 18_900,
      successRatePct: 99.1,
      region: "eu-west-1",
      apiFormat: "Anthropic Messages",
      contextWindow: "200k",
    },
  }),
  mockRow({
    id: 900_003,
    owner: DEMO_OWNER,
    modelId: "demo/local-llm",
    modelVersion: "0.9.0",
    endpointCommitment: labelHash("endpoint:demo/local-ollama"),
    capabilityHash: labelHash("cap:demo-local-completion"),
    pricePerCall: parseEther("0.0002"),
    pendingPriceWei: 0n,
    pendingEffectiveBlock: 0n,
    effectivePriceWei: parseEther("0.0002"),
    hasPendingPrice: true,
    pendingPriceDisplay: parseEther("0.00015"),
    pendingAppliesAtBlock: 18_450_000n,
    stake: parseEther("0.03"),
    stakeLockBlocks: 0n,
    active: true,
    metadataURI: "https://example.com/meta/demo-local.json",
    metadataHash: labelHash("meta:demo-local"),
    identityHash: labelHash("id:demo-local"),
    metrics: {
      latencyP50Ms: 85,
      latencyP99Ms: 410,
      throughputRpm: 320,
      uptimePct: 99.65,
      requests24h: 128_000,
      successRatePct: 98.8,
      region: "ap-southeast-1",
      apiFormat: "Custom JSON-RPC",
      contextWindow: "32k",
    },
  }),
];

/** Quick fills for MyProviderCard (metadata + scheduled price) — UI only, still validated on submit. */
export const DASHBOARD_METADATA_PRESETS: readonly {
  id: string;
  label: string;
  metadataURI: string;
  identityHash: Hex;
}[] = [
  {
    id: "meta-a",
    label: "Demo meta A",
    metadataURI: "https://example.com/metadata/provider-dashboard-a.json",
    identityHash: labelHash("id:dashboard-metadata-demo-a"),
  },
  {
    id: "meta-b",
    label: "Demo meta B",
    metadataURI: "ipfs://bafybeigdemo/dashboard/provider-meta.json",
    identityHash: labelHash("id:dashboard-metadata-demo-b"),
  },
];

export const DASHBOARD_PRICE_CHIPS = ["0.001", "0.002", "0.005", "0.01"] as const;
