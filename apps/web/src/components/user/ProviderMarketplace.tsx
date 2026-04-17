"use client";

import { useMemo, useState } from "react";
import type { MockProvider, RiskLevel } from "@/lib/mockData";
import { ProviderCard, riskRank } from "@/components/user/ProviderCard";

type SimulateCallbacks = {
  action: (label: string) => void;
};

type SortKey = "price_asc" | "price_desc" | "risk_asc" | "risk_desc";

type ProviderMarketplaceProps = {
  providers: MockProvider[];
  simulate: SimulateCallbacks;
};

function matchesSearch(p: MockProvider, q: string): boolean {
  if (!q.trim()) return true;
  return p.modelId.toLowerCase().includes(q.trim().toLowerCase());
}

export function ProviderMarketplace({
  providers,
  simulate,
}: ProviderMarketplaceProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("price_asc");

  const filtered = useMemo(() => {
    const list = providers.filter((p) => matchesSearch(p, query));
    const next = [...list];
    next.sort((a, b) => {
      const pa = Number.parseFloat(a.pricePerCall);
      const pb = Number.parseFloat(b.pricePerCall);
      const ra = riskRank(a.risk as RiskLevel);
      const rb = riskRank(b.risk as RiskLevel);
      switch (sort) {
        case "price_asc":
          return pa - pb;
        case "price_desc":
          return pb - pa;
        case "risk_asc":
          return ra - rb;
        case "risk_desc":
          return rb - ra;
        default:
          return 0;
      }
    });
    return next;
  }, [providers, query, sort]);

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 border-b-2 border-theme pb-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="section-heading">Provider_Marketplace</h2>
        <span className="section-eyebrow">Mock catalog</span>
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
            <option value="risk_asc">Risk · low → high</option>
            <option value="risk_desc">Risk · high → low</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-theme p-12 text-center text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
          &lt;NO_MATCHING_PROVIDERS&gt;
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProviderCard key={p.id} provider={p} simulate={simulate} />
          ))}
        </div>
      )}
    </section>
  );
}
