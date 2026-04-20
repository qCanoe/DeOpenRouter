"use client";

import { useMemo, useState } from "react";
import { formatEther, type Address } from "viem";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import { shortenHex } from "@/lib/format";
import { resolveProviderMetrics } from "@/lib/providerMetrics";
import { PlaygroundModal } from "@/components/user/PlaygroundModal";

export type ProviderCardProps = {
  marketplace: Address;
  row: ChainProviderRow;
  onInvoked?: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className="truncate text-xs font-semibold tabular-nums text-[var(--foreground)]">{value}</div>
    </div>
  );
}

export function ProviderCard({ marketplace, row, onInvoked }: ProviderCardProps) {
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const metrics = useMemo(() => resolveProviderMetrics(row), [row]);

  const pendingSlotMinClass = "min-h-[2rem] pt-1";
  const useDemoInvoke = row.demoCatalog === true;

  return (
    <>
      <article className="card-modern flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex min-h-[6rem] shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xl font-semibold tracking-tight sm:text-2xl">{row.modelId}</h3>
            <p className="mt-1 truncate text-xs font-medium text-[var(--muted)]">
              Owner: {shortenHex(row.owner, 6, 4)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider ${
                row.active
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "bg-[var(--muted-bg)] text-[var(--muted)]"
              }`}
            >
              {row.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        <div className="flex min-h-[9rem] shrink-0 items-stretch border-b border-[var(--border)]">
          <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--border)] p-5">
            <div className="mb-2 text-xs font-medium text-[var(--muted)]">Effective Price</div>
            <div className="text-xl font-semibold tabular-nums tracking-tight">
              {formatEther(row.effectivePriceWei)}{" "}
              <span className="text-sm font-medium text-[var(--muted)]">ETH</span>
            </div>
            <div className={pendingSlotMinClass}>
              {row.hasPendingPrice ? (
                <p className="text-[11px] text-[var(--muted)]">
                  Pending {formatEther(row.pendingPriceDisplay)} ETH @ block {row.pendingAppliesAtBlock.toString()}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-5">
            <div className="mb-2 text-xs font-medium text-[var(--muted)]">Stake</div>
            <div className="text-xl font-semibold tabular-nums tracking-tight">
              {formatEther(row.stake)} <span className="text-sm font-medium text-[var(--muted)]">ETH</span>
            </div>
            <div className={pendingSlotMinClass}>
              <p className="text-[11px] text-[var(--muted)]">
                Lock: {row.stakeLockBlocks.toString()} blocks
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-b border-[var(--border)] bg-[var(--muted-bg)]/60 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Performance & routing
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
            <Stat label="p50 latency" value={`${metrics.latencyP50Ms} ms`} />
            <Stat label="p99 latency" value={`${metrics.latencyP99Ms} ms`} />
            <Stat label="Throughput" value={`${metrics.throughputRpm} rpm`} />
            <Stat label="Uptime (30d)" value={`${metrics.uptimePct.toFixed(2)}%`} />
            <Stat label="24h requests" value={metrics.requests24h.toLocaleString()} />
            <Stat label="Success rate" value={`${metrics.successRatePct.toFixed(2)}%`} />
            <Stat label="Region" value={metrics.region} />
            <Stat label="Context" value={metrics.contextWindow} />
          </div>
          <p className="mt-3 truncate text-[11px] text-[var(--muted)]">
            <span className="font-medium text-[var(--foreground)]/80">API:</span> {metrics.apiFormat}
          </p>
        </div>

        <div className="min-h-[4.5rem] shrink-0 border-b border-[var(--border)] bg-[var(--muted-bg)] p-5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--muted)]">Endpoint Commitment</span>
            <span className="text-[10px] font-medium text-[var(--muted)]">v{row.modelVersion}</span>
          </div>
          <div className="truncate font-mono text-[13px] text-[var(--foreground)]">
            {shortenHex(row.endpointCommitment, 6, 6)}
          </div>
        </div>

        <div className="mt-auto shrink-0 p-5">
          <button
            type="button"
            disabled={!row.active}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setIsPlaygroundOpen(true)}
          >
            {!row.active ? "Provider Inactive" : "Open playground"}
          </button>
        </div>
      </article>

      <PlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        marketplace={marketplace}
        row={row}
        isMock={useDemoInvoke}
        onInvoked={onInvoked}
      />
    </>
  );
}
