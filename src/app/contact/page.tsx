import { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Global Job Matching",
  description: "Get in touch with the Global Job Matching team. We are here to help.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Contact Us
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            Have a question, suggestion, or need help? We would love to hear from you.
          </p>
        </div>

        <div className="glass rounded-2xl p-8 sm:p-10 border border-white/10 shadow-xl">
          <ContactForm />
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sky-400 text-2xl mb-2">📧</div>
            <h3 className="text-white font-semibold mb-1">Email</h3>
            <p className="text-slate-400 text-sm">support@globaljobmatching.com</p>
          </div>
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sky-400 text-2xl mb-2">💬</div>
            <h3 className="text-white font-semibold mb-1">Live Chat</h3>
            <p className="text-slate-400 text-sm">Available 9AM - 6PM EST</p>
          </div>
          <div className="glass rounded-xl p-6 border border-white/10">
            <div className="text-sky-400 text-2xl mb-2">🌐</div>
            <h3 className="text-white font-semibold mb-1">Social</h3>
            <p className="text-slate-400 text-sm">@globaljobmatching</p>
          </div>
        </div>
      </div>
    </main>
  );
}
