import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Mic,
  MicOff,
  Radio,
  Settings2,
  Sparkles,
  Users,
  Video,
  VideoOff,
  WandSparkles,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { Link } from "wouter";

export default function Studio() {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [aiLook, setAiLook] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [live, setLive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!live) {
      return;
    }

    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [live]);

  const time = `${String(
    Math.floor(seconds / 60),
  ).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;

  function toggleLive(): void {
    setLive((value) => !value);

    if (live) {
      setSeconds(0);
    }
  }

  return (
    <div
      className="space-y-7"
      data-testid="page-studio"
    >
      <div className="panel hero-radial rounded-[1.5rem] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="eyebrow">
              Creator studio
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
              Go live. Stay present.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Broadcast with your camera for free. Other creators find you in
              Feed, open your watch page, and interact live.
            </p>
          </div>

          <StatusPill live={live} />
        </div>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <section className="panel rounded-[1.5rem] p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">
                Camera preview
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Private until you choose Go Live
              </p>
            </div>

            <span
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-xs text-slate-400"
              data-testid="status-preview"
            >
              <span className="size-1.5 rounded-full bg-slate-500" />
              Preview
            </span>
          </div>

          <div
            className={`relative grid min-h-[320px] place-items-center overflow-hidden rounded-2xl border border-white/10 ${
              cameraOn
                ? "bg-[radial-gradient(circle_at_50%_35%,rgba(38,174,184,.18),transparent_25%),linear-gradient(135deg,#19283b,#101723_55%,#231c3b)]"
                : "bg-[#080b11]"
            }`}
            data-testid="display-camera-preview"
          >
            {cameraOn ? (
              <div className="text-center">
                <div className="mx-auto grid size-24 place-items-center rounded-full border border-cyan-300/25 bg-cyan-300/[.08] text-cyan-200">
                  <Camera
                    size={36}
                    strokeWidth={1.4}
                  />
                </div>

                <p className="mt-5 text-sm font-bold">
                  {aiLook
                    ? "Aurora look preview"
                    : "Your camera preview"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  1280 ×{" "}
                  {resolution === "1080p" ? "1080" : "720"} ·{" "}
                  {aiLook
                    ? "AI look active"
                    : "Natural camera"}
                </p>
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <VideoOff
                  className="mx-auto"
                  size={30}
                />

                <p className="mt-3 text-sm">
                  Camera is off
                </p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
              <span
                className={`size-1.5 rounded-full ${
                  live
                    ? "live-pulse bg-rose-400"
                    : "bg-slate-500"
                }`}
              />
              {live ? "Live now" : "Private preview"}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={toggleLive}
              className="btn-primary flex items-center justify-center gap-2 rounded-xl py-3.5 font-bold"
              data-testid="button-go-live"
            >
              <Radio size={17} />
              {live ? "End stream" : "Go Live"}
            </button>

            <button
              type="button"
              onClick={() =>
                setCameraOn((value) => !value)
              }
              className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 font-semibold ${
                cameraOn
                  ? "border-cyan-300/30 bg-cyan-300/[.06] text-cyan-100"
                  : "border-white/10 bg-white/[.03] text-slate-400"
              }`}
              data-testid="button-toggle-camera"
            >
              {cameraOn ? (
                <Video size={17} />
              ) : (
                <VideoOff size={17} />
              )}

              {cameraOn ? "Camera on" : "Camera off"}
            </button>

            <button
              type="button"
              onClick={() =>
                setMicOn((value) => !value)
              }
              className={`flex items-center justify-center gap-2 rounded-xl border py-3.5 font-semibold sm:col-span-2 ${
                micOn
                  ? "border-white/10 bg-white/[.03] text-slate-200"
                  : "border-rose-300/25 bg-rose-300/[.05] text-rose-200"
              }`}
              data-testid="button-toggle-mic"
            >
              {micOn ? (
                <Mic size={17} />
              ) : (
                <MicOff size={17} />
              )}

              {micOn ? "Mic on" : "Mic muted"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px]">
            <label className="relative">
              <span className="sr-only">
                Choose camera
              </span>

              <select
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-300/50"
                data-testid="select-camera"
              >
                <option>
                  Built-in camera · front
                </option>
                <option>
                  USB camera · studio
                </option>
              </select>

              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
            </label>

            <label className="relative">
              <span className="sr-only">
                Choose resolution
              </span>

              <select
                value={resolution}
                onChange={(event) =>
                  setResolution(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300 outline-none focus:border-cyan-300/50"
                data-testid="select-resolution"
              >
                <option>1080p</option>
                <option>720p</option>
              </select>

              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() =>
              setAiLook((value) => !value)
            }
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold ${
              aiLook
                ? "border-violet-300/40 bg-violet-300/[.1] text-violet-100"
                : "border-white/10 bg-white/[.03] text-slate-300"
            }`}
            data-testid="button-toggle-ai-look"
          >
            <WandSparkles size={17} />

            {aiLook
              ? "AI look active · Aurora"
              : "Switch to AI look"}

            <span className="font-mono text-[.65rem] text-slate-500">
              {aiLook ? "4 cr" : "uses credits"}
            </span>
          </button>
        </section>

        <div className="space-y-7">
          <div className="panel rounded-[1.5rem] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                Audience
              </h2>

              <Users
                size={18}
                className="text-cyan-300"
              />
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              When you go live, your stream appears in Feed. People can watch,
              chat, and react in real time.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li className="flex gap-2">
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-cyan-300"
                />
                Natural streams are free
              </li>

              <li className="flex gap-2">
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-cyan-300"
                />
                Share your watch link from chat
              </li>

              <li className="flex gap-2">
                <CheckCircle2
                  size={16}
                  className="shrink-0 text-cyan-300"
                />
                Switch looks any time
              </li>
            </ul>

            <Link
              href="/feed"
              className="mt-6 flex items-center justify-center rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold hover:bg-white/[.08]"
              data-testid="link-browse-live-creators"
            >
              Browse live creators
            </Link>
          </div>

          <div className="panel rounded-[1.5rem] p-6">
            <h2 className="font-bold">
              Stream status
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Metric
                label="Status"
                value={live ? "Live" : "Offline"}
                testId="status-stream"
              />

              <Metric
                label="Elapsed"
                value={live ? time : "0:00"}
                testId="text-elapsed-time"
              />

              <Metric
                label="Viewers"
                value={live ? "12" : "—"}
                testId="text-viewer-count"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Settings2 size={14} />
              Camera and audio are ready to configure
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-violet-300/15 bg-violet-300/[.05] p-5">
            <div className="flex items-start gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 text-violet-300"
              />

              <div>
                <p className="text-sm font-bold">
                  Try AI &amp; OBS
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Send your scene into OBS, Zoom, or Meet with a private
                  source.
                </p>

                <Link
                  href="/ai-obs"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-violet-200"
                  data-testid="link-studio-ai-obs"
                >
                  Open workflow →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  testId: string;
}

function Metric({
  label,
  value,
  testId,
}: MetricProps) {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/[.03] p-3"
      data-testid={testId}
    >
      <p className="text-[.68rem] text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-mono text-lg font-medium text-slate-100">
        {value}
      </p>
    </div>
  );
}

interface StatusPillProps {
  live: boolean;
}

function StatusPill({
  live,
}: StatusPillProps) {
  return (
    <span
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
        live
          ? "border-rose-300/30 bg-rose-300/[.07] text-rose-200"
          : "border-white/10 bg-white/[.04] text-slate-400"
      }`}
      data-testid="status-studio-pill"
    >
      <span
        className={`size-1.5 rounded-full ${
          live
            ? "live-pulse bg-rose-300"
            : "bg-slate-500"
        }`}
      />

      {live ? "Live" : "Preview mode"}
    </span>
  );
}
