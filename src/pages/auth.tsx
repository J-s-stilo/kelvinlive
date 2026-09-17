import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  type FormEvent,
  useState,
} from "react";
import {
  Link,
  useLocation,
} from "wouter";

import { BrandMark } from "@/components/brand-mark";

type AuthMode = "signin" | "register";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [, setLocation] = useLocation();

  function submit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setFeedback(
      mode === "signin"
        ? "Welcome back. Opening your studio…"
        : "Account ready. Opening your studio…",
    );

    window.setTimeout(() => {
      setLocation("/studio");
    }, 550);
  }

  return (
    <div className="app-noise grid min-h-[100dvh] bg-[#080c15] text-slate-100 lg:grid-cols-[.85fr_1.15fr]">
      <div className="hero-radial hidden flex-col justify-between border-r border-white/[.08] p-10 lg:flex">
        <BrandMark />

        <div className="max-w-md">
          <p className="eyebrow">
            Creator studio / 06
          </p>

          <h1 className="mt-5 text-6xl font-extrabold leading-[.95] tracking-[-.07em]">
            Your next
            <br />
            <span className="text-cyan-300">
              good idea
            </span>
            <br />
            starts here.
          </h1>

          <p className="mt-6 leading-7 text-slate-400">
            Sign in to keep your scenes, credits, and stream history close at
            hand.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <ShieldCheck
            size={15}
            className="text-cyan-300"
          />
          Private by default · built for responsible creation
        </div>
      </div>

      <div className="flex flex-col p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white"
            data-testid="link-auth-home"
          >
            <ArrowLeft size={16} />
            Home
          </Link>

          <div className="lg:hidden">
            <BrandMark />
          </div>

          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span className="size-1.5 rounded-full bg-cyan-300" />
            Studio online
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
          <div className="w-full">
            <p className="eyebrow">
              Welcome to LumaLive
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-[-.05em] sm:text-4xl">
              {mode === "signin"
                ? "Welcome back."
                : "Make room for more."}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              {mode === "signin"
                ? "Sign in to manage credits, sessions, and your creator studio."
                : "Create your free creator account and find your signal."}
            </p>

            <div className="mt-8 grid grid-cols-2 rounded-xl border border-white/10 bg-black/10 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-lg py-3 text-sm font-bold ${
                  mode === "signin"
                    ? "btn-primary"
                    : "text-slate-400"
                }`}
                data-testid="button-auth-signin-tab"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={() => setMode("register")}
                className={`rounded-lg py-3 text-sm font-bold ${
                  mode === "register"
                    ? "btn-primary"
                    : "text-slate-400"
                }`}
                data-testid="button-auth-register-tab"
              >
                Register
              </button>
            </div>

            <form
              onSubmit={submit}
              className="mt-8 space-y-5"
            >
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-slate-500">
                  Email address
                </span>

                <span className="relative block">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    size={17}
                  />

                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-11 py-3.5 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                    data-testid="input-auth-email"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[.14em] text-slate-500">
                  Password
                </span>

                <span className="relative block">
                  <LockKeyhole
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    size={17}
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Your password"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-11 py-3.5 pr-16 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                    data-testid="input-auth-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (visible) => !visible,
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </span>
              </label>

              {mode === "signin" ? (
                <button
                  type="button"
                  onClick={() =>
                    setFeedback(
                      "Password reset link requested. Check your inbox.",
                    )
                  }
                  className="ml-auto block text-sm font-semibold text-violet-300 hover:text-violet-200"
                  data-testid="button-forgot-password"
                >
                  Forgot password?
                </button>
              ) : null}

              <button
                type="submit"
                className="btn-primary w-full rounded-xl py-3.5 font-bold"
                data-testid="button-auth-submit"
              >
                {mode === "signin"
                  ? "Sign in"
                  : "Create account"}
              </button>

              {feedback ? (
                <p
                  className="rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] px-4 py-3 text-sm text-cyan-100"
                  data-testid="status-auth-feedback"
                >
                  {feedback}
                </p>
              ) : null}
            </form>

            <p className="mt-8 text-center text-xs text-slate-600">
              By continuing, you agree to create responsibly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
