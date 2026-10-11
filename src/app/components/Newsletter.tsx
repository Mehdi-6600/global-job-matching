"use client";

import { useState } from "react";
import { Mail, CheckCircle2, Sparkles } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { DynamicButton } from "@/components/ui/dynamic-button";
import { ProcessingStatus } from "@/components/ui/processing-status";

export default function Newsletter() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ||
            t("Common.newsletterErrorSubscribe", "Failed to subscribe")
        );
      } else {
        setSuccess(true);
        setEmail("");
        setName("");
      }
    } catch {
      setError(
        t("Common.newsletterErrorNetwork", "Network error. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gjm-newsletter-card">
      <div className="gjm-newsletter-head">
        <div className="gjm-newsletter-icon">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="gjm-newsletter-heading">
          <h3>{t("Common.newsletterTitle", "Stay Updated")}</h3>
          <p>
            {t(
              "Common.newsletterSubtitle",
              "Get the best jobs delivered to your inbox weekly"
            )}
          </p>
        </div>
      </div>

      {success ? (
        <div className="gjm-newsletter-success" role="status">
          <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p>
            {t(
              "Common.newsletterSuccess",
              "You are subscribed! Check your inbox soon."
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="gjm-newsletter-form">
          <input
            type="text"
            placeholder={t(
              "Common.newsletterNamePlaceholder",
              "Your name (optional)"
            )}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="gjm-newsletter-input gjm-newsletter-input--name"
            autoComplete="name"
          />
          <div className="gjm-newsletter-input-wrap">
            <Mail className="gjm-newsletter-mail-icon" aria-hidden="true" />
            <input
              type="email"
              required
              placeholder={t(
                "Common.newsletterEmailPlaceholder",
                "Enter your email"
              )}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="gjm-newsletter-input gjm-newsletter-input--email"
              autoComplete="email"
            />
          </div>
          <DynamicButton
            type="submit"
            variant="primary"
            status={loading ? "loading" : error ? "error" : "idle"}
            loadingLabel={t("Common.newsletterSubmitting", "Subscribing…")}
            errorLabel={t("Common.newsletterRetry", "Try again")}
            announce={false}
            fullWidth
          >
            {t("Common.newsletterSubscribe", "Subscribe")}
          </DynamicButton>
        </form>
      )}

      <ProcessingStatus
        state={error ? "error" : "idle"}
        title={error || undefined}
        className="gjm-newsletter-error"
      />

      <p className="gjm-newsletter-footnote">
        {t("Common.newsletterFooter", "No spam. Unsubscribe anytime.")}
      </p>
    </div>
  );
}
