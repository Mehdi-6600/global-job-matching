"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { messageFromAiHttpError } from "@/lib/ai-client-errors";
import { DynamicButton } from "@/components/ui/dynamic-button";
import { ProcessingStatus } from "@/components/ui/processing-status";
import { useTransientFeedback } from "@/hooks/use-transient-feedback";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Tone = "professional" | "confident" | "concise";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  targetRole: string;
  summary: string;
  skills: string;
  experience: string;
  education: string;
  languages: string;
  tone: Tone;
  saveToProfile: boolean;
}

type ResumeSource = "ai" | "template" | "";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_RESUME_CHARS = 20_000;

const emptyForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  targetRole: "",
  summary: "",
  skills: "",
  experience: "",
  education: "",
  languages: "",
  tone: "professional",
  saveToProfile: true,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {};
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/**
 * Extract the profile-ish object from various API response shapes:
 *   { profile: {...} }
 *   { user: {...} }
 *   { ...directFields }
 */
function extractProfile(data: unknown): Record<string, unknown> {
  const root = asRecord(data);
  const profile = asRecord(root.profile);
  const user = asRecord(root.user);
  if (Object.keys(profile).length) return profile;
  if (Object.keys(user).length) return user;
  return root;
}

/**
 * Convert an unknown value to a string suitable for a form field.
 * - Arrays are joined by ", "
 * - Strings pass through
 * - Everything else becomes ""
 */
function toFieldString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return "";
}

/**
 * HTML-escape a string before injecting into a printed document.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Banner({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    kind === "error"
      ? "bg-[var(--error-soft)] border-[var(--error)] text-[var(--error)]"
      : "bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]";
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`mb-4 p-3 rounded-xl border text-sm flex items-center gap-2 ${styles}`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ResumeBuilderPage() {
  const { t } = useLocale();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [resume, setResume] = useState("");
  const [source, setSource] = useState<ResumeSource>("");
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  // Brief button feedback after generating. The banners stay as the source of truth.
  const [buttonFeedback, flashButton] = useTransientFeedback<
    "success" | "error"
  >();

  /* -------- Prefill from /api/profile -------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/resume-builder";
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const p = extractProfile(data);
        setForm((prev) => ({
          ...prev,
          fullName: str(p.name, prev.fullName),
          email: str(p.email, prev.email),
          phone: str(p.phone, ""),
          location: str(p.location, ""),
          targetRole: str(p.title ?? p.headline, ""),
          summary: str(p.bio, ""),
          skills: toFieldString(p.skills) || prev.skills,
          experience: str(p.experience, ""),
          education: str(p.education, ""),
        }));
      } catch {
        /* prefill is best-effort */
      } finally {
        if (!cancelled) setPrefillLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------- Input handlers -------- */
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value, type } = e.target;
      if (type === "checkbox") {
        const checked = (e.target as HTMLInputElement).checked;
        setForm((prev) => ({ ...prev, [name]: checked }));
      } else {
        setForm((prev) => ({ ...prev, [name]: value }));
      }
      setSuccess("");
      setError("");
    },
    [],
  );

  /* -------- Generate -------- */
  const handleGenerate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (loading) return;

      setLoading(true);
      setError("");
      setSuccess("");
      setCopied(false);

      try {
        const res = await fetch("/api/resume/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });

        if (res.status === 401) {
          window.location.href = "/login?callbackUrl=/resume-builder";
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            messageFromAiHttpError(
              res.status,
              data as { error?: string; code?: string },
              (k, fb) => t(k, fb),
            ),
          );
          flashButton("error");
          return;
        }

        const d = asRecord(data);
        setResume(str(d.resume).slice(0, MAX_RESUME_CHARS));
        const src = str(d.source);
        setSource(
          src === "ai" || src === "template" ? (src as ResumeSource) : "",
        );
        setSuccess(str(d.message) || t("Common.success", "Resume ready"));
        flashButton("success");
      } catch {
        setError(t("Common.errorNetwork", "Network error"));
        flashButton("error");
      } finally {
        setLoading(false);
      }
    },
    [form, loading, t, flashButton],
  );

  /* -------- Copy -------- */
  const handleCopy = useCallback(async () => {
    if (!resume) return;
    try {
      await navigator.clipboard.writeText(resume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("Common.error", "Could not copy to clipboard"));
    }
  }, [resume, t]);

  /* -------- Print -------- */
  const handlePrint = useCallback(() => {
    if (!resume) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const printTitle = t("Resume.printTitle", "Resume");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(printTitle)}</title>
    <style>
      body {
        font-family: Georgia, serif;
        max-width: 720px;
        margin: 40px auto;
        white-space: pre-wrap;
        line-height: 1.5;
        color: #111;
      }
    </style>
  </head>
  <body>${escapeHtml(resume)}</body>
</html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Wait a tick so styles/layout settle before printing.
    setTimeout(() => w.print(), 0);
  }, [resume, t]);

  /* -------- Derived -------- */
  const canSubmit = useMemo(
    () => !loading && form.fullName.trim().length >= 2,
    [loading, form.fullName],
  );

  const sourceLabel = useMemo(() => {
    if (source === "ai") return t("Resume.sourceAi", "AI");
    if (source === "template") return t("Resume.sourceTemplate", "Template");
    return "";
  }, [source, t]);

  /* -------- Prefill loading screen -------- */
  if (prefillLoading) {
    return (
      <div className="gjm-page flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
      </div>
    );
  }

  /* -------- Render -------- */
  return (
    <div className="gjm-page px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("Common.back", "Back to Dashboard")}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-7 h-7 text-[var(--brand-primary)]" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("Resume.title", "AI Resume Builder")}
            </h1>
            <p className="text-[var(--text-muted)] text-sm">
              {t(
                "Resume.subtitle",
                "Fill your details — generate a professional resume",
              )}
            </p>
          </div>
        </div>

        {error && <Banner kind="error">{error}</Banner>}
        {success && (
          <Banner kind="success">
            {success}
            {sourceLabel && (
              <span className="text-[var(--text-muted)]">({sourceLabel})</span>
            )}
          </Banner>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* -------- Form -------- */}
          <form
            onSubmit={handleGenerate}
            className="glass rounded-2xl p-6 border border-[var(--border)] space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder={t("Settings.name", "Full name") + " *"}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)]"
              />
              <input
                name="targetRole"
                value={form.targetRole}
                onChange={handleChange}
                autoComplete="organization-title"
                placeholder={t("Settings.headline", "Target role")}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder={t("Settings.email", "Email")}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none"
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder={t("Settings.phone", "Phone")}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none"
              />
            </div>

            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              autoComplete="address-level2"
              placeholder={t("Settings.location", "Location")}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none"
            />

            <textarea
              name="summary"
              value={form.summary}
              onChange={handleChange}
              rows={3}
              placeholder={t("Settings.bio", "Short summary / career goal")}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none resize-none"
            />

            <textarea
              name="skills"
              value={form.skills}
              onChange={handleChange}
              rows={2}
              placeholder={t("Jobs.tagPlaceholder", "Skills")}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none resize-none"
            />

            <textarea
              name="experience"
              value={form.experience}
              onChange={handleChange}
              rows={4}
              placeholder={t(
                "Resume.experiencePlaceholder",
                "Work experience (roles, years, achievements)",
              )}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none resize-none"
            />

            <textarea
              name="education"
              value={form.education}
              onChange={handleChange}
              rows={2}
              placeholder={t("Resume.educationPlaceholder", "Education")}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm outline-none resize-none"
            />

            <input
              name="languages"
              value={form.languages}
              onChange={handleChange}
              placeholder={t(
                "Resume.languagesPlaceholder",
                "Languages (e.g. English, Persian)",
              )}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] text-sm outline-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[var(--text-muted)] text-xs">
                {t("Resume.tone", "Tone")}
              </label>
              <select
                name="tone"
                value={form.tone}
                onChange={handleChange}
                className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none"
              >
                <option value="professional">
                  {t("Resume.toneProfessional", "Professional")}
                </option>
                <option value="confident">
                  {t("Resume.toneConfident", "Confident")}
                </option>
                <option value="concise">
                  {t("Resume.toneConcise", "Concise")}
                </option>
              </select>
              <label className="inline-flex items-center gap-2 text-[var(--text-muted)] text-xs ms-auto">
                <input
                  type="checkbox"
                  name="saveToProfile"
                  checked={form.saveToProfile}
                  onChange={handleChange}
                  className="rounded border-[var(--border-strong)]"
                />
                {t("Resume.saveToProfile", "Save note to profile")}
              </label>
            </div>

            <DynamicButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              // While loading, DynamicButton uses aria-disabled so focus stays put.
              disabled={!canSubmit && !loading}
              status={loading ? "loading" : (buttonFeedback ?? "idle")}
              icon={<Sparkles className="h-4 w-4" />}
              loadingLabel={t("Resume.generating", "Generating...")}
              successLabel={t("Common.success", "Success")}
              errorLabel={t("Common.error", "Something went wrong")}
            >
              {t("Resume.generate", "Generate Resume")}
            </DynamicButton>
          </form>

          {/* -------- Preview -------- */}
          <div className="glass rounded-2xl p-6 border border-[var(--border)] flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">
                {t("Common.view", "Preview")}
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  disabled={!resume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] text-xs disabled:opacity-40"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied
                    ? t("Common.success", "Copied")
                    : t("Common.save", "Copy")}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!resume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] text-xs disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {t("Common.print", "Print")}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <ProcessingStatus
                  state="processing"
                  announce={false}
                  title={t("Resume.generating", "Generating...")}
                  className="max-w-sm"
                />
              </div>
            ) : resume ? (
              <pre
                key={resume}
                className="gjm-feed-in flex-1 whitespace-pre-wrap text-[var(--text-primary)] text-sm leading-relaxed overflow-auto font-sans"
              >
                {resume}
              </pre>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm text-center px-4">
                {t(
                  "Resume.previewEmpty",
                  "Your generated resume will appear here",
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
