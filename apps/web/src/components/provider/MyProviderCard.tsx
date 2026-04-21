"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useBlockNumber,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";
import type { CallLogRow } from "@/hooks/useMyCallLogs";
import { shortenHex } from "@/lib/format";
import {
  DASHBOARD_METADATA_PRESETS,
  DASHBOARD_PRICE_CHIPS,
} from "@/lib/providerDemoData";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import { CopyableHash } from "@/components/ui/CopyableHash";
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
  onChanged,
}: MyProviderCardProps) {
  const [metadataURI, setMetadataURI] = useState(provider.metadataURI);
  const [identityHash, setIdentityHash] = useState<string>(provider.identityHash);
  const [nextPrice, setNextPrice] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ProviderAction | null>(null);
  /** True while completing Deactivate → Withdraw from the Delete control (for toast copy). */
  const listingRemovalRef = useRef(false);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { data: headBlock } = useBlockNumber({ watch: true });
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const stakeUnlockBlock = provider.createdAtBlock + provider.stakeLockBlocks;
  const stakeLockReleased =
    headBlock !== undefined && headBlock >= stakeUnlockBlock;

  useEffect(() => {
    setMetadataURI(provider.metadataURI);
    setIdentityHash(provider.identityHash);
    setActionError(null);
  }, [provider.metadataURI, provider.identityHash, provider.id]);

  useEffect(() => {
    if (!error) return;
    setPendingAction(null);
    listingRemovalRef.current = false;
    setActionError(error.message);
  }, [error]);

  useEffect(() => {
    if (!isSuccess || !pendingAction) return;

    if (pendingAction === "deactivate" && listingRemovalRef.current) {
      setPendingAction(null);
      setActionError(null);
      reset();

      if (provider.stake > 0n && stakeLockReleased) {
        setPendingAction("withdraw");
        writeContract({
          address: marketplace,
          abi: marketplaceAbi,
          functionName: "withdrawStake",
          args: [BigInt(provider.id)],
        });
        return;
      }

      listingRemovalRef.current = false;
      onChanged?.(
        provider.stake > 0n
          ? "Deactivated. Withdraw when the stake lock ends (Delete or Withdraw)."
          : "Provider Deactivated",
      );
      return;
    }

    if (pendingAction === "price") {
      setNextPrice("");
    }

    const messages: Record<ProviderAction, string> = {
      metadata: "Metadata Updated",
      price: "Price Change Scheduled",
      deactivate: "Provider Deactivated",
      withdraw: "Stake Withdrawn",
    };

    if (pendingAction === "withdraw" && listingRemovalRef.current) {
      listingRemovalRef.current = false;
      onChanged?.("Listing removed from your dashboard");
    } else {
      onChanged?.(messages[pendingAction]);
    }

    setPendingAction(null);
    setActionError(null);
    reset();
  }, [
    isSuccess,
    onChanged,
    pendingAction,
    reset,
    marketplace,
    provider.id,
    provider.stake,
    stakeLockReleased,
    writeContract,
  ]);

  const totalCalls = calls.length;
  const totalEarnedEth = useMemo(() => {
    let total = 0n;
    for (const call of calls) total += call.paid;
    return formatEther(total);
  }, [calls]);

  const working = isPending || isConfirming;

  const withdrawDisabled =
    working || provider.active || provider.stake === 0n || !stakeLockReleased;
  const withdrawTitle = (() => {
    if (working) return "Transaction in progress…";
    if (provider.active) return "Deactivate the provider before withdrawing stake.";
    if (provider.stake === 0n) return "No stake left to withdraw.";
    if (!stakeLockReleased)
      return `Stake is locked until block ${stakeUnlockBlock.toString()} (current ${headBlock?.toString() ?? "…"}).`;
    return "Withdraw remaining stake to your wallet.";
  })();

  const removeListingDisabled =
    working ||
    (!provider.active && provider.stake === 0n) ||
    (!provider.active && provider.stake > 0n && !stakeLockReleased);
  const removeListingTitle = (() => {
    if (working) return "Transaction in progress…";
    if (!provider.active && provider.stake === 0n) return "Nothing to remove.";
    if (!provider.active && provider.stake > 0n && !stakeLockReleased)
      return `Stake locked until block ${stakeUnlockBlock.toString()} (current ${headBlock?.toString() ?? "…"}).`;
    return "Deactivate (if needed), withdraw stake, and hide this listing from your dashboard.";
  })();

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
    listingRemovalRef.current = false;
    submitAction("deactivate", {
      functionName: "deactivate",
      args: [BigInt(provider.id)] as const,
    });
  }

  function handleWithdraw() {
    listingRemovalRef.current = false;
    submitAction("withdraw", {
      functionName: "withdrawStake",
      args: [BigInt(provider.id)] as const,
    });
  }

  function handleRemoveListing() {
    setActionError(null);
    if (!provider.active && provider.stake === 0n) return;

    if (provider.active) {
      listingRemovalRef.current = true;
      submitAction("deactivate", {
        functionName: "deactivate",
        args: [BigInt(provider.id)] as const,
      });
      return;
    }

    if (provider.stake > 0n) {
      if (!stakeLockReleased) {
        setActionError(`Stake locked until block ${stakeUnlockBlock.toString()}.`);
        return;
      }
      listingRemovalRef.current = true;
      submitAction("withdraw", {
        functionName: "withdrawStake",
        args: [BigInt(provider.id)] as const,
      });
    }
  }

  const pendingSlotMinClass = "min-h-[2rem] pt-1.5";

  return (
    <article className="card-modern flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-[6rem] shrink-0 flex-col gap-4 border-b border-[var(--border)] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Provider #{provider.id}
            </span>
            <span className="text-[10px] text-[var(--muted)]/50">&bull;</span>
            <span className="text-[10px] font-semibold text-[var(--muted)]">v{provider.modelVersion}</span>
          </div>
          <h3 className="break-all text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            {provider.modelId}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
            <span className="text-[var(--foreground)]/70">Owner</span>
            <span className="rounded-md border border-[var(--border)]/50 bg-[var(--muted-bg)] px-1.5 py-0.5 font-mono text-[11px]">
              {shortenHex(provider.owner, 6, 4)}
            </span>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ${
            provider.active
              ? "bg-[var(--foreground)] text-[var(--background)]"
              : "bg-[var(--muted-bg)] text-[var(--muted)]"
          }`}
        >
          {provider.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="grid grid-cols-1 items-stretch divide-y divide-[var(--border)] border-b border-[var(--border)] bg-[var(--muted-bg)]/30 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex flex-col justify-center gap-1.5 p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Total calls</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">{totalCalls}</p>
        </div>
        <div className="flex flex-col justify-center gap-1.5 p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Total earned</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
            {totalEarnedEth} <span className="text-sm font-semibold text-[var(--muted)]">ETH</span>
          </p>
        </div>
        <div className="flex flex-col justify-center gap-1.5 p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Current stake</p>
          <p className="text-3xl font-bold tabular-nums tracking-tight text-[var(--foreground)]">
            {formatEther(provider.stake)} <span className="text-sm font-semibold text-[var(--muted)]">ETH</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch divide-y divide-[var(--border)] border-b border-[var(--border)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <div className="flex min-h-0 flex-col gap-8 p-6">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Endpoint Commitment
            </div>
            <CopyableHash hash={provider.endpointCommitment} />
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Capability Hash
            </div>
            <CopyableHash hash={provider.capabilityHash} />
          </div>
        </div>

        <div className="flex flex-col gap-8 p-6">
          <div className="shrink-0">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Current Effective Price
            </div>
            <div className="text-2xl font-bold tabular-nums tracking-tight">
              {formatEther(provider.effectivePriceWei)}{" "}
              <span className="text-sm font-semibold text-[var(--muted)]">ETH</span>
            </div>
            <div className={pendingSlotMinClass}>
              {provider.hasPendingPrice ? (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Pending {formatEther(provider.pendingPriceDisplay)} ETH @ block{" "}
                  {provider.pendingAppliesAtBlock.toString()}
                </div>
              ) : null}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Schedule New Price</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  value={nextPrice}
                  onChange={(e) => setNextPrice(e.target.value)}
                  className="input-modern w-full tabular-nums bg-[var(--muted-bg)]/50 pr-14 focus:bg-transparent focus:ring-0 focus:border-[var(--foreground)]"
                  inputMode="decimal"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--muted)]">
                  ETH
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary h-auto whitespace-nowrap rounded-xl px-6 py-2.5"
                disabled={working}
                onClick={handlePriceSchedule}
              >
                Announce
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-semibold text-[var(--muted)]">Quick:</span>
              {DASHBOARD_PRICE_CHIPS.map((eth) => (
                <button
                  key={eth}
                  type="button"
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--muted)] transition-ui hover:border-[var(--foreground)]/30 hover:text-[var(--foreground)]"
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

      <div className="flex flex-col gap-6 bg-[var(--muted-bg)]/30 p-6 border-b border-[var(--border)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="flex flex-1 flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Metadata URI</span>
              <input
                value={metadataURI}
                onChange={(e) => setMetadataURI(e.target.value)}
                className="input-modern bg-[var(--background)] focus:bg-transparent focus:ring-0 focus:border-[var(--foreground)]"
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Identity Hash</span>
              <input
                value={identityHash}
                onChange={(e) => setIdentityHash(e.target.value)}
                className="input-modern bg-[var(--background)] font-mono text-[13px] focus:bg-transparent focus:ring-0 focus:border-[var(--foreground)]"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
          </div>

          <div className="shrink-0 xl:w-72">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Quick presets</p>
            <div className="flex flex-col gap-2">
              {DASHBOARD_METADATA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="group flex flex-col items-start rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-left transition-ui hover:border-[var(--foreground)]/30 hover:shadow-sm"
                  disabled={working}
                  onClick={() => {
                    setActionError(null);
                    setMetadataURI(preset.metadataURI);
                    setIdentityHash(preset.identityHash);
                  }}
                >
                  <span className="text-xs font-semibold tracking-tight text-[var(--foreground)]">{preset.label}</span>
                  <span className="mt-0.5 w-full truncate font-mono text-[10px] text-[var(--muted)]">{preset.metadataURI}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-[var(--border)] bg-[var(--muted-bg)]/10 p-6 sm:grid-cols-4">
        <button
          type="button"
          className="btn-secondary w-full rounded-xl py-2.5 text-sm font-semibold"
          disabled={working}
          onClick={handleMetadataUpdate}
        >
          Save
        </button>
        <button
          type="button"
          className="btn-secondary w-full rounded-xl py-2.5 text-sm font-semibold"
          disabled={working || !provider.active}
          onClick={handleDeactivate}
        >
          Deactivate
        </button>
        <button
          type="button"
          className="btn-secondary w-full rounded-xl py-2.5 text-sm font-semibold"
          disabled={withdrawDisabled}
          title={withdrawTitle}
          onClick={handleWithdraw}
        >
          Withdraw
        </button>
        <button
          type="button"
          className="btn-secondary w-full rounded-xl py-2.5 text-sm font-semibold"
          disabled={removeListingDisabled}
          title={removeListingTitle}
          onClick={handleRemoveListing}
        >
          Delete
        </button>
      </div>

      {actionError && (
        <div className="border-t border-red-200 bg-red-50/80 px-6 py-4 text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          <div className="flex items-start gap-2">
            <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="leading-relaxed">{actionError}</span>
          </div>
        </div>
      )}
    </article>
  );
}
