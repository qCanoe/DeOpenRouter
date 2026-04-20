"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { getMarketplaceAddress } from "@/lib/marketplaceEnv";
import { DEMO_CALL_HISTORY } from "@/lib/callHistoryDemoData";
import { DEMO_MARKETPLACE_ROWS } from "@/lib/providerDemoData";
import { useMarketplaceProviders } from "@/hooks/useMarketplaceProviders";
import { useMyCallLogs } from "@/hooks/useMyCallLogs";
import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { UserDashboard } from "@/components/user/UserDashboard";
import { ProviderMarketplace } from "@/components/user/ProviderMarketplace";
import { MyCallHistory } from "@/components/user/MyCallHistory";
import { ApiRequestHistory } from "@/components/user/ApiRequestHistory";
import { AuditTransparencyPanel } from "@/components/user/AuditTransparencyPanel";
import { DEMO_API_REQUEST_HISTORY } from "@/lib/apiRequestHistoryDemo";

function mergeCallHistory(chain: CallLogRow[], demo: readonly CallLogRow[]): CallLogRow[] {
  const merged = [...demo, ...chain];
  const sortKey = (a: CallLogRow) => a.recordedAt ?? a.blockNumber;
  merged.sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka > kb) return -1;
    if (ka < kb) return 1;
    if (a.callId !== b.callId) return a.callId > b.callId ? -1 : 1;
    return b.id.localeCompare(a.id);
  });
  return merged;
}

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

  const combinedCalls = useMemo(() => mergeCallHistory(callRows, DEMO_CALL_HISTORY), [callRows]);

  const totalSpent = useMemo(() => {
    let wei = 0n;
    for (const c of combinedCalls) wei += c.paid;
    return formatEther(wei);
  }, [combinedCalls]);

  const resolveModelId = (providerId: number) => {
    const p =
      providerRows.find((r) => r.id === providerId) ??
      DEMO_MARKETPLACE_ROWS.find((r) => r.id === providerId);
    return p?.modelId ?? `#${providerId}`;
  };

  const refresh = () => {
    void refetchProviders();
    void refetchLogs();
  };

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <UserDashboard
        ethBalanceFormatted={bal ? formatEther(bal.value) : undefined}
        totalSpentEth={totalSpent}
        callCount={combinedCalls.length}
        isLoadingBalance={loadingBal}
      />
      <ProviderMarketplace
        marketplace={marketplace}
        rows={providerRows}
        isLoading={loadingProviders}
        onInvoked={refresh}
      />
      <AuditTransparencyPanel marketplace={marketplace} />
      <MyCallHistory
        calls={combinedCalls}
        resolveModelId={resolveModelId}
        isLoading={loadingLogs && !!marketplace && !!address}
        marketplace={marketplace}
      />
      <ApiRequestHistory rows={DEMO_API_REQUEST_HISTORY} />
    </div>
  );
}
