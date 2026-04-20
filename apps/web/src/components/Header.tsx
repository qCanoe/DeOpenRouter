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
    <header className="border-b border-[var(--border)] bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
              DeOpenRouter
            </h1>
            <p className="mt-1 max-w-[42ch] text-sm text-[var(--muted)] sm:mt-2">
              Decentralized AI routing &middot; Transparent marketplace
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex flex-row items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--muted-bg)] px-4 py-2 sm:gap-6 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Network
                </span>
                <span className="text-sm font-medium tabular-nums text-[var(--foreground)]">
                  {chainId === 31337 ? "Anvil Local" : chainId}
                </span>
              </div>
              <div className="h-5 w-px bg-[var(--border)]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Status
                </span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {isConnected ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                      Online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[var(--muted)]" aria-hidden />
                      Offline
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-row gap-2.5">
              {!isConnected ? (
                <button
                  type="button"
                  className="btn-primary flex-1 sm:flex-none"
                  onClick={() => connect({ connector: connectors[0] })}
                >
                  Connect Wallet
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-secondary flex-1 sm:flex-none"
                  onClick={() => disconnect()}
                >
                  {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Disconnect"}
                </button>
              )}

              {chainId !== 31337 && (
                <button
                  type="button"
                  className="btn-secondary hidden sm:flex"
                  onClick={() => switchChain?.({ chainId: 31337 })}
                >
                  Switch to Anvil
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-start border-t border-[var(--border)] pt-6">
          <RoleTabs role={role} onRoleChange={onRoleChange} />
        </div>
      </div>
    </header>
  );
}
