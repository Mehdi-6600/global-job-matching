import { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Global Job Matching",
  description: "Get in touch with the Global Job Matching team.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto glass-card p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Contact Us</h1>
        <p className="text-[var(--text-muted)] mb-8">
          Have a question, feedback, or partnership inquiry? We would love to hear from you.
        </p>
        <ContactForm />
      </div>
    </main>
  );
}
