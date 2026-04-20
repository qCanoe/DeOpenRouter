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
      metadata: "METADATA_UPDATED",
      price: "PRICE_CHANGE_SCHEDULED",
      deactivate: "PROVIDER_DEACTIVATED",
      withdraw: "STAKE_WITHDRAWN",
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
      setActionError(e instanceof Error ? e.message : "provider_action_failed");
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
      setActionError("next price must be a positive decimal ETH string.");
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

  return (
    <article className="flex flex-col border-2 border-theme">
      <div className="flex flex-col gap-4 border-b-2 border-theme bg-zinc-50 p-6 dark:bg-zinc-900/30 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="section-eyebrow">Provider #{provider.id}</p>
          <h3 className="mt-2 break-all text-2xl font-bold uppercase leading-tight tracking-tighter sm:text-3xl">
            {provider.modelId}
          </h3>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">
            Owner {shortenHex(provider.owner, 4, 4)} / v{provider.modelVersion}
          </p>
        </div>
        <span
          className={`border-2 border-theme px-2 py-1 text-xs font-bold uppercase tracking-widest ${
            provider.active
              ? "bg-emerald-200 text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-200"
              : "bg-red-200 text-red-950 dark:bg-red-900/40 dark:text-red-200"
          }`}
        >
          {provider.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b-2 border-theme p-4 sm:grid-cols-3">
        <div className="flex min-h-[6.5rem] flex-col justify-between border-2 border-theme bg-sky-50 p-4 dark:bg-sky-900/20">
          <p className="text-xs font-bold uppercase leading-snug tracking-widest text-sky-900/70 dark:text-sky-200/70 mb-1">Total calls</p>
          <p className="text-2xl font-bold tabular-nums leading-tight text-sky-950 dark:text-sky-100">{totalCalls}</p>
        </div>
        <div className="flex min-h-[6.5rem] flex-col justify-between border-2 border-theme bg-amber-50 p-4 dark:bg-amber-900/20">
          <p className="text-xs font-bold uppercase leading-snug tracking-widest text-amber-900/70 dark:text-amber-200/70 mb-1">Total earned (ETH)</p>
          <p className="text-2xl font-bold tabular-nums leading-tight text-amber-950 dark:text-amber-100">{totalEarnedEth}</p>
        </div>
        <div className="flex min-h-[6.5rem] flex-col justify-between border-2 border-theme bg-fuchsia-50 p-4 dark:bg-fuchsia-900/20">
          <p className="text-xs font-bold uppercase leading-snug tracking-widest text-fuchsia-900/70 dark:text-fuchsia-200/70 mb-1">Current stake (ETH)</p>
          <p className="text-2xl font-bold tabular-nums leading-tight text-fuchsia-950 dark:text-fuchsia-100">
            {formatEther(provider.stake)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b-2 border-theme lg:grid-cols-2">
        <div className="border-b-2 border-theme p-5 lg:border-b-0 lg:border-r-2">
          <div className="section-eyebrow mb-2">Endpoint commitment</div>
          <div className="break-all font-mono text-sm font-bold leading-snug">
            {provider.endpointCommitment}
          </div>

          <div className="section-eyebrow mb-2 mt-4">Capability hash</div>
          <div className="break-all font-mono text-sm font-bold leading-snug">
            {provider.capabilityHash}
          </div>
        </div>

        <div className="grid gap-5 p-5">
          <div>
            <div className="section-eyebrow mb-1">Current effective price</div>
            <div className="text-lg font-bold tabular-nums leading-tight">
              {formatEther(provider.effectivePriceWei)} ETH
            </div>
            {provider.hasPendingPrice && (
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted">
                Pending {formatEther(provider.pendingPriceDisplay)} ETH @ block{" "}
                {provider.pendingAppliesAtBlock.toString()}
              </p>
            )}
          </div>

          <label className="flex flex-col gap-2">
            <span className="section-eyebrow">Schedule new price (ETH)</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={nextPrice}
                onChange={(e) => setNextPrice(e.target.value)}
                className="input-brutal min-h-[44px] flex-1 tabular-nums"
                inputMode="decimal"
                placeholder="e.g. 0.0025"
              />
              <button
                type="button"
                className="btn-brutal border-theme bg-background"
                disabled={working}
                onClick={handlePriceSchedule}
              >
                [ ANNOUNCE_PRICE ]
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="w-full text-xs font-bold uppercase tracking-widest text-muted">
                Quick price (ETH)
              </span>
              {DASHBOARD_PRICE_CHIPS.map((eth) => (
                <button
                  key={eth}
                  type="button"
                  className="border-2 border-theme bg-zinc-50 px-2 py-1 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background dark:bg-zinc-900/30"
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

      <div className="grid grid-cols-1 gap-5 border-b-2 border-theme p-5">
        <div className="border-2 border-dashed border-theme bg-zinc-50 p-4 dark:bg-zinc-900/30">
          <p className="mb-3 text-xs font-bold uppercase leading-snug tracking-widest text-zinc-600 dark:text-zinc-400">Quick metadata presets</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {DASHBOARD_METADATA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="btn-brutal border-theme bg-zinc-100/50 text-left hover:bg-zinc-200/50 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60 sm:min-w-[12rem]"
                disabled={working}
                onClick={() => {
                  setActionError(null);
                  setMetadataURI(preset.metadataURI);
                  setIdentityHash(preset.identityHash);
                }}
              >
                <span className="block font-bold uppercase tracking-tight">{preset.label}</span>
                <span className="mt-1 block truncate font-mono text-[10px] font-bold uppercase leading-snug tracking-widest text-muted">
                  {preset.metadataURI}
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="section-eyebrow">metadataURI</span>
          <input
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            className="input-brutal min-h-[44px]"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="section-eyebrow">identityHash</span>
          <input
            value={identityHash}
            onChange={(e) => setIdentityHash(e.target.value)}
            className="input-brutal min-h-[44px] font-mono text-xs leading-normal"
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-brutal border-theme bg-background"
            disabled={working}
            onClick={handleMetadataUpdate}
          >
            [ UPDATE_METADATA ]
          </button>
          <button
            type="button"
            className="btn-brutal border-theme bg-background"
            disabled={working || !provider.active}
            onClick={handleDeactivate}
          >
            [ DEACTIVATE ]
          </button>
          <button
            type="button"
            className="btn-brutal border-theme bg-background"
            disabled={working || provider.active || provider.stake === 0n}
            onClick={handleWithdraw}
          >
            [ WITHDRAW_STAKE ]
          </button>
          <button
            type="button"
            className="btn-brutal border-theme bg-inverse text-inverse-fg hover:bg-background hover:text-foreground"
            disabled={working}
            onClick={onScrollToRegister}
          >
            [ REGISTER_ANOTHER ]
          </button>
        </div>
      </div>

      {actionError && (
        <p className="border-b-2 border-red-600 px-5 py-3 text-xs font-bold uppercase tracking-widest text-red-600 dark:border-red-400 dark:text-red-400">
          {actionError}
        </p>
      )}
    </article>
  );
}
