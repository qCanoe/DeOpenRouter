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
import { marketplaceAbi, REQUEST_FORMAT_V1, RESPONSE_FORMAT_V1 } from "@/lib/marketplaceAbi";
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
    <div className="min-h-screen flex flex-col font-mono text-sm sm:text-base selection:bg-inverse selection:text-inverse-fg">
      <header className="border-b-2 border-theme">
        <div className="p-4 sm:p-8 max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter uppercase leading-none">
              DeOpen<br className="hidden md:block"/>Router
            </h1>
            <p className="mt-4 text-muted uppercase tracking-widest text-sm font-bold">
              {"//"} Trust-minimized AI API Marketplace
            </p>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-4 uppercase tracking-widest w-full md:w-auto">
            <div className="flex flex-row gap-8 border-2 border-theme p-4 bg-inverse text-inverse-fg w-full md:w-auto justify-between md:justify-start">
              <div>
                <span className="text-neutral-400 block text-xs mb-1">NETWORK</span>
                <span className="text-base font-bold">{chainId === 31337 ? 'ANVIL_LOCAL' : chainId}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-xs mb-1">STATUS</span>
                <span className="text-base font-bold">
                  {isConnected ? (
                    <span className="flex items-center gap-2"><span className="w-3 h-3 bg-inverse-fg animate-pulse"></span> ONLINE</span>
                  ) : (
                    <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-inverse-fg"></span> OFFLINE</span>
                  )}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              {!isConnected ? (
                <button
                  type="button"
                  className="flex-1 md:flex-none border-2 border-theme bg-inverse text-inverse-fg px-6 py-3 text-sm sm:text-base font-bold hover:bg-background hover:text-foreground transition-colors"
                  onClick={() => connect({ connector: connectors[0] })}
                >
                  [ CONNECT_WALLET ]
                </button>
              ) : (
                <button 
                  type="button" 
                  className="flex-1 md:flex-none border-2 border-theme bg-background text-foreground px-6 py-3 text-sm sm:text-base font-bold hover:bg-inverse hover:text-inverse-fg transition-colors" 
                  onClick={() => disconnect()}
                >
                  [ DISCONNECT: {address?.slice(0, 6)}… ]
                </button>
              )}
              
              {chainId !== 31337 && (
                <button
                  type="button"
                  className="flex-1 md:flex-none border-2 border-theme bg-background text-foreground px-6 py-3 text-sm sm:text-base font-bold hover:bg-inverse hover:text-inverse-fg transition-colors"
                  onClick={() => switchChain({ chainId: 31337 })}
                >
                  [ SWITCH_TO_ANVIL ]
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full p-4 sm:p-8 max-w-6xl mx-auto grid gap-12 content-start">
        <section>
          <div className="border-b-2 border-theme mb-8 pb-3 flex justify-between items-end">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider">Available_Providers</h2>
            <span className="text-muted text-sm font-bold">COUNT: {ids.length}</span>
          </div>
          
          {ids.length === 0 ? (
            <div className="border-2 border-theme p-12 text-center text-muted uppercase tracking-widest border-dashed font-bold">
              &lt;NO_PROVIDERS_FOUND_ON_CHAIN&gt;
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              {ids.map((id) => (
                <ProviderRow key={id.toString()} marketplace={marketplace} providerId={id} mockApi={MOCK_API} />
              ))}
            </div>
          )}
        </section>
      </main>
      
      <footer className="mt-auto border-t-2 border-theme p-6 text-center text-xs font-bold text-muted uppercase tracking-widest bg-theme">
        DeOpenRouter MVP {"//"} {new Date().getFullYear()} {"//"} On-chain trust {"//"} Off-chain inference
      </footer>
    </div>
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
  const [prompt, setPrompt] = useState("Explain proof of work simply.");
  const [lastHashes, setLastHashes] = useState<{ rq: string; rs: string } | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  if (!p) return <div className="border-2 border-theme p-8 animate-pulse uppercase text-muted font-bold tracking-widest border-dashed">LOADING_PROVIDER_DATA...</div>;
  const [owner, modelId, endpoint, pricePerCall, , active] = p;
  if (!active) return null;

  async function onCall() {
    const body = JSON.stringify({ prompt });
    const res = await fetch(`${mockApi}/v1/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const json = (await res.json()) as { model?: string; response?: string };
    const responseText = typeof json.response === "string" ? json.response : "";
    const modelForHash = typeof json.model === "string" && json.model.length > 0 ? json.model : "mock-mvp";
    const rq = keccak256(stringToHex(body));
    const rs = keccak256(stringToHex(JSON.stringify({ model: modelForHash, response: responseText })));
    setLastHashes({ rq, rs });
    try {
      await writeContractAsync({
        address: marketplace,
        abi: marketplaceAbi,
        functionName: "invoke",
        args: [providerId, rq, rs, REQUEST_FORMAT_V1, RESPONSE_FORMAT_V1],
        value: pricePerCall,
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <article className="border-2 border-theme flex flex-col group hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--border)] transition-all bg-background relative">
      <div className="absolute top-0 right-0 w-8 h-8 border-l-2 border-b-2 border-theme flex items-center justify-center bg-inverse text-inverse-fg text-xs font-bold">
        {providerId.toString()}
      </div>
      
      <div className="border-b-2 border-theme p-5 bg-background flex justify-between items-start pt-8">
        <div>
          <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tighter leading-none">{modelId}</h3>
        </div>
      </div>
      
      <div className="flex border-b-2 border-theme">
        <div className="p-4 flex-1 border-r-2 border-theme">
          <div className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Price / Call</div>
          <div className="text-lg font-bold">{formatEther(pricePerCall)} <span className="text-sm">ETH</span></div>
        </div>
        <div className="p-4 flex-1 overflow-hidden">
          <div className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Endpoint</div>
          <div className="text-xs truncate font-bold">{endpoint}</div>
        </div>
      </div>

      <div className="p-4 border-b-2 border-theme border-dashed bg-theme">
        <div className="text-muted text-[10px] uppercase font-bold tracking-widest mb-1">Owner</div>
        <div className="text-xs truncate font-bold">{owner}</div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-5 bg-background">
        <div className="flex-1 relative">
          <label className="absolute -top-2 left-2 bg-background px-2 text-[10px] text-muted uppercase font-bold tracking-widest">
            Prompt_Input
          </label>
          <textarea 
            className="w-full min-h-[120px] border-2 border-theme bg-transparent p-4 text-sm font-medium focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0_var(--border)] transition-shadow resize-y" 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            spellCheck={false}
          />
        </div>
        
        <button
          type="button"
          disabled={isPending}
          className="w-full border-2 border-theme bg-inverse text-inverse-fg py-4 text-sm font-bold uppercase tracking-widest hover:bg-background hover:text-foreground hover:shadow-[4px_4px_0_var(--border)] transition-all disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-1 active:shadow-none"
          onClick={() => void onCall()}
        >
          {isPending ? ">>> EXECUTING_TRANSACTION..." : ">>> EXECUTE_MOCK_INFERENCE"}
        </button>
        
        {lastHashes && (
          <div className="mt-2 border-2 border-theme bg-theme p-4 text-xs overflow-hidden relative">
             <div className="absolute top-0 right-0 bg-theme border-l-2 border-b-2 border-theme px-2 py-1 text-[10px] font-bold uppercase">
               Receipt
             </div>
            <div className="text-muted uppercase mb-2 font-bold tracking-widest border-b border-theme border-dashed pb-2">Transaction_Hashes</div>
            <div className="truncate mb-1"><span className="text-muted font-bold mr-2">REQ:</span><span className="font-mono">{lastHashes.rq}</span></div>
            <div className="truncate"><span className="text-muted font-bold mr-2">RES:</span><span className="font-mono">{lastHashes.rs}</span></div>
          </div>
        )}
      </div>
    </article>
  );
}
