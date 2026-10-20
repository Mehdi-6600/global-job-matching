export default function BlogLoading() {
  return (
    <div className="gjm-page px-4">
      <div className="max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-40 rounded-lg bg-[var(--surface-3)]" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass rounded-2xl border border-[var(--border)] p-6"
          >
            <div className="h-4 w-24 rounded bg-[var(--surface-2)] mb-3" />
            <div className="h-6 w-3/4 rounded bg-[var(--surface-3)] mb-3" />
            <div className="h-3 w-full rounded bg-[var(--surface-2)] mb-2" />
            <div className="h-3 w-5/6 rounded bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
