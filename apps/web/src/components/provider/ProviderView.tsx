"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { getMarketplaceAddress } from "@/lib/marketplaceEnv";
import { useMarketplaceProviders } from "@/hooks/useMarketplaceProviders";
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
    return rows.filter((row) => row.owner.toLowerCase() === address.toLowerCase());
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
    showToast("REGISTER_CONFIRMED");
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
      <div className="border-2 border-dashed border-theme p-12 text-center text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
        Set NEXT_PUBLIC_MARKETPLACE_ADDRESS in apps/web/.env.local (see repository
        README).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      {myProviders && myProviders.length > 0 ? (
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-3 border-b-2 border-theme pb-3 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="section-heading">My_Providers</h2>
            <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest text-muted">
              <span>Providers: {myProviders.length}</span>
              <span>Incoming calls: {callRows.length}</span>
              <span>Earned: {totalEarned} ETH</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            {myProviders.map((provider) => (
              <MyProviderCard
                key={provider.id}
                marketplace={marketplace}
                provider={provider}
                calls={callsByProvider.get(provider.id) ?? []}
                onScrollToRegister={handleScrollToRegister}
                onChanged={onProviderChanged}
              />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
            <h2 className="section-heading">My_Providers</h2>
          </div>
          <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase tracking-widest text-muted">
            {isLoading ? "LOADING..." : "No on-chain provider for this wallet. Register below."}
          </div>
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
