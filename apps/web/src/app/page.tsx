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
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col font-mono text-base leading-normal selection:bg-inverse selection:text-inverse-fg">
      <Header role={role} onRoleChange={setRole} />

      <main
        id="role-panel"
        role="tabpanel"
        aria-labelledby={role === "user" ? "tab-user" : "tab-provider"}
        className="mx-auto grid w-full max-w-[min(88rem,calc(100%-4rem))] flex-1 content-start gap-14 sm:gap-16 px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12"
      >
        {role === "user" ? (
          <UserView />
        ) : (
          <ProviderView showToast={showToast} />
        )}
      </main>

      <footer className="mt-auto border-t-2 border-theme bg-theme px-6 py-8 text-center text-xs font-bold uppercase leading-relaxed tracking-widest text-muted">
        DeOpenRouter MVP {"//"} {new Date().getFullYear()} {"//"} On-chain trust {"//"} Off-chain inference
      </footer>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 w-[min(100%,28rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 border-2 border-theme bg-inverse px-5 py-4 text-center text-[11px] font-bold uppercase leading-snug tracking-widest text-inverse-fg shadow-none sm:text-xs"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
