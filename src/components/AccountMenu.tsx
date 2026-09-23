import {
  KeyRound,
  LogOut,
  MessageCircle,
  Shield,
  User,
} from "lucide-react";
import { Link } from "wouter";

interface AccountMenuProps {
  onLogout?: () => void;
  onSupport?: () => void;
  onFeedback?: () => void;
}

export function AccountMenu({
  onLogout,
  onSupport,
  onFeedback,
}: AccountMenuProps) {
  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl"
      data-testid="account-menu"
    >
      <Link
        href="/settings"
        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[.06] hover:text-white"
      >
        <User size={17} />
        <span>Profile & account</span>
      </Link>

      <Link
        href="/settings"
        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[.06] hover:text-white"
      >
        <Shield size={17} />
        <span>Security</span>
      </Link>

      <Link
        href="/settings"
        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/[.06] hover:text-white"
      >
        <KeyRound size={17} />
        <span>Change password</span>
      </Link>

      <button
        type="button"
        onClick={onFeedback}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/[.06] hover:text-white"
        data-testid="button-account-feedback"
      >
        <MessageCircle size={17} />
        <span>Feedback</span>
      </button>

      <button
        type="button"
        onClick={onSupport}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/[.06] hover:text-white"
        data-testid="button-account-support"
      >
        <MessageCircle size={17} />
        <span>Customer support</span>
      </button>

      <div className="border-t border-white/10" />

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-rose-300 transition hover:bg-rose-300/[.06]"
        data-testid="button-account-logout"
      >
        <LogOut size={17} />
        <span>Log out</span>
      </button>
    </div>
  );
}
