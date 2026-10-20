import type { Metadata } from "next";
import AboutContent from "./AboutContent";
import { buildPublicMetadata, jsonLdScript } from "@/lib/seo/core";
import { faqPageJsonLd } from "@/lib/seo/json-ld";

export const metadata: Metadata = buildPublicMetadata({
  title: "About Us",
  description:
    "Learn more about Global Job Matching — a modern job board connecting talent and employers worldwide.",
  path: "/about",
  index: true,
  hreflang: true,
});

const aboutFaqs = [
  {
    question: "What is Global Job Matching?",
    answer:
      "Global Job Matching is an international job board that helps job seekers find roles and helps employers hire talent, with tools like AI career risk analysis and resume support.",
  },
  {
    question: "Is it free to browse jobs?",
    answer:
      "Yes. Anyone can browse open jobs and company profiles. Some premium features may require a paid plan.",
  },
  {
    question: "How do employers post jobs?",
    answer:
      "Employers create an account, set up a company profile, and post openings from the employer dashboard according to their plan limits.",
  },
  {
    question: "Where can I find jobs by country or category?",
    answer:
      "Use the Locations and Categories hubs, or the main Jobs browse page with filters.",
  },
];

export default function AboutPage() {
  const faqLd = faqPageJsonLd(aboutFaqs);

  return (
    <div className="gjm-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }}
      />
      <div className="gjm-container">
        <div className="mx-auto max-w-3xl">
          <AboutContent />
        </div>
      </div>
    </div>
  );
}
