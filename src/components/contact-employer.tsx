"use client";

import { useState } from "react";
import {
  Mail,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Send,
  FileText,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Props = {
  jobId: string;
  jobTitle: string;
};

export function ContactEmployer({ jobId, jobTitle }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    t(
      "JobDetail.contactDefault",
      `I am very interested in the "${jobTitle}" position and would welcome the chance to discuss how my background fits your team.\n\nThank you for your time.`
    ).replace("{title}", jobTitle)
  );
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState<"draft" | "send" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [copied, setCopied] = useState(false);

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

      const data = await res.json();

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=/jobs/${jobId}`;
        return;
      }

      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : t("Common.error", "Request failed")
        );
        return;
      }

      if (mode === "draft") {
        setDraft(
          typeof data.draft === "string"
            ? data.draft
            : typeof data.message === "string"
              ? data.message
              : message
        );
        setSuccess(t("Common.success", "Draft ready"));
      } else {
        setSuccess(
          t("Common.success", "Message sent (or queued for the employer)")
        );
        setConfirmSend(false);
      }
    } catch {
      setError(t("Common.errorNetwork", "Network error"));
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
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-200 hover:bg-white/10 transition-colors"
      >
        <Mail className="w-4 h-4 text-cyan-400" />
        {t("JobDetail.contactEmployer", "Contact employer")}
      </button>

      {open && (
        <div className="mt-4 glass rounded-2xl border border-white/10 p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("Contact.subject", "Subject (optional)")}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              placeholder={jobTitle}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              {t("Contact.message", "Message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 resize-y"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {draft && (
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {t("Common.view", "Draft")}
                </span>
                <button
                  type="button"
                  onClick={copyDraft}
                  className="text-xs text-cyan-400 inline-flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copied
                    ? t("Common.success", "Copied")
                    : t("Common.save", "Copy")}
                </button>
              </div>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans">
                {draft}
              </pre>
            </div>
          )}

          <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmSend}
              onChange={(e) => setConfirmSend(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              {t(
                "JobDetail.contactConfirm",
                "I confirm I want to send this message to the employer (not only a draft)."
              )}
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!!loading}
              onClick={() => run("draft")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 disabled:opacity-50"
            >
              {loading === "draft" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {t("Common.view", "Generate draft")}
            </button>
            <button
              type="button"
              disabled={!!loading || !confirmSend}
              onClick={() => run("send")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-sm text-white font-medium disabled:opacity-50"
            >
              {loading === "send" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t("Common.submit", "Send")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
