"use client";

import { useState } from "react";
import {
  Mail,
  Copy,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { messageFromApiError } from "@/lib/api-error-i18n";
import { DynamicButton } from "@/components/ui/dynamic-button";
import { useTransientFeedback } from "@/hooks/use-transient-feedback";

type Props = {
  jobId: string;
  jobTitle: string;
};

export function ContactEmployer({ jobId, jobTitle }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const defaultMessage = t(
    "JobDetail.contactDefault",
    'I am very interested in the "{title}" position and would welcome the chance to discuss how my background fits your team.\n\nThank you for your time.',
  ).split("{title}").join(jobTitle);

  const [message, setMessage] = useState(defaultMessage);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [copied, setCopied] = useState(false);
  // Brief send feedback on the button. The banners remain the detailed message.
  const [sendFeedback, flashSend] = useTransientFeedback<"success" | "error">();

  async function run(mode: "draft" | "send") {
    setLoading(mode);
    setError("");
    setSuccess("");
    setCopied(false);

    try {
      const res = await fetch(`/api/jobs/${jobId}/contact-employer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          message,
          subject: subject || undefined,
          confirmSend: mode === "send" ? confirmSend : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=/jobs/${jobId}`;
        return;
      }

      if (!res.ok) {
        setError(messageFromApiError(res.status, data, t));
        if (mode === "send") flashSend("error");
        if (typeof data.draft === "string") {
          setDraft(data.draft);
        }
        return;
      }

      if (mode === "draft") {
        setDraft(
          typeof data.draft === "string"
            ? data.draft
            : typeof data.message === "string"
              ? data.message
              : message,
        );
        setSuccess(t("JobDetail.contactDraftReady", "Draft ready"));
      } else {
        setSuccess(
          t("JobDetail.contactSent", "Message sent to the employer."),
        );
        flashSend("success");
        setConfirmSend(false);
      }
    } catch {
      setError(t("Common.errorNetwork", "Network error"));
      if (mode === "send") flashSend("error");
    } finally {
      setLoading(null);
    }
  }

  async function copyDraft() {
    const text = draft || message;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("Common.error", "Could not copy"));
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-sm text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-colors"
      >
        <Mail className="w-4 h-4 text-[var(--brand-primary)]" />
        {t("JobDetail.contactEmployer", "Contact employer")}
      </button>

      {open && (
        <div className="mt-4 glass rounded-2xl border border-[var(--border)] p-5 space-y-4">
          <div>
            <label
              htmlFor="contact-subject"
              className="block text-xs text-[var(--text-muted)] mb-1.5"
            >
              {t("JobDetail.contactSubject", "Subject (optional)")}
            </label>
            <input
              id="contact-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
              placeholder={jobTitle}
            />
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block text-xs text-[var(--text-muted)] mb-1.5"
            >
              {t("JobDetail.contactMessage", "Message")}
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-xl bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] resize-y"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-[var(--error)]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 text-sm text-[var(--success)]">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {draft && (
            <div className="rounded-xl bg-black/20 border border-[var(--border)] p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {t("JobDetail.contactDraft", "Draft")}
                </span>
                <button
                  type="button"
                  onClick={copyDraft}
                  className="text-xs text-[var(--brand-primary)] inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied
                    ? t("Common.copied", "Copied")
                    : t("JobDetail.contactCopy", "Copy")}
                </button>
              </div>
              <pre className="text-xs text-[var(--text-body)] whitespace-pre-wrap font-sans">
                {draft}
              </pre>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={confirmSend}
              onChange={(e) => setConfirmSend(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t(
                "JobDetail.contactConfirm",
                "I confirm I want to send this message to the employer (not only a draft).",
              )}
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <DynamicButton
              variant="secondary"
              size="sm"
              disabled={loading === "send"}
              onClick={() => run("draft")}
              status={loading === "draft" ? "loading" : "idle"}
              icon={<FileText className="h-4 w-4" />}
              loadingLabel={t("Common.loading", "Loading...")}
            >
              {t("JobDetail.contactGenerateDraft", "Generate draft")}
            </DynamicButton>
            <DynamicButton
              variant="primary"
              size="sm"
              disabled={!confirmSend || loading === "draft"}
              onClick={() => run("send")}
              status={loading === "send" ? "loading" : (sendFeedback ?? "idle")}
              icon={<Send className="h-4 w-4" />}
              mirrorIconInRtl
              loadingLabel={t("Common.loading", "Loading...")}
              successLabel={t("Common.success", "Success")}
              errorLabel={t("Common.error", "Something went wrong")}
            >
              {t("JobDetail.contactSend", "Send")}
            </DynamicButton>
          </div>
        </div>
      )}
    </div>
  );
}
