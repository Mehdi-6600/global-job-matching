export default function LocationsLoading() {
  return (
    <div className="gjm-page px-4">
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-52 rounded-lg bg-[var(--surface-3)] mx-auto mb-3" />
        <div className="h-4 w-72 max-w-full rounded bg-[var(--surface-2)] mx-auto mb-10" />
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass rounded-2xl border border-[var(--border)] p-5 h-24"
            >
              <div className="h-4 w-1/2 rounded bg-[var(--surface-3)] mb-3" />
              <div className="h-3 w-1/3 rounded bg-[var(--surface-2)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
