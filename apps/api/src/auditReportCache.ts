import type { Hex } from "viem";

/** Keep recent anchored reports so the web UI can show full audit JSON (same relay process only). */
const MAX_ENTRIES = 64;
const byHash = new Map<string, string>();

export function cacheAuditReport(reportHash: Hex, canonicalJson: string): void {
  const k = reportHash.toLowerCase();
  if (byHash.has(k)) byHash.delete(k);
  byHash.set(k, canonicalJson);
  while (byHash.size > MAX_ENTRIES) {
    const first = byHash.keys().next().value as string;
    byHash.delete(first);
  }
}

export function getCachedAuditReport(reportHash: Hex): string | null {
  return byHash.get(reportHash.toLowerCase()) ?? null;
}
