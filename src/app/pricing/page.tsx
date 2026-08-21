"use client";

import Link from "next/link";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    features: [
      "Browse all job listings",
      "Basic search & filters",
      "Save up to 10 jobs",
      "Email notifications",
    ],
    cta: "Get Started",
    href: "/register",
    popular: false,
  },
  {
    name: "Pro",
    icon: Crown,
    price: "$9",
    period: "/month",
    description: "For serious job seekers",
    features: [
      "Everything in Free",
      "AI-powered job matching",
      "Unlimited saved jobs",
      "Priority application alerts",
      "Resume builder access",
      "Salary insights",
    ],
    cta: "Upgrade to Pro",
    href: "/payment?plan=pro",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Rocket,
    price: "$29",
    period: "/month",
    description: "For teams & recruiters",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Advanced analytics",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#3B82F6]/10 dark:bg-[#3B82F6]/15 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="glass-section p-10 sm:p-14">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h1>
            <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
              Choose the plan that fits your career goals. No hidden fees, cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`glass-card relative ${
                  plan.popular ? "ring-2 ring-[#3B82F6] glow-primary" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full text-xs font-bold bg-[#3B82F6] text-white shadow-glow">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                      plan.popular
                        ? "gradient-primary shadow-glow"
                        : "glass"
                    }`}
                  >
                    <plan.icon
                      className={`w-7 h-7 ${
                        plan.popular ? "text-white" : "text-[#3B82F6]"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    {plan.description}
                  </p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold gradient-text">
                      {plan.price}
                    </span>
                    <span className="text-[var(--text-muted)]">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#3B82F6]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-[#3B82F6]" />
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular
                      ? "btn-primary"
                      : "btn-secondary"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
