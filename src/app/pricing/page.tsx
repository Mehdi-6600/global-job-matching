"use client";

import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/payment/plans";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") {
      router.push("/dashboard");
    } else {
      router.push(`/payment?plan=${planId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      {/* هدر */}
      <div className="text-center py-16 px-4 border-b border-white/10">
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-lg border border-white/10 px-5 py-2 rounded-full text-sm font-medium text-white/90 mb-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Choose Your Plan
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Choose the plan that fits your needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* پلن‌ها */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gradient-to-br from-white/5 to-white/5 backdrop-blur-lg border rounded-3xl p-8 hover:scale-[1.02] transition-all duration-300 shadow-xl hover:shadow-2xl ${
                plan.id === "pro"
                  ? "border-blue-500/50 shadow-blue-500/20"
                  : "border-white/10 shadow-white/5"
              }`}
            >
              {plan.id === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="text-5xl font-bold text-white">${plan.price}</span>
                  {plan.price > 0 && <span className="text-white/50 ml-2">/ month</span>}
                </div>
                <ul className="space-y-3 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-white/80">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={`w-full mt-8 py-6 rounded-xl ${
                    plan.id === "pro"
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25"
                      : plan.id === "free"
                      ? "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                  }`}
                >
                  {plan.price === 0 ? "Start Free" : "Select Plan"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
