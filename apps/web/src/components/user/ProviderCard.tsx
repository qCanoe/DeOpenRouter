import type { MockProvider, RiskLevel } from "@/lib/mockData";
import { shortenHex } from "@/lib/format";

type SimulateCallbacks = {
  action: (label: string) => void;
};

type ProviderCardProps = {
  provider: MockProvider;
  simulate: SimulateCallbacks;
};

const riskOrder: Record<RiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function riskRank(r: RiskLevel): number {
  return riskOrder[r];
}

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

export function ProviderCard({ provider, simulate }: ProviderCardProps) {
  return (
    <article className="flex flex-col border-2 border-theme bg-background">
      <div className="flex items-start justify-between gap-4 border-b-2 border-theme p-5">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold uppercase leading-tight tracking-tighter sm:text-2xl">
            {provider.modelId}
          </h3>
          <p className="mt-2 truncate text-xs font-bold uppercase tracking-widest text-muted">
            {shortenHex(provider.owner, 4, 4)}
          </p>
        </div>
        <RiskBadge risk={provider.risk} />
      </div>

      <div className="flex border-b-2 border-theme">
        <div className="flex-1 border-r-2 border-theme p-4">
          <div className="section-eyebrow mb-1">Price / call</div>
          <div className="text-lg font-bold tabular-nums leading-tight">
            {provider.pricePerCall} <span className="text-sm font-bold">ETH</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="section-eyebrow mb-1">Stake</div>
          <div className="text-lg font-bold tabular-nums leading-tight">
            {provider.stake} <span className="text-sm font-bold">ETH</span>
          </div>
        </div>
      </div>

      <div className="border-b-2 border-dashed border-theme bg-background p-4">
        <div className="section-eyebrow mb-1">Endpoint</div>
        <div className="truncate text-sm font-bold leading-snug">{provider.endpoint}</div>
      </div>

      <div className="mt-auto p-5">
        <button
          type="button"
          className="btn-brutal w-full border-theme bg-inverse text-inverse-fg hover:bg-background hover:text-foreground"
          onClick={() => simulate.action(`invoke:${provider.modelId}`)}
        >
          [ INVOKE ]
        </button>
      </div>
    </article>
  );
}
