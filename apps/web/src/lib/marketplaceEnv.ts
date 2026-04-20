import { type Address, isAddress } from "viem";

/**
 * Next.js only inlines `NEXT_PUBLIC_*` when accessed as a static property
 * (`process.env.NEXT_PUBLIC_FOO`). Dynamic `process.env[name]` is undefined
 * in the browser bundle, which caused SSR/client marketplace mismatch.
 */
function trimEnv(v: string | undefined): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function getMarketplaceAddress(): Address | null {
  const raw = trimEnv(process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS);
  if (!raw || raw === "0xYourDeployedAddress") return null;
  return isAddress(raw) ? (raw as Address) : null;
}

/** Default matches the mock API URL documented in README. */
export function getMockApiBase(): string {
  return trimEnv(process.env.NEXT_PUBLIC_MOCK_API) ?? "http://127.0.0.1:8787";
}
