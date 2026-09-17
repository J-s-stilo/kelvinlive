import {
  Menu,
  MessageCircle,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useState,
} from "react";
import {
  Link,
  useLocation,
} from "wouter";

import { navItems } from "@/lib/content";
import { BrandMark } from "./brand-mark";

interface StudioShellProps {
  children: ReactNode;
}

export function StudioShell({
  children,
}: StudioShellProps) {
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div
      className="app-noise min-h-[100dvh] bg-[#080c15] text-slate-100"
      data-testid="studio-shell"
    >
      <div className="flex min-h-[100dvh]">
        {drawerOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation overlay"
            data-testid="button-close-navigation-overlay"
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-[270px] flex-col border-r border-white/[.09] bg-[#0b101a] px-5 py-6 transition-transform duration-300 lg:static lg:translate-x-0 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          data-testid="studio-sidebar"
        >
          <div className="flex items-center justify-between">
            <BrandMark />

            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              data-testid="button-close-navigation"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mt-10 flex-1 space-y-1">
            <p className="mb-3 px-3 font-mono text-[.65rem] uppercase tracking-[.2em] text-slate-600">
              Workspace
            </p>

            {navItems.map(
              ({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`nav-item flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-semibold text-slate-400 hover:text-slate-100 ${
                    location === href ? "active" : ""
                  }`}
                  data-testid={`link-nav-${label
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />

                  <span>{label}</span>

                  {href === "/studio" ? (
                    <span className="ml-auto size-1.5 rounded-full bg-cyan-300" />
                  ) : null}
                </Link>
              ),
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="text-sm font-bold">
              Need a hand?
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              The creator team is online.
            </p>

            <button
              type="button"
              className="mt-3 flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
              data-testid="button-open-support"
            >
              <MessageCircle size={15} />
              Open support
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-300 text-sm font-bold text-slate-950">
              AM
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                Ari Mendez
              </p>

              <p className="text-xs text-slate-500">
                Creator account
              </p>
            </div>

            <Link
              href="/settings"
              className="ml-auto text-slate-500 hover:text-white"
              aria-label="Open settings"
              data-testid="link-sidebar-settings"
            >
              <span className="sr-only">
                Settings
              </span>
              •••
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-white/[.08] bg-[#080c15]/85 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="rounded-xl border border-white/10 bg-white/[.04] p-2.5 text-slate-300 lg:hidden"
                aria-label="Open navigation"
                data-testid="button-open-navigation"
              >
                <Menu size={20} />
              </button>

              <div className="lg:hidden">
                <BrandMark compact />
              </div>

              <div className="hidden lg:block">
                <p className="text-sm font-bold">
                  {navItems.find(
                    (item) => item.href === location,
                  )?.label || "Workspace"}
                </p>

                <p className="text-xs text-slate-500">
                  Your creator workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[.05] px-3 py-1.5 text-xs font-semibold text-cyan-200 sm:flex">
                <span className="live-pulse size-1.5 rounded-full bg-cyan-300" />
                Studio online
              </div>

              <div
                className="rounded-full border border-violet-300/20 bg-violet-300/[.06] px-3 py-1.5 font-mono text-xs text-violet-200"
                data-testid="text-credit-balance"
              >
                18 cr
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1450px] p-4 sm:p-7 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
