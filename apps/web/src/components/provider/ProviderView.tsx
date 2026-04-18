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

  const myProvider = useMemo(() => {
    if (!address) return null;
    return (
      rows.find((r) => r.owner.toLowerCase() === address.toLowerCase()) ?? null
    );
  }, [rows, address]);

  const providerId = myProvider?.id ?? null;

  const {
    rows: callRows,
    isLoading: loadingCalls,
    refetch: refetchCalls,
  } = useProviderCallLogs(marketplace, providerId);

  const totalEarned = useMemo(() => {
    let w = 0n;
    for (const c of callRows) w += c.paid;
    return formatEther(w);
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
    setFormSeed((s) => s + 1);
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
      {myProvider ? (
        <MyProviderCard
          provider={myProvider}
          totalCalls={callRows.length}
          totalEarnedEth={totalEarned}
          onScrollToRegister={handleScrollToRegister}
        />
      ) : (
        <section>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
            <h2 className="section-heading">My_Provider</h2>
          </div>
          <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase tracking-widest text-muted">
            {isLoading
              ? "LOADING…"
              : "No on-chain provider for this wallet. Register below."}
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

      {myProvider !== null && (
        <ProviderCallLog calls={callRows} isLoading={loadingCalls} />
      )}
    </div>
  );
}
