"use client";

import { useEffect, useMemo, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { shortenHex } from "@/lib/format";
import {
  DASHBOARD_METADATA_PRESETS,
  DASHBOARD_PRICE_CHIPS,
} from "@/lib/providerDemoData";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import {
  formatEther,
  keccak256,
  parseEther,
  stringToHex,
  type Address,
  type Hex,
} from "viem";

type MyProviderCardProps = {
  marketplace: Address;
  provider: ChainProviderRow;
  calls: CallLogRow[];
  onScrollToRegister: () => void;
  onChanged?: (message: string) => void;
};

type ProviderAction = "metadata" | "price" | "deactivate" | "withdraw";

function isHex32(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

function isEthDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

export function MyProviderCard({
  marketplace,
  provider,
  calls,
  onScrollToRegister,
  onChanged,
}: MyProviderCardProps) {
  const [metadataURI, setMetadataURI] = useState(provider.metadataURI);
  const [identityHash, setIdentityHash] = useState<string>(provider.identityHash);
  const [nextPrice, setNextPrice] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ProviderAction | null>(null);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    setMetadataURI(provider.metadataURI);
    setIdentityHash(provider.identityHash);
    setActionError(null);
  }, [provider.metadataURI, provider.identityHash, provider.id]);

  useEffect(() => {
    if (!error) return;
    setPendingAction(null);
    setActionError(error.message);
  }, [error]);

  useEffect(() => {
    if (!isSuccess || !pendingAction) return;

    if (pendingAction === "price") {
      setNextPrice("");
    }

    const messages: Record<ProviderAction, string> = {
      metadata: "Metadata Updated",
      price: "Price Change Scheduled",
      deactivate: "Provider Deactivated",
      withdraw: "Stake Withdrawn",
    };

    onChanged?.(messages[pendingAction]);
    setPendingAction(null);
    setActionError(null);
    reset();
  }, [isSuccess, onChanged, pendingAction, reset]);

  const totalCalls = calls.length;
  const totalEarnedEth = useMemo(() => {
    let total = 0n;
    for (const call of calls) total += call.paid;
    return formatEther(total);
  }, [calls]);

  const working = isPending || isConfirming;

  function submitAction(
    action: ProviderAction,
    tx: { functionName: string; args: readonly unknown[] },
  ) {
    setActionError(null);
    try {
      setPendingAction(action);
      writeContract({
        address: marketplace,
        abi: marketplaceAbi,
        functionName: tx.functionName as never,
        args: tx.args as never,
      });
    } catch (e) {
      setPendingAction(null);
      setActionError(e instanceof Error ? e.message : "Provider action failed");
    }
  }

  function handleMetadataUpdate() {
    const nextMetadataURI = metadataURI.trim();
    const nextIdentityHash = identityHash.trim();
    if (!nextMetadataURI) {
      setActionError("metadataURI is required.");
      return;
    }
    if (!isHex32(nextIdentityHash)) {
      setActionError("identityHash must be 0x + 64 hex chars.");
      return;
    }

    submitAction("metadata", {
      functionName: "updateProviderMetadata",
      args: [
        BigInt(provider.id),
        {
          metadataURI: nextMetadataURI,
          metadataHash: keccak256(stringToHex(nextMetadataURI)),
          identityHash: nextIdentityHash as Hex,
        },
      ] as const,
    });
  }

  function handlePriceSchedule() {
    if (!isEthDecimal(nextPrice)) {
      setActionError("Next price must be a positive decimal ETH string.");
      return;
    }

    submitAction("price", {
      functionName: "announcePriceChange",
      args: [BigInt(provider.id), parseEther(nextPrice.trim())] as const,
    });
  }

  function handleDeactivate() {
    submitAction("deactivate", {
      functionName: "deactivate",
      args: [BigInt(provider.id)] as const,
    });
  }

  function handleWithdraw() {
    submitAction("withdraw", {
      functionName: "withdrawStake",
      args: [BigInt(provider.id)] as const,
    });
  }

  const pendingSlotMinClass = "min-h-[2rem] pt-1";

  return (
    <article className="card-modern flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-[6rem] shrink-0 flex-col gap-4 border-b border-[var(--border)] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted)]">Provider #{provider.id}</p>
          <h3 className="mt-1 break-all text-2xl font-semibold tracking-tight sm:text-3xl">
            {provider.modelId}
          </h3>
          <p className="mt-1.5 text-xs font-medium text-[var(--muted)]">
            Owner {shortenHex(provider.owner, 4, 4)} &middot; v{provider.modelVersion}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider ${
            provider.active
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : "bg-[var(--muted-bg)] text-[var(--muted)]"
          }`}
        >
          {provider.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="grid grid-cols-1 items-stretch border-b border-[var(--border)] sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
        <div className="flex min-h-[6rem] flex-col justify-between p-5">
          <p className="text-xs font-medium text-[var(--muted)]">Total calls</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{totalCalls}</p>
        </div>
        <div className="flex min-h-[6rem] flex-col justify-between p-5">
          <p className="text-xs font-medium text-[var(--muted)]">Total earned (ETH)</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{totalEarnedEth}</p>
        </div>
        <div className="flex min-h-[6rem] flex-col justify-between p-5">
          <p className="text-xs font-medium text-[var(--muted)]">Current stake (ETH)</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatEther(provider.stake)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch border-b border-[var(--border)] lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border)]">
        <div className="flex min-h-0 flex-col p-6">
          <div className="mb-2 text-xs font-medium text-[var(--muted)]">Endpoint Commitment</div>
          <div className="break-all font-mono text-[13px] font-medium text-[var(--foreground)]">
            {provider.endpointCommitment}
          </div>

          <div className="mb-2 mt-5 text-xs font-medium text-[var(--muted)]">Capability Hash</div>
          <div className="break-all font-mono text-[13px] font-medium text-[var(--foreground)]">
            {provider.capabilityHash}
          </div>
        </div>

        <div className="grid min-h-0 gap-6 p-6 lg:flex lg:flex-col lg:justify-between">
          <div className="shrink-0">
            <div className="mb-1.5 text-xs font-medium text-[var(--muted)]">Current Effective Price</div>
            <div className="text-xl font-semibold tabular-nums tracking-tight">
              {formatEther(provider.effectivePriceWei)} <span className="text-sm font-medium text-[var(--muted)]">ETH</span>
            </div>
            <div className={pendingSlotMinClass}>
              {provider.hasPendingPrice ? (
                <p className="text-[11px] text-[var(--muted)]">
                  Pending {formatEther(provider.pendingPriceDisplay)} ETH @ block{" "}
                  {provider.pendingAppliesAtBlock.toString()}
                </p>
              ) : null}
            </div>
          </div>

          <label className="flex flex-col gap-2.5">
            <span className="text-xs font-medium text-[var(--muted)]">Schedule New Price (ETH)</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={nextPrice}
                onChange={(e) => setNextPrice(e.target.value)}
                className="input-modern flex-1 tabular-nums"
                inputMode="decimal"
                placeholder="e.g. 0.0025"
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={working}
                onClick={handlePriceSchedule}
              >
                Announce Price
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-[var(--muted)]">Quick values:</span>
              {DASHBOARD_PRICE_CHIPS.map((eth) => (
                <button
                  key={eth}
                  type="button"
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] transition-ui hover:border-[var(--muted)] hover:text-[var(--foreground)]"
                  disabled={working}
                  onClick={() => setNextPrice(eth)}
                >
                  {eth}
                </button>
              ))}
            </div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 p-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-4">
          <p className="mb-3 text-xs font-medium text-[var(--muted)]">Quick metadata presets</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {DASHBOARD_METADATA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="card-modern px-4 py-3 text-left transition-ui sm:min-w-[12rem] bg-[var(--background)]"
                disabled={working}
                onClick={() => {
                  setActionError(null);
                  setMetadataURI(preset.metadataURI);
                  setIdentityHash(preset.identityHash);
                }}
              >
                <span className="block text-sm font-semibold tracking-tight text-[var(--foreground)]">{preset.label}</span>
                <span className="mt-1 block truncate font-mono text-[10px] text-[var(--muted)]">
                  {preset.metadataURI}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--muted)]">Metadata URI</span>
          <input
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            className="input-modern"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--muted)]">Identity Hash</span>
          <input
            value={identityHash}
            onChange={(e) => setIdentityHash(e.target.value)}
            className="input-modern font-mono text-[13px]"
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            disabled={working}
            onClick={handleMetadataUpdate}
          >
            Update Metadata
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={working || !provider.active}
            onClick={handleDeactivate}
          >
            Deactivate
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={working || provider.active || provider.stake === 0n}
            onClick={handleWithdraw}
          >
            Withdraw Stake
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={working}
            onClick={onScrollToRegister}
          >
            Register Another
          </button>
        </div>
      </div>

      {actionError && (
        <div className="border-t border-red-200 bg-red-50/50 px-6 py-4 text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400">
          {actionError}
        </div>
      )}
    </article>
  );
}
