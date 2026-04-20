"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, type Address } from "viem";
import {
  marketplaceAbi,
  REQUEST_FORMAT_V1,
  RESPONSE_FORMAT_V1,
} from "@/lib/marketplaceAbi";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import { postChat } from "@/lib/chatClient";
import { getMockApiBase } from "@/lib/marketplaceEnv";
import { requestHashV1, responseHashV1 } from "@/lib/hashMvp";
import { shortenHex } from "@/lib/format";

/** No user message UI — fixed preimage for request hash + mock /v1/chat body. */
const DEFAULT_INVOKE_PROMPT = "";

export type ProviderCardProps = {
  marketplace: Address;
  row: ChainProviderRow;
  /** Simulated catalog row — no on-chain invoke; shows demo UI only. */
  isMock?: boolean;
  onInvoked?: () => void;
};

export function ProviderCard({
  marketplace,
  row,
  isMock = false,
  onInvoked,
}: ProviderCardProps) {
  const { isConnected } = useAccount();
  const [chatLoading, setChatLoading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (error) {
      setLocalErr(error.message);
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess) {
      onInvoked?.();
      reset();
      setLocalErr(null);
    }
  }, [isSuccess, onInvoked, reset]);

  async function handleInvoke() {
    setLocalErr(null);
    if (isMock) {
      setLocalErr("Simulated provider — connect a deployed marketplace and use an on-chain row to invoke.");
      return;
    }
    if (!isConnected) {
      setLocalErr("Connect wallet first.");
      return;
    }
    if (!row.active) {
      setLocalErr("Provider is inactive.");
      return;
    }
    setChatLoading(true);
    try {
      const { response, usageUnits } = await postChat(
        getMockApiBase(),
        DEFAULT_INVOKE_PROMPT,
      );
      const reqH = requestHashV1(DEFAULT_INVOKE_PROMPT);
      const resH = responseHashV1(response);
      writeContract({
        address: marketplace,
        abi: marketplaceAbi,
        functionName: "invoke",
        args: [
          BigInt(row.id),
          reqH,
          resH,
          REQUEST_FORMAT_V1,
          RESPONSE_FORMAT_V1,
          usageUnits,
        ],
        value: row.effectivePriceWei,
      });
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "invoke_failed");
    } finally {
      setChatLoading(false);
    }
  }

  const working = chatLoading || isPending || isConfirming;

  /** Keeps the pending-price row height identical across cards so grid columns stay aligned. */
  const pendingSlotMinClass = "min-h-[2.875rem] pt-1";

  return (
    <article
      className={`flex h-full min-h-0 flex-col border-2 border-theme bg-background ${
        isMock ? "opacity-95" : ""
      }`}
    >
      {isMock && (
        <div className="shrink-0 border-b-2 border-dashed border-theme bg-background px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-muted">
          Simulated API provider — not on-chain
        </div>
      )}
      <div className="flex min-h-[6.5rem] shrink-0 items-start justify-between gap-4 border-b-2 border-theme bg-background p-5">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-xl font-bold uppercase leading-tight tracking-tighter sm:text-2xl">
            {row.modelId}
          </h3>
          <p className="mt-2 truncate text-xs font-bold uppercase tracking-widest text-muted">
            {shortenHex(row.owner, 4, 4)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {isMock && (
            <span className="inline-flex min-h-[1.75rem] items-center border-2 border-theme px-2 py-1 text-xs font-bold uppercase tracking-widest text-foreground">
              DEMO
            </span>
          )}
          <span
            className={`inline-flex min-h-[1.75rem] items-center border-2 px-2 py-1 text-xs font-bold uppercase tracking-widest ${
              row.active
                ? "border-foreground text-foreground"
                : "border-muted text-muted"
            }`}
          >
            {row.active ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      </div>

      <div className="flex min-h-[9.5rem] shrink-0 items-stretch border-b-2 border-theme">
        <div className="flex min-w-0 flex-1 flex-col border-r-2 border-theme bg-background p-4">
          <div className="section-eyebrow mb-1">Price / call (effective)</div>
          <div className="text-lg font-bold tabular-nums leading-tight text-foreground">
            {formatEther(row.effectivePriceWei)}{" "}
            <span className="text-sm font-bold">ETH</span>
          </div>
          <div className={pendingSlotMinClass}>
            {row.hasPendingPrice ? (
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                Pending {formatEther(row.pendingPriceDisplay)} ETH @ block{" "}
                {row.pendingAppliesAtBlock.toString()}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col bg-background p-4">
          <div className="section-eyebrow mb-1">Stake</div>
          <div className="text-lg font-bold tabular-nums leading-tight text-foreground">
            {formatEther(row.stake)} <span className="text-sm font-bold">ETH</span>
          </div>
          <div className={pendingSlotMinClass} aria-hidden />
        </div>
      </div>

      <div className="min-h-[5.5rem] shrink-0 border-b-2 border-dashed border-theme bg-background p-4">
        <div className="section-eyebrow mb-1">Endpoint commitment</div>
        <div className="truncate font-mono text-sm font-bold leading-snug">
          {shortenHex(row.endpointCommitment, 6, 6)}
        </div>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">
          v{row.modelVersion}
        </p>
      </div>

      {localErr && (
        <p
          role="alert"
          className="border-b-2 border-red-600 px-4 py-2 text-xs font-bold uppercase text-red-600 dark:border-red-400 dark:text-red-400"
        >
          {localErr}
        </p>
      )}

      <div className="mt-auto shrink-0 p-5">
        <button
          type="button"
          disabled={working || isMock}
          className="btn-brutal w-full border-theme bg-inverse text-inverse-fg hover:bg-background hover:text-foreground disabled:opacity-50"
          onClick={() => void handleInvoke()}
        >
          {isMock
            ? "[ SIMULATED — NO INVOKE ]"
            : working
              ? "[ WORKING... ]"
              : "[ INVOKE ]"}
        </button>
      </div>
    </article>
  );
}
