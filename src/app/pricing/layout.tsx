import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose Free, Pro, Business, or Enterprise plans. Crypto payments supported. Upgrade when you need more applications, AI tools, and employer seats.",
  alternates: {
    canonical: absoluteUrl("/pricing"),
  },
  openGraph: {
    title: "Pricing | Global Job Matching",
    description:
      "Plans for job seekers and employers. Crypto checkout available.",
    url: absoluteUrl("/pricing"),
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
