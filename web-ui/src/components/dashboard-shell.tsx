"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { platformAdminNavigation } from "@/lib/platform-admin-navigation";

function AdminNavigation({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Platform administrator navigation"
      className={collapsed ? "space-y-4 px-2" : "space-y-6 px-3"}
    >
      {platformAdminNavigation.map((group, groupIdx) => (
        <div key={group.title}>
          {!collapsed ? (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">
              {group.title}
            </p>
          ) : (
            groupIdx > 0 && <div className="mx-auto my-2.5 h-px w-8 bg-border/70" />
          )}
          <div className={collapsed ? "space-y-1.5" : "space-y-1"}>
            {group.items.map(({ label, href, icon: Icon }) => {
              const isActive =
                pathname === href ||
                (href !== "/dashboard" && pathname?.startsWith(href));

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  className={`flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-atlas-navy))] ${
                    collapsed
                      ? "size-11 mx-auto justify-center rounded-xl p-0"
                      : "h-10 gap-3 rounded-xl px-3 text-sm font-medium"
                  } ${
                    isActive
                      ? "bg-[hsl(var(--brand-atlas-navy))] text-white font-semibold shadow-sm"
                      : "text-foreground/75 hover:bg-[hsl(var(--brand-stone))] hover:text-foreground"
                  }`}
                >
                  <Icon
                    size={collapsed ? 24 : 18}
                    strokeWidth={collapsed ? 2 : 1.8}
                    className="shrink-0"
                  />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-svh overflow-hidden bg-[hsl(var(--brand-stone))] text-foreground">
      <aside
        className={`hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex ${collapsed ? "w-[76px]" : "w-[260px]"}`}
      >
        <div
          className={`flex h-16 items-center border-b border-border ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand dashboard sidebar"
              title="Expand sidebar"
              className="grid size-11 cursor-pointer place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-[hsl(var(--brand-stone))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-atlas-navy))]"
            >
              <PanelLeftOpen size={22} strokeWidth={2} />
            </button>
          ) : (
            <>
              <BrandMark />
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse dashboard sidebar"
                title="Collapse sidebar"
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-[hsl(var(--brand-stone))] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-atlas-navy))]"
              >
                <PanelLeftClose size={19} />
              </button>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-5">
          <AdminNavigation collapsed={collapsed} />
        </div>
        <div className={`border-t border-border ${collapsed ? "p-3" : "p-4"}`}>
          <div
            title={collapsed ? "Platform administrator" : undefined}
            className={`mt-2.5 flex items-center gap-3 rounded-xl bg-[hsl(var(--brand-stone))] ${collapsed ? "size-11 mx-auto justify-center p-0" : "p-3"}`}
          >
            <span className="grid size-9 place-items-center rounded-full bg-[hsl(var(--brand-atlas-navy))] text-xs font-bold text-white shrink-0">
              PA
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">Platform admin</p>
                <p className="text-[10px] text-muted-foreground">
                  Administrator
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
              className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border text-foreground hover:bg-[hsl(var(--brand-stone))] lg:hidden"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="text-xs font-semibold text-muted-foreground lg:text-sm">
              Platform administration
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
            <span className="size-2 rounded-full bg-[hsl(var(--brand-success-green))]" />
            <span className="text-[11px] font-medium">Admin workspace</span>
          </div>
        </header>
        {mobileOpen && (
          <div className="absolute inset-x-0 top-16 z-30 max-h-[calc(100svh-64px)] overflow-y-auto border-b border-border bg-card py-5 shadow-lg lg:hidden">
            <AdminNavigation onNavigate={() => setMobileOpen(false)} />
          </div>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
