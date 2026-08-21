import { Metadata } from "next";
import VerifyEmailHandler from "./VerifyEmailHandler";

export const metadata: Metadata = {
  title: "Verify Email | Global Job Matching",
  description: "Verify your email address for Global Job Matching.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full glass-card p-8 text-center">
        <VerifyEmailHandler token={token} />
      </div>
    </main>
  );
}
