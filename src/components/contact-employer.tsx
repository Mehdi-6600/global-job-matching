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

type Props = {
  jobId: string;
  jobTitle: string;
};

export function ContactEmployer({ jobId, jobTitle }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    `I am very interested in the "${jobTitle}" position and would welcome the chance to discuss how my background fits your team.\n\nThank you for your time.`
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
        setError(data.error || "Request failed");
        if (data.draft) setDraft(data.draft);
        setLoading(null);
        return;
      }

      if (mode === "draft") {
        setDraft(data.draft || "");
        setSuccess(
          data.hasEmployerEmail
            ? "Draft ready — copy and send from your email, or use Send below."
            : "Draft ready — no employer email on file; please send this yourself."
        );
      } else {
        setSuccess(`Email sent to ${data.sentTo}`);
        setConfirmSend(false);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy");
    }
  }

  return (
    <div className="glass rounded-2xl border border-white/10 p-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-white font-semibold text-sm">
          <Mail className="w-4 h-4 text-cyan-400" />
          Contact employer by email
        </span>
        <span className="text-slate-500 text-xs">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-slate-400 text-xs leading-relaxed">
            Write a short message. You can generate a <strong>draft</strong> to
            copy, or <strong>send</strong> via the platform (requires your
            confirmation). The employer can reply to your email.
          </p>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500/50 resize-none"
          />

          {error && (
            <div className="text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="text-emerald-400 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {draft && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Draft
                </span>
                <button
                  type="button"
                  onClick={copyDraft}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-black/30 rounded-xl p-3 max-h-48 overflow-auto border border-white/5">
                {draft}
              </pre>
            </div>
          )}

          <label className="flex items-start gap-2 text-slate-400 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={confirmSend}
              onChange={(e) => setConfirmSend(e.target.checked)}
              className="mt-0.5"
            />
            I confirm I want the platform to email the employer on my behalf
            (Send only).
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={loading !== null || message.trim().length < 30}
              onClick={() => run("draft")}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
            >
              {loading === "draft" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Draft only
            </button>
            <button
              type="button"
              disabled={
                loading !== null ||
                message.trim().length < 30 ||
                !confirmSend
              }
              onClick={() => run("send")}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading === "send" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
