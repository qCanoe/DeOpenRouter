"use client";

import { useState } from "react";

type CopyRowProps = {
  label: string;
  value: string;
  monospace?: boolean;
};

export function CopyRow({ label, value, monospace = true }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--foreground)] transition-ui hover:bg-[var(--muted-bg)]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p
        className={`break-all text-[13px] leading-snug text-[var(--foreground)] ${
          monospace ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
