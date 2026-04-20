"use client";

import { useMemo, useState } from "react";
import type { Address } from "viem";
import { useAuditLogs } from "@/hooks/useAuditLogs";

function riskLabel(level: number): string {
  if (level === 2) return "HIGH";
  if (level === 1) return "MEDIUM";
  return "LOW";
}

type Props = {
  marketplace: Address | null;
};

export function AuditTransparencyPanel({ marketplace }: Props) {
  const { rows, loading, error, refetch } = useAuditLogs(marketplace);
  const [filterPid, setFilterPid] = useState<string>("");

  const filtered = useMemo(() => {
    if (!filterPid.trim()) return rows;
    const n = BigInt(filterPid.trim());
    return rows.filter((r) => r.providerId === n);
  }, [rows, filterPid]);

  if (!marketplace) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight">On-chain audit log</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Set <code className="rounded bg-[var(--muted-bg)] px-1.5 py-0.5 text-xs">NEXT_PUBLIC_MARKETPLACE_ADDRESS</code>{" "}
          to load <code className="rounded bg-[var(--muted-bg)] px-1.5 py-0.5 text-xs">AuditRecorded</code> events.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">On-chain audit log</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Anchored hashes from <span className="font-mono text-xs">recordAudit</span> /{" "}
            <span className="font-mono text-xs">recordAuditWithUri</span>. Verify off-chain JSON with the same canonical
            encoding as the relay (see repo docs).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
            Provider ID
            <input
              type="text"
              inputMode="numeric"
              placeholder="all"
              value={filterPid}
              onChange={(e) => setFilterPid(e.target.value)}
              className="w-28 rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-2 py-1.5 text-[var(--foreground)]"
            />
          </label>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--border)]"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {loading && <p className="mt-4 text-sm text-[var(--muted)]">Loading events…</p>}

      {!loading && filtered.length === 0 && (
        <p className="mt-4 text-sm text-[var(--muted)]">No audit events in this range.</p>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th className="py-2 pr-3 font-medium">Block</th>
                <th className="py-2 pr-3 font-medium">Provider</th>
                <th className="py-2 pr-3 font-medium">Risk</th>
                <th className="py-2 pr-3 font-medium">Report hash</th>
                <th className="py-2 pr-3 font-medium">URI</th>
                <th className="py-2 font-medium">Recorder</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.transactionHash}-${r.auditId}`} className="border-b border-[var(--border)]/60">
                  <td className="py-2 pr-3 font-mono text-xs">{r.blockNumber.toString()}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.providerId.toString()}</td>
                  <td className="py-2 pr-3">
                    <span className="rounded-md bg-[var(--muted-bg)] px-2 py-0.5 text-xs font-medium">
                      {riskLabel(r.riskLevel)}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate py-2 pr-3 font-mono text-xs" title={r.reportHash}>
                    {r.reportHash}
                  </td>
                  <td className="max-w-[180px] truncate py-2 pr-3 text-xs" title={r.reportUri ?? ""}>
                    {r.reportUri ? (
                      <a
                        href={r.reportUri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${r.reportUri.slice(7)}` : r.reportUri}
                        className="text-[var(--accent)] underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.reportUri}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="truncate py-2 font-mono text-xs" title={r.recorder}>
                    {r.recorder}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
