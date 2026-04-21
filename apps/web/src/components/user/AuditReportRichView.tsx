"use client";

import { useMemo, useState } from "react";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function riskBadgeClass(level: string) {
  const u = level.toUpperCase();
  if (u === "HIGH") return "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400";
  if (u === "MEDIUM") return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
  if (u === "LOW") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
  return "bg-[var(--muted-bg)] text-[var(--foreground)] border-[var(--border)]";
}

function Jsonish({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-[var(--muted)]">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span className="break-all">{String(value)}</span>;
  }
  return (
    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--border)] bg-[var(--muted-bg)] p-2 font-mono text-[10px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StepRow({ step }: { step: Record<string, unknown> }) {
  const n = step.step;
  const key = typeof step.key === "string" ? step.key : "?";
  const skipped = step.skipped === true;
  const err = typeof step.error === "string" ? step.error : null;
  const flags = Array.isArray(step.flags) ? step.flags : [];
  const events = Array.isArray(step.events) ? step.events : [];

  let status = "Done";
  if (skipped) status = "Skipped";
  else if (err) status = "Error";

  return (
    <tr className="border-b border-[var(--border)]/60 align-top">
      <td className="py-2 pr-2 font-mono text-xs text-[var(--muted)]">{String(n ?? "")}</td>
      <td className="py-2 pr-2 font-mono text-xs">{key}</td>
      <td className="py-2 pr-2 text-xs">
        <span
          className={
            skipped
              ? "text-[var(--muted)]"
              : err
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-[var(--foreground)]"
          }
        >
          {status}
        </span>
        {err && (
          <p className="mt-1 max-w-md break-words font-mono text-[11px] text-red-600/90 dark:text-red-400/90">
            {err}
          </p>
        )}
      </td>
      <td className="py-2 pr-2 text-center font-mono text-xs tabular-nums">{flags.length}</td>
      <td className="py-2 text-center font-mono text-xs tabular-nums">{events.length}</td>
    </tr>
  );
}

type Props = {
  report: Record<string, unknown>;
};

/** Renders structured audit-server response (target, overall, metrics, steps, …). */
export function AuditReportRichView({ report }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const target = typeof report.target === "string" ? report.target : null;
  const model = typeof report.model === "string" ? report.model : null;
  const profile = typeof report.profile === "string" ? report.profile : null;
  const ok = typeof report.ok === "boolean" ? report.ok : null;

  const overall = report.overall;
  const metrics = isRecord(report.metrics) ? report.metrics : null;
  const steps = Array.isArray(report.steps) ? report.steps : [];
  const crashes = Array.isArray(report.step_crashes) ? report.step_crashes : [];

  const metricEntries = useMemo(() => (metrics ? Object.entries(metrics) : []), [metrics]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30 p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Run summary</h4>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {target && (
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">Target (relay)</dt>
              <dd className="mt-0.5 break-all font-mono text-xs">{target}</dd>
            </div>
          )}
          {model && (
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">Model</dt>
              <dd className="mt-0.5 font-mono text-xs">{model}</dd>
            </div>
          )}
          {profile && (
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">Profile</dt>
              <dd className="mt-0.5 font-mono text-xs">{profile}</dd>
            </div>
          )}
          {ok !== null && (
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">ok</dt>
              <dd className="mt-0.5 font-mono text-xs">{ok ? "true" : "false"}</dd>
            </div>
          )}
        </dl>
      </div>

      {overall !== undefined && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Overall risk</h4>
          {isRecord(overall) ? (
            <div className="space-y-4">
              {typeof overall.level === "string" && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--muted)]">Level</span>
                  <span
                    className={`rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-wide ${riskBadgeClass(overall.level)}`}
                  >
                    {overall.level.toUpperCase()}
                  </span>
                </div>
              )}
              {Array.isArray(overall.reasons) && overall.reasons.length > 0 && (
                <div>
                  <span className="mb-2 block text-xs font-medium text-[var(--muted)]">Reasons</span>
                  <ul className="list-inside list-disc space-y-1 text-sm text-[var(--foreground)]">
                    {overall.reasons.map((r, i) => (
                      <li key={i}>{String(r)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {isRecord(overall.dimensions) && Object.keys(overall.dimensions).length > 0 && (
                <div>
                  <span className="mb-2 block text-xs font-medium text-[var(--muted)]">Dimensions</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(overall.dimensions).map(([k, v]) => (
                      <div
                        key={k}
                        className={`flex items-center gap-1.5 rounded border px-2 py-1 ${
                          v === true
                            ? "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
                            : "border-[var(--border)] bg-[var(--background)] text-[var(--muted)]"
                        }`}
                      >
                        <span className="font-mono text-[10px] font-medium">{k}</span>
                        <span className="text-[10px] font-bold">{v === true ? "TRUE" : "FALSE"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Fallback for other unexpected keys in overall */}
              {Object.entries(overall).filter(([k]) => !["level", "reasons", "dimensions"].includes(k)).length > 0 && (
                <div className="pt-2">
                  <span className="mb-2 block text-xs font-medium text-[var(--muted)]">Other metadata</span>
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(overall)
                      .filter(([k]) => !["level", "reasons", "dimensions"].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-[var(--border)]/60 bg-[var(--background)] p-2">
                          <dt className="font-mono text-[11px] text-[var(--muted)]">{k}</dt>
                          <dd className="mt-1 text-sm">
                            <Jsonish value={v} />
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              )}
            </div>
          ) : (
            <Jsonish value={overall} />
          )}
        </div>
      )}

      {metricEntries.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Metrics</h4>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {metricEntries.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-[var(--border)]/60 bg-[var(--background)] p-2">
                <dt className="font-mono text-[11px] text-[var(--muted)]">{k}</dt>
                <dd className="mt-1 text-sm">
                  <Jsonish value={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {crashes.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Step crashes
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-amber-900/90 dark:text-amber-100/90">
            {crashes.map((c, i) => (
              <li key={i} className="font-mono text-xs">
                {String(c)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/30 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Checks ({steps.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Key</th>
                  <th className="py-2 pr-2 font-medium">Status</th>
                  <th className="py-2 pr-2 text-center font-medium">Flags</th>
                  <th className="py-2 text-center font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s, i) =>
                  isRecord(s) ? (
                    <StepRow key={i} step={s} />
                  ) : (
                    <tr key={i}>
                      <td colSpan={5} className="py-2 text-xs text-[var(--muted)]">
                        Invalid step entry
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          className="text-xs font-medium text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? "Hide" : "Show"} full JSON
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-[min(28rem,45vh)] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-4 text-left font-mono text-[11px] leading-relaxed text-[var(--foreground)]">
            {JSON.stringify(report, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
