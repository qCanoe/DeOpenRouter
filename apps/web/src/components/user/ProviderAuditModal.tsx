"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuditLogRow } from "@/hooks/useAuditLogs";
import { AuditReportRichView } from "@/components/user/AuditReportRichView";
import { getMockApiBase } from "@/lib/marketplaceEnv";

function riskLabel(level: number): string {
  if (level === 2) return "HIGH";
  if (level === 1) return "MEDIUM";
  return "LOW";
}

function resolveReportFetchUrl(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/40 p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        <button
          type="button"
          className="text-xs font-medium text-[var(--foreground)] underline-offset-2 hover:underline"
          onClick={onCopy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="break-all font-mono text-xs leading-relaxed text-[var(--foreground)]">{value}</p>
    </div>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  providerId: number;
  modelId: string;
  rows: AuditLogRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

export function ProviderAuditModal({
  isOpen,
  onClose,
  providerId,
  modelId,
  rows,
  loading,
  error,
  onRefresh,
}: Props) {
  const [detail, setDetail] = useState<AuditLogRow | null>(null);
  const [uriBody, setUriBody] = useState<string | null>(null);
  const [uriLoadState, setUriLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [uriError, setUriError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<"idle" | "loading" | "hit" | "miss" | "error">("idle");
  const [cacheReport, setCacheReport] = useState<Record<string, unknown> | null>(null);

  const filtered = useMemo(
    () => (rows ?? []).filter((r) => r.providerId === BigInt(providerId)),
    [rows, providerId],
  );

  const openDetail = useCallback((r: AuditLogRow) => {
    setDetail(r);
    setUriBody(null);
    setUriLoadState("idle");
    setUriError(null);
  }, []);

  const closeDetail = useCallback(() => {
    setDetail(null);
    setUriBody(null);
    setUriLoadState("idle");
    setUriError(null);
    setCacheStatus("idle");
    setCacheReport(null);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const base = getMockApiBase().replace(/\/$/, "");
    const ac = new AbortController();
    setCacheStatus("loading");
    setCacheReport(null);
    void fetch(
      `${base}/v1/audit/cached-report?hash=${encodeURIComponent(detail.reportHash)}`,
      { signal: ac.signal },
    )
      .then(async (res) => {
        if (res.status === 404) {
          setCacheStatus("miss");
          return;
        }
        if (!res.ok) {
          setCacheStatus("error");
          return;
        }
        const j = (await res.json()) as { report?: unknown; reportRaw?: string };
        if (j.report && typeof j.report === "object" && j.report !== null) {
          setCacheReport(j.report as Record<string, unknown>);
          setCacheStatus("hit");
          return;
        }
        if (typeof j.reportRaw === "string") {
          try {
            setCacheReport(JSON.parse(j.reportRaw) as Record<string, unknown>);
            setCacheStatus("hit");
          } catch {
            setCacheStatus("miss");
          }
          return;
        }
        setCacheStatus("miss");
      })
      .catch(() => {
        if (!ac.signal.aborted) setCacheStatus("error");
      });
    return () => ac.abort();
  }, [detail]);

  const loadReportFromUri = useCallback(async (uri: string) => {
    const url = resolveReportFetchUrl(uri);
    if (!/^https?:\/\//i.test(url)) {
      setUriError("Only http(s) or ipfs:// URIs can be loaded in the browser.");
      setUriLoadState("error");
      return;
    }
    setUriLoadState("loading");
    setUriError(null);
    try {
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const text = await res.text();
      try {
        const parsed = JSON.parse(text) as unknown;
        setUriBody(JSON.stringify(parsed, null, 2));
      } catch {
        setUriBody(text);
      }
      setUriLoadState("idle");
    } catch (e) {
      setUriError(e instanceof Error ? e.message : "fetch_failed");
      setUriLoadState("error");
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div
        className={`flex w-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl ${detail ? "h-[min(64rem,95vh)] max-w-6xl" : "max-h-[min(56rem,90vh)] max-w-5xl"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Audit history</h2>
            <p className="text-xs text-[var(--muted)]">
              Provider #{providerId} · {modelId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-sm"
              onClick={() => void onRefresh()}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--muted-bg)]"
              title="Close"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto p-6">
          {detail && (
            <div className="absolute inset-0 z-10 flex flex-col bg-[var(--background)]">
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Audit detail · #{detail.auditId.toString()}
                </h3>
                <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={closeDetail}>
                  Back to list
                </button>
              </div>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <h4 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Audit result</h4>
                  <p className="mb-4 text-xs leading-relaxed text-[var(--muted)]">
                    Structured checks (overall risk, per-step flags, metrics) come from the audit server. When this
                    relay has anchored that report, it keeps a short-lived copy keyed by report hash so you can review
                    it here. Restarting the relay clears this cache.
                  </p>
                  {cacheStatus === "loading" && (
                    <p className="text-sm text-[var(--muted)]">Loading report from relay…</p>
                  )}
                  {cacheStatus === "hit" && cacheReport && <AuditReportRichView report={cacheReport} />}
                  {cacheStatus === "miss" && (
                    <p className="text-sm text-[var(--muted)]">
                      No cached report on this relay for this hash (older audits, another process, or after restart).
                      If you published a <span className="font-mono text-xs">reportUri</span> on-chain, load it below.
                    </p>
                  )}
                  {cacheStatus === "error" && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Could not reach the relay or request failed. Check <span className="font-mono text-xs">NEXT_PUBLIC_MOCK_API</span>.
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    On-chain anchor
                  </h4>
                  <p className="mb-4 text-xs text-[var(--muted)]">
                    The contract stores <span className="font-mono">reportHash</span> and optional{" "}
                    <span className="font-mono">reportUri</span>.
                  </p>
                </div>
                <CopyField label="Report hash (bytes32)" value={detail.reportHash} />
                <CopyField label="Transaction hash" value={detail.transactionHash} />
                <CopyField label="Recorder" value={detail.recorder} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/40 p-3">
                    <span className="text-xs font-medium text-[var(--muted)]">Audit ID</span>
                    <p className="mt-1 font-mono text-sm">{detail.auditId.toString()}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/40 p-3">
                    <span className="text-xs font-medium text-[var(--muted)]">Block</span>
                    <p className="mt-1 font-mono text-sm">{detail.blockNumber.toString()}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/40 p-3">
                    <span className="text-xs font-medium text-[var(--muted)]">Risk level</span>
                    <p className="mt-1 text-sm font-medium">{riskLabel(detail.riskLevel)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)]/40 p-3">
                  <span className="text-xs font-medium text-[var(--muted)]">Report URI</span>
                  {detail.reportUri ? (
                    <div className="mt-2 space-y-2">
                      <p className="break-all font-mono text-xs">{detail.reportUri}</p>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={resolveReportFetchUrl(detail.reportUri)}
                          className="btn-secondary inline-flex px-3 py-1.5 text-xs"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in new tab
                        </a>
                        <button
                          type="button"
                          className="btn-primary px-3 py-1.5 text-xs"
                          disabled={uriLoadState === "loading"}
                          onClick={() => void loadReportFromUri(detail.reportUri!)}
                        >
                          {uriLoadState === "loading" ? "Loading…" : "Load in panel"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      No URI was anchored for this audit. Configure{" "}
                      <span className="font-mono text-xs">AUDIT_REPORT_PUBLISH_URL</span> on the relay to publish and
                      store a link on-chain.
                    </p>
                  )}
                </div>
                {uriError && (
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                    {uriError}
                  </p>
                )}
                {uriBody && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-[var(--muted)]">Report body</p>
                    <pre className="max-h-[min(40rem,70vh)] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-4 text-left font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
                      {uriBody}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="mb-4 text-sm text-[var(--muted)]">
            Anchored <span className="font-mono text-xs">AuditRecorded</span> /{" "}
            <span className="font-mono text-xs">AuditReportUri</span> events for this provider only.
          </p>

          {error && (
            <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}

          {loading && <p className="text-sm text-[var(--muted)]">Loading events…</p>}

          {!loading && filtered.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No audit events for this provider in the scanned range.</p>
          )}

          {filtered.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]">
                    <th className="py-2.5 pl-3 pr-2 font-medium">Block</th>
                    <th className="py-2.5 pr-2 font-medium">Risk</th>
                    <th className="py-2.5 pr-2 font-medium">Report hash</th>
                    <th className="py-2.5 pr-2 font-medium">URI</th>
                    <th className="py-2.5 pr-2 font-medium">Recorder</th>
                    <th className="py-2.5 pr-3 text-right font-medium"> </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.transactionHash}-${r.auditId}`} className="border-b border-[var(--border)]/60">
                      <td className="py-2.5 pl-3 pr-2 font-mono text-xs">{r.blockNumber.toString()}</td>
                      <td className="py-2.5 pr-2">
                        <span className="rounded-md bg-[var(--muted-bg)] px-2 py-0.5 text-xs font-medium">
                          {riskLabel(r.riskLevel)}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate py-2.5 pr-2 font-mono text-xs" title={r.reportHash}>
                        {r.reportHash}
                      </td>
                      <td className="max-w-[140px] truncate py-2.5 pr-2 text-xs" title={r.reportUri ?? ""}>
                        {r.reportUri ? (
                          <a
                            href={
                              r.reportUri.startsWith("ipfs://")
                                ? `https://ipfs.io/ipfs/${r.reportUri.slice(7)}`
                                : r.reportUri
                            }
                            className="text-[var(--foreground)] underline-offset-2 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.reportUri}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[120px] truncate py-2.5 pr-2 font-mono text-xs" title={r.recorder}>
                        {r.recorder}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <button
                          type="button"
                          className="btn-secondary whitespace-nowrap px-2.5 py-1 text-xs font-medium"
                          onClick={() => openDetail(r)}
                        >
                          View detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
