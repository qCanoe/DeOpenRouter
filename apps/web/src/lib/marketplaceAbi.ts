export const marketplaceAbi = [
  { type: "function", name: "nextProviderId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256", name: "" }] },
  {
    type: "function",
    name: "providers",
    stateMutability: "view",
    inputs: [{ type: "uint256", name: "" }],
    outputs: [
      { type: "address", name: "owner" },
      { type: "string", name: "modelId" },
      { type: "string", name: "endpoint" },
      { type: "uint256", name: "pricePerCall" },
      { type: "uint256", name: "stake" },
      { type: "bool", name: "active" },
    ],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "payable",
    inputs: [
      { type: "string", name: "modelId" },
      { type: "string", name: "endpoint" },
      { type: "uint256", name: "pricePerCall" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "invoke",
    stateMutability: "payable",
    inputs: [
      { type: "uint256", name: "providerId" },
      { type: "bytes32", name: "requestHash" },
      { type: "bytes32", name: "responseHash" },
    ],
    outputs: [],
  },
] as const;
