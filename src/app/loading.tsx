import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  );
}
