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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">Register_Provider</h2>
        <span className="section-eyebrow">New on-chain provider</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 border-2 border-theme p-4 sm:p-6"
        noValidate
      >
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
