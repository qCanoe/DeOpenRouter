"use client";

import { useChainId, useReadContracts } from "wagmi";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import type { Address, Hex } from "viem";

/** Display-only stats for marketplace cards (optional on chain rows; filled by resolver). */
export type ProviderMarketplaceMetrics = {
  latencyP50Ms: number;
  latencyP99Ms: number;
  throughputRpm: number;
  uptimePct: number;
  requests24h: number;
  successRatePct: number;
  region: string;
  apiFormat: string;
  contextWindow: string;
};

export type ChainProviderRow = {
  id: number;
  owner: Address;
  modelId: string;
  modelVersion: string;
  endpointCommitment: Hex;
  capabilityHash: Hex;
  /** Stored `pricePerCall` before pending apply (may match effective after invoke). */
  pricePerCall: bigint;
  pendingPriceWei: bigint;
  pendingEffectiveBlock: bigint;
  /** Amount `invoke` must send (after pending price is applied at current block). */
  effectivePriceWei: bigint;
  hasPendingPrice: boolean;
  pendingPriceDisplay: bigint;
  pendingAppliesAtBlock: bigint;
  stake: bigint;
  stakeLockBlocks: bigint;
  /** Registration block; used with `stakeLockBlocks` for `withdrawStake` eligibility. */
  createdAtBlock: bigint;
  active: boolean;
  metadataURI: string;
  metadataHash: Hex;
  identityHash: Hex;
  /** When set, playground skips wallet and uses the demo invoke flow. */
  demoCatalog?: boolean;
  metrics?: ProviderMarketplaceMetrics;
};

/**
 * The contract never deletes a provider; after deactivate + withdraw, stake is 0 and active is false.
 * Hide those rows in the UI so finished providers "disappear" while staying on-chain for audit.
 */
export function isChainProviderVisibleInCatalog(row: ChainProviderRow): boolean {
  if (row.demoCatalog) return true;
  return row.active || row.stake > 0n;
}

type ProviderTuple = {
  owner: Address;
  modelId: string;
  modelVersion: string;
  endpointCommitment: Hex;
  capabilityHash: Hex;
  pricePerCall: bigint;
  pendingPriceWei: bigint;
  pendingEffectiveBlock: bigint;
  stake: bigint;
  stakeLockBlocks: bigint;
  createdAtBlock: bigint;
  active: boolean;
  metadataURI: string;
  metadataHash: Hex;
  identityHash: Hex;
};

/** `readContract` / batched reads may return a struct as named object or positional tuple. */
function parseProviderTuple(raw: unknown): ProviderTuple | null {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length >= 14) {
    const [
      owner,
      modelId,
      modelVersion,
      endpointCommitment,
      capabilityHash,
      pricePerCall,
      pendingPriceWei,
      pendingEffectiveBlock,
      stake,
      stakeLockBlocks,
      active,
      metadataURI,
      metadataHash,
      identityHash,
      createdAtBlock,
    ] = raw;
    return {
      owner: owner as Address,
      modelId: typeof modelId === "string" ? modelId : "",
      modelVersion: typeof modelVersion === "string" ? modelVersion : "",
      endpointCommitment: endpointCommitment as Hex,
      capabilityHash: capabilityHash as Hex,
      pricePerCall: pricePerCall as bigint,
      pendingPriceWei: pendingPriceWei as bigint,
      pendingEffectiveBlock: pendingEffectiveBlock as bigint,
      stake: stake as bigint,
      stakeLockBlocks: stakeLockBlocks as bigint,
      createdAtBlock: raw.length >= 15 && typeof createdAtBlock === "bigint" ? createdAtBlock : 0n,
      active: Boolean(active),
      metadataURI: typeof metadataURI === "string" ? metadataURI : "",
      metadataHash: metadataHash as Hex,
      identityHash: identityHash as Hex,
    };
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.owner !== "string") return null;
    return {
      owner: o.owner as Address,
      modelId: typeof o.modelId === "string" ? o.modelId : "",
      modelVersion: typeof o.modelVersion === "string" ? o.modelVersion : "",
      endpointCommitment: o.endpointCommitment as Hex,
      capabilityHash: o.capabilityHash as Hex,
      pricePerCall: o.pricePerCall as bigint,
      pendingPriceWei: o.pendingPriceWei as bigint,
      pendingEffectiveBlock: o.pendingEffectiveBlock as bigint,
      stake: o.stake as bigint,
      stakeLockBlocks: o.stakeLockBlocks as bigint,
      createdAtBlock: typeof o.createdAtBlock === "bigint" ? o.createdAtBlock : 0n,
      active: Boolean(o.active),
      metadataURI: typeof o.metadataURI === "string" ? o.metadataURI : "",
      metadataHash: o.metadataHash as Hex,
      identityHash: o.identityHash as Hex,
    };
  }
  return null;
}

type UseMarketplaceProvidersArgs = {
  marketplace: Address | null;
};

export function useMarketplaceProviders({
  marketplace,
}: UseMarketplaceProvidersArgs) {
  const chainId = useChainId();

  const nextIdQuery = useReadContracts({
    contracts: marketplace
      ? [
          {
            address: marketplace,
            abi: marketplaceAbi,
            functionName: "nextProviderId",
          },
        ]
      : [],
    query: { enabled: !!marketplace && !!chainId },
  });

  const next =
    nextIdQuery.data?.[0]?.status === "success"
      ? nextIdQuery.data[0].result
      : undefined;

  const count = typeof next === "bigint" ? Number(next) : 0;

  const idContracts = marketplace
    ? Array.from({ length: count }, (_, i) => ({
        address: marketplace,
        abi: marketplaceAbi,
        functionName: "providers" as const,
        args: [BigInt(i)] as const,
      }))
    : [];

  const providersQuery = useReadContracts({
    contracts: idContracts,
    query: {
      enabled: !!marketplace && !!chainId && count > 0,
    },
  });

  const priceContracts = marketplace
    ? Array.from({ length: count }, (_, i) => ({
        address: marketplace,
        abi: marketplaceAbi,
        functionName: "getEffectivePrice" as const,
        args: [BigInt(i)] as const,
      }))
    : [];

  const effectivePriceQuery = useReadContracts({
    contracts: priceContracts,
    query: {
      enabled: !!marketplace && !!chainId && count > 0,
    },
  });

  const rows: ChainProviderRow[] = [];
  if (providersQuery.data && effectivePriceQuery.data && count > 0) {
    for (let i = 0; i < count; i++) {
      const r = providersQuery.data[i];
      const pr = effectivePriceQuery.data[i];
      if (r?.status !== "success" || !r.result) continue;
      const tuple = parseProviderTuple(r.result);
      if (!tuple) continue;

      let effectivePriceWei = tuple.pricePerCall;
      let hasPendingPrice = false;
      let pendingPriceDisplay = 0n;
      let pendingAppliesAtBlock = 0n;
      if (pr?.status === "success" && pr.result) {
        const eff = pr.result as readonly [bigint, boolean, bigint, bigint];
        effectivePriceWei = eff[0];
        hasPendingPrice = eff[1];
        pendingPriceDisplay = eff[2];
        pendingAppliesAtBlock = eff[3];
      }

      rows.push({
        id: i,
        owner: tuple.owner,
        modelId: tuple.modelId,
        modelVersion: tuple.modelVersion,
        endpointCommitment: tuple.endpointCommitment,
        capabilityHash: tuple.capabilityHash,
        pricePerCall: tuple.pricePerCall,
        pendingPriceWei: tuple.pendingPriceWei,
        pendingEffectiveBlock: tuple.pendingEffectiveBlock,
        effectivePriceWei,
        hasPendingPrice,
        pendingPriceDisplay,
        pendingAppliesAtBlock,
        stake: tuple.stake,
        stakeLockBlocks: tuple.stakeLockBlocks,
        createdAtBlock: tuple.createdAtBlock,
        active: tuple.active,
        metadataURI: tuple.metadataURI,
        metadataHash: tuple.metadataHash,
        identityHash: tuple.identityHash,
      });
    }
  }

  const isLoading =
    nextIdQuery.isLoading ||
    (count > 0 && (providersQuery.isLoading || effectivePriceQuery.isLoading));

  return {
    rows,
    isLoading,
    refetch: () => {
      void nextIdQuery.refetch();
      void providersQuery.refetch();
      void effectivePriceQuery.refetch();
    },
  };
}
