import Link from "next/link";

export function Footer() {
  return (
    <footer className="glass-strip mt-auto">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-xl font-bold text-[var(--ios-blue)]">
              Global Job Matching
            </Link>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              AI-powered job matching for the modern workforce.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Platform</h3>
            <ul className="space-y-3">
              <li><Link href="/jobs" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Browse Jobs</Link></li>
              <li><Link href="/pricing" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Pricing</Link></li>
              <li><Link href="/about" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">About Us</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-3">
              <li><Link href="/contact" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Contact</Link></li>
              <li><Link href="/terms" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Privacy Policy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Account</h3>
            <ul className="space-y-3">
              <li><Link href="/login" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Sign In</Link></li>
              <li><Link href="/register" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Create Account</Link></li>
              <li><Link href="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--ios-blue)] transition">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-[var(--glass-border)] text-center">
          <p className="text-sm text-[var(--text-muted)]">&copy; {new Date().getFullYear()} Global Job Matching. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
