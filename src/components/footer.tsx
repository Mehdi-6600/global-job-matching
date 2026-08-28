import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" className="text-lg font-bold text-white">
              G<span className="text-sky-400">JM</span>
            </Link>
            <p className="text-slate-500 text-sm mt-2 max-w-xs">
              Global Job Matching — find roles and hire talent with a clear,
              modern job board.
            </p>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-3">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/jobs"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Jobs
                </Link>
              </li>
              <li>
                <Link
                  href="/companies"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Companies
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-slate-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} Global Job Matching. All rights
            reserved.
          </p>
          <p className="text-slate-600 text-xs">Built for seekers &amp; employers</p>
        </div>
      </div>
    </footer>
  );
}
