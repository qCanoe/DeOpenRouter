import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { formatEther } from "viem";
import { shortenHex } from "@/lib/format";

type MyCallHistoryProps = {
  calls: CallLogRow[];
  resolveModelId: (providerId: number) => string;
  isLoading?: boolean;
};

export function MyCallHistory({
  calls,
  resolveModelId,
  isLoading,
}: MyCallHistoryProps) {
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">My_Call_History</h2>
        <span className="section-eyebrow tabular-nums">Rows: {calls.length}</span>
      </div>

      {isLoading ? (
        <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase tracking-widest text-muted">
          LOADING LOGS…
        </div>
      ) : calls.length === 0 ? (
        <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
          NO CALLS YET
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-theme">
          <table className="min-w-full border-collapse text-left font-mono text-xs leading-snug sm:text-sm">
            <thead className="bg-inverse text-inverse-fg">
              <tr className="uppercase tracking-widest">
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Provider
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Model
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Block
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Cost
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  reqHash
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-theme last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3.5 align-top font-bold">
                    #{String(c.providerId)}
                  </td>
                  <td className="px-4 py-3.5 align-top font-bold">
                    {resolveModelId(Number(c.providerId))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-top text-muted">
                    #{String(c.blockNumber)}
                  </td>
                  <td className="px-4 py-3.5 align-top tabular-nums">
                    {formatEther(c.paid)} ETH
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 align-top font-medium">
                    {shortenHex(c.requestHash, 6, 4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
