"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Building2,
  Crown,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Globe,
  Users,
  Briefcase,
  BarChart3,
  Mail,
} from "lucide-react";

const plans = [
  {
    name: "Free",
    icon: <Zap className="w-6 h-6 text-slate-300" />,
    price: "€0",
    period: "/month",
    description: "Perfect for job seekers getting started.",
    href: "/register",
    buttonText: "Get Started",
    popular: false,
    features: [
      "Browse all jobs",
      "Apply to 5 jobs/month",
      "Create profile & upload CV",
      "Save up to 10 jobs",
      "Basic job alerts",
      "Email support",
    ],
    disabled: [],
  },
  {
    name: "Pro",
    icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
    price: "€9",
    period: "/month",
    description: "For serious job seekers who want more.",
    href: "/register?plan=pro",
    buttonText: "Upgrade to Pro",
    popular: true,
    features: [
      "Unlimited job applications",
      "Priority application badge",
      "AI resume optimization",
      "Save unlimited jobs",
      "Advanced job alerts",
      "Salary insights",
      "Profile analytics",
      "Priority email support",
    ],
    disabled: [],
  },
  {
    name: "Business",
    icon: <Building2 className="w-6 h-6 text-purple-400" />,
    price: "€29",
    period: "/month",
    description: "For employers & recruiters.",
    href: "/register?plan=business",
    buttonText: "Upgrade to Business",
    popular: false,
    features: [
      "Post up to 10 active jobs",
      "Applicant tracking system",
      "Company profile page",
      "Candidate messaging",
      "Job analytics dashboard",
      "Featured job listings",
      "Resume database access",
      "Dedicated support",
    ],
    disabled: [],
  },
  {
    name: "Enterprise",
    icon: <Crown className="w-6 h-6 text-amber-400" />,
    price: "Custom",
    period: "",
    description: "For large organizations with custom needs.",
    href: "/contact",
    buttonText: "Contact Sales",
    popular: false,
    features: [
      "Unlimited job postings",
      "Custom ATS integration",
      "API access",
      "White-label options",
      "Advanced analytics",
      "Dedicated account manager",
      "SSO & team management",
      "SLA guarantee",
    ],
    disabled: [],
  },
];

const comparisonFeatures = [
  { name: "Job Applications", free: "5/month", pro: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
  { name: "Saved Jobs", free: "10", pro: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
  { name: "Profile & CV", free: true, pro: true, business: true, enterprise: true },
  { name: "Job Alerts", free: "Basic", pro: "Advanced", business: "Advanced", enterprise: "Custom" },
  { name: "AI Resume Help", free: false, pro: true, business: true, enterprise: true },
  { name: "Apply Badge", free: false, pro: "Priority", business: "Priority", enterprise: "Priority" },
  { name: "Post Jobs", free: false, pro: false, business: "10 active", enterprise: "Unlimited" },
  { name: "ATS / Pipeline", free: false, pro: false, business: true, enterprise: true },
  { name: "Analytics", free: false, pro: "Basic", business: "Advanced", enterprise: "Full" },
  { name: "Support", free: "Email", pro: "Priority", business: "Dedicated", enterprise: "Account Manager" },
];

const faqs = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
  },
  {
    q: "Is there a free trial for paid plans?",
    a: "We offer a 7-day free trial for Pro and Business plans. No credit card required.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept credit cards, PayPal, and cryptocurrency. More options coming soon.",
  },
  {
    q: "Can I cancel my subscription?",
    a: "Absolutely. You can cancel anytime from your dashboard settings with no hidden fees.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto">
            Start free and scale as you grow. No hidden fees, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                billing === "yearly"
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative glass rounded-2xl p-6 border transition-all hover:-translate-y-1 ${
                plan.popular
                  ? "border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.popular
                      ? "bg-cyan-500/10 border border-cyan-500/20"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  {plan.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{plan.name}</h3>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">
                    {billing === "yearly" && plan.price !== "€0" && plan.price !== "Custom"
                      ? plan.price.replace("€", "€") // در نسخه واقعی محاسبه 20% تخفیف
                      : plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-slate-500 text-sm">
                      {billing === "yearly" && plan.price !== "€0" && plan.price !== "Custom"
                        ? "/year"
                        : plan.period}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm mt-1">{plan.description}</p>
              </div>

              <Link
                href={plan.href}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all mb-6 ${
                  plan.popular
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                    : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                }`}
              >
                {plan.buttonText}
                <ArrowRight className="w-4 h-4" />
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden mb-20">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Compare Plans
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-slate-400 font-medium px-6 py-4">Feature</th>
                  <th className="text-center text-slate-300 font-semibold px-4 py-4">Free</th>
                  <th className="text-center text-cyan-400 font-semibold px-4 py-4">Pro</th>
                  <th className="text-center text-purple-400 font-semibold px-4 py-4">Business</th>
                  <th className="text-center text-amber-400 font-semibold px-4 py-4">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr
                    key={row.name}
                    className={`border-b border-white/5 ${
                      i % 2 === 0 ? "bg-white/[0.02]" : ""
                    }`}
                  >
                    <td className="text-slate-300 px-6 py-3.5 font-medium">{row.name}</td>
                    <td className="text-center text-slate-400 px-4 py-3.5">
                      {typeof row.free === "boolean" ? (
                        row.free ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        row.free
                      )}
                    </td>
                    <td className="text-center text-slate-300 px-4 py-3.5">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        row.pro
                      )}
                    </td>
                    <td className="text-center text-slate-300 px-4 py-3.5">
                      {typeof row.business === "boolean" ? (
                        row.business ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        row.business
                      )}
                    </td>
                    <td className="text-center text-slate-300 px-4 py-3.5">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-slate-600">—</span>
                        )
                      ) : (
                        row.enterprise
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="glass rounded-2xl p-5 border border-white/10"
              >
                <h3 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="glass rounded-2xl p-8 sm:p-12 text-center border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Still have questions?
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Our team is here to help you choose the right plan for your needs.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-all"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Link>
        </div>
      </div>
    </main>
  );
}
