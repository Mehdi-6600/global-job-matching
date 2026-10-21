export default function CareerRiskLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-4 pb-16">
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="flex items-start gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-8 w-56 rounded-lg bg-white/10" />
            <div className="h-4 w-full max-w-md rounded bg-white/5" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="h-10 w-full rounded-xl bg-white/10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-10 rounded-xl bg-white/10" />
            <div className="h-10 rounded-xl bg-white/10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-10 rounded-xl bg-white/10" />
            <div className="h-10 rounded-xl bg-white/10" />
          </div>
          <div className="h-10 w-full rounded-xl bg-white/5" />
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="h-12 flex-1 rounded-xl bg-cyan-500/20" />
            <div className="h-12 flex-1 rounded-xl bg-white/10" />
            <div className="h-12 flex-1 rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
