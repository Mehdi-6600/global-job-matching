import { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Global Job Matching",
  description: "Get in touch with the Global Job Matching team.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
        <p className="text-gray-500 mb-8">
          Have a question, feedback, or partnership inquiry? We would love to hear from you.
        </p>
        <ContactForm />
      </div>
    </main>
  );
}
