import type { MockProvider, RiskLevel } from "@/lib/mockData";
import { shortenHex } from "@/lib/format";
import type { SimulateBundle } from "@/components/user/UserView";

type MyProviderCardProps = {
  provider: MockProvider;
  totalCalls: number;
  totalEarned: string;
  currentStake: string;
  simulate: SimulateBundle;
  onEdit: () => void;
};

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const label = risk === "low" ? "LOW" : risk === "medium" ? "MED" : "HIGH";
  const base =
    "inline-flex min-h-[1.75rem] items-center px-2 py-1 text-xs font-bold uppercase leading-none tracking-widest border-theme";
  if (risk === "low") {
    return (
      <span className={`${base} border-2 text-muted border-muted`}>{label}</span>
    );
  }
  if (risk === "medium") {
    return (
      <span
        className={`${base} border-4 text-amber-600 dark:text-amber-400 border-amber-600 dark:border-amber-400`}
      >
        {label}
      </span>
    );
  }
  return (
    <span className={`${base} border-4 text-red-600 dark:text-red-400 border-red-600 dark:border-red-400`}>
      {label}
    </span>
  );
}

export function MyProviderCard({
  provider,
  totalCalls,
  totalEarned,
  currentStake,
  simulate,
  onEdit,
}: MyProviderCardProps) {
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">My_Provider</h2>
        <span
          className={`border-2 px-2 py-1 text-xs font-bold uppercase tracking-widest ${
            provider.active
              ? "border-foreground text-foreground"
              : "border-muted text-muted"
          }`}
        >
          {provider.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex min-h-[6.5rem] flex-col justify-between border-2 border-theme p-4">
          <p className="section-eyebrow mb-1">Total calls</p>
          <p className="text-2xl font-bold tabular-nums leading-tight">{totalCalls}</p>
        </div>
        <div className="flex min-h-[6.5rem] flex-col justify-between border-2 border-theme p-4">
          <p className="section-eyebrow mb-1">Total earned (ETH)</p>
          <p className="text-2xl font-bold tabular-nums leading-tight">{totalEarned}</p>
        </div>
        <div className="flex min-h-[6.5rem] flex-col justify-between border-2 border-theme p-4">
          <p className="section-eyebrow mb-1">Current stake (ETH)</p>
          <p className="text-2xl font-bold tabular-nums leading-tight">{currentStake}</p>
        </div>
      </div>

      <article className="flex flex-col border-2 border-theme">
        <div className="flex flex-col gap-4 border-b-2 border-theme p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="break-all text-2xl font-bold uppercase leading-tight tracking-tighter sm:text-3xl">
              {provider.modelId}
            </h3>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">
              Owner {shortenHex(provider.owner, 4, 4)}
            </p>
          </div>
          <RiskBadge risk={provider.risk} />
        </div>

        <div className="grid grid-cols-1 border-b-2 border-theme sm:grid-cols-2">
          <div className="border-b-2 border-theme p-5 sm:border-b-0 sm:border-r-2">
            <div className="section-eyebrow mb-1">Endpoint</div>
            <div className="break-all text-sm font-bold leading-snug">{provider.endpoint}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5">
            <div>
              <div className="section-eyebrow mb-1">Price / call</div>
              <div className="text-lg font-bold tabular-nums leading-tight">
                {provider.pricePerCall} ETH
              </div>
            </div>
            <div>
              <div className="section-eyebrow mb-1">Stake</div>
              <div className="text-lg font-bold tabular-nums leading-tight">
                {provider.stake} ETH
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-brutal border-theme bg-inverse text-inverse-fg hover:bg-background hover:text-foreground"
            onClick={() => {
              simulate.action("edit-provider");
              onEdit();
            }}
          >
            [ EDIT ]
          </button>
          <button
            type="button"
            className="btn-brutal border-theme bg-background text-foreground hover:bg-inverse hover:text-inverse-fg"
            onClick={() => simulate.wouldCall("deactivate")}
          >
            [ DEACTIVATE ]
          </button>
          <button
            type="button"
            className="btn-brutal border-theme bg-background text-foreground hover:bg-inverse hover:text-inverse-fg"
            onClick={() => simulate.wouldCall("withdrawStake")}
          >
            [ WITHDRAW STAKE ]
          </button>
        </div>
      </article>
    </section>
  );
}
