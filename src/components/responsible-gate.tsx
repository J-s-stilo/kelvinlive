import {
  ArrowRight,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useState,
} from "react";
import { useLocation } from "wouter";

interface ResponsibleGateProps {
  onClose: () => void;
}

export function ResponsibleGate({
  onClose,
}: ResponsibleGateProps) {
  const [accepted, setAccepted] = useState(false);
  const [, setLocation] = useLocation();

  function enter(): void {
    if (accepted) {
      setLocation("/auth");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#070b14]/85 p-4 backdrop-blur-md"
      data-testid="modal-responsible-gate"
    >
      <div className="panel relative my-8 w-full max-w-xl rounded-[1.75rem] p-6 sm:p-9">
        <button
          type="button"
          onClick={onClose}
          className="icon-button absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close responsible use gate"
          data-testid="button-close-gate"
        >
          <X size={18} />
        </button>

        <div className="mb-8 flex items-center gap-3">
          <BrandGlyph />

          <div>
            <p className="eyebrow">
              A quick note before you go live
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Create with care.
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          <GateCard
            icon={<Sparkles size={19} />}
            title="For expressive work"
            text="LumaLive is for entertainment, live education, and thoughtful creator workflows."
            tone="cyan"
          />

          <GateCard
            icon={<ShieldAlert size={19} />}
            title="Never impersonate"
            text="No identity theft, fraud, deceptive impersonation, or unauthorized likenesses. Your audience deserves clarity."
            tone="rose"
          />
        </div>

        <label
          className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-300 hover:border-cyan-300/30"
          data-testid="label-responsible-agreement"
        >
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) =>
              setAccepted(event.target.checked)
            }
            className="mt-1 size-4 accent-cyan-300"
            data-testid="input-responsible-agreement"
          />

          <span>
            I understand the guidelines and agree to use
            LumaLive responsibly.
          </span>
        </label>

        <button
          type="button"
          onClick={enter}
          disabled={!accepted}
          className="btn-primary mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 font-bold disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="button-enter-lumalive"
        >
          Enter LumaLive
          <ArrowRight size={17} />
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          By continuing, you confirm you have rights to content
          you share.
        </p>
      </div>
    </div>
  );
}

function BrandGlyph() {
  return (
    <div className="grid size-11 place-items-center rounded-2xl border border-violet-300/30 bg-violet-300/10 text-violet-200">
      <Sparkles size={21} />
    </div>
  );
}

interface GateCardProps {
  icon: ReactNode;
  title: string;
  text: string;
  tone: "cyan" | "rose";
}

function GateCard({
  icon,
  title,
  text,
  tone,
}: GateCardProps) {
  const toneClasses =
    tone === "rose"
      ? "border-rose-300/20 bg-rose-400/[.05]"
      : "border-cyan-300/15 bg-cyan-400/[.04]";

  const iconClasses =
    tone === "rose"
      ? "text-rose-200"
      : "text-cyan-200";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div
        className={`mb-3 grid size-9 place-items-center rounded-xl ${iconClasses}`}
      >
        {icon}
      </div>

      <h3 className="font-semibold text-slate-100">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-slate-400">
        {text}
      </p>
    </div>
  );
}
