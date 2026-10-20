export default function AboutLoading() {
  return (
    <div className="gjm-page px-4">
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 rounded-lg bg-[var(--surface-3)]" />
        <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
        <div className="h-4 w-5/6 rounded bg-[var(--surface-2)]" />
        <div className="h-4 w-4/6 rounded bg-[var(--surface-2)]" />
        <div className="h-40 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] mt-8" />
      </div>
    </div>
  );
}
