"use client";

type UserDashboardProps = {
  ethBalanceFormatted: string | undefined;
  totalSpentEth: string;
  callCount: number;
  isLoadingBalance?: boolean;
};

export function UserDashboard({
  ethBalanceFormatted,
  totalSpentEth,
  callCount,
  isLoadingBalance,
}: UserDashboardProps) {
  return (
    <section>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-4">
        <h2 className="section-heading">User Dashboard</h2>
        <span className="section-eyebrow">On-chain snapshot</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <div className="card-modern flex min-h-[8rem] flex-col justify-between p-6">
          <p className="text-sm font-medium text-[var(--muted)]">Balance (ETH)</p>
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {isLoadingBalance ? "..." : ethBalanceFormatted ?? "--"}
          </p>
        </div>
        <div className="card-modern flex min-h-[8rem] flex-col justify-between p-6">
          <p className="text-sm font-medium text-[var(--muted)]">Total spent (ETH)</p>
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {totalSpentEth}
          </p>
        </div>
        <div className="card-modern flex min-h-[8rem] flex-col justify-between p-6">
          <p className="text-sm font-medium text-[var(--muted)]">Call count</p>
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {callCount}
          </p>
        </div>
      </div>
    </section>
  );
}
