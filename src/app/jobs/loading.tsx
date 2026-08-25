export default function JobsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mb-3" />
          <div className="h-5 w-48 bg-white/5 rounded-lg animate-pulse" />
        </div>
        <div className="glass rounded-2xl p-4 mb-6 border border-white/10">
          <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 animate-pulse" />
                <div className="w-16 h-6 rounded-full bg-white/5 animate-pulse" />
              </div>
              <div className="h-6 w-3/4 bg-white/5 rounded-lg animate-pulse mb-2" />
              <div className="h-4 w-1/2 bg-white/5 rounded-lg animate-pulse mb-4" />
              <div className="flex gap-2 mb-4">
                <div className="w-20 h-4 rounded-md bg-white/5 animate-pulse" />
                <div className="w-16 h-4 rounded-md bg-white/5 animate-pulse" />
              </div>
              <div className="h-4 w-full bg-white/5 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
