import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Pricing",
  description:
    "Choose Free, Pro, Business, or Enterprise plans. Crypto payments supported. Upgrade when you need more applications, AI tools, and employer seats.",
  path: "/pricing",
  index: true,
});

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
