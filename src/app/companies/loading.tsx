export default function CompaniesLoading() {
  return (
    <div className="min-h-[50vh] px-4 py-10 max-w-6xl mx-auto animate-pulse">
      <div className="h-8 w-56 rounded-lg bg-white/10 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl border border-white/10 p-5 h-36"
          >
            <div className="flex gap-3 items-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-2/3 rounded bg-white/10 mb-2" />
                <div className="h-3 w-1/3 rounded bg-white/5" />
              </div>
            </div>
            <div className="h-3 w-full rounded bg-white/5 mb-2" />
            <div className="h-3 w-4/5 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
