"use client";

export type AppRole = "user" | "provider";

type RoleTabsProps = {
  role: AppRole;
  onRoleChange: (role: AppRole) => void;
};

export function RoleTabs({ role, onRoleChange }: RoleTabsProps) {
  return (
    <div
      className="inline-flex items-center rounded-lg bg-[var(--muted-bg)] p-1 shadow-inner border border-[var(--border)]"
      role="tablist"
      aria-label="Role"
    >
      <button
        type="button"
        role="tab"
        id="tab-user"
        aria-selected={role === "user"}
        aria-controls="role-panel"
        tabIndex={0}
        onClick={() => onRoleChange("user")}
        className={`focus-ring transition-ui flex h-8 items-center justify-center rounded-md px-5 text-sm font-medium ${
          role === "user"
            ? "bg-[var(--background)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.05)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        User
      </button>
      <button
        type="button"
        role="tab"
        id="tab-provider"
        aria-selected={role === "provider"}
        aria-controls="role-panel"
        tabIndex={0}
        onClick={() => onRoleChange("provider")}
        className={`focus-ring transition-ui flex h-8 items-center justify-center rounded-md px-5 text-sm font-medium ${
          role === "provider"
            ? "bg-[var(--background)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.05)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Provider
      </button>
    </div>
  );
}
