"use client";

import { useCallback, useState } from "react";
import { shortenHex } from "@/lib/format";
import type { Hex } from "viem";

export function CopyableHash({ hash }: { hash: string | Hex }) {
  const [copied, setCopied] = useState(false);
  const safeHash = typeof hash === "string" ? hash : String(hash);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(safeHash);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [safeHash]);

  if (!safeHash) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-3.5 text-xs text-[var(--muted)]">
        —
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group relative flex w-full items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-3.5 text-left transition-ui hover:border-[var(--foreground)]/30 hover:shadow-sm"
      title={safeHash}
      aria-label={copied ? "Copied" : "Copy hash"}
    >
      <div className="min-w-0 flex-1 truncate font-mono text-[12px] leading-relaxed text-[var(--foreground)]/90">
        <span className="sm:hidden">{shortenHex(safeHash as Hex, 8, 8)}</span>
        <span className="hidden sm:inline">{shortenHex(safeHash as Hex, 12, 12)}</span>
      </div>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--border)]/50 bg-[var(--background)] text-[var(--muted)] transition-ui group-hover:text-[var(--foreground)]">
        {copied ? (
          <svg
            className="h-3.5 w-3.5 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </div>
    </button>
  );
}
