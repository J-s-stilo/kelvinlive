import { Radio } from "lucide-react";

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({
  compact = false,
}: BrandMarkProps) {
  return (
    <div
      className="flex items-center gap-2.5"
      data-testid="brand-lumalive"
    >
      <span className="grid size-9 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 text-cyan-200 shadow-[0_0_24px_rgba(21,196,224,.16)]">
        <Radio size={18} strokeWidth={2.2} />
      </span>

      {!compact ? (
        <span className="text-[1.1rem] font-extrabold tracking-[-.04em] text-slate-100">
          Luma<span className="text-cyan-300">Live</span>
        </span>
      ) : null}
    </div>
  );
}
