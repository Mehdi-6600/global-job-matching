import { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | Global Job Matching",
  description: "Reset your Global Job Matching password.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enter your email and we will send you a reset link.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
