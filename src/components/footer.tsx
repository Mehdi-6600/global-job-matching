export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Global Job Matching. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/terms" className="text-slate-400 hover:text-sky-400 transition-colors">
              Terms
            </a>
            <a href="/privacy" className="text-slate-400 hover:text-sky-400 transition-colors">
              Privacy
            </a>
            <a href="/contact" className="text-slate-400 hover:text-sky-400 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
