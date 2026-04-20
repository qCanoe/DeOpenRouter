"use client";

import { useEffect, useId, type ReactNode } from "react";

type OnChainSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

export function OnChainSheet({
  open,
  onClose,
  title,
  description,
  children,
}: OnChainSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(92dvh,56rem)] w-full max-w-2xl flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl sm:max-h-[min(88dvh,48rem)] sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-ui hover:bg-[var(--background)]"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
