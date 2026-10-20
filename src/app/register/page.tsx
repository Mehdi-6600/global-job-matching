"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { AuthShell } from "@/components/auth-shell";
import { safeCallbackOr } from "@/lib/url-safety";

const fieldClass =
  "h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] ps-10 pe-3.5 text-[0.9375rem] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] transition-colors focus-visible:border-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-primary-soft)]";

const labelClass =
  "mb-1.5 block text-[0.8125rem] font-semibold text-[var(--text-body)]";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();

  const callbackUrlParam = searchParams.get("callbackUrl");
  const callbackUrl = useMemo(
    () => safeCallbackOr(callbackUrlParam, "/dashboard"),
    [callbackUrlParam],
  );

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "JOB_SEEKER",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error || t("Auth.errors.generic", "Something went wrong"),
        );
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: formData.email.trim(),
        password: formData.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("registered", "1");
      loginUrl.searchParams.set("email", formData.email.trim());
      if (callbackUrl && callbackUrl !== "/dashboard") {
        loginUrl.searchParams.set("callbackUrl", callbackUrl);
      }
      router.push(loginUrl.pathname + "?" + loginUrl.searchParams.toString());
    } catch {
      setError(t("Auth.errors.network", "Network error. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const loginHref = useMemo(() => {
    if (!callbackUrlParam) return "/login";
    const safe = safeCallbackOr(callbackUrlParam, "/dashboard");
    return `/login?callbackUrl=${encodeURIComponent(safe)}`;
  }, [callbackUrlParam]);

  return (
    <AuthShell
      title={t("Auth.registerTitle", "Create Account")}
      subtitle={t(
        "Auth.registerSubtitle",
        "Start your journey to find your dream job",
      )}
      footer={
        <>
          {t("Auth.hasAccount", "Already have an account?")}{" "}
          <Link
            href={loginHref}
            className="font-semibold text-[var(--brand-primary-hover)] hover:underline"
          >
            {t("Auth.submitLogin", "Sign In")}
          </Link>
        </>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-[var(--radius-md)] border border-[var(--error-soft)] bg-[var(--error-soft)] px-3.5 py-3 text-[0.8125rem] font-medium text-[var(--error)]"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="register-name" className={labelClass}>
            {t("Auth.name", "Full Name")}
          </label>
          <div className="relative">
            <User
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              id="register-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("Auth.namePlaceholder", "John Doe")}
              required
              minLength={2}
              autoComplete="name"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-email" className={labelClass}>
            {t("Auth.email", "Email")}
          </label>
          <div className="relative">
            <Mail
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className={labelClass}>
            {t("Auth.password", "Password")}
          </label>
          <div className="relative">
            <Lock
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]"
            />
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={t("Auth.passwordHint", "At least 8 characters")}
              required
              minLength={8}
              autoComplete="new-password"
              className={`${fieldClass} pe-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center text-[var(--text-subtle)] transition-colors hover:text-[var(--text-primary)]"
              aria-label={
                showPassword
                  ? t("Auth.hidePassword", "Hide password")
                  : t("Auth.showPassword", "Show password")
              }
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="register-role" className={labelClass}>
            {t("Auth.role", "I am a...")}
          </label>
          <select
            id="register-role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="gjm-select"
          >
            <option value="JOB_SEEKER">{t("Auth.jobSeeker", "Job Seeker")}</option>
            <option value="EMPLOYER">{t("Auth.employer", "Employer")}</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--brand-action)] py-3 text-[0.9375rem] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--brand-action-hover)] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              {t("Auth.creatingAccount", "Creating account...")}
            </>
          ) : (
            t("Auth.submitRegister", "Create Account")
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="gjm-page">
          <div className="gjm-container flex justify-center py-20">
            <Loader2
              size={26}
              className="animate-spin text-[var(--brand-primary)]"
              aria-hidden="true"
            />
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
