import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  CirclePlay,
  LockKeyhole,
  MonitorPlay,
  Play,
  Video,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

import { BrandMark } from "@/components/brand-mark";
import { ResponsibleGate } from "@/components/responsible-gate";
import {
  creatorStats,
  faqItems,
  featureCards,
} from "@/lib/content";

export default function Landing() {
  const [gateOpen, setGateOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <div className="app-noise min-h-[100dvh] overflow-hidden bg-[#080c15] text-slate-100">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <BrandMark />

          <nav className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a
              href="#studio"
              className="hover:text-white"
              data-testid="link-landing-studio"
            >
              Studio
            </a>

            <a
              href="#features"
              className="hover:text-white"
              data-testid="link-landing-features"
            >
              Features
            </a>

            <a
              href="#faq"
              className="hover:text-white"
              data-testid="link-landing-faq"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="hidden px-3 py-2 text-sm font-semibold text-slate-300 hover:text-white sm:block"
              data-testid="link-landing-signin"
            >
              Sign in
            </Link>

            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="btn-primary rounded-lg px-4 py-2.5 text-sm font-bold"
              data-testid="button-landing-start"
            >
              Start creating
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-radial grid-lines relative flex min-h-[760px] items-center px-5 pb-24 pt-32 sm:px-8 lg:px-10">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[1.02fr_.98fr]">
            <div className="float-in max-w-2xl">
              <div className="eyebrow flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-cyan-300" />
                Creator studio / 01
              </div>

              <h1 className="mt-6 text-[clamp(3.1rem,7vw,6.9rem)] font-extrabold leading-[.98] tracking-[-.075em] text-slate-50">
                Make the room
                <br />
                <span className="bg-gradient-to-r from-violet-300 via-cyan-200 to-sky-300 bg-clip-text text-transparent">
                  feel live.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400 sm:text-xl">
                A browser-based studio for creators who want less setup,
                better presence, and a clear line between preview and going
                live.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setGateOpen(true)}
                  className="btn-primary flex items-center gap-3 rounded-xl px-6 py-3.5 font-bold"
                  data-testid="button-hero-cta"
                >
                  Enter the studio
                  <ArrowRight size={17} />
                </button>

                <a
                  href="#how-it-works"
                  className="flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/[.06]"
                  data-testid="link-hero-how-it-works"
                >
                  <CirclePlay
                    size={17}
                    className="text-cyan-300"
                  />
                  See how it works
                </a>
              </div>

              <div className="mt-10 flex items-center gap-5 text-xs text-slate-500">
                <span className="flex items-center gap-2">
                  <LockKeyhole
                    size={14}
                    className="text-cyan-300"
                  />
                  Private until you choose
                </span>

                <span className="hidden size-1 rounded-full bg-slate-600 sm:block" />

                <span className="hidden sm:block">
                  No install required
                </span>
              </div>
            </div>

            <StudioPreview
              onStart={() => setGateOpen(true)}
            />
          </div>

          <a
            href="#studio"
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 hover:text-cyan-300"
            aria-label="Scroll to studio preview"
            data-testid="link-scroll-studio"
          >
            <ArrowDown size={20} />
          </a>
        </section>

        <section
          id="studio"
          className="border-y border-white/[.07] bg-[#0b111d] px-5 py-20 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
              <div>
                <p className="eyebrow">
                  01 / Your live room
                </p>

                <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-.04em] sm:text-5xl">
                  A calm control room
                  <br />
                  <span className="text-slate-500">
                    for high-energy work.
                  </span>
                </h2>
              </div>

              <p className="max-w-sm text-sm leading-6 text-slate-400">
                Your camera, audio, stream status, and audience guidance in
                one focused surface. No production maze between you and your
                people.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {featureCards.map(
                ({ icon: Icon, title, text }, index) => (
                  <div
                    className="panel rounded-2xl p-6"
                    key={title}
                    data-testid={`card-feature-${index}`}
                  >
                    <div className="mb-14 flex items-center justify-between">
                      <span className="grid size-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[.06] text-cyan-200">
                        <Icon size={19} />
                      </span>

                      <span className="font-mono text-xs text-slate-600">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold">
                      {title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {text}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="px-5 py-24 sm:px-8 lg:px-10"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="eyebrow">
                02 / The handoff
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-[-.05em] sm:text-5xl">
                From quiet
                <br />
                <span className="text-cyan-300">
                  to live.
                </span>
              </h2>

              <p className="mt-6 max-w-sm leading-7 text-slate-400">
                A short path that keeps your attention where it belongs: on
                the work, the people, and the moment.
              </p>
            </div>

            <div className="space-y-3">
              {[
                [
                  "01",
                  "Check your frame",
                  "Preview your camera and mic before anybody can see you.",
                ],
                [
                  "02",
                  "Choose your feeling",
                  "Stay natural or switch to an AI look when the story needs a different texture.",
                ],
                [
                  "03",
                  "Open the room",
                  "Go live when it feels right. Your audience finds you in Feed and chat opens with you.",
                ],
              ].map(([number, title, text]) => (
                <div
                  className="group flex gap-5 rounded-2xl border border-white/10 bg-white/[.025] p-5 hover:border-cyan-300/25"
                  key={number}
                >
                  <span className="font-mono text-sm text-cyan-300">
                    {number}
                  </span>

                  <div>
                    <h3 className="font-bold">
                      {title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {text}
                    </p>
                  </div>

                  <ArrowRight
                    size={17}
                    className="ml-auto mt-1 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="features"
          className="bg-[#0b111d] px-5 py-24 sm:px-8 lg:px-10"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex items-end justify-between">
              <div>
                <p className="eyebrow">
                  03 / Proof of presence
                </p>

                <h2 className="mt-4 text-4xl font-bold tracking-[-.05em] sm:text-5xl">
                  Built for the
                  <br />
                  <span className="text-slate-500">
                    first minute.
                  </span>
                </h2>
              </div>

              <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <span className="size-2 rounded-full bg-cyan-300" />
                live infrastructure
              </div>
            </div>

            <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_.8fr]">
              <div className="panel relative min-h-[360px] overflow-hidden rounded-[1.75rem] p-6 sm:p-9">
                <div className="absolute -right-20 -top-24 size-80 rounded-full bg-cyan-300/10 blur-3xl" />

                <div className="relative z-[1] flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                    <span className="live-pulse size-1.5 rounded-full bg-cyan-300" />
                    PREVIEW / PRIVATE
                  </span>

                  <Video
                    size={18}
                    className="text-slate-500"
                  />
                </div>

                <div className="relative z-[1] mt-20 flex max-w-sm items-end justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[.2em] text-slate-500">
                      Scene 01
                    </p>

                    <h3 className="mt-3 text-3xl font-bold">
                      Your signal,
                      <br />
                      without the noise.
                    </h3>
                  </div>

                  <button
                    type="button"
                    className="grid size-12 place-items-center rounded-full bg-cyan-300 text-slate-950"
                    data-testid="button-feature-preview"
                  >
                    <Play
                      size={17}
                      fill="currentColor"
                    />
                  </button>
                </div>

                <div className="absolute inset-x-6 bottom-6 h-px bg-white/10">
                  <div className="h-full w-[43%] bg-cyan-300" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {creatorStats.map(
                  ({ value, label }) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/[.025] p-5"
                      key={label}
                      data-testid={`stat-${label.replaceAll(
                        " ",
                        "-",
                      )}`}
                    >
                      <div className="font-mono text-2xl font-medium text-slate-100">
                        {value}
                      </div>

                      <div className="mt-2 text-xs uppercase tracking-[.16em] text-slate-500">
                        {label}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className="px-5 py-24 sm:px-8 lg:px-10"
        >
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="eyebrow">
                04 / Good questions
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-[-.05em]">
                Keep the
                <br />
                <span className="text-violet-300">
                  signal clear.
                </span>
              </h2>
            </div>

            <div className="divide-y divide-white/10 border-y border-white/10">
              {faqItems.map(
                ([question, answer], index) => (
                  <div key={question}>
                    <button
                      type="button"
                      onClick={() =>
                        setFaqOpen(
                          faqOpen === index ? -1 : index,
                        )
                      }
                      className="flex w-full items-center justify-between gap-5 py-5 text-left font-semibold"
                      data-testid={`button-faq-${index}`}
                    >
                      <span>{question}</span>

                      <ChevronDown
                        size={18}
                        className={`text-slate-500 transition-transform ${
                          faqOpen === index
                            ? "rotate-180 text-cyan-300"
                            : ""
                        }`}
                      />
                    </button>

                    {faqOpen === index ? (
                      <p
                        className="max-w-2xl pb-5 pr-8 text-sm leading-7 text-slate-400"
                        data-testid={`text-faq-answer-${index}`}
                      >
                        {answer}
                      </p>
                    ) : null}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-8 lg:px-10">
          <div className="hero-radial mx-auto max-w-7xl rounded-[2rem] border border-cyan-300/15 px-6 py-16 text-center sm:px-10">
            <p className="eyebrow">
              05 / The room is yours
            </p>

            <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold tracking-[-.06em] sm:text-6xl">
              When you’re ready,
              <br />
              <span className="text-cyan-200">
                we’re live.
              </span>
            </h2>

            <button
              type="button"
              onClick={() => setGateOpen(true)}
              className="btn-primary mt-8 inline-flex items-center gap-3 rounded-xl px-6 py-3.5 font-bold"
              data-testid="button-final-cta"
            >
              Open your studio
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[.08] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-xs text-slate-500 sm:flex-row sm:items-center">
          <BrandMark />
          <span>
            © 2026 LumaLive · Built for responsible creators
          </span>
        </div>
      </footer>

      {gateOpen ? (
        <ResponsibleGate
          onClose={() => setGateOpen(false)}
        />
      ) : null}
    </div>
  );
}

interface StudioPreviewProps {
  onStart: () => void;
}

function StudioPreview({
  onStart,
}: StudioPreviewProps) {
  return (
    <div className="float-in-delay relative mx-auto w-full max-w-[570px]">
      <div className="absolute -inset-5 rounded-[2rem] bg-cyan-300/[.06] blur-2xl" />

      <div className="panel relative rounded-[1.75rem] p-3 sm:p-4">
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-rose-300" />
            <span className="size-2 rounded-full bg-amber-300" />
            <span className="size-2 rounded-full bg-emerald-300" />
          </div>

          <span className="font-mono text-[.65rem] text-slate-500">
            lumalive / studio
          </span>
        </div>

        <div className="grid min-h-[350px] place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#111b28]">
          <div className="relative w-full p-8 text-center">
            <div className="mx-auto grid size-24 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/[.07] text-cyan-200">
              <MonitorPlay
                size={38}
                strokeWidth={1.3}
              />
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-200">
              Your camera preview
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Private · 1280 × 720
            </p>

            <div className="mx-auto mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[56%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-2 pt-3">
          <button
            type="button"
            className="btn-primary col-span-2 rounded-xl px-4 py-3 text-sm font-bold"
            onClick={onStart}
            data-testid="button-preview-go-live"
          >
            Go live
          </button>

          <button
            type="button"
            className="btn-quiet rounded-xl border border-white/10 px-3 py-3 text-sm text-slate-300"
            data-testid="button-preview-settings"
          >
            Controls
          </button>
        </div>
      </div>
    </div>
  );
}
