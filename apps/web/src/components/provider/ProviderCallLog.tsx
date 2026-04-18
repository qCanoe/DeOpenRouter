import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { formatEther } from "viem";
import { shortenHex } from "@/lib/format";

type ProviderCallLogProps = {
  calls: CallLogRow[];
  isLoading?: boolean;
};

export function ProviderCallLog({ calls, isLoading }: ProviderCallLogProps) {
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">Incoming_Calls</h2>
        <span className="section-eyebrow tabular-nums">Rows: {calls.length}</span>
      </div>

      {isLoading ? (
        <div className="border-2 border-theme p-12 text-center text-sm font-bold uppercase tracking-widest text-muted">
          LOADING…
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-theme">
          <table className="min-w-full border-collapse text-left font-mono text-xs leading-snug sm:text-sm">
            <thead className="bg-inverse text-inverse-fg">
              <tr className="uppercase tracking-widest">
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Caller
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Block
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  Amount
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  reqHash
                </th>
                <th className="border-b-2 border-theme px-4 py-3.5 text-left text-[10px] font-bold sm:text-xs">
                  responseHash
                </th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-b border-theme last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3.5 align-top font-bold">
                    {shortenHex(c.caller, 4, 4)}
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
                  <td className="whitespace-nowrap px-4 py-3.5 align-top font-medium">
                    {shortenHex(c.responseHash, 6, 4)}
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
