export default function JobsLoading() {
  return (
    <div className="min-h-[50vh] px-4 py-10 max-w-6xl mx-auto animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/10 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl border border-white/10 p-5 h-40"
          >
            <div className="h-4 w-3/4 rounded bg-white/10 mb-3" />
            <div className="h-3 w-1/2 rounded bg-white/10 mb-6" />
            <div className="h-3 w-full rounded bg-white/5 mb-2" />
            <div className="h-3 w-5/6 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
