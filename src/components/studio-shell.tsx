import {
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  User,
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
  const [accountOpen, setAccountOpen] = useState(false);

  function openSupport(): void {
    window.open(
      "https://wa.me/2347078448084",
      "_blank",
      "noopener,noreferrer",
    );
  }

  function openFeedback(): void {
    window.location.href = "/feedback";
  }

  function handleLogout(): void {
    /*
     * Authentication logout will be connected to
     * the real Clerk session in the account step.
     *
     * For now we only close the account menu.
     */
    setAccountOpen(false);
  }

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
            drawerOpen
              ? "translate-x-0"
              : "-translate-x-full"
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
              ({
                href,
                label,
                icon: Icon,
              }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() =>
                    setDrawerOpen(false)
                  }
                  className={`nav-item flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-semibold text-slate-400 hover:text-slate-100 ${
                    location === href
                      ? "active"
                      : ""
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
              Contact KelvinLive customer support.
            </p>

            <button
              type="button"
              onClick={openSupport}
              className="mt-3 flex items-center gap-2 text-xs font-bold text-cyan-300 hover:text-cyan-200"
              data-testid="button-open-support"
            >
              <MessageCircle size={15} />
              Customer support
            </button>
          </div>

          <div className="relative mt-5 border-t border-white/10 pt-5">
            {accountOpen ? (
              <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
                <Link
                  href="/settings"
                  onClick={() =>
                    setAccountOpen(false)
                  }
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[.06] hover:text-white"
                >
                  <User size={16} />
                  Profile & account
                </Link>

                <Link
                  href="/settings"
                  onClick={() =>
                    setAccountOpen(false)
                  }
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[.06] hover:text-white"
                >
                  <Shield size={16} />
                  Security & password
                </Link>

                <button
                  type="button"
                  onClick={openFeedback}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/[.06] hover:text-white"
                >
                  <MessageCircle size={16} />
                  Feedback
                </button>

                <button
                  type="button"
                  onClick={openSupport}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/[.06] hover:text-white"
                >
                  <MessageCircle size={16} />
                  Customer support
                </button>

                <div className="border-t border-white/10" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-rose-300 hover:bg-rose-300/[.06]"
                  data-testid="button-logout"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setAccountOpen(
                  (open) => !open,
                )
              }
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[.04]"
              aria-expanded={accountOpen}
              data-testid="button-account-menu"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.05] text-slate-400">
                <User size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-300">
                  Your account
                </p>

                <p className="text-xs text-slate-500">
                  Account settings
                </p>
              </div>

              <span className="text-xs text-slate-500">
                •••
              </span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-white/[.08] bg-[#080c15]/85 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setDrawerOpen(true)
                }
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
                    (item) =>
                      item.href === location,
                  )?.label ||
                    "Workspace"}
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
                className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-semibold text-slate-500"
                data-testid="text-credit-balance"
              >
                Credits not connected
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
