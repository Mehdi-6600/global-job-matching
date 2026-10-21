export default function AboutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 px-4 pb-16">
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 rounded-lg bg-white/10" />
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-5/6 rounded bg-white/5" />
        <div className="h-4 w-4/6 rounded bg-white/5" />
        <div className="h-40 rounded-2xl bg-white/5 border border-white/10 mt-8" />
      </div>
    </div>
  );
}
