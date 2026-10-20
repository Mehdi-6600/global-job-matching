"use client";

import ContactForm from "./ContactForm";
import { useLocale } from "@/components/locale-provider";

export default function ContactContent() {
  const { t } = useLocale();

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
          {t("Contact.title", "Contact Us")}
        </h1>
        <p className="text-[var(--text-muted)] max-w-lg mx-auto">
          {t(
            "Contact.subtitle",
            "Have a question, suggestion, or need help? We would love to hear from you."
          )}
        </p>
      </div>

      <div className="glass rounded-2xl p-8 sm:p-10 border border-[var(--border)] shadow-xl">
        <ContactForm />
      </div>

      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="glass rounded-xl p-6 border border-[var(--border)]">
          <div className="text-[var(--info)] text-2xl mb-2">📧</div>
          <h3 className="text-[var(--text-primary)] font-semibold mb-1">
            {t("Contact.cardEmail", "Email")}
          </h3>
          <p className="text-[var(--text-muted)] text-sm">support@globaljobmatching.com</p>
        </div>
        <div className="glass rounded-xl p-6 border border-[var(--border)]">
          <div className="text-[var(--info)] text-2xl mb-2">💬</div>
          <h3 className="text-[var(--text-primary)] font-semibold mb-1">
            {t("Contact.cardChat", "Live Chat")}
          </h3>
          <p className="text-[var(--text-muted)] text-sm">
            {t("Contact.cardChatHours", "Available 9AM - 6PM EST")}
          </p>
        </div>
        <div className="glass rounded-xl p-6 border border-[var(--border)]">
          <div className="text-[var(--info)] text-2xl mb-2">🌐</div>
          <h3 className="text-[var(--text-primary)] font-semibold mb-1">
            {t("Contact.cardSocial", "Social")}
          </h3>
          <p className="text-[var(--text-muted)] text-sm">@globaljobmatching</p>
        </div>
      </div>
    </>
  );
}
