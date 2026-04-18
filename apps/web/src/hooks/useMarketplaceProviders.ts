"use client";

import { useChainId, useReadContracts } from "wagmi";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import type { Address, Hex } from "viem";

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
  active: boolean;
  metadataURI: string;
  metadataHash: Hex;
  identityHash: Hex;
};

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
      const tuple = r.result as unknown as {
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
        active: boolean;
        metadataURI: string;
        metadataHash: Hex;
        identityHash: Hex;
      };

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
