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
          className="fixed bottom-6 left-1/2 z-50 w-[min(100%,24rem)] -translate-x-1/2 rounded-xl bg-[var(--inverse-bg)] px-5 py-3 text-center text-sm font-medium text-[var(--inverse-fg)] shadow-lg sm:bottom-8"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
