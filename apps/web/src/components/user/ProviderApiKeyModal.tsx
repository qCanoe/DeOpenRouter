"use client";

import { useState } from "react";
import type { Address } from "viem";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import { getMockApiBase } from "@/lib/marketplaceEnv";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  marketplace: Address;
  row: ChainProviderRow;
};

async function copyText(text: string, setMsg: (s: string | null) => void) {
  try {
    await navigator.clipboard.writeText(text);
    setMsg("Copied.");
    setTimeout(() => setMsg(null), 2000);
  } catch {
    setMsg("Copy failed — select text manually.");
  }
}

export function ProviderApiKeyModal({ isOpen, onClose, marketplace, row }: Props) {
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const base = getMockApiBase();
  const curl = `curl -sS -X POST "${base.replace(/\/$/, "")}/v1/chat" \\\n  -H "Content-Type: application/json" \\\n  -d "{\\"prompt\\":\\"Hello\\"}"`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6">
      <div className="flex max-h-[min(44rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">API access</h2>
            <p className="text-xs text-[var(--muted)]">
              Provider #{row.id} · {row.modelId}
            </p>
          </div>
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 text-sm">
          <p className="text-[var(--muted)]">
            This MVP does not mint per-provider API keys on-chain. Inference goes through the{" "}
            <strong className="text-[var(--foreground)]">DeOpenRouter relay</strong>; you configure{" "}
            <span className="font-mono text-xs">OPENROUTER_API_KEY</span> on the server (
            <span className="font-mono text-xs">apps/api/.env</span>). Use the identifiers below when integrating or
            requesting access from the provider owner.
          </p>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/40 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Relay base URL</div>
            <div className="mt-1 break-all font-mono text-xs text-[var(--foreground)]">{base}</div>
            <button
              type="button"
              className="btn-secondary mt-3 w-full text-sm"
              onClick={() => void copyText(base, setCopyHint)}
            >
              Copy URL
            </button>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/40 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">On-chain provider</div>
            <dl className="mt-2 space-y-2 font-mono text-xs text-[var(--foreground)]">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--muted)]">Marketplace</dt>
                <dd className="max-w-[14rem] truncate text-right" title={marketplace}>
                  {marketplace}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--muted)]">providerId</dt>
                <dd>{row.id}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--muted)]">modelId</dt>
                <dd className="truncate text-right" title={row.modelId}>
                  {row.modelId}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/40 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Example request</div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Playground uses <span className="font-mono">POST /v1/chat</span> with{" "}
              <span className="font-mono">{"{ \"prompt\" }"}</span>. Upstream model is set by{" "}
              <span className="font-mono">OPENROUTER_MODEL</span> on the relay, not by this card.
            </p>
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-[11px] leading-relaxed">
              {curl}
            </pre>
            <button
              type="button"
              className="btn-secondary mt-3 w-full text-sm"
              onClick={() => void copyText(curl.replace(/\\\n\s+/g, " "), setCopyHint)}
            >
              Copy cURL
            </button>
          </div>

          {copyHint ? <p className="text-center text-xs text-[var(--muted)]">{copyHint}</p> : null}
        </div>
      </div>
    </div>
  );
}
