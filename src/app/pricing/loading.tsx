export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-4 pb-16">
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-white/10 mx-auto mb-3" />
        <div className="h-4 w-64 rounded bg-white/5 mx-auto mb-10" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl border border-white/10 p-6 h-64"
            >
              <div className="h-5 w-24 rounded bg-white/10 mb-4" />
              <div className="h-8 w-16 rounded bg-white/10 mb-6" />
              <div className="h-3 w-full rounded bg-white/5 mb-2" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
