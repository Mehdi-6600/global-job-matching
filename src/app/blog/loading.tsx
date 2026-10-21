export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-40 rounded-lg bg-white/10" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl border border-white/10 p-6"
          >
            <div className="h-4 w-24 rounded bg-white/5 mb-3" />
            <div className="h-6 w-3/4 rounded bg-white/10 mb-3" />
            <div className="h-3 w-full rounded bg-white/5 mb-2" />
            <div className="h-3 w-5/6 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
