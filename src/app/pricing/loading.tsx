export default function PricingLoading() {
  return (
    <div className="gjm-page px-4">
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-[var(--surface-3)] mx-auto mb-3" />
        <div className="h-4 w-64 rounded bg-[var(--surface-2)] mx-auto mb-10" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl border border-[var(--border)] p-6 h-64"
            >
              <div className="h-5 w-24 rounded bg-[var(--surface-3)] mb-4" />
              <div className="h-8 w-16 rounded bg-[var(--surface-3)] mb-6" />
              <div className="h-3 w-full rounded bg-[var(--surface-2)] mb-2" />
              <div className="h-3 w-5/6 rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
