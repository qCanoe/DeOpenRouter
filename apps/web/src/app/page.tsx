"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import type { AppRole } from "@/components/RoleTabs";
import { UserView } from "@/components/user/UserView";
import { ProviderView } from "@/components/provider/ProviderView";

export default function Page() {
  const [role, setRole] = useState<AppRole>("user");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--muted-bg)] text-[var(--foreground)] selection:bg-[var(--foreground)] selection:text-[var(--background)]">
      <Header role={role} onRoleChange={setRole} />

      <main
        id="role-panel"
        role="tabpanel"
        aria-labelledby={role === "user" ? "tab-user" : "tab-provider"}
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-8 sm:gap-14 sm:px-6 sm:py-10 md:px-8 md:py-12"
      >
        {role === "user" ? (
          <UserView />
        ) : (
          <ProviderView showToast={showToast} />
        )}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--background)] px-6 py-8 text-center text-xs text-[var(--muted)]">
        DeOpenRouter MVP &middot; {new Date().getFullYear()} &middot; On-chain trust &middot; Off-chain inference
      </footer>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex min-w-[200px] max-w-[min(100%-3rem,24rem)] -translate-x-1/2 items-center justify-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-6 py-3.5 text-sm font-semibold text-[var(--foreground)] shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:bottom-8 animate-toast-in"
          role="status"
          aria-live="polite"
        >
          <svg
            className="h-4 w-4 shrink-0 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
