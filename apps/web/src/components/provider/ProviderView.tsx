"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { getMarketplaceAddress } from "@/lib/marketplaceEnv";
import {
  isChainProviderVisibleInCatalog,
  useMarketplaceProviders,
} from "@/hooks/useMarketplaceProviders";
import { useProviderCallLogs } from "@/hooks/useMyCallLogs";
import { MyProviderCard } from "@/components/provider/MyProviderCard";
import {
  ProviderRegisterForm,
  emptyRegisterValues,
  type RegisterFormValues,
} from "@/components/provider/ProviderRegisterForm";
import { ProviderCallLog } from "@/components/provider/ProviderCallLog";

type ProviderViewProps = {
  showToast: (msg: string) => void;
};

export function ProviderView({ showToast }: ProviderViewProps) {
  const marketplace = getMarketplaceAddress();
  const { address } = useAccount();
  const { rows, isLoading, refetch } = useMarketplaceProviders({ marketplace });

  const myProviders = useMemo(() => {
    if (!address) return null;
    return rows.filter(
      (row) =>
        row.owner.toLowerCase() === address.toLowerCase() &&
        isChainProviderVisibleInCatalog(row),
    );
  }, [rows, address]);
  const providerIds = useMemo(
    () => myProviders?.map((provider) => provider.id) ?? [],
    [myProviders],
  );

  const {
    rows: callRows,
    isLoading: loadingCalls,
    refetch: refetchCalls,
  } = useProviderCallLogs(marketplace, providerIds);

  const callsByProvider = useMemo(() => {
    const grouped = new Map<number, typeof callRows>();
    for (const provider of myProviders ?? []) {
      grouped.set(provider.id, []);
    }
    for (const call of callRows) {
      const providerCalls = grouped.get(Number(call.providerId));
      if (providerCalls) providerCalls.push(call);
    }
    return grouped;
  }, [callRows, myProviders]);

  const totalEarned = useMemo(() => {
    let wei = 0n;
    for (const call of callRows) wei += call.paid;
    return formatEther(wei);
  }, [callRows]);

  const formRef = useRef<HTMLDivElement>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [formInitial, setFormInitial] =
    useState<RegisterFormValues>(emptyRegisterValues);

  const scrollToForm = useCallback(() => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleScrollToRegister = useCallback(() => {
    setFormInitial(emptyRegisterValues);
    setFormSeed((seed) => seed + 1);
    scrollToForm();
  }, [scrollToForm]);

  const refresh = useCallback(() => {
    void refetch();
    void refetchCalls();
  }, [refetch, refetchCalls]);

  const onRegistered = useCallback(() => {
    refresh();
    showToast("Registration Confirmed");
  }, [refresh, showToast]);

  const onProviderChanged = useCallback(
    (message: string) => {
      refresh();
      showToast(message);
    },
    [refresh, showToast],
  );

  const resolveModelId = useCallback(
    (providerId: number) =>
      rows.find((provider) => provider.id === providerId)?.modelId ?? `#${providerId}`,
    [rows],
  );

  if (!marketplace) {
    return (
      <div className="card-modern border-dashed p-12 text-center text-sm font-medium text-[var(--muted)]">
        Set NEXT_PUBLIC_MARKETPLACE_ADDRESS in apps/web/.env.local
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {myProviders && myProviders.length > 0 ? (
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="section-heading">My Providers</h2>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-[var(--muted)]">
              <span>Providers: {myProviders.length}</span>
              <span>&middot;</span>
              <span>Incoming calls: {callRows.length}</span>
              <span>&middot;</span>
              <span>Earned: {totalEarned} ETH</span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-2 [&>*]:min-h-0 [&>*]:h-full">
            {myProviders.map((provider) => (
              <MyProviderCard
                key={provider.id}
                marketplace={marketplace}
                provider={provider}
                calls={callsByProvider.get(provider.id) ?? []}
                onChanged={onProviderChanged}
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b border-[var(--border)] pb-4">
            <h2 className="section-heading">My Providers</h2>
          </div>
          {isLoading ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-6 py-16 text-center text-sm font-medium text-[var(--muted)] shadow-sm">
              Loading…
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--background)] px-6 py-16 text-center shadow-sm transition-ui hover:shadow-md">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)]/50 bg-[var(--muted-bg)] text-[var(--foreground)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                  <path d="M10 4v4" />
                  <path d="M14 4v4" />
                  <path d="M6 4v4" />
                  <path d="M18 4v4" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">Become a provider</h3>
              <p className="mb-6 max-w-sm text-sm text-[var(--muted)]">
                Register an on-chain provider to list a model, set pricing, and receive calls. Stake ETH and add metadata below.
              </p>
              <button type="button" className="btn-primary px-6 py-2.5 text-sm font-semibold shadow-sm" onClick={handleScrollToRegister}>
                Register first provider
              </button>
            </div>
          )}
        </section>
      )}

      <ProviderRegisterForm
        ref={formRef}
        seed={formSeed}
        initialValues={formInitial}
        marketplace={marketplace}
        onRegistered={onRegistered}
      />

      {myProviders && myProviders.length > 0 && (
        <ProviderCallLog
          calls={callRows}
          isLoading={loadingCalls}
          resolveModelId={resolveModelId}
        />
      )}
    </div>
  );
}
