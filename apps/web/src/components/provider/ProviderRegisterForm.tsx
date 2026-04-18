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
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  formatEther,
  keccak256,
  stringToHex,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import type { ChainProviderRow } from "@/hooks/useMarketplaceProviders";

export type RegisterFormValues = {
  modelId: string;
  endpoint: string;
  pricePerCall: string;
  stake: string;
  metadataURI: string;
  identityHash: string;
};

export const emptyRegisterValues: RegisterFormValues = {
  modelId: "",
  endpoint: "",
  pricePerCall: "",
  stake: "",
  metadataURI: "",
  identityHash: "",
};

const MIN_STAKE_WEI = parseEther("0.01");

function isEthDecimal(s: string): boolean {
  return /^\d+(\.\d+)?$/.test(s.trim());
}

function isIdentityHash(s: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(s.trim());
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
  {
    seed,
    initialValues,
    marketplace,
    onRegistered,
  },
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

    const v = values;
    if (
      !v.modelId.trim() ||
      !v.endpoint.trim() ||
      !v.pricePerCall.trim() ||
      !v.stake.trim() ||
      !v.metadataURI.trim() ||
      !v.identityHash.trim()
    ) {
      setError("All fields are required.");
      return;
    }
    if (!isEthDecimal(v.pricePerCall) || !isEthDecimal(v.stake)) {
      setError("pricePerCall and stake must be positive decimal ETH strings.");
      return;
    }
    if (!isIdentityHash(v.identityHash)) {
      setError("identityHash must be 0x followed by 64 hex characters.");
      return;
    }

    const priceWei = parseEther(v.pricePerCall.trim());
    const stakeWei = parseEther(v.stake.trim());
    if (stakeWei < MIN_STAKE_WEI) {
      setError("Stake must be at least 0.01 ETH (MIN_STAKE).");
      return;
    }

    const metadataHash = keccak256(stringToHex(v.metadataURI.trim()));
    const identityHash = v.identityHash.trim() as Hex;

    writeContract({
      address: marketplace,
      abi: marketplaceAbi,
      functionName: "register",
      args: [
        {
          modelId: v.modelId.trim(),
          endpoint: v.endpoint.trim(),
          pricePerCall: priceWei,
          metadataURI: v.metadataURI.trim(),
          metadataHash,
          identityHash,
        },
      ],
      value: stakeWei,
    });
  }

  const working = isPending || isConfirming;

  return (
    <section ref={ref}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-2 border-b-2 border-theme pb-3">
        <h2 className="section-heading">Register_Or_Edit</h2>
        <span className="section-eyebrow">On-chain register</span>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 border-2 border-theme p-4 sm:p-6"
        noValidate
      >
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
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="section-eyebrow">endpoint</span>
            <input
              id={`${baseId}-endpoint`}
              value={values.endpoint}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, endpoint: e.target.value }))
              }
              className="input-brutal min-h-[44px]"
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
          {working ? "[ SUBMITTING… ]" : "[ REGISTER_ON_CHAIN ]"}
        </button>
      </form>
    </section>
  );
});

export function chainProviderToFormValues(
  p: ChainProviderRow,
): RegisterFormValues {
  return {
    modelId: p.modelId,
    endpoint: p.endpoint,
    pricePerCall: formatEther(p.pricePerCall),
    stake: formatEther(p.stake),
    metadataURI: p.metadataURI,
    identityHash: p.identityHash,
  };
}
