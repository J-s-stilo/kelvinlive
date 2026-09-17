import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#080c15] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <AlertCircle className="size-8 text-rose-300" />

          <h1 className="text-2xl font-bold tracking-tight">
            404 Page Not Found
          </h1>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-400">
          The page you are looking for does not exist.
        </p>
      </div>
    </div>
  );
}
