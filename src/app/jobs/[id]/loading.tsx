export default function JobDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-4 pb-16">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-4 w-40 rounded bg-white/10 mb-6" />
        <div className="h-9 w-3/4 max-w-xl rounded-lg bg-white/10 mb-3" />
        <div className="h-4 w-48 rounded bg-white/5 mb-8" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-2xl border border-white/10 p-6 h-48" />
            <div className="glass rounded-2xl border border-white/10 p-6 h-32" />
          </div>
          <div className="glass rounded-2xl border border-white/10 p-6 h-56" />
        </div>
      </div>
    </div>
  );
}
