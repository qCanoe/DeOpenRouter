/**
 * Minimal ABI for DeOpenRouterMarketplace — keep in sync with
 * contracts/src/DeOpenRouterMarketplace.sol
 */
export const marketplaceAbi = [
  { type: "function", name: "MIN_STAKE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256", name: "" }] },
  { type: "function", name: "slashOperator", stateMutability: "view", inputs: [], outputs: [{ type: "address", name: "" }] },
  { type: "function", name: "nextProviderId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256", name: "" }] },
  { type: "function", name: "nextCallId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256", name: "" }] },
  { type: "function", name: "nextAuditId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256", name: "" }] },
  { type: "function", name: "auditRecorder", stateMutability: "view", inputs: [], outputs: [{ type: "address", name: "" }] },
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
      { type: "string", name: "metadataURI" },
      { type: "bytes32", name: "metadataHash" },
      { type: "bytes32", name: "identityHash" },
      { type: "uint256", name: "createdAtBlock" },
      { type: "uint256", name: "updatedAtBlock" },
      { type: "uint256", name: "slashedTotal" },
      { type: "uint256", name: "lastSlashedAtBlock" },
    ],
  },
  {
    type: "function",
    name: "register",
    stateMutability: "payable",
    inputs: [
      {
        name: "info",
        type: "tuple",
        components: [
          { name: "modelId", type: "string" },
          { name: "endpoint", type: "string" },
          { name: "pricePerCall", type: "uint256" },
          { name: "metadataURI", type: "string" },
          { name: "metadataHash", type: "bytes32" },
          { name: "identityHash", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateProviderMetadata",
    stateMutability: "nonpayable",
    inputs: [
      { name: "providerId", type: "uint256" },
      {
        name: "update",
        type: "tuple",
        components: [
          { name: "metadataURI", type: "string" },
          { name: "metadataHash", type: "bytes32" },
          { name: "identityHash", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "deactivate",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "providerId" }],
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
      { type: "uint8", name: "requestFormat" },
      { type: "uint8", name: "responseFormat" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "slash",
    stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "providerId" },
      { type: "uint256", name: "amount" },
      { type: "bytes32", name: "reasonHash" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawStake",
    stateMutability: "nonpayable",
    inputs: [{ type: "uint256", name: "providerId" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transferSlashOperator",
    stateMutability: "nonpayable",
    inputs: [{ type: "address", name: "newOperator" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transferAuditRecorder",
    stateMutability: "nonpayable",
    inputs: [{ type: "address", name: "newRecorder" }],
    outputs: [],
  },
  {
    type: "function",
    name: "recordAudit",
    stateMutability: "nonpayable",
    inputs: [
      { type: "uint256", name: "providerId" },
      { type: "bytes32", name: "reportHash" },
      { type: "uint8", name: "riskLevel" },
    ],
    outputs: [],
  },
] as const;

/** Hash preimage format for the web MVP (must match hashing in page.tsx). */
export const REQUEST_FORMAT_V1 = 1;
export const RESPONSE_FORMAT_V1 = 1;
