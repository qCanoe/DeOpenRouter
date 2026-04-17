"use client";

export type AppRole = "user" | "provider";

type RoleTabsProps = {
  role: AppRole;
  onRoleChange: (role: AppRole) => void;
};

const tabBtn =
  "focus-ring transition-ui min-h-[44px] border-2 border-theme px-6 py-3 text-xs font-bold uppercase tracking-widest sm:text-sm";

export function RoleTabs({ role, onRoleChange }: RoleTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-0"
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
        className={`${tabBtn} ${
          role === "user"
            ? "bg-inverse text-inverse-fg"
            : "bg-background text-foreground hover:bg-inverse hover:text-inverse-fg"
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
        className={`${tabBtn} border-l-0 ${
          role === "provider"
            ? "bg-inverse text-inverse-fg"
            : "bg-background text-foreground hover:bg-inverse hover:text-inverse-fg"
        }`}
      >
        Provider
      </button>
    </div>
  );
}
