"use client";

import { useState } from "react";
import { 
  Check, 
  Zap, 
  Crown, 
  Rocket, 
  Shield, 
  CreditCard,
  ArrowRight
} from "lucide-react";

interface PricingPlan {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const plans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    icon: <Zap className="w-6 h-6" />,
    description: "Perfect for getting started",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Browse all job listings",
      "Create basic profile",
      "Apply to 3 jobs per month",
      "Email support",
      "Basic job alerts",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    icon: <Crown className="w-6 h-6" />,
    description: "Best for active job seekers",
    monthlyPrice: 19,
    yearlyPrice: 190,
    highlighted: true,
    badge: "MOST POPULAR",
    features: [
      "Everything in Free",
      "Unlimited job applications",
      "Priority profile visibility",
      "Advanced search filters",
      "Resume builder tool",
      "Salary insights & analytics",
      "Priority email support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: <Rocket className="w-6 h-6" />,
    description: "For teams and recruiters",
    monthlyPrice: 49,
    yearlyPrice: 490,
    features: [
      "Everything in Professional",
      "Post unlimited jobs",
      "Applicant tracking system",
      "Team collaboration tools",
      "Advanced analytics dashboard",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, <span className="text-cyan-400">Transparent</span> Pricing
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. No hidden fees, cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 glass rounded-2xl p-1.5">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                !isYearly
                  ? "bg-cyan-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? "bg-cyan-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Yearly
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] ${
                plan.highlighted
                  ? "glass bg-gradient-to-b from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/10"
                  : "glass border border-white/10 hover:border-white/20"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    plan.highlighted
                      ? "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
                      : "bg-white/10 text-cyan-400"
                  }`}
                >
                  {plan.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-slate-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">
                    ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-slate-400">/{isYearly ? "year" : "month"}</span>
                </div>
                {isYearly && plan.yearlyPrice > 0 && (
                  <p className="text-sm text-emerald-400 mt-1">
                    Save ${plan.monthlyPrice * 12 - plan.yearlyPrice} per year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <Check
                      className={`w-5 h-5 shrink-0 ${
                        plan.highlighted ? "text-cyan-400" : "text-emerald-400"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 group ${
                  plan.highlighted
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                    : "glass text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {plan.monthlyPrice === 0 ? "Get Started Free" : "Choose Plan"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 glass rounded-2xl p-8 max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-8 h-8 text-emerald-400" />
              <h4 className="text-white font-semibold">Secure Payment</h4>
              <p className="text-slate-400 text-sm">256-bit SSL encryption</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <CreditCard className="w-8 h-8 text-cyan-400" />
              <h4 className="text-white font-semibold">Flexible Billing</h4>
              <p className="text-slate-400 text-sm">Monthly or yearly options</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Zap className="w-8 h-8 text-amber-400" />
              <h4 className="text-white font-semibold">Instant Access</h4>
              <p className="text-slate-400 text-sm">Start immediately after payment</p>
            </div>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-12 text-center">
          <p className="text-slate-400">
            Have questions?{" "}
            <a href="/contact" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
