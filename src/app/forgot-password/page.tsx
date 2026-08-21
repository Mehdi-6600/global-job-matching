import { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | Global Job Matching",
  description: "Reset your Global Job Matching password.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full glass-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reset Password</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Enter your email and we will send you a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
