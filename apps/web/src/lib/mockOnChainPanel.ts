import { parseEther, type Address, type Hex } from "viem";

/**
 * When true, "View on chain" panels use fixed mock data for UI / copy review.
 * Set to false to show live values from RPC (marketplace + wallet logs).
 */
export const ON_CHAIN_PANEL_DESIGN_MOCK = true;

export const MOCK_PANEL_COPY = {
  banner:
    "Simulated on-chain fields for layout and information architecture only — not real blocks or contract state.",
  explorerDisabled: "Block explorer link (design placeholder — not wired)",
  sheetMarketplaceTitle: "On-chain marketplace (simulated)",
  sheetMarketplaceDesc:
    "Preview of how the contract address, network, and full provider records are shown.",
  sheetCallTitle: "Settlement record (simulated)",
  sheetCallDesc:
    "Preview grouping for transaction context, log index, and CallRecorded event fields.",
} as const;

/** Fictional contract for layout — do not use for transactions. */
export const MOCK_MARKETPLACE_CONTRACT =
  "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE" as Address;

export const MOCK_NETWORK_LABEL = "Sepolia (UI simulation)";
export const MOCK_CHAIN_ID_LABEL = "11,155,111";

export type MockMarketplaceProviderPanel = {
  id: number;
  active: boolean;
  owner: Address;
  modelId: string;
  modelVersion: string;
  effectivePriceEth: string;
  storedPriceEth: string;
  pendingPriceEth?: string;
  pendingAtBlock?: string;
  stakeEth: string;
  stakeLockBlocks: string;
  endpointCommitment: Hex;
  capabilityHash: Hex;
  metadataURI: string;
  metadataHash: Hex;
  identityHash: Hex;
};

export const MOCK_MARKETPLACE_PROVIDERS: readonly MockMarketplaceProviderPanel[] = [
  {
    id: 0,
    active: true,
    owner: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    modelId: "acme/gpt-sim",
    modelVersion: "1",
    effectivePriceEth: "0.0024",
    storedPriceEth: "0.0024",
    stakeEth: "0.5",
    stakeLockBlocks: "1209600",
    endpointCommitment:
      "0x9b1d5e8c4a2f6071e3d9c0b8a7f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4",
    capabilityHash:
      "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f80",
    metadataURI: "ipfs://bafyMockProvider0/metadata.json",
    metadataHash:
      "0xdeadbeef00000000000000000000000000000000000000000000000000000001",
    identityHash:
      "0xcafe000000000000000000000000000000000000000000000000000000000001",
  },
  {
    id: 1,
    active: true,
    owner: "0xAb5801a7D398351b8bE11C439e34C134120a8FDc",
    modelId: "northwind/claude-sim",
    modelVersion: "2",
    effectivePriceEth: "0.008",
    storedPriceEth: "0.006",
    pendingPriceEth: "0.008",
    pendingAtBlock: "5,482,901",
    stakeEth: "1.25",
    stakeLockBlocks: "604800",
    endpointCommitment:
      "0x7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f",
    capabilityHash:
      "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    metadataURI: "https://mock-registry.example/api/v1/providers/1",
    metadataHash:
      "0xdeadbeef00000000000000000000000000000000000000000000000000000002",
    identityHash:
      "0xcafe000000000000000000000000000000000000000000000000000000000002",
  },
];

export type MockCallRecordPanel = {
  txHash: Hex;
  blockNumber: string;
  logIndex: string;
  caller: Address;
  providerId: string;
  callId: string;
  paidWei: string;
  paidEth: string;
  requestHash: Hex;
  responseHash: Hex;
  usageUnits: string;
  recordedAtLabel: string;
  protocolFormats: string;
  settlement: string;
};

export const MOCK_CALL_RECORD_BASE: MockCallRecordPanel = {
  txHash:
    "0xf8e0a912d5b8b7c6d5e4f3029181716151413121110090807060504030201a0",
  blockNumber: "5,482,887",
  logIndex: "23",
  caller: "0xCa1100000000000000000000000000000000000001",
  providerId: "1",
  callId: "10,842",
  paidWei: parseEther("0.0024").toString(),
  paidEth: "0.0024 ETH",
  requestHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  responseHash:
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  usageUnits: "612",
  recordedAtLabel: "20 Apr 2026, 14:32:08",
  protocolFormats: "req v1 · res v1",
  settlement: "Settled",
};
