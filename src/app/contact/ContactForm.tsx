"use client";

import { useState } from "react";
import { sendContactMessage } from "./actions";
import { useLocale } from "@/components/locale-provider";

export default function ContactForm() {
  const { t } = useLocale();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await sendContactMessage(formData);
    setStatus(result.success ? "success" : "error");
    setLoading(false);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          {t("Contact.name", "Full Name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-sky-500"
          placeholder={t("Contact.namePlaceholder", "John Doe")}
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          {t("Contact.email", "Email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-sky-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          {t("Contact.subject", "Subject")}
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-sky-500"
          placeholder={t("Contact.subjectPlaceholder", "How can we help?")}
        />
      </div>
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-slate-300 mb-1"
        >
          {t("Contact.message", "Message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          placeholder={t("Contact.messagePlaceholder", "Tell us more...")}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-400 disabled:opacity-60"
      >
        {loading
          ? t("Contact.sending", "Sending...")
          : t("Contact.send", "Send Message")}
      </button>
      {status === "success" && (
        <p className="text-sm text-emerald-400 text-center">
          {t("Contact.success", "Message sent successfully!")}
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-400 text-center">
          {t("Contact.error", "Something went wrong. Please try again.")}
        </p>
      )}
    </form>
  );
}
