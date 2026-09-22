import { Metadata } from "next";
import VerifyEmailHandler from "./VerifyEmailHandler";
import { consumeEmailVerificationToken } from "@/lib/auth/tokens";

export const metadata: Metadata = {
  title: "Verify Email | Global Job Matching",
  description: "Verify your email address for Global Job Matching.",
};

export const dynamic = "force-dynamic";

type VerifyErrorCode = "INVALID" | "EXPIRED" | "UNKNOWN";

type VerifyResult =
  | { status: "success" }
  | { status: "error"; errorCode: VerifyErrorCode }
  | { status: "missing" };

async function tryVerify(
  token: string | undefined,
  email: string | undefined,
): Promise<VerifyResult> {
  if (!token || !email) {
    return { status: "missing" };
  }

  try {
    const result = await consumeEmailVerificationToken(token, email);
    if (result.ok) {
      return { status: "success" };
    }
    return { status: "error", errorCode: result.errorCode };
  } catch (err) {
    console.error("[verify-email page] consume failed:", err);
    return { status: "error", errorCode: "UNKNOWN" };
  }
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;
  const result = await tryVerify(token, email);

  return (
    <main className="min-h-screen bg-[var(--page-bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full glass-card p-8 text-center">
        <VerifyEmailHandler
          status={result.status}
          errorCode={result.status === "error" ? result.errorCode : undefined}
        />
      </div>
    </main>
  );
}
