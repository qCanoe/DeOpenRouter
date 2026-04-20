"use client";

import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { formatEther } from "viem";
import { shortenHex } from "@/lib/format";

type ProviderCallLogProps = {
  calls: CallLogRow[];
  isLoading?: boolean;
  resolveModelId: (providerId: number) => string;
};

export function ProviderCallLog({
  calls,
  isLoading,
  resolveModelId,
}: ProviderCallLogProps) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-4">
        <h2 className="section-heading">Incoming Calls</h2>
        <span className="section-eyebrow tabular-nums">Rows: {calls.length}</span>
      </div>

      {isLoading ? (
        <div className="card-modern flex flex-col items-center justify-center p-12 text-sm font-medium text-[var(--muted)]">
          <svg className="mb-4 h-6 w-6 animate-spin text-[var(--muted)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading logs...
        </div>
      ) : calls.length === 0 ? (
        <div className="card-modern border-dashed p-12 text-center text-sm font-medium text-[var(--muted)]">
          No calls yet
        </div>
      ) : (
        <div className="card-modern overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[var(--muted-bg)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Provider</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Model</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Caller</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Block</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Req Hash</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--muted)]">Resp Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--background)]">
              {calls.map((call) => (
                <tr key={call.id} className="transition-ui hover:bg-[var(--muted-bg)]">
                  <td className="whitespace-nowrap px-6 py-4 font-medium">#{String(call.providerId)}</td>
                  <td className="px-6 py-4 font-medium">{resolveModelId(Number(call.providerId))}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-[var(--muted)]">{shortenHex(call.caller, 4, 4)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-[var(--muted)] tabular-nums">#{String(call.blockNumber)}</td>
                  <td className="whitespace-nowrap px-6 py-4 tabular-nums">{formatEther(call.paid)} ETH</td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-[13px]">{shortenHex(call.requestHash, 6, 4)}</td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-[13px]">{shortenHex(call.responseHash, 6, 4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </section>
  );
}
