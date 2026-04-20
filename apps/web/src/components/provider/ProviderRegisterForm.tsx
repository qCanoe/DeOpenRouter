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

/** Visual + layout for preset tiles (avoid btn-brutal’s centered inline-flex, which collapses multi-line labels). */
const PRESET_BUTTON_CLASS: Record<string, string> = {
  budget:
    "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-100",
  standard:
    "bg-blue-100 hover:bg-blue-200 text-blue-950 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-100",
  premium:
    "bg-violet-100 hover:bg-violet-200 text-violet-950 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 dark:text-violet-100",
};

const PRESET_DESC_CLASS: Record<string, string> = {
  budget: "text-emerald-900/70 dark:text-emerald-200/70",
  standard: "text-blue-900/70 dark:text-blue-200/70",
  premium: "text-violet-900/70 dark:text-violet-200/70",
};

function presetTileClass(id: string): string {
  return PRESET_BUTTON_CLASS[id] ?? "bg-background hover:bg-zinc-100 dark:hover:bg-zinc-900/60";
}

function presetDescClass(id: string): string {
  return PRESET_DESC_CLASS[id] ?? "text-muted";
}

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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">Register_Provider</h2>
        <span className="section-eyebrow">New on-chain provider</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 border-2 border-theme p-4 sm:p-6"
        noValidate
      >
        <div className="border-2 border-dashed border-theme bg-zinc-100/70 p-4 dark:bg-zinc-900/35">
          <p className="mb-2 text-xs font-bold uppercase leading-snug tracking-widest text-zinc-600 dark:text-zinc-400">
            Quick presets
          </p>
          <p className="mb-5 max-w-[65ch] text-sm font-medium leading-relaxed text-zinc-700 dark:text-zinc-300">
            Load a full valid example, then edit any field before registering.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            {REGISTER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`focus-ring transition-ui flex h-auto min-h-0 w-full flex-col items-stretch gap-2.5 border-2 border-theme px-4 py-4 text-left sm:min-w-[12.5rem] sm:max-w-[20rem] ${presetTileClass(preset.id)}`}
                onClick={() => {
                  setError(null);
                  setValues({ ...preset.values });
                }}
              >
                <span className="text-sm font-bold uppercase leading-tight tracking-wide text-current">
                  {preset.label}
                </span>
                <span
                  className={`block text-xs font-semibold uppercase leading-relaxed tracking-wider ${presetDescClass(preset.id)}`}
                >
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs font-bold uppercase leading-relaxed tracking-widest text-muted">
          Endpoint commitment is keccak256(utf8(endpointId)) - store the real URL
          off-chain; only the short id is hashed.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="section-eyebrow">modelId</span>
            <input
              id={`${baseId}-modelId`}
              value={values.modelId}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, modelId: e.target.value }))
              }
              className="input-brutal min-h-[44px]"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="section-eyebrow">modelVersion</span>
            <input
              id={`${baseId}-modelVersion`}
              value={values.modelVersion}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, modelVersion: e.target.value }))
              }
              className="input-brutal min-h-[44px]"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="section-eyebrow">endpointId (preimage for commitment)</span>
            <input
              id={`${baseId}-endpointId`}
              value={values.endpointId}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, endpointId: e.target.value }))
              }
              className="input-brutal min-h-[44px]"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="section-eyebrow">capabilityHash</span>
            <input
              id={`${baseId}-capability`}
              value={values.capabilityHash}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, capabilityHash: e.target.value }))
              }
              className="input-brutal min-h-[44px] font-mono text-xs leading-normal"
              spellCheck={false}
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="section-eyebrow">pricePerCall (ETH)</span>
            <input
              id={`${baseId}-price`}
              value={values.pricePerCall}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, pricePerCall: e.target.value }))
              }
              className="input-brutal min-h-[44px] tabular-nums"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="section-eyebrow">stake (ETH)</span>
            <input
              id={`${baseId}-stake`}
              value={values.stake}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, stake: e.target.value }))
              }
              className="input-brutal min-h-[44px] tabular-nums"
              inputMode="decimal"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="section-eyebrow">stakeLockBlocks (0 = no extra lock)</span>
            <input
              id={`${baseId}-lock`}
              value={values.stakeLockBlocks}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, stakeLockBlocks: e.target.value }))
              }
              className="input-brutal min-h-[44px] tabular-nums"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="section-eyebrow">metadataURI</span>
            <input
              id={`${baseId}-metadata`}
              value={values.metadataURI}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, metadataURI: e.target.value }))
              }
              className="input-brutal min-h-[44px]"
              autoComplete="off"
            />
          </label>

          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="section-eyebrow">identityHash</span>
            <input
              id={`${baseId}-identity`}
              value={values.identityHash}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, identityHash: e.target.value }))
              }
              className="input-brutal min-h-[44px] font-mono text-xs leading-normal"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="border-2 border-red-600 px-4 py-3 text-sm font-bold uppercase leading-snug tracking-widest text-red-600 dark:border-red-400 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={working || !marketplace}
          className="btn-brutal w-full border-theme bg-inverse text-inverse-fg hover:bg-background hover:text-foreground disabled:opacity-50 sm:w-auto sm:self-start"
        >
          {working ? "[ SUBMITTING... ]" : "[ REGISTER_ON_CHAIN ]"}
        </button>
      </form>
    </section>
  );
});
