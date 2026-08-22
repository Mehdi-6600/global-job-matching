import { Metadata } from "next";
import Link from "next/link";
import { Check, Bitcoin, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing | Global Job Matching",
  description: "Simple, transparent pricing for Global Job Matching. Pay with cryptocurrency.",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with job searching",
    features: [
      "View 5 jobs per day",
      "Save 2 jobs",
      "Basic support",
    ],
    cta: "Get Started",
    href: "/register?plan=free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "Unlock unlimited access",
    features: [
      "Unlimited job viewing",
      "Unlimited job saves",
      "AI resume generator",
      "Priority support",
    ],
    cta: "Upgrade with Crypto",
    href: "/payment?plan=pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$29.99",
    period: "/month",
    description: "For power users & teams",
    features: [
      "Everything in Pro",
      "AI job matching agent",
      "Interview coach",
      "24/7 dedicated support",
      "API access",
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b0d12] py-16 px-4 sm:px-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose the plan that works for you. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Payment methods notice */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="rounded-2xl bg-white dark:bg-[#13151c] border border-gray-200 dark:border-[#1e2330] p-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Bitcoin className="w-5 h-5 text-orange-500" />
            <span className="font-medium">Crypto payments accepted</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <CreditCard className="w-5 h-5" />
            <span>PayPal — Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#13151c] border transition-all
              ${
                plan.popular
                  ? "border-[#3478F5]/50 shadow-[0_0_0_1px_rgba(52,120,245,0.3)] dark:shadow-[0_0_30px_rgba(52,120,245,0.15)]"
                  : "border-gray-200 dark:border-[#1e2330]"
              }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-[#3478F5] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
            )}

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {plan.name}
            </h2>
            <div className="mb-4">
              <span className="text-3xl font-bold text-[#3478F5]">{plan.price}</span>
              {plan.period && (
                <span className="text-base font-normal text-gray-500 dark:text-gray-400">
                  {plan.period}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {plan.description}
            </p>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <Check className="w-4 h-4 text-[#3478F5] mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`block w-full text-center py-3 rounded-full font-semibold text-sm transition-all
                ${
                  plan.popular
                    ? "bg-[#3478F5] text-white shadow-[0_6px_20px_rgba(52,120,245,0.35)] hover:bg-[#2f6de0] active:scale-[0.98]"
                    : "bg-gray-100 dark:bg-[#1a1d24] text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#222733]"
                }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">
        All paid plans are activated instantly after crypto payment confirmation. No hidden fees.
      </p>
    </main>
  );
}
