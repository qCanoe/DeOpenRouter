export type RiskLevel = "low" | "medium" | "high";

export interface MockProvider {
  id: number;
  owner: `0x${string}`;
  modelId: string;
  endpoint: string;
  pricePerCall: string;
  stake: string;
  active: boolean;
  risk: RiskLevel;
  metadataURI: string;
  identityHash: `0x${string}`;
}

export interface MockCall {
  id: number;
  providerId: number;
  caller: `0x${string}`;
  amount: string;
  requestHash: `0x${string}`;
  responseHash: `0x${string}`;
  timestamp: number;
  modelId: string;
}

export interface MockUserStats {
  balance: string;
  totalSpent: string;
  callCount: number;
}

export interface MockProviderStats {
  totalCalls: number;
  totalEarned: string;
  currentStake: string;
}

export const CURRENT_USER_ADDRESS: `0x${string}` =
  "0x1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d";

export const mockUserStats: MockUserStats = {
  balance: "2.458",
  totalSpent: "0.084",
  callCount: 127,
};

export const mockProviderStats: MockProviderStats = {
  totalCalls: 1842,
  totalEarned: "12.906",
  currentStake: "5.0",
};

export const mockMyProvider: MockProvider = {
  id: 0,
  owner: CURRENT_USER_ADDRESS,
  modelId: "deopen-gpt-local-v2",
  endpoint: "https://inference.example.internal/v1/chat",
  pricePerCall: "0.00042",
  stake: "5.0",
  active: true,
  risk: "low",
  metadataURI: "ipfs://bafybeiexample000000000000000000000000000000000000000000000000",
  identityHash:
    "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
};

export const mockProviders: MockProvider[] = [
  {
    id: 1,
    owner: "0xdeadbeef00000000000000000000000000000001",
    modelId: "claude-haiku-proxy",
    endpoint: "https://edge-east.provider.example/api/v1",
    pricePerCall: "0.00012",
    stake: "2.5",
    active: true,
    risk: "low",
    metadataURI: "https://metadata.example/claude-haiku.json",
    identityHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  {
    id: 2,
    owner: "0xdeadbeef00000000000000000000000000000002",
    modelId: "llama-3-70b-anvil",
    endpoint: "http://127.0.0.1:11434/v1",
    pricePerCall: "0.00028",
    stake: "1.0",
    active: true,
    risk: "medium",
    metadataURI: "ipfs://bafybeillama000000000000000000000000000000000000000000000000",
    identityHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  {
    id: 3,
    owner: "0xdeadbeef00000000000000000000000000000003",
    modelId: "mistral-small-open",
    endpoint: "https://mistral.provider.example/infer",
    pricePerCall: "0.00009",
    stake: "0.5",
    active: true,
    risk: "high",
    metadataURI: "https://metadata.example/mistral.json",
    identityHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  },
  {
    id: 4,
    owner: "0xdeadbeef00000000000000000000000000000004",
    modelId: "gpt-4o-mini-routed",
    endpoint: "https://router.openai-adjacent.example/v1",
    pricePerCall: "0.00055",
    stake: "8.0",
    active: true,
    risk: "medium",
    metadataURI: "ipfs://bafybeigpt4o000000000000000000000000000000000000000000000000",
    identityHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  },
  {
    id: 5,
    owner: "0xdeadbeef00000000000000000000000000000005",
    modelId: "gemini-flash-edge",
    endpoint: "https://gemini.provider.example/predict",
    pricePerCall: "0.00018",
    stake: "3.25",
    active: true,
    risk: "low",
    metadataURI: "https://metadata.example/gemini.json",
    identityHash:
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  },
];

export const mockUserCalls: MockCall[] = [
  {
    id: 101,
    providerId: 1,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00012",
    requestHash:
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    responseHash:
      "0x2222222222222222222222222222222222222222222222222222222222222222",
    timestamp: 1713206400,
    modelId: "claude-haiku-proxy",
  },
  {
    id: 102,
    providerId: 2,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00028",
    requestHash:
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    responseHash:
      "0x4444444444444444444444444444444444444444444444444444444444444444",
    timestamp: 1713292800,
    modelId: "llama-3-70b-anvil",
  },
  {
    id: 103,
    providerId: 3,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00009",
    requestHash:
      "0x5555555555555555555555555555555555555555555555555555555555555555",
    responseHash:
      "0x6666666666666666666666666666666666666666666666666666666666666666",
    timestamp: 1713379200,
    modelId: "mistral-small-open",
  },
  {
    id: 104,
    providerId: 4,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00055",
    requestHash:
      "0x7777777777777777777777777777777777777777777777777777777777777777",
    responseHash:
      "0x8888888888888888888888888888888888888888888888888888888888888888",
    timestamp: 1713465600,
    modelId: "gpt-4o-mini-routed",
  },
  {
    id: 105,
    providerId: 5,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00018",
    requestHash:
      "0x9999999999999999999999999999999999999999999999999999999999999999",
    responseHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    timestamp: 1713552000,
    modelId: "gemini-flash-edge",
  },
  {
    id: 106,
    providerId: 2,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00028",
    requestHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    responseHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    timestamp: 1713638400,
    modelId: "llama-3-70b-anvil",
  },
  {
    id: 107,
    providerId: 1,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00012",
    requestHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    responseHash:
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    timestamp: 1713724800,
    modelId: "claude-haiku-proxy",
  },
  {
    id: 108,
    providerId: 4,
    caller: CURRENT_USER_ADDRESS,
    amount: "0.00055",
    requestHash:
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    responseHash:
      "0x1010101010101010101010101010101010101010101010101010101010101010",
    timestamp: 1713811200,
    modelId: "gpt-4o-mini-routed",
  },
];

export const mockProviderCalls: MockCall[] = [
  {
    id: 201,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000001",
    amount: "0.00042",
    requestHash:
      "0x2011111111111111111111111111111111111111111111111111111111111111",
    responseHash:
      "0x2022222222222222222222222222222222222222222222222222222222222222",
    timestamp: 1713200400,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 202,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000002",
    amount: "0.00042",
    requestHash:
      "0x2033333333333333333333333333333333333333333333333333333333333333",
    responseHash:
      "0x2044444444444444444444444444444444444444444444444444444444444444",
    timestamp: 1713286800,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 203,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000003",
    amount: "0.00042",
    requestHash:
      "0x2055555555555555555555555555555555555555555555555555555555555555",
    responseHash:
      "0x2066666666666666666666666666666666666666666666666666666666666666",
    timestamp: 1713373200,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 204,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000004",
    amount: "0.00042",
    requestHash:
      "0x2077777777777777777777777777777777777777777777777777777777777777",
    responseHash:
      "0x2088888888888888888888888888888888888888888888888888888888888888",
    timestamp: 1713459600,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 205,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000005",
    amount: "0.00042",
    requestHash:
      "0x2099999999999999999999999999999999999999999999999999999999999999",
    responseHash:
      "0x20aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    timestamp: 1713546000,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 206,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000006",
    amount: "0.00042",
    requestHash:
      "0x20bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    responseHash:
      "0x20cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    timestamp: 1713632400,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 207,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000007",
    amount: "0.00042",
    requestHash:
      "0x20dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    responseHash:
      "0x20eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    timestamp: 1713718800,
    modelId: "deopen-gpt-local-v2",
  },
  {
    id: 208,
    providerId: 0,
    caller: "0xfeedface00000000000000000000000000000008",
    amount: "0.00042",
    requestHash:
      "0x20ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    responseHash:
      "0x3010101010101010101010101010101010101010101010101010101010101010",
    timestamp: 1713805200,
    modelId: "deopen-gpt-local-v2",
  },
];
