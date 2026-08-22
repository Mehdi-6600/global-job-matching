import { Metadata } from "next";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | Global Job Matching",
  description: "Simple, transparent pricing for Global Job Matching.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">Simple, Transparent Pricing</h1>
        <p className="text-[var(--text-muted)]">Choose the plan that works for you. Upgrade or downgrade anytime.</p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free */}
        <div className="glass-card">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Free</h2>
          <div className="text-3xl font-bold text-[var(--ios-blue)] mb-6">$0</div>
          <p className="text-[var(--text-muted)] mb-6">Get started with job searching</p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> View 5 jobs per day</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Save 2 jobs</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Basic support</li>
          </ul>
          <button className="btn-secondary w-full">Get Started</button>
        </div>

        {/* Pro — جدید */}
        <div className="glass-card border-[var(--ios-blue)]/30 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-[var(--ios-blue)] text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Pro</h2>
          <div className="text-3xl font-bold text-[var(--ios-blue)] mb-6">$9.99<span className="text-base font-normal text-[var(--text-muted)]">/month</span></div>
          <p className="text-[var(--text-muted)] mb-6">Unlock unlimited access</p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Unlimited job viewing</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Unlimited job saves</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> AI resume generator</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Priority support</li>
          </ul>
          <button className="btn-primary w-full">Upgrade Now</button>
        </div>

        {/* Enterprise — جدید */}
        <div className="glass-card">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Enterprise</h2>
          <div className="text-3xl font-bold text-[var(--ios-blue)] mb-6">$29.99<span className="text-base font-normal text-[var(--text-muted)]">/month</span></div>
          <p className="text-[var(--text-muted)] mb-6">For power users & teams</p>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Everything in Pro</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> AI job matching agent</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> Interview coach</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> 24/7 dedicated support</li>
            <li className="flex items-center gap-2 text-[var(--text-secondary)]"><Check className="w-4 h-4 text-[var(--ios-blue)]" /> API access</li>
          </ul>
          <button className="btn-secondary w-full">Contact Sales</button>
        </div>
      </div>

      <p className="text-center text-sm text-[var(--text-muted)] mt-8">All plans include secure payment and instant activation. No hidden fees.</p>
    </main>
  );
}
