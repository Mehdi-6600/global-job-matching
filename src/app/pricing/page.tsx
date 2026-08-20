"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
    cta: "Start Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Professional",
    price: "$9.99",
    period: "/ month",
    description: "Unlock unlimited access",
    features: [
      "Unlimited job viewing",
      "Unlimited job saves",
      "AI resume generator",
      "Priority support",
      "Early access to new features",
    ],
    cta: "Get Started",
    href: "/register",
    popular: true,
  },
];

export default function PricingPage() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that works for you. Upgrade or downgrade anytime.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-8 ${
              plan.popular
                ? "border-primary/50 bg-primary/5 shadow-lg"
                : "border-border bg-card"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </span>
              </div>
            )}

            <div className="text-center">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <div className="mt-4 flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold tracking-tight">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.description}
              </p>
            </div>

            <ul className="mt-8 space-y-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link href={plan.href} className="block">
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        All plans include secure payment and instant activation. No hidden fees.
      </p>
    </div>
  );
}
