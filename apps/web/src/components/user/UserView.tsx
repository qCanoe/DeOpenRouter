"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { getMarketplaceAddress } from "@/lib/marketplaceEnv";
import { useMarketplaceProviders } from "@/hooks/useMarketplaceProviders";
import { useMyCallLogs } from "@/hooks/useMyCallLogs";
import { UserDashboard } from "@/components/user/UserDashboard";
import { ProviderMarketplace } from "@/components/user/ProviderMarketplace";
import { MyCallHistory } from "@/components/user/MyCallHistory";

export function UserView() {
  const marketplace = getMarketplaceAddress();
  const { address } = useAccount();
  const {
    rows: providerRows,
    isLoading: loadingProviders,
    refetch: refetchProviders,
  } = useMarketplaceProviders({ marketplace });
  const {
    rows: callRows,
    isLoading: loadingLogs,
    refetch: refetchLogs,
  } = useMyCallLogs(marketplace);
  const { data: bal, isLoading: loadingBal } = useBalance({ address });

  const totalSpent = useMemo(() => {
    let wei = 0n;
    for (const c of callRows) wei += c.paid;
    return formatEther(wei);
  }, [callRows]);

  const resolveModelId = (providerId: number) => {
    const p = providerRows.find((r) => r.id === providerId);
    return p?.modelId ?? `#${providerId}`;
  };

  const refresh = () => {
    void refetchProviders();
    void refetchLogs();
  };

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <UserDashboard
        ethBalanceFormatted={bal ? formatEther(bal.value) : undefined}
        totalSpentEth={totalSpent}
        callCount={callRows.length}
        isLoadingBalance={loadingBal}
      />
      <ProviderMarketplace
        marketplace={marketplace}
        rows={providerRows}
        isLoading={loadingProviders}
        onInvoked={refresh}
      />
      <MyCallHistory
        calls={callRows}
        resolveModelId={resolveModelId}
        isLoading={loadingLogs}
      />
    </div>
  );
}
