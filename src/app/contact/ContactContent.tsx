"use client";

import ContactForm from "./ContactForm";
import { useLocale } from "@/components/locale-provider";

export default function ContactContent() {
  const { t } = useLocale();

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          {t("Contact.title", "Contact Us")}
        </h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          {t(
            "Contact.subtitle",
            "Have a question, suggestion, or need help? We would love to hear from you."
          )}
        </p>
      </div>

      <div className="glass rounded-2xl p-8 sm:p-10 border border-white/10 shadow-xl">
        <ContactForm />
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="glass rounded-xl p-6 border border-white/10">
          <div className="text-sky-400 text-2xl mb-2">📧</div>
          <h3 className="text-white font-semibold mb-1">
            {t("Contact.cardEmail", "Email")}
          </h3>
          <p className="text-slate-400 text-sm">support@globaljobmatching.com</p>
        </div>
        <div className="glass rounded-xl p-6 border border-white/10">
          <div className="text-sky-400 text-2xl mb-2">💬</div>
          <h3 className="text-white font-semibold mb-1">
            {t("Contact.cardChat", "Live Chat")}
          </h3>
          <p className="text-slate-400 text-sm">
            {t("Contact.cardChatHours", "Available 9AM - 6PM EST")}
          </p>
        </div>
        <div className="glass rounded-xl p-6 border border-white/10">
          <div className="text-sky-400 text-2xl mb-2">🌐</div>
          <h3 className="text-white font-semibold mb-1">
            {t("Contact.cardSocial", "Social")}
          </h3>
          <p className="text-slate-400 text-sm">@globaljobmatching</p>
        </div>
      </div>
    </>
  );
}
