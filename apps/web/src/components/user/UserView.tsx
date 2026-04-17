"use client";

import { useMemo } from "react";
import {
  mockProviders,
  mockUserCalls,
  mockUserStats,
} from "@/lib/mockData";
import { shortenHex } from "@/lib/format";
import { UserDashboard } from "@/components/user/UserDashboard";
import { ProviderMarketplace } from "@/components/user/ProviderMarketplace";
import { MyCallHistory } from "@/components/user/MyCallHistory";

export type SimulateBundle = {
  action: (label: string) => void;
  wouldCall: (fn: string) => void;
};

type UserViewProps = {
  simulate: SimulateBundle;
};

export function UserView({ simulate }: UserViewProps) {
  const resolveProviderLabel = useMemo(() => {
    return (providerId: number) => {
      const p = mockProviders.find((x) => x.id === providerId);
      return p ? shortenHex(p.owner, 4, 4) : `#${providerId}`;
    };
  }, []);

  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <UserDashboard stats={mockUserStats} />
      <ProviderMarketplace providers={mockProviders} simulate={simulate} />
      <MyCallHistory calls={mockUserCalls} resolveProviderLabel={resolveProviderLabel} />
    </div>
  );
}
