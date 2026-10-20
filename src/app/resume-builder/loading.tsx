export default function ResumeBuilderLoading() {
  return (
    <div className="gjm-page px-4">
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-[var(--surface-3)] mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl border border-[var(--border)] p-6 h-96 space-y-3">
            <div className="h-10 rounded-xl bg-[var(--surface-3)]" />
            <div className="h-10 rounded-xl bg-[var(--surface-3)]" />
            <div className="h-24 rounded-xl bg-[var(--surface-2)]" />
            <div className="h-12 w-40 rounded-xl bg-[var(--brand-primary-soft)]" />
          </div>
          <div className="glass rounded-2xl border border-[var(--border)] p-6 h-96" />
        </div>
      </div>
    </div>
  );
}
