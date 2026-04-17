"use client";

import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { RoleTabs, type AppRole } from "@/components/RoleTabs";

type HeaderProps = {
  role: AppRole;
  onRoleChange: (role: AppRole) => void;
};

export function Header({ role, onRoleChange }: HeaderProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  return (
    <header className="border-b-2 border-theme">
      <div className="mx-auto flex w-full max-w-[min(88rem,calc(100%-4rem))] flex-col gap-6 px-6 py-6 sm:px-8 sm:py-7 lg:px-12 lg:py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold uppercase leading-[0.95] tracking-tighter sm:text-6xl">
              DeOpen
              <br className="hidden md:block" />
              Router
            </h1>
            <p className="mt-4 max-w-[42ch] text-sm font-bold uppercase leading-relaxed tracking-widest text-muted">
              Decentralized AI routing · Transparent marketplace
            </p>
          </div>

          <div className="flex flex-col items-stretch md:items-end gap-4 w-full md:w-auto uppercase tracking-widest">
            <div className="flex w-full flex-row justify-between gap-8 border-2 border-theme bg-background p-4 text-foreground md:w-auto md:justify-start">
              <div>
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted">
                  NETWORK
                </span>
                <span className="text-base font-bold tabular-nums">
                  {chainId === 31337 ? "ANVIL_LOCAL" : chainId}
                </span>
              </div>
              <div>
                <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted">
                  STATUS
                </span>
                <span className="text-base font-bold">
                  {isConnected ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 bg-foreground" aria-hidden />
                      ONLINE
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 border-2 border-foreground"
                        aria-hidden
                      />
                      OFFLINE
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              {!isConnected ? (
                <button
                  type="button"
                  className="btn-brutal flex-1 border-theme bg-background text-foreground hover:bg-inverse hover:text-inverse-fg sm:text-center"
                  onClick={() => connect({ connector: connectors[0] })}
                >
                  [ CONNECT_WALLET ]
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-brutal flex-1 border-theme bg-background text-foreground hover:bg-inverse hover:text-inverse-fg sm:text-center"
                  onClick={() => disconnect()}
                >
                  [ WALLET: {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—"} ]
                </button>
              )}

              {chainId !== 31337 && (
                <button
                  type="button"
                  className="btn-brutal flex-1 border-theme bg-background text-foreground hover:bg-inverse hover:text-inverse-fg"
                  onClick={() => switchChain({ chainId: 31337 })}
                >
                  [ SWITCH_TO_ANVIL ]
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="border-t-2 border-theme pt-6">
          <RoleTabs role={role} onRoleChange={onRoleChange} />
        </div>
      </div>
    </header>
  );
}
