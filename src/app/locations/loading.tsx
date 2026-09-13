export default function LocationsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-52 rounded-lg bg-white/10 mx-auto mb-3" />
        <div className="h-4 w-72 max-w-full rounded bg-white/5 mx-auto mb-10" />
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl border border-white/10 p-5 h-24"
            >
              <div className="h-4 w-1/2 rounded bg-white/10 mb-3" />
              <div className="h-3 w-1/3 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
