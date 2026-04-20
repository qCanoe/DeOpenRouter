"use client";

import { formatEther, type Address } from "viem";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import { chainLabel, addressExplorerUrl } from "@/lib/chainUi";
import { CopyRow } from "@/components/chain/CopyRow";
import {
  MOCK_CHAIN_ID_LABEL,
  MOCK_MARKETPLACE_CONTRACT,
  MOCK_MARKETPLACE_PROVIDERS,
  MOCK_NETWORK_LABEL,
  MOCK_PANEL_COPY,
  ON_CHAIN_PANEL_DESIGN_MOCK,
} from "@/lib/mockOnChainPanel";

type MarketplaceOnChainDetailsProps = {
  marketplace: Address | null;
  chainId: number;
  providers: ChainProviderRow[];
};

function DesignMockBanner() {
  return (
    <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
      {MOCK_PANEL_COPY.banner}
    </p>
  );
}

function MockMarketplaceBody() {
  return (
    <>
      <DesignMockBanner />
      <div className="flex flex-col gap-3">
        <CopyRow label="Marketplace contract (simulated)" value={MOCK_MARKETPLACE_CONTRACT} />
        <p className="text-xs text-[var(--muted)]">{MOCK_PANEL_COPY.explorerDisabled}</p>
        <CopyRow
          label="Network (simulated)"
          value={`${MOCK_NETWORK_LABEL} · chainId ${MOCK_CHAIN_ID_LABEL}`}
          monospace={false}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Providers in contract (simulated · {MOCK_MARKETPLACE_PROVIDERS.length})
        </h3>
        <ul className="flex flex-col gap-4">
          {MOCK_MARKETPLACE_PROVIDERS.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--foreground)]">Provider #{p.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    p.active
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "bg-[var(--muted-bg)] text-[var(--muted)]"
                  }`}
                >
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
              <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">Owner</dt>
                  <dd className="mt-0.5 break-all font-mono text-[var(--foreground)]">{p.owner}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">Model</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]">
                    {p.modelId} <span className="text-[var(--muted)]">v{p.modelVersion}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">Effective price / call</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">{p.effectivePriceEth} ETH</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">Stored price / call</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">{p.storedPriceEth} ETH</dd>
                </div>
                {p.pendingPriceEth != null ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-[var(--muted)]">Pending price</dt>
                    <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">
                      {p.pendingPriceEth} ETH from block {p.pendingAtBlock}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">Stake</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">{p.stakeEth} ETH</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-[var(--muted)]">Stake lock (blocks)</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">{p.stakeLockBlocks}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">Endpoint commitment</dt>
                  <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                    {p.endpointCommitment}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">Capability hash</dt>
                  <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                    {p.capabilityHash}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">Metadata URI</dt>
                  <dd className="mt-0.5 break-all text-[var(--foreground)]">{p.metadataURI}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">Metadata hash</dt>
                  <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                    {p.metadataHash}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-[var(--muted)]">Identity hash</dt>
                  <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                    {p.identityHash}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function MarketplaceOnChainDetails({
  marketplace,
  chainId,
  providers,
}: MarketplaceOnChainDetailsProps) {
  if (ON_CHAIN_PANEL_DESIGN_MOCK) {
    return (
      <div className="flex flex-col gap-6">
        <MockMarketplaceBody />
      </div>
    );
  }

  const network = chainLabel(chainId);
  const contractLink = marketplace ? addressExplorerUrl(chainId, marketplace) : null;

  return (
    <div className="flex flex-col gap-6">
      {chainId === 31_337 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)]/60 px-3 py-2.5 text-sm text-[var(--muted)]">
          Local chain (Anvil): there is no public block explorer. Use the fields below to verify state via RPC or
          your own tooling.
        </p>
      ) : null}

      {!marketplace ? (
        <p className="text-sm text-[var(--muted)]">
          Set{" "}
          <code className="rounded bg-[var(--muted-bg)] px-1 py-0.5 font-mono text-[13px] text-[var(--foreground)]">
            NEXT_PUBLIC_MARKETPLACE_ADDRESS
          </code>{" "}
          to load the live registry from your deployment.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <CopyRow label="Marketplace contract" value={marketplace} />
            {contractLink ? (
              <a
                href={contractLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-[var(--muted)]"
              >
                View contract in explorer
              </a>
            ) : null}
            <CopyRow label="Network" value={`${network} (chainId ${chainId})`} monospace={false} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
              Providers in contract ({providers.length})
            </h3>
            {providers.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No providers returned from chain yet.</p>
            ) : (
              <ul className="flex flex-col gap-4">
                {providers.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        Provider #{p.id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          p.active
                            ? "bg-[var(--foreground)] text-[var(--background)]"
                            : "bg-[var(--muted-bg)] text-[var(--muted)]"
                        }`}
                      >
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
                      <div>
                        <dt className="text-xs font-medium text-[var(--muted)]">Owner</dt>
                        <dd className="mt-0.5 break-all font-mono text-[var(--foreground)]">{p.owner}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-[var(--muted)]">Model</dt>
                        <dd className="mt-0.5 text-[var(--foreground)]">
                          {p.modelId}{" "}
                          <span className="text-[var(--muted)]">v{p.modelVersion}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-[var(--muted)]">Effective price / call</dt>
                        <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">
                          {formatEther(p.effectivePriceWei)} ETH
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-[var(--muted)]">Stored price / call</dt>
                        <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">
                          {formatEther(p.pricePerCall)} ETH
                        </dd>
                      </div>
                      {p.hasPendingPrice ? (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-medium text-[var(--muted)]">Pending price</dt>
                          <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">
                            {formatEther(p.pendingPriceDisplay)} ETH from block{" "}
                            {p.pendingAppliesAtBlock.toString()}
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-xs font-medium text-[var(--muted)]">Stake</dt>
                        <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">
                          {formatEther(p.stake)} ETH
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-[var(--muted)]">Stake lock (blocks)</dt>
                        <dd className="mt-0.5 tabular-nums text-[var(--foreground)]">
                          {p.stakeLockBlocks.toString()}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-[var(--muted)]">Endpoint commitment</dt>
                        <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                          {p.endpointCommitment}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-[var(--muted)]">Capability hash</dt>
                        <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                          {p.capabilityHash}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-[var(--muted)]">Metadata URI</dt>
                        <dd className="mt-0.5 break-all text-[var(--foreground)]">
                          {p.metadataURI || "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-[var(--muted)]">Metadata hash</dt>
                        <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                          {p.metadataHash}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-medium text-[var(--muted)]">Identity hash</dt>
                        <dd className="mt-0.5 break-all font-mono text-[12px] text-[var(--foreground)]">
                          {p.identityHash}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
