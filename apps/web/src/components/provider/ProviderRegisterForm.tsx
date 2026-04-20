"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useState,
  type FormEvent,
} from "react";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  keccak256,
  parseEther,
  stringToBytes,
  stringToHex,
  type Address,
  type Hex,
} from "viem";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import { REGISTER_PRESETS } from "@/lib/providerDemoData";

export type RegisterFormValues = {
  modelId: string;
  modelVersion: string;
  endpointId: string;
  capabilityHash: string;
  pricePerCall: string;
  stake: string;
  stakeLockBlocks: string;
  metadataURI: string;
  identityHash: string;
};

export const emptyRegisterValues: RegisterFormValues = {
  modelId: "",
  modelVersion: "1.0.0",
  endpointId: "",
  capabilityHash: "",
  pricePerCall: "",
  stake: "",
  stakeLockBlocks: "0",
  metadataURI: "",
  identityHash: "",
};

const MIN_STAKE_WEI = parseEther("0.01");

function isEthDecimal(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

function isHex32(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value.trim());
}

function isUintString(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

type ProviderRegisterFormProps = {
  seed: number;
  initialValues: RegisterFormValues;
  marketplace: Address | null;
  onRegistered?: () => void;
};

export const ProviderRegisterForm = forwardRef<
  HTMLDivElement,
  ProviderRegisterFormProps
>(function ProviderRegisterForm(
  { seed, initialValues, marketplace, onRegistered },
  ref,
) {
  const baseId = useId();
  const { isConnected } = useAccount();
  const [values, setValues] = useState<RegisterFormValues>(emptyRegisterValues);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: txError } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    setValues({ ...initialValues });
    setError(null);
  }, [seed, initialValues]);

  useEffect(() => {
    if (txError) {
      setError(txError.message);
    }
  }, [txError]);

  useEffect(() => {
    if (isSuccess) {
      onRegistered?.();
      setValues({ ...emptyRegisterValues });
    }
  }, [isSuccess, onRegistered]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!marketplace) {
      setError("Missing marketplace address.");
      return;
    }
    if (!isConnected) {
      setError("Connect wallet first.");
      return;
    }

    const value = values;
    if (
      !value.modelId.trim() ||
      !value.modelVersion.trim() ||
      !value.endpointId.trim() ||
      !value.capabilityHash.trim() ||
      !value.pricePerCall.trim() ||
      !value.stake.trim() ||
      !value.stakeLockBlocks.trim() ||
      !value.metadataURI.trim() ||
      !value.identityHash.trim()
    ) {
      setError("All fields are required.");
      return;
    }
    if (!isEthDecimal(value.pricePerCall) || !isEthDecimal(value.stake)) {
      setError("pricePerCall and stake must be positive decimal ETH strings.");
      return;
    }
    if (!isUintString(value.stakeLockBlocks)) {
      setError("stakeLockBlocks must be a non-negative integer.");
      return;
    }
    if (!isHex32(value.identityHash) || !isHex32(value.capabilityHash)) {
      setError("identityHash and capabilityHash must be 0x + 64 hex chars.");
      return;
    }

    const priceWei = parseEther(value.pricePerCall.trim());
    const stakeWei = parseEther(value.stake.trim());
    if (stakeWei < MIN_STAKE_WEI) {
      setError("Stake must be at least 0.01 ETH (MIN_STAKE).");
      return;
    }

    const endpointCommitment = keccak256(stringToBytes(value.endpointId.trim())) as Hex;
    const metadataHash = keccak256(stringToHex(value.metadataURI.trim()));
    const stakeLockBlocks = BigInt(value.stakeLockBlocks.trim());

    writeContract({
      address: marketplace,
      abi: marketplaceAbi,
      functionName: "register",
      args: [
        {
          modelId: value.modelId.trim(),
          modelVersion: value.modelVersion.trim(),
          endpointCommitment,
          capabilityHash: value.capabilityHash.trim() as Hex,
          pricePerCall: priceWei,
          stakeLockBlocks,
          metadataURI: value.metadataURI.trim(),
          metadataHash,
          identityHash: value.identityHash.trim() as Hex,
        },
      ],
      value: stakeWei,
    });
  }

  const working = isPending || isConfirming;

  return (
    <section ref={ref}>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-4">
        <h2 className="section-heading">Register Provider</h2>
        <span className="section-eyebrow">New on-chain provider</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="card-modern flex flex-col gap-8 p-6 sm:p-8"
        noValidate
      >
        <div className="rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Quick Presets</h3>
            <p className="text-xs text-[var(--muted)]">Load a valid example, then edit fields before registering.</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            {REGISTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="card-modern flex h-auto min-h-0 flex-1 flex-col items-start gap-1 p-4 text-left transition-ui sm:min-w-[12.5rem] bg-[var(--background)]"
                onClick={() => {
                  setError(null);
                  setValues({ ...preset.values });
                }}
              >
                <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                  {preset.label}
                </span>
                <span className="text-xs font-medium text-[var(--muted)]">
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs font-medium text-[var(--muted)]">
          Endpoint commitment is <code className="rounded bg-[var(--muted-bg)] px-1 py-0.5 font-mono">keccak256(utf8(endpointId))</code>. 
          Store the real URL off-chain; only the hashed short ID is saved to the contract.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--muted)]">Model ID</span>
            <input
              id={`${baseId}-modelId`}
              value={values.modelId}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, modelId: e.target.value }))
              }
              className="input-modern"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--muted)]">Model Version</span>
            <input
              id={`${baseId}-modelVersion`}
              value={values.modelVersion}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, modelVersion: e.target.value }))
              }
              className="input-modern"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-medium text-[var(--muted)]">Endpoint ID (preimage for commitment)</span>
            <input
              id={`${baseId}-endpointId`}
              value={values.endpointId}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, endpointId: e.target.value }))
              }
              className="input-modern"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-medium text-[var(--muted)]">Capability Hash</span>
            <input
              id={`${baseId}-capability`}
              value={values.capabilityHash}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, capabilityHash: e.target.value }))
              }
              className="input-modern font-mono text-[13px]"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--muted)]">Price Per Call (ETH)</span>
            <input
              id={`${baseId}-price`}
              value={values.pricePerCall}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, pricePerCall: e.target.value }))
              }
              className="input-modern tabular-nums"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[var(--muted)]">Stake (ETH)</span>
            <input
              id={`${baseId}-stake`}
              value={values.stake}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, stake: e.target.value }))
              }
              className="input-modern tabular-nums"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-medium text-[var(--muted)]">Stake Lock Blocks (0 = no extra lock)</span>
            <input
              id={`${baseId}-lock`}
              value={values.stakeLockBlocks}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, stakeLockBlocks: e.target.value }))
              }
              className="input-modern tabular-nums"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-medium text-[var(--muted)]">Metadata URI</span>
            <input
              id={`${baseId}-metadata`}
              value={values.metadataURI}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, metadataURI: e.target.value }))
              }
              className="input-modern"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs font-medium text-[var(--muted)]">Identity Hash</span>
            <input
              id={`${baseId}-identity`}
              value={values.identityHash}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, identityHash: e.target.value }))
              }
              className="input-modern font-mono text-[13px]"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-sm font-medium text-red-600 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-400"
          >
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={working || !marketplace}
            className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed px-8"
          >
            {working ? "Submitting..." : "Register on Chain"}
          </button>
        </div>
      </form>
    </section>
  );
});
