"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { ProviderCard } from "@/components/user/ProviderCard";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";

type SortKey = "price_asc" | "price_desc" | "model_asc";

type ProviderMarketplaceProps = {
  marketplace: Address | null;
  rows: ChainProviderRow[];
  isLoading: boolean;
  onInvoked?: () => void;
};

function matchesSearch(provider: ChainProviderRow, query: string): boolean {
  if (!query.trim()) return true;
  return provider.modelId.toLowerCase().includes(query.trim().toLowerCase());
}

export function ProviderMarketplace({
  marketplace,
  rows,
  isLoading,
  onInvoked,
}: ProviderMarketplaceProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("price_asc");

  const filtered = useMemo(() => {
    const list = rows.filter((provider) => matchesSearch(provider, query));
    const next = [...list];
    next.sort((a, b) => {
      const priceA = a.effectivePriceWei;
      const priceB = b.effectivePriceWei;
      switch (sort) {
        case "price_asc":
          return priceA < priceB ? -1 : priceA > priceB ? 1 : 0;
        case "price_desc":
          return priceB < priceA ? -1 : priceB > priceA ? 1 : 0;
        case "model_asc":
          return a.modelId.localeCompare(b.modelId);
        default:
          return 0;
      }
    });
    return next;
  }, [rows, query, sort]);

  if (!marketplace) {
    return (
      <section>
        <div className="mb-8 flex flex-col gap-4 border-b-2 border-theme pb-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="section-heading">Provider_Marketplace</h2>
          <span className="section-eyebrow">On-chain</span>
        </div>
        <div className="border-2 border-dashed border-theme p-12 text-center text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
          <p className="mb-4">Set NEXT_PUBLIC_MARKETPLACE_ADDRESS in apps/web/.env.local</p>
          <p>
            Deploy with{" "}
            <code className="text-foreground">
              forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
            </code>{" "}
            (see repo README), then paste the contract address.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 border-b-2 border-theme pb-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="section-heading">Provider_Marketplace</h2>
        <span className="section-eyebrow">On-chain catalog</span>
      </div>

      <div className="mb-8 flex flex-col gap-4 lg:flex-row">
        <label className="flex flex-1 flex-col gap-2">
          <span className="section-eyebrow">Search modelId</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. llama"
            className="input-brutal min-h-[44px]"
          />
        </label>
        <label className="flex w-full flex-col gap-2 lg:w-64">
          <span className="section-eyebrow">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="input-brutal min-h-[44px] cursor-pointer bg-background font-bold uppercase tracking-widest"
          >
            <option value="price_asc">Price / low to high</option>
            <option value="price_desc">Price / high to low</option>
            <option value="model_asc">Model / A to Z</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase tracking-widest text-muted">
          LOADING PROVIDERS...
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-theme p-12 text-center text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
          &lt;NO_PROVIDERS_REGISTERED&gt;
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              marketplace={marketplace}
              row={provider}
              onInvoked={onInvoked}
            />
          ))}
        </div>
      )}
    </section>
  );
}
