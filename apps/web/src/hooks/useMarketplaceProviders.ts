"use client";

import { useChainId, useReadContracts } from "wagmi";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import type { Address, Hex } from "viem";

export type ChainProviderRow = {
  id: number;
  owner: Address;
  modelId: string;
  endpoint: string;
  pricePerCall: bigint;
  stake: bigint;
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

  const rows: ChainProviderRow[] = [];
  if (providersQuery.data && count > 0) {
    for (let i = 0; i < count; i++) {
      const r = providersQuery.data[i];
      if (r?.status !== "success" || !r.result) continue;
      const tuple = r.result as unknown as {
        owner: Address;
        modelId: string;
        endpoint: string;
        pricePerCall: bigint;
        stake: bigint;
        active: boolean;
        metadataURI: string;
        metadataHash: Hex;
        identityHash: Hex;
      };
      rows.push({
        id: i,
        owner: tuple.owner,
        modelId: tuple.modelId,
        endpoint: tuple.endpoint,
        pricePerCall: tuple.pricePerCall,
        stake: tuple.stake,
        active: tuple.active,
        metadataURI: tuple.metadataURI,
        metadataHash: tuple.metadataHash,
        identityHash: tuple.identityHash,
      });
    }
  }

  const isLoading =
    nextIdQuery.isLoading || (count > 0 && providersQuery.isLoading);

  return {
    rows,
    isLoading,
    refetch: () => {
      void nextIdQuery.refetch();
      void providersQuery.refetch();
    },
  };
}
