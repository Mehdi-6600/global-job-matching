export default function CompaniesLoading() {
  return (
    <div className="min-h-[50vh] px-4 py-10 max-w-6xl mx-auto animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-white/10 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl border border-white/10 p-5 h-36"
          >
            <div className="h-10 w-10 rounded-full bg-white/10 mb-3" />
            <div className="h-4 w-2/3 rounded bg-white/10 mb-2" />
            <div className="h-3 w-1/2 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
