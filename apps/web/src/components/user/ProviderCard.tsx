"use client";

import { useMemo, useState } from "react";
import { formatEther, type Address } from "viem";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import { shortenHex } from "@/lib/format";
import { resolveProviderMetrics } from "@/lib/providerMetrics";
import { PlaygroundModal } from "@/components/user/PlaygroundModal";
import { ProviderAuditModal } from "@/components/user/ProviderAuditModal";
import { ProviderApiKeyModal } from "@/components/user/ProviderApiKeyModal";
import type { ApiRequestHistoryRow } from "@/lib/apiRequestHistoryDemo";
import type { AuditLogRow } from "@/hooks/useAuditLogs";
import { CopyableHash } from "@/components/ui/CopyableHash";

export type ProviderCardProps = {
  marketplace: Address;
  row: ChainProviderRow;
  onInvoked?: () => void;
  onRelayChatLogged?: (entry: ApiRequestHistoryRow) => void;
  auditRows: AuditLogRow[];
  auditLoading: boolean;
  auditError: string | null;
  onAuditRefetch: () => void;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{label}</div>
      <div className="truncate text-sm font-bold tabular-nums text-[var(--foreground)]">{value}</div>
    </div>
  );
}

export function ProviderCard({
  marketplace,
  row,
  onInvoked,
  onRelayChatLogged,
  auditRows,
  auditLoading,
  auditError,
  onAuditRefetch,
}: ProviderCardProps) {
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const metrics = useMemo(() => resolveProviderMetrics(row), [row]);

  const pendingSlotMinClass = "min-h-[2rem] pt-1.5";
  const useDemoInvoke = row.demoCatalog === true;

  return (
    <>
      <article className="card-modern flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex min-h-[5rem] shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
              {row.modelId}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              <span className="text-[var(--foreground)]/70">Owner</span>
              <span className="rounded-md border border-[var(--border)]/50 bg-[var(--muted-bg)] px-1.5 py-0.5 font-mono text-[11px]">
                {shortenHex(row.owner, 6, 4)}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ${
                row.active
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "bg-[var(--muted-bg)] text-[var(--muted)]"
              }`}
            >
              {row.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        <div className="flex min-h-[8rem] shrink-0 items-stretch divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--muted-bg)]/30">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Effective Price</div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-[var(--foreground)] sm:text-3xl">
              {formatEther(row.effectivePriceWei)}{" "}
              <span className="text-sm font-semibold text-[var(--muted)]">ETH</span>
            </div>
            <div className={pendingSlotMinClass}>
              {row.hasPendingPrice ? (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Pending {formatEther(row.pendingPriceDisplay)} ETH @ block {row.pendingAppliesAtBlock.toString()}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Stake</div>
            <div className="text-2xl font-bold tabular-nums tracking-tight text-[var(--foreground)] sm:text-3xl">
              {formatEther(row.stake)} <span className="text-sm font-semibold text-[var(--muted)]">ETH</span>
            </div>
            <div className={pendingSlotMinClass}>
              <p className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--muted)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Lock: {row.stakeLockBlocks.toString()} blocks
              </p>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-b border-[var(--border)] p-5">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
            Performance & routing
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <Stat label="p50 latency" value={`${metrics.latencyP50Ms} ms`} />
            <Stat label="p99 latency" value={`${metrics.latencyP99Ms} ms`} />
            <Stat label="Throughput" value={`${metrics.throughputRpm} rpm`} />
            <Stat label="Uptime (30d)" value={`${metrics.uptimePct.toFixed(2)}%`} />
            <Stat label="24h requests" value={metrics.requests24h.toLocaleString()} />
            <Stat label="Success rate" value={`${metrics.successRatePct.toFixed(2)}%`} />
            <Stat label="Region" value={metrics.region} />
            <Stat label="Context" value={metrics.contextWindow} />
          </div>
        </div>

        <div className="flex min-h-[4rem] shrink-0 flex-col justify-center gap-2.5 border-b border-[var(--border)] bg-[var(--muted-bg)]/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Endpoint Commitment</span>
            <span className="rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
              v{row.modelVersion}
            </span>
          </div>
          <CopyableHash hash={row.endpointCommitment} />
        </div>

        <div className="mt-auto grid shrink-0 grid-cols-1 gap-2.5 bg-[var(--muted-bg)]/10 p-5 sm:grid-cols-3">
          <button
            type="button"
            className="btn-secondary h-auto rounded-xl border-[var(--border)]/80 py-2.5 text-sm font-semibold"
            onClick={() => setIsAuditOpen(true)}
          >
            Audit
          </button>
          <button
            type="button"
            disabled={!row.active}
            className="btn-secondary h-auto rounded-xl border-[var(--border)]/80 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setIsPlaygroundOpen(true)}
          >
            Playground
          </button>
          <button
            type="button"
            className="btn-secondary h-auto rounded-xl border-[var(--border)]/80 py-2.5 text-sm font-semibold"
            onClick={() => setIsApiKeyOpen(true)}
          >
            API key
          </button>
        </div>
      </article>

      <ProviderAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        providerId={row.id}
        modelId={row.modelId}
        rows={auditRows}
        loading={auditLoading}
        error={auditError}
        onRefresh={onAuditRefetch}
      />

      <ProviderApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        marketplace={marketplace}
        row={row}
      />

      <PlaygroundModal
        isOpen={isPlaygroundOpen}
        onClose={() => setIsPlaygroundOpen(false)}
        marketplace={marketplace}
        row={row}
        isMock={useDemoInvoke}
        onInvoked={onInvoked}
        onRelayChatLogged={onRelayChatLogged}
      />
    </>
  );
}
