import type { MockUserStats } from "@/lib/mockData";

type UserDashboardProps = {
  stats: MockUserStats;
};

export function UserDashboard({ stats }: UserDashboardProps) {
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">User_Dashboard</h2>
        <span className="section-eyebrow">Snapshot</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <div className="flex min-h-[7.5rem] flex-col justify-between border-2 border-theme p-6">
          <p className="section-eyebrow mb-2">Balance (ETH)</p>
          <p className="text-3xl font-bold tabular-nums tracking-tighter sm:text-4xl">
            {stats.balance}
          </p>
        </div>
        <div className="flex min-h-[7.5rem] flex-col justify-between border-2 border-theme p-6">
          <p className="section-eyebrow mb-2">Total spent (ETH)</p>
          <p className="text-3xl font-bold tabular-nums tracking-tighter sm:text-4xl">
            {stats.totalSpent}
          </p>
        </div>
        <div className="flex min-h-[7.5rem] flex-col justify-between border-2 border-theme p-6">
          <p className="section-eyebrow mb-2">Call count</p>
          <p className="text-3xl font-bold tabular-nums tracking-tighter sm:text-4xl">
            {stats.callCount}
          </p>
        </div>
      </div>
    </section>
  );
}
