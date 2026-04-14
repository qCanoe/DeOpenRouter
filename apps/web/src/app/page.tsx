"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { marketplaceAbi } from "@/lib/marketplaceAbi";
import { keccak256, stringToHex, formatEther } from "viem";

const MOCK_API =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_MOCK_API ?? "http://127.0.0.1:8787"
    : "http://127.0.0.1:8787";

export default function Page() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const marketplace = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ??
    "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const { data: nextId } = useReadContract({
    address: marketplace,
    abi: marketplaceAbi,
    functionName: "nextProviderId",
    query: { enabled: marketplace !== "0x0000000000000000000000000000000000000000" },
  });

  const ids = useMemo(() => {
    const n = nextId ?? BigInt(0);
    return Array.from({ length: Number(n) }, (_, i) => BigInt(i));
  }, [nextId]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">DeOpenRouter MVP</h1>
        <p className="text-sm text-neutral-600">
          Local Anvil + mock API. Set <code>NEXT_PUBLIC_MARKETPLACE_ADDRESS</code> after deploy.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!isConnected ? (
            <button
              type="button"
              className="rounded bg-black px-3 py-1.5 text-sm text-white"
              onClick={() => connect({ connector: connectors[0] })}
            >
              Connect
            </button>
          ) : (
            <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={() => disconnect()}>
              Disconnect {address?.slice(0, 6)}…
            </button>
          )}
          {chainId !== 31337 ? (
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm"
              onClick={() => switchChain({ chainId: 31337 })}
            >
              Switch to Anvil (31337)
            </button>
          ) : (
            <span className="text-sm text-green-700">Chain: Anvil</span>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded border p-4">
        <h2 className="font-medium">Providers</h2>
        {ids.length === 0 ? <p className="text-sm text-neutral-600">No providers yet.</p> : null}
        {ids.map((id) => (
          <ProviderRow key={id.toString()} marketplace={marketplace} providerId={id} mockApi={MOCK_API} />
        ))}
      </section>
    </main>
  );
}

function ProviderRow({
  marketplace,
  providerId,
  mockApi,
}: {
  marketplace: `0x${string}`;
  providerId: bigint;
  mockApi: string;
}) {
  const { data: p } = useReadContract({
    address: marketplace,
    abi: marketplaceAbi,
    functionName: "providers",
    args: [providerId],
  });
  const [prompt, setPrompt] = useState("hello");
  const [lastHashes, setLastHashes] = useState<{ rq: string; rs: string } | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  if (!p) return <div className="text-sm">Loading provider {providerId.toString()}…</div>;
  const [owner, modelId, endpoint, pricePerCall, , active] = p;
  if (!active) return null;

  async function onCall() {
    const body = JSON.stringify({ prompt });
    const res = await fetch(`${mockApi}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const json = (await res.json()) as { response?: string };
    const responseText = typeof json.response === "string" ? json.response : "";
    const rq = keccak256(stringToHex(body));
    const rs = keccak256(stringToHex(JSON.stringify({ model: "mock-mvp", response: responseText })));
    setLastHashes({ rq, rs });
    await writeContractAsync({
      address: marketplace,
      abi: marketplaceAbi,
      functionName: "invoke",
      args: [providerId, rq, rs],
      value: pricePerCall,
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <div className="text-sm">
        <div>
          <span className="font-mono">id={providerId.toString()}</span> · {modelId}
        </div>
        <div className="text-neutral-600">owner {owner}</div>
        <div className="text-neutral-600">endpoint {endpoint}</div>
        <div>pricePerCall {formatEther(pricePerCall)} ETH</div>
      </div>
      <textarea className="min-h-24 w-full rounded border p-2 text-sm" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button
        type="button"
        disabled={isPending}
        className="w-fit rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        onClick={() => void onCall()}
      >
        {isPending ? "Sending…" : "Mock complete + invoke on-chain"}
      </button>
      {lastHashes ? (
        <pre className="overflow-x-auto text-xs">{JSON.stringify(lastHashes, null, 2)}</pre>
      ) : null}
    </div>
  );
}
