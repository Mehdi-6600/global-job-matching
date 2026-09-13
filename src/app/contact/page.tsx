import type { Metadata } from "next";
import ContactContent from "./ContactContent";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Global Job Matching team. We are here to help job seekers and employers.",
  path: "/contact",
  index: true,
});

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <ContactContent />
      </div>
    </main>
  );
}
