import type { ApiRequestHistoryRow } from "@/lib/apiRequestHistoryDemo";
import { API_REQUEST_DISCLAIMER } from "@/lib/apiRequestHistoryDemo";

type ApiRequestHistoryProps = {
  rows: readonly ApiRequestHistoryRow[];
};

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

export function ApiRequestHistory({ rows }: ApiRequestHistoryProps) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="section-heading">API request history</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Upstream-style receipts: request id, route, token counts, and illustrative USD. Playground relay calls
            appear at the top for this session; sample rows below are demo fixtures.
          </p>
        </div>
        <span className="section-eyebrow tabular-nums">Rows: {rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="card-modern border-dashed p-12 text-center text-sm font-medium text-[var(--muted)]">
          No API requests logged
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.id}>
              <details className="group card-modern overflow-hidden open:shadow-md">
                <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-[13px] text-[var(--foreground)]">{row.requestId}</span>
                      {row.modelId ? (
                        <span className="rounded-full bg-[var(--muted-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)]">
                          {row.modelId}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
                      <span>
                        Route{" "}
                        <span className="font-medium text-[var(--foreground)]">{row.route}</span>
                      </span>
                      <span className="tabular-nums">{row.recordedAtLabel}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums text-[var(--foreground)]">
                      ≈ {formatUsd(row.estimatedTotalUsd)}
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] transition-ui group-open:border-[var(--foreground)] group-open:text-[var(--foreground)]">
                      Details
                    </span>
                  </div>
                </summary>

                <div className="space-y-5 border-t border-[var(--border)] bg-[var(--muted-bg)]/40 px-5 py-5">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Cache read tokens
                      </div>
                      <div className="mt-1 tabular-nums text-base font-semibold">{row.cacheReadTokens.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Cache create (5m) tokens
                      </div>
                      <div className="mt-1 tabular-nums text-base font-semibold">
                        {row.cacheCreationTokens.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Prompt tokens
                      </div>
                      <div className="mt-1 tabular-nums text-base font-semibold">{row.promptTokens.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        Completion tokens
                      </div>
                      <div className="mt-1 tabular-nums text-base font-semibold">
                        {row.completionTokens.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Log detail
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">{row.logSummary}</p>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Price sheet ($ / 1M tokens)
                    </div>
                    <ul className="mt-2 space-y-1 font-mono text-[13px] text-[var(--foreground)]">
                      <li>Input: ${row.pricing.inputPerMUsd.toFixed(6)}</li>
                      <li>Output: ${row.pricing.outputPerMUsd.toFixed(6)}</li>
                      <li>Cache read: ${row.pricing.cacheReadPerMUsd.toFixed(6)}</li>
                      <li>5m cache create: ${row.pricing.cacheCreate5mPerMUsd.toFixed(6)}</li>
                      <li>Group multiplier: {row.pricing.groupMultiplier}x</li>
                    </ul>
                  </div>

                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Billing steps
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                      {row.billingLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Estimated charge
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[var(--foreground)]">
                      {row.billingTotalLine}
                    </p>
                    <p className="mt-3 text-xs text-[var(--muted)]">{API_REQUEST_DISCLAIMER}</p>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
