import Link from "next/link";
import { Globe, Zap, Bell, Headphones } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)]">
      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-bold text-[var(--text-primary)] mb-6">
            Find Your <span className="text-[var(--ios-blue)]">Dream Job</span> Anywhere
          </h1>
          <p className="text-lg sm:text-xl text-[var(--text-secondary)] mb-8 max-w-2xl mx-auto">
            Global job matching powered by AI. Discover opportunities tailored to your skills and preferences — completely free to start.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/jobs" className="btn-primary">Browse Jobs</Link>
            <Link href="/register" className="btn-secondary">Create Account</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card text-center">
            <div className="text-3xl font-bold text-[var(--ios-blue)]">500+</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Projects</div>
          </div>
          <div className="glass-card text-center">
            <div className="text-3xl font-bold text-[var(--ios-blue)]">98%</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Satisfaction</div>
          </div>
          <div className="glass-card text-center">
            <div className="text-3xl font-bold text-[var(--ios-blue)]">24/7</div>
            <div className="text-sm text-[var(--text-muted)] mt-1">Support</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] text-center mb-12">Everything You Need to Succeed</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card">
              <Zap className="w-8 h-8 text-[var(--ios-blue)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Smart Matching</h3>
              <p className="text-sm text-[var(--text-secondary)]">AI-powered algorithm connects you with the best opportunities.</p>
            </div>
            <div className="glass-card">
              <Globe className="w-8 h-8 text-[var(--ios-blue)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Global Reach</h3>
              <p className="text-sm text-[var(--text-secondary)]">Access job listings from companies worldwide.</p>
            </div>
            <div className="glass-card">
              <Bell className="w-8 h-8 text-[var(--ios-blue)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Real-time Updates</h3>
              <p className="text-sm text-[var(--text-secondary)]">Get instant notifications for new matches.</p>
            </div>
            <div className="glass-card">
              <Headphones className="w-8 h-8 text-[var(--ios-blue)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">24/7 Support</h3>
              <p className="text-sm text-[var(--text-secondary)]">Dedicated support team ready to help anytime.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
