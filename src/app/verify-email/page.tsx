import { Metadata } from "next";
import VerifyEmailHandler from "./VerifyEmailHandler";

export const metadata: Metadata = {
  title: "Verify Email | Global Job Matching",
  description: "Verify your email address for Global Job Matching.",
};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <main className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full glass-card p-8 text-center">
        <VerifyEmailHandler token={searchParams.token} />
      </div>
    </main>
  );
}
