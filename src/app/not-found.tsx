export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="glass rounded-2xl p-10 text-center border border-white/10">
        <h1 className="text-6xl font-bold text-sky-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
        <p className="text-slate-400 mb-6">The page you are looking for does not exist.</p>
        <a
          href="/"
          className="inline-block bg-sky-500 hover:bg-sky-400 text-white font-semibold px-6 py-3 rounded-xl transition-all"
        >
          Go Home
        </a>
      </div>
    </main>
  );
}
