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

function matchesSearch(p: ChainProviderRow, q: string): boolean {
  if (!q.trim()) return true;
  return p.modelId.toLowerCase().includes(q.trim().toLowerCase());
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
    const list = rows.filter((p) => matchesSearch(p, query));
    const next = [...list];
    next.sort((a, b) => {
      const pa = a.pricePerCall;
      const pb = b.pricePerCall;
      switch (sort) {
        case "price_asc":
          return pa < pb ? -1 : pa > pb ? 1 : 0;
        case "price_desc":
          return pb < pa ? -1 : pb > pa ? 1 : 0;
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
            <option value="price_asc">Price · low → high</option>
            <option value="price_desc">Price · high → low</option>
            <option value="model_asc">Model A → Z</option>
          </select>
        </label>
      </div>

      {isLoading ? (
        <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase tracking-widest text-muted">
          LOADING PROVIDERS…
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-2 border-dashed border-theme p-12 text-center text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
          &lt;NO_PROVIDERS_REGISTERED&gt;
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProviderCard
              key={p.id}
              marketplace={marketplace}
              row={p}
              onInvoked={onInvoked}
            />
          ))}
        </div>
      )}
    </section>
  );
}
