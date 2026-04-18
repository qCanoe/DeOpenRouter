import { type Address, isAddress } from "viem";

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[name];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function getMarketplaceAddress(): Address | null {
  const raw = readEnv("NEXT_PUBLIC_MARKETPLACE_ADDRESS");
  if (!raw || raw === "0xYourDeployedAddress") return null;
  return isAddress(raw) ? (raw as Address) : null;
}

/** 默认与 README 中 mock API 一致 */
export function getMockApiBase(): string {
  return readEnv("NEXT_PUBLIC_MOCK_API") ?? "http://127.0.0.1:8787";
}
