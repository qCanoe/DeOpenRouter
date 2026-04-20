/** Human-readable chain label for header / on-chain panels. */
export function chainLabel(chainId: number): string {
  if (chainId === 31_337) return "Anvil Local";
  if (chainId === 1) return "Ethereum Mainnet";
  if (chainId === 11_155_111) return "Sepolia";
  if (chainId === 8453) return "Base";
  if (chainId === 84_532) return "Base Sepolia";
  return `Chain ${chainId}`;
}

export function txExplorerUrl(chainId: number, txHash: string): string | null {
  const h = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  switch (chainId) {
    case 1:
      return `https://etherscan.io/tx/${h}`;
    case 11_155_111:
      return `https://sepolia.etherscan.io/tx/${h}`;
    case 8453:
      return `https://basescan.org/tx/${h}`;
    case 84_532:
      return `https://sepolia.basescan.org/tx/${h}`;
    case 31_337:
    default:
      return null;
  }
}

export function addressExplorerUrl(chainId: number, address: string): string | null {
  const a = address.startsWith("0x") ? address : `0x${address}`;
  switch (chainId) {
    case 1:
      return `https://etherscan.io/address/${a}`;
    case 11_155_111:
      return `https://sepolia.etherscan.io/address/${a}`;
    case 8453:
      return `https://basescan.org/address/${a}`;
    case 84_532:
      return `https://sepolia.basescan.org/address/${a}`;
    case 31_337:
    default:
      return null;
  }
}
