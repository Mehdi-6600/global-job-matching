import type { Metadata } from "next";
import ContactContent from "./ContactContent";
import { buildPublicMetadata } from "@/lib/seo/core";

export const metadata: Metadata = buildPublicMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Global Job Matching team. We are here to help job seekers and employers.",
  path: "/contact",
  index: true,
  hreflang: true,
});

export default function ContactPage() {
  return (
    <div className="gjm-page px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <ContactContent />
      </div>
    </div>
  );
}
