"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChainId } from "wagmi";
import { zeroAddress, type Address } from "viem";
import { ProviderCard } from "@/components/user/ProviderCard";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import type { AuditLogRow } from "@/hooks/useAuditLogs";
import type { ApiRequestHistoryRow } from "@/lib/apiRequestHistoryDemo";
import { DEMO_MARKETPLACE_ROWS } from "@/lib/providerDemoData";
import { resolveProviderMetrics } from "@/lib/providerMetrics";
import { OnChainSheet } from "@/components/chain/OnChainSheet";
import { MarketplaceOnChainDetails } from "@/components/chain/MarketplaceOnChainDetails";
import { MOCK_PANEL_COPY, ON_CHAIN_PANEL_DESIGN_MOCK } from "@/lib/mockOnChainPanel";

type SortKey = "price_asc" | "price_desc" | "model_asc";

type ProviderMarketplaceProps = {
  marketplace: Address | null;
  rows: ChainProviderRow[];
  isLoading: boolean;
  onInvoked?: () => void;
  onRelayChatLogged?: (entry: ApiRequestHistoryRow) => void;
  auditRows: AuditLogRow[];
  auditLoading: boolean;
  auditError: string | null;
  onAuditRefetch: () => void;
};

function matchesSearch(provider: ChainProviderRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const m = resolveProviderMetrics(provider);
  return (
    provider.modelId.toLowerCase().includes(q) ||
    m.region.toLowerCase().includes(q) ||
    m.apiFormat.toLowerCase().includes(q)
  );
}

function CustomSortDropdown({
  sort,
  setSort,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { value: SortKey; label: string }[] = [
    { value: "price_asc", label: "Price / low to high" },
    { value: "price_desc", label: "Price / high to low" },
    { value: "model_asc", label: "Model / A to Z" },
  ];

  const currentLabel = options.find((o) => o.value === sort)?.label;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="input-modern flex w-full items-center justify-between bg-[var(--background)] text-left shadow-sm"
      >
        <span className="truncate">{currentLabel}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-1.5 shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSort(option.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-[var(--muted-bg)] ${
                sort === option.value
                  ? "font-medium text-[var(--foreground)] bg-[var(--muted-bg)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {sort === option.value && (
                <svg
                  className="ml-auto h-4 w-4 shrink-0 text-[var(--foreground)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProviderMarketplace({
  marketplace,
  rows,
  isLoading,
  onInvoked,
  onRelayChatLogged,
  auditRows,
  auditLoading,
  auditError,
  onAuditRefetch,
}: ProviderMarketplaceProps) {
  const chainId = useChainId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("price_asc");
  const [chainPanelOpen, setChainPanelOpen] = useState(false);

  const combinedRows = useMemo(() => {
    const demo = [...DEMO_MARKETPLACE_ROWS];
    return [...rows, ...demo];
  }, [rows]);

  const filtered = useMemo(() => {
    const list = combinedRows.filter((provider) => matchesSearch(provider, query));
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
  }, [combinedRows, query, sort]);

  const resolvedMarketplace = marketplace ?? zeroAddress;

  return (
    <section>
      <div className="mb-8 flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="section-heading">API Providers</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Browse models, compare pricing and throughput, and open the playground to try a call.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <span className="section-eyebrow">Demo catalog</span>
          <button
            type="button"
            className="btn-secondary w-full px-4 py-2.5 text-sm font-medium sm:w-auto"
            onClick={() => setChainPanelOpen(true)}
          >
            View on chain
          </button>
        </div>
      </div>

      {!marketplace && (
        <p className="mb-6 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)]/50 px-4 py-3 text-sm text-[var(--muted)]">
          Optional: set{" "}
          <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[var(--foreground)]">
            NEXT_PUBLIC_MARKETPLACE_ADDRESS
          </code>{" "}
          in{" "}
          <code className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[var(--foreground)]">
            apps/web/.env.local
          </code>{" "}
          to list providers from your deployed contract alongside the samples below.
        </p>
      )}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row">
        <label className="flex flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-[var(--muted)]">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Model, region, or API format…"
            className="input-modern"
          />
        </label>
        <label className="flex w-full flex-col gap-2 lg:w-64">
          <span className="text-sm font-medium text-[var(--muted)]">Sort By</span>
          <CustomSortDropdown sort={sort} setSort={setSort} />
        </label>
      </div>

      {marketplace && isLoading && (
        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted)]">
          <svg
            className="h-4 w-4 shrink-0 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Syncing on-chain provider list…
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] px-6 py-20 text-center shadow-sm">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)]/50 bg-[var(--muted-bg)] text-[var(--muted)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">No providers found</h3>
          <p className="mb-6 max-w-sm text-sm text-[var(--muted)]">
            We couldn&apos;t find any providers matching your current search or sort. Try clearing the search.
          </p>
          <button type="button" className="btn-secondary px-5 py-2 text-sm font-semibold" onClick={() => setQuery("")}>
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3 [&>*]:min-h-0 [&>*]:h-full">
          {filtered.map((provider) => (
            <ProviderCard
              key={`${provider.id}-${provider.modelId}`}
              marketplace={resolvedMarketplace}
              row={provider}
              onInvoked={onInvoked}
              onRelayChatLogged={onRelayChatLogged}
              auditRows={auditRows}
              auditLoading={auditLoading}
              auditError={auditError}
              onAuditRefetch={onAuditRefetch}
            />
          ))}
        </div>
      )}

      <OnChainSheet
        open={chainPanelOpen}
        onClose={() => setChainPanelOpen(false)}
        title={
          ON_CHAIN_PANEL_DESIGN_MOCK
            ? MOCK_PANEL_COPY.sheetMarketplaceTitle
            : "Marketplace on chain"
        }
        description={
          ON_CHAIN_PANEL_DESIGN_MOCK
            ? MOCK_PANEL_COPY.sheetMarketplaceDesc
            : "Contract address, network, and full provider structs as read from the registry."
        }
      >
        <MarketplaceOnChainDetails marketplace={marketplace} chainId={chainId} providers={rows} />
      </OnChainSheet>
    </section>
  );
}
