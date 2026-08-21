"use client";

import { useRouter } from "next/navigation";
import { Check, Sparkles, Zap, Building2, Award } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const plans = [
  {
    id: "free",
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    icon: Zap,
    features: [
      "Browse all job listings",
      "Create a profile",
      "Apply to 5 jobs/month",
      "Basic resume builder",
      "Email notifications",
    ],
    cta: "Get Started",
    popular: false,
    border: "border-white/20 dark:border-white/10",
  },
  {
    id: "basic",
    name: "Basic",
    description: "For active job seekers",
    price: "$9.99",
    period: "per month",
    icon: Award,
    features: [
      "Everything in Free",
      "50 job applications/month",
      "Salary insights & reports",
      "Priority email support",
      "Job match alerts",
    ],
    cta: "Start Basic Trial",
    popular: false,
    border: "border-gray-300/60 dark:border-gray-400/40 shadow-[0_0_15px_rgba(200,200,200,0.15)] dark:shadow-[0_0_20px_rgba(200,200,200,0.1)]",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For serious job seekers",
    price: "$19",
    period: "per month",
    icon: Sparkles,
    features: [
      "Everything in Free & Basic",
      "Unlimited job applications",
      "AI-powered resume optimizer",
      "Priority application status",
      "Direct messaging with recruiters",
      "Interview preparation tools",
      "3-day free trial",
    ],
    cta: "Start Pro Trial",
    popular: true,
    border: "border-amber-400/60 dark:border-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.2)] dark:shadow-[0_0_30px_rgba(251,191,36,0.15)]",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For teams and organizations",
    price: "Custom",
    period: "contact us",
    icon: Building2,
    features: [
      "Everything in Pro",
      "Team collaboration tools",
      "Advanced analytics dashboard",
      "Custom integrations",
      "Dedicated account manager",
      "SSO & advanced security",
      "Custom branding",
    ],
    cta: "Contact Sales",
    popular: false,
    border: "border-white/20 dark:border-white/10",
  },
];

export default function PricingPage() {
  const router = useRouter();

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") {
      router.push("/dashboard");
    } else if (planId === "basic") {
      router.push("/payment?plan=basic");
    } else if (planId === "pro") {
      router.push("/payment?plan=pro");
    } else if (planId === "enterprise") {
      router.push("/contact");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white">
      <Navbar />

      <section className="relative pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-40 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -right-40 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-100 dark:to-purple-200 bg-clip-text text-transparent mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-slate-500 dark:text-white/60 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include a free trial.
          </p>
        </div>
      </section>

      <section className="relative px-4 sm:px-6 lg:px-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 transition-all duration-300 border-2 ${plan.border} ${
                  plan.popular
                    ? "bg-gradient-to-b from-blue-500/20 to-purple-500/20 scale-105"
                    : "glass hover:bg-white/[0.15] dark:hover:bg-white/[0.15]"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-sm font-semibold shadow-lg text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                      plan.popular
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-white/5 text-white/60 dark:bg-white/5"
                    }`}
                  >
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-slate-500 dark:text-white/50 text-sm">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-slate-400 dark:text-white/40 ml-2">
                    {plan.period}
                  </span>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          plan.popular ? "text-blue-400" : "text-slate-400 dark:text-white/40"
                        }`}
                      />
                      <span className="text-sm text-slate-600 dark:text-white/70">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/25 text-white"
                      : "glass hover:bg-white/20 dark:hover:bg-white/20 text-slate-700 dark:text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-400 dark:text-white/30 text-sm mb-6">
              Trusted by 10,000+ professionals worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-50 dark:opacity-30">
              {["Google", "Microsoft", "Amazon", "Meta", "Apple"].map(
                (company) => (
                  <span
                    key={company}
                    className="text-lg font-semibold text-slate-500 dark:text-white/60"
                  >
                    {company}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
