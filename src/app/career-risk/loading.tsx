export default function CareerRiskLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-4 pb-16">
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-white/10 mb-3" />
        <div className="h-4 w-full max-w-md rounded bg-white/5 mb-8" />
        <div className="glass rounded-2xl border border-white/10 p-6 space-y-4">
          <div className="h-10 w-full rounded-xl bg-white/10" />
          <div className="h-10 w-full rounded-xl bg-white/10" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 rounded-xl bg-white/10" />
            <div className="h-10 rounded-xl bg-white/10" />
          </div>
          <div className="h-24 w-full rounded-xl bg-white/5" />
          <div className="h-12 w-40 rounded-full bg-cyan-500/20" />
        </div>
      </div>
    </div>
  );
}
