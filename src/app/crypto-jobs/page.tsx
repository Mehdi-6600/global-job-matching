import type { Metadata } from "next";
import Link from "next/link";
import { Bitcoin, Globe, Lock, Zap, Building2, ArrowRight, ShieldCheck, Clock, DollarSign } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo/core";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return buildPublicMetadata({
    title: "Remote Jobs Paying in Crypto 2026 — Work & Earn BTC, USDT, ETH",
    description: "Find remote jobs that pay in crypto. BTC, USDT, ETH, BNB — no banks, no KYC. Apply worldwide. Featured jobs updated daily on Global Job Matching.",
    path: "/crypto-jobs",
    index: true,
    hreflang: true,
  });
}

const benefits = [
  { icon: Globe, title: "No Borders", desc: "Work from Iran, Turkey, India — get paid anywhere. No blocked bank accounts." },
  { icon: Lock, title: "No KYC for Workers", desc: "Employers pay crypto directly. You keep privacy." },
  { icon: Zap, title: "Fast Payouts", desc: "USDT-TRC20 settles in minutes, fees ~$1. BTC/ETH also supported." },
  { icon: ShieldCheck, title: "Verified Employers", desc: "We review companies. Featured jobs are on-chain verified payments." },
];

const faqs = [
  { q: "Which crypto do you support?", a: "USDT (TRC20), USDC, BNB (BSC), BTC, ETH, DOGE. We recommend USDT-TRC20 — cheapest (~$1 fee) and fastest." },
  { q: "Do I need to pay to apply?", a: "No. Applying is free (20/month on Free plan, 500 on Pro $9). Only employers pay to feature jobs." },
  { q: "How do employers pay?", a: "They send exact crypto to our wallet (QR + address), we verify on-chain (TronGrid/Blockstream), activate in minutes." },
  { q: "Are these real jobs?", a: "Yes. We sync from Arbeitnow, RemoteOK, Jobicy and manual employer posts. Every job has source attribution." },
];

export default function CryptoJobsPage() {
  return (
    <div className="gjm-page">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--warning-soft)] border border-[var(--warning)] text-[var(--warning)] text-xs font-bold mb-4">
            <Bitcoin className="w-4 h-4" /> CRYPTO JOBS • NO BANKS • NO BORDERS
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] mb-4 leading-tight">
            Remote Jobs That <span className="bg-[image:var(--gradient-brand)] bg-clip-text text-transparent">Pay in Crypto</span>
          </h1>
          <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-lg mb-8">
            BTC, USDT, ETH, BNB — earn crypto for real work. No blocked cards, no KYC hassles. Join 12,000+ global workers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/jobs?tag=crypto" className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[var(--warning)] hover:bg-[var(--warning-hover)] text-[var(--text-on-brand)] font-bold">
              Browse Crypto Jobs <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-3)]">
              For Employers — Post for $19 <Building2 className="w-4 h-4" />
            </Link>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3">✓ Free to apply • ✓ 2,000+ jobs synced daily • ✓ On-chain verified payments</p>
        </div>

        {/* Trust stats */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-12">
          <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">2k+</p>
            <p className="text-xs text-[var(--text-muted)]">Crypto-friendly jobs</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">$1</p>
            <p className="text-xs text-[var(--text-muted)]">Avg fee with USDT</p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">~5 min</p>
            <p className="text-xs text-[var(--text-muted)]">Payment verified</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-5">
              <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-brand)] flex items-center justify-center text-[var(--text-on-brand)] mb-3">
                <b.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-1">{b.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-[var(--border)] bg-white/[0.03] p-6 md:p-8 mb-12">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="w-12 h-12 rounded-full bg-[var(--brand-accent)] text-[var(--text-on-brand)] flex items-center justify-center mx-auto mb-3 font-bold">1</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-1">Browse & Apply Free</h3>
              <p className="text-sm text-[var(--text-muted)]">Search jobs, filter by “crypto”, apply in 1 click. No payment needed.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-[var(--warning)] text-[var(--text-on-brand)] flex items-center justify-center mx-auto mb-3 font-bold">2</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-1">Employers Pay Crypto to Feature</h3>
              <p className="text-sm text-[var(--text-muted)]">$19/7d or $39/30d in USDT/BTC/ETH — on-chain verified, job pinned on top.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-[var(--success)] text-[var(--text-on-brand)] flex items-center justify-center mx-auto mb-3 font-bold">3</div>
              <h3 className="font-bold text-[var(--text-primary)] mb-1">Get Hired & Paid Crypto</h3>
              <p className="text-sm text-[var(--text-muted)]">Interview via platform, get paid directly to your wallet.</p>
            </div>
          </div>
        </div>

        {/* Pricing teaser */}
        <div className="rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] p-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-12">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Hiring? Feature your job for $19</h3>
            <p className="text-sm text-[var(--text-body)]">Appear on homepage + top of search. Pay once with crypto — no subscription.</p>
          </div>
          <Link href="/employer/post-job" className="px-6 py-3 rounded-xl bg-[var(--surface)] text-[var(--warning)] font-bold shrink-0">
            Post a Crypto Job →
          </Link>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 text-center">FAQ</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-xl bg-[var(--surface-2)] border border-[var(--border)] p-4">
                <h3 className="font-medium text-[var(--text-primary)] mb-1">{f.q}</h3>
                <p className="text-sm text-[var(--text-muted)]">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-[var(--brand-accent)] hover:text-[var(--text-primary)] text-sm">
            Browse all jobs <ArrowRight className="w-4 h-4" /> Browse crypto jobs now
          </Link>
        </div>
      </section>
    </div>
  );
}
