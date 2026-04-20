"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChainId } from "wagmi";
import type { Address } from "viem";
import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { formatEther } from "viem";
import { shortenHex } from "@/lib/format";
import {
  formatProtocolFormats,
  formatRecordedAt,
  formatSettlementStatus,
} from "@/lib/callLogDisplay";
import { OnChainSheet } from "@/components/chain/OnChainSheet";
import { CallRecordOnChainDetails } from "@/components/chain/CallRecordOnChainDetails";
import { MOCK_PANEL_COPY, ON_CHAIN_PANEL_DESIGN_MOCK } from "@/lib/mockOnChainPanel";

type MyCallHistoryProps = {
  calls: CallLogRow[];
  resolveModelId: (providerId: number) => string;
  isLoading?: boolean;
  marketplace: Address | null;
};

const SCROLLBAR_REVEAL_MS = 900;

export function MyCallHistory({
  calls,
  resolveModelId,
  isLoading,
  marketplace,
}: MyCallHistoryProps) {
  const chainId = useChainId();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scrollbarReveal, setScrollbarReveal] = useState(false);
  const [chainDetailCall, setChainDetailCall] = useState<CallLogRow | null>(null);

  const bumpScrollbarReveal = useCallback(() => {
    setScrollbarReveal(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setScrollbarReveal(false);
      hideTimer.current = null;
    }, SCROLLBAR_REVEAL_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <section>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-4">
        <div>
          <h2 className="section-heading">My Call History</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Settlement events include request/response hashes, usage units, and protocol format ids from{" "}
            <code className="rounded bg-[var(--muted-bg)] px-1 py-0.5 font-mono text-[13px]">CallRecorded</code>.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="section-eyebrow tabular-nums">Rows: {calls.length}</span>
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <svg
                className="h-3.5 w-3.5 shrink-0 animate-spin"
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
              Syncing wallet logs…
            </span>
          ) : null}
        </div>
      </div>

      {calls.length === 0 ? (
        <div className="card-modern border-dashed p-12 text-center text-sm font-medium text-[var(--muted)]">
          No calls yet
        </div>
      ) : (
        <div className="card-modern overflow-hidden">
          <div
            className={`scroll-fade-x scroll-fade-x--inset overflow-x-auto ${scrollbarReveal ? "scroll-fade-x--reveal" : ""}`}
            onScroll={bumpScrollbarReveal}
          >
            <table className="min-w-[78rem] border-collapse text-left text-sm">
            <thead className="bg-[var(--muted-bg)] border-b border-[var(--border)]">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">
                  Recorded (chain time)
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Block</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Call ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Provider</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Model</th>
                <th className="max-w-[12rem] px-4 py-3 text-xs font-semibold text-[var(--muted)]">
                  Prompt summary
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Paid</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Usage units</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">RTT</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Request hash</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Response hash</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Tx</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Formats</th>
                <th className="px-4 py-3 text-xs font-semibold text-[var(--muted)]">Settlement</th>
                <th className="sticky right-0 z-[1] bg-[var(--muted-bg)] px-4 py-3 text-xs font-semibold text-[var(--muted)] shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.12)]">
                  On chain
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--background)]">
              {calls.map((call) => (
                <tr key={call.id} className="group transition-ui hover:bg-[var(--muted-bg)]">
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--foreground)]">
                    {formatRecordedAt(call.recordedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted)]">
                    #{String(call.blockNumber)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] tabular-nums text-[var(--foreground)]">
                    {String(call.callId)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium">#{String(call.providerId)}</td>
                  <td className="px-4 py-3 font-medium">{resolveModelId(Number(call.providerId))}</td>
                  <td
                    className="max-w-[12rem] px-4 py-3 text-[13px] text-[var(--muted)]"
                    title={call.promptSummary ?? undefined}
                  >
                    {call.promptSummary ? (
                      <span className="line-clamp-2">{call.promptSummary}</span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{formatEther(call.paid)} ETH</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted)]">
                    {call.usageUnits != null ? call.usageUnits.toLocaleString() : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-[var(--muted)]">
                    {call.latencyMs != null ? `${call.latencyMs} ms` : "—"}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 font-mono text-[13px]"
                    title={call.requestHash}
                  >
                    {shortenHex(call.requestHash, 6, 4)}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 font-mono text-[13px]"
                    title={call.responseHash}
                  >
                    {shortenHex(call.responseHash, 6, 4)}
                  </td>
                  <td
                    className="whitespace-nowrap px-4 py-3 font-mono text-[13px]"
                    title={call.txHash}
                  >
                    {shortenHex(call.txHash, 6, 4)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--muted)]">
                    {formatProtocolFormats(call.requestFormat, call.responseFormat)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px]">
                    {formatSettlementStatus(call.settlementStatus)}
                  </td>
                  <td className="sticky right-0 z-[1] bg-[var(--background)] px-3 py-2 shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.08)] transition-colors group-hover:bg-[var(--muted-bg)]">
                    <button
                      type="button"
                      className="whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-ui hover:bg-[var(--background)]"
                      onClick={() => setChainDetailCall(call)}
                    >
                      View on chain
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <OnChainSheet
        open={chainDetailCall != null}
        onClose={() => setChainDetailCall(null)}
        title={ON_CHAIN_PANEL_DESIGN_MOCK ? MOCK_PANEL_COPY.sheetCallTitle : "Call on chain"}
        description={
          ON_CHAIN_PANEL_DESIGN_MOCK
            ? MOCK_PANEL_COPY.sheetCallDesc
            : "Settlement log fields and transaction context for this row."
        }
      >
        {chainDetailCall ? (
          <CallRecordOnChainDetails
            call={chainDetailCall}
            marketplace={marketplace}
            chainId={chainId}
          />
        ) : null}
      </OnChainSheet>
    </section>
  );
}
