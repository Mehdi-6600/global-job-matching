// src/app/pricing/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/payment/plans";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();

  const handleSelectPlan = (planId: string) => {
    if (planId === "free") {
      // فعال‌سازی پلن رایگان
      router.push("/dashboard");
    } else {
      // رفتن به صفحه پرداخت با انتخاب پلن
      router.push(`/payment?plan=${planId}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">انتخاب پلن مناسب</h1>
        <p className="text-muted-foreground text-lg">
          با انتخاب پلن مناسب، به امکانات بیشتری دسترسی پیدا کنید.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow ${
              plan.id === "pro" ? "border-blue-500 ring-4 ring-blue-100" : ""
            }`}
          >
            {plan.id === "pro" && (
              <div className="text-xs font-semibold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full mb-4">
                محبوب‌ترین
              </div>
            )}
            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-black">${plan.price}</span>
              {plan.price > 0 && <span className="text-muted-foreground">/ ماه</span>}
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSelectPlan(plan.id)}
              className={`w-full ${
                plan.id === "pro"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : plan.id === "free"
                  ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  : ""
              }`}
              variant={plan.id === "free" ? "outline" : "default"}
            >
              {plan.price === 0 ? "شروع رایگان" : "انتخاب پلن"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
