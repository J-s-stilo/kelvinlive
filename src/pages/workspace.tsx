import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  type ReactNode,
  useState,
} from "react";

import {
  activity,
  analyticsBars,
  transactions,
} from "@/lib/content";

export function FeedPage() {
  const [following, setFollowing] = useState<number[]>(
    [],
  );

  const creators = [
    {
      name: "Mara Chen",
      note: "Late night field notes",
      viewers: 84,
      color: "from-violet-400 to-cyan-300",
    },
    {
      name: "Jon Bell",
      note: "Building a tiny synth",
      viewers: 32,
      color: "from-amber-300 to-rose-300",
    },
    {
      name: "Nia Rivers",
      note: "Sunday sketchbook",
      viewers: 19,
      color: "from-emerald-300 to-cyan-300",
    },
  ];

  function toggleFollowing(index: number): void {
    setFollowing((items) =>
      items.includes(index)
        ? items.filter((item) => item !== index)
        : [...items, index],
    );
  }

  return (
    <PageIntro
      eyebrow="Live network"
      title="Find your people."
      description="A small, focused feed of creators who are live right now."
      action={
        <button
          type="button"
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
          data-testid="button-refresh-feed"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {creators.map((creator, index) => (
          <article
            className="panel overflow-hidden rounded-2xl"
            key={creator.name}
            data-testid={`card-live-creator-${index}`}
          >
            <div
              className={`relative grid h-44 place-items-center bg-gradient-to-br ${creator.color}`}
            >
              <div className="absolute inset-0 bg-[#0b1020]/30" />

              <div className="relative grid size-16 place-items-center rounded-full border-2 border-white/60 bg-white/15 text-xl font-extrabold text-white backdrop-blur">
                {creator.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>

              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-[#080c15]/75 px-2.5 py-1 text-[.68rem] font-bold text-rose-200">
                <span className="live-pulse size-1.5 rounded-full bg-rose-300" />
                LIVE
              </span>

              <span className="absolute bottom-4 right-4 rounded-full bg-[#080c15]/75 px-2.5 py-1 font-mono text-[.68rem] text-white">
                {creator.viewers} watching
              </span>
            </div>

            <div className="p-5">
              <h2 className="font-bold">
                {creator.name}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {creator.note}
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold"
                  data-testid={`button-watch-creator-${index}`}
                >
                  <PlayCircle size={16} />
                  Watch
                </button>

                <button
                  type="button"
                  onClick={() => toggleFollowing(index)}
                  className="rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
                  data-testid={`button-follow-creator-${index}`}
                >
                  {following.includes(index)
                    ? "Following"
                    : "Follow"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageIntro>
  );
}

export function AiObsPage() {
  const [copied, setCopied] = useState(false);

  function copySource(): void {
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1600);
  }

  return (
    <PageIntro
      eyebrow="Production workflow"
      title="AI, then anywhere."
      description="Shape your scene here, then hand it to the tools that help you do your best work."
    >
      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="panel rounded-2xl p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">
                Private Browser Source
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Only you can access this source.
              </p>
            </div>

            <KeyRound
              size={20}
              className="text-cyan-300"
            />
          </div>

          <div className="mt-7 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <code className="truncate font-mono text-xs text-cyan-100">
              lumalive.tv/source/ari-mendez-7f2
            </code>

            <button
              type="button"
              onClick={copySource}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Copy browser source"
              data-testid="button-copy-browser-source"
            >
              <Copy size={16} />
            </button>
          </div>

          {copied ? (
            <p
              className="mt-3 text-xs text-cyan-200"
              data-testid="status-source-copied"
            >
              Source copied to clipboard.
            </p>
          ) : null}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <WorkflowStep
              number="01"
              title="Select your look"
              text="Natural or Aurora"
            />

            <WorkflowStep
              number="02"
              title="Add to OBS"
              text="Browser Source · 1280×720"
            />

            <WorkflowStep
              number="03"
              title="Go live"
              text="Publish from your production tool"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-violet-300/20 bg-violet-300/[.05] p-6 sm:p-8">
          <Sparkles className="text-violet-300" />

          <h2 className="mt-6 text-2xl font-bold">
            AI looks, with a clear line.
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Use AI as a creative layer, never as a way to mislead. Every look
            is labeled in your studio preview.
          </p>

          <button
            type="button"
            className="mt-7 flex items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/[.08] px-4 py-3 text-sm font-bold text-violet-100"
            data-testid="button-browse-ai-looks"
          >
            Browse looks
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </PageIntro>
  );
}

export function AnalyticsPage() {
  const metrics = [
    ["Total live time", "14h 28m", "+18%"],
    ["Peak audience", "84 viewers", "+12"],
    ["Sessions", "23", "+4"],
  ];

  return (
    <PageIntro
      eyebrow="Your signal"
      title="Know what lands."
      description="A lightweight view of your recent sessions and audience rhythm."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map(([label, value, change], index) => (
          <div
            className="panel rounded-2xl p-5"
            key={label}
            data-testid={`metric-analytics-${index}`}
          >
            <p className="text-sm text-slate-500">
              {label}
            </p>

            <p className="mt-3 font-mono text-2xl text-slate-100">
              {value}
            </p>

            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-300">
              <TrendingUp size={13} />
              {change} this month
            </p>
          </div>
        ))}
      </div>

      <div className="panel mt-5 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold">
              Audience minutes
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Last 12 sessions
            </p>
          </div>

          <BarChart3
            size={19}
            className="text-cyan-300"
          />
        </div>

        <div className="mt-10 flex h-44 items-end gap-2">
          {analyticsBars.map((height, index) => (
            <div
              className="group flex flex-1 flex-col items-center gap-2"
              key={index}
            >
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-violet-400/70 to-cyan-300"
                style={{ height: `${height}%` }}
                data-testid={`bar-analytics-${index}`}
              />

              <span className="font-mono text-[.58rem] text-slate-600">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel mt-5 rounded-2xl p-6">
        <h2 className="font-bold">
          Recent sessions
        </h2>

        <div className="mt-4 divide-y divide-white/10">
          {activity.map((item) => (
            <div
              className="flex items-center gap-4 py-4"
              key={item.title}
            >
              <span
                className={`size-2 rounded-full ${
                  item.color === "cyan"
                    ? "bg-cyan-300"
                    : item.color === "violet"
                      ? "bg-violet-300"
                      : "bg-amber-300"
                }`}
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {item.title}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.detail}
                </p>
              </div>

              <span className="text-xs text-slate-500">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageIntro>
  );
}

export function CreditsPage() {
  const [notice, setNotice] = useState("");

  const creditRows = [
    [
      "AI looks",
      "4 cr / minute",
      "Switch visual identity while live.",
    ],
    [
      "Natural camera",
      "Free",
      "Your camera stream stays free for viewers.",
    ],
    [
      "Preview & rehearsal",
      "Free",
      "Take your time before the room opens.",
    ],
  ];

  return (
    <PageIntro
      eyebrow="Resource center"
      title="Credits, clearly."
      description="Keep your creative budget visible. Natural streaming is always free."
    >
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="panel hero-radial rounded-2xl p-7">
          <p className="text-sm text-slate-400">
            Available balance
          </p>

          <p className="mt-4 font-mono text-6xl text-cyan-200">
            18
          </p>

          <p className="mt-2 text-sm text-slate-500">
            credits ready to use
          </p>

          <button
            type="button"
            onClick={() =>
              setNotice(
                "Top-up options are ready for your next session.",
              )
            }
            className="btn-primary mt-8 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            data-testid="button-top-up-credits"
          >
            <Plus size={16} />
            Add credits
          </button>

          {notice ? (
            <p
              className="mt-3 text-xs text-cyan-200"
              data-testid="status-credit-notice"
            >
              {notice}
            </p>
          ) : null}
        </div>

        <div className="panel rounded-2xl p-7">
          <h2 className="font-bold">
            What uses credits?
          </h2>

          <div className="mt-5 space-y-4">
            {creditRows.map(
              ([name, cost, detail], index) => (
                <div
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/[.02] p-4"
                  key={name}
                  data-testid={`row-credit-${index}`}
                >
                  <Sparkles
                    size={17}
                    className="mt-0.5 text-violet-300"
                  />

                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {detail}
                    </p>
                  </div>

                  <span className="font-mono text-xs text-cyan-200">
                    {cost}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </PageIntro>
  );
}

export function TransactionsPage() {
  return (
    <PageIntro
      eyebrow="Account history"
      title="Every credit accounted for."
      description="A simple record of your LumaLive activity."
      action={
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-semibold hover:bg-white/[.08]"
          data-testid="button-export-transactions"
        >
          <FileText size={16} />
          Export CSV
        </button>
      }
    >
      <div className="panel overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-[.13em] text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">
                Date
              </th>

              <th className="px-6 py-4 font-medium">
                Activity
              </th>

              <th className="px-6 py-4 font-medium">
                Amount
              </th>

              <th className="px-6 py-4 font-medium">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {transactions.map((transaction, index) => (
              <tr
                key={transaction.date}
                data-testid={`row-transaction-${index}`}
              >
                <td className="px-6 py-5 text-slate-400">
                  {transaction.date}
                </td>

                <td className="px-6 py-5 font-semibold">
                  {transaction.item}
                </td>

                <td className="px-6 py-5 font-mono text-cyan-200">
                  {transaction.amount}
                </td>

                <td className="px-6 py-5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                    <CheckCircle2 size={14} />
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageIntro>
  );
}

export function TutorialPage() {
  const lessons = [
    [
      "01",
      "Your first private preview",
      "Learn the studio controls before the room opens.",
      "4 min",
    ],
    [
      "02",
      "A thoughtful AI workflow",
      "Use a look as a creative choice, not a disguise.",
      "7 min",
    ],
    [
      "03",
      "Bring LumaLive into OBS",
      "Add your private Browser Source in three steps.",
      "5 min",
    ],
  ];

  return (
    <PageIntro
      eyebrow="Learn the room"
      title="A better first stream."
      description="Short guides for making the technical part feel unremarkable."
    >
      <div className="space-y-3">
        {lessons.map(
          ([number, title, text, duration]) => (
            <button
              type="button"
              className="panel group flex w-full items-center gap-5 rounded-2xl p-5 text-left hover:border-cyan-300/30"
              key={number}
              data-testid={`button-tutorial-${number}`}
            >
              <span className="font-mono text-sm text-cyan-300">
                {number}
              </span>

              <span className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300">
                <PlayCircle size={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-bold">
                  {title}
                </span>

                <span className="mt-1 block truncate text-sm text-slate-500">
                  {text}
                </span>
              </span>

              <span className="hidden text-xs text-slate-500 sm:block">
                {duration}
              </span>

              <ArrowRight
                size={17}
                className="text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-cyan-300"
              />
            </button>
          ),
        )}
      </div>
    </PageIntro>
  );
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);

  function saveSettings(): void {
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 1800);
  }

  return (
    <PageIntro
      eyebrow="Your account"
      title="Settings that stay out of the way."
      description="Control your profile, privacy, and default studio behavior."
    >
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="panel rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-cyan-300 text-lg font-extrabold text-slate-950">
              AM
            </div>

            <div>
              <p className="font-bold">
                Ari Mendez
              </p>

              <p className="text-sm text-slate-500">
                ari@lumalive.example
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-white/[.03] p-3">
              <span className="text-slate-400">
                Plan
              </span>

              <span className="font-semibold text-cyan-200">
                Creator
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white/[.03] p-3">
              <span className="text-slate-400">
                Member since
              </span>

              <span>
                September 2026
              </span>
            </div>
          </div>
        </div>

        <div className="panel rounded-2xl p-6">
          <h2 className="font-bold">
            Studio defaults
          </h2>

          <div className="mt-6 space-y-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  Start in private preview
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Never open the room by accident.
                </span>
              </span>

              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-cyan-300"
                data-testid="input-default-preview"
              />
            </label>

            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold">
                  Show audience guidance
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Keep the promise to your viewers visible.
                </span>
              </span>

              <input
                type="checkbox"
                defaultChecked
                className="size-5 accent-cyan-300"
                data-testid="input-audience-guidance"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-semibold">
                Default resolution
              </span>

              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#111a2a] px-4 py-3 text-sm text-slate-300"
                data-testid="select-default-resolution"
              >
                <option>1080p</option>
                <option>720p</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={saveSettings}
            className="btn-primary mt-7 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            data-testid="button-save-settings"
          >
            <Save size={16} />
            {saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </PageIntro>
  );
}

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}

function PageIntro({
  eyebrow,
  title,
  description,
  action,
  children,
}: PageIntroProps) {
  return (
    <div
      className="space-y-8"
      data-testid={`page-${title
        .toLowerCase()
        .replaceAll(" ", "-")}`}
    >
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">
            {eyebrow}
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        {action}
      </div>

      {children}
    </div>
  );
}

interface WorkflowStepProps {
  number: string;
  title: string;
  text: string;
}

function WorkflowStep({
  number,
  title,
  text,
}: WorkflowStepProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.02] p-4">
      <span className="font-mono text-xs text-cyan-300">
        {number}
      </span>

      <p className="mt-5 text-sm font-bold">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {text}
      </p>
    </div>
  );
}
