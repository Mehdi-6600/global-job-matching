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
    <div className="gjm-page flex min-h-[70vh] items-center justify-center">
      <div className="gjm-container">
        <div className="mx-auto w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-2)] sm:p-8">
        <VerifyEmailHandler
          status={result.status}
          errorCode={result.status === "error" ? result.errorCode : undefined}
        />
        </div>
      </div>
    </div>
  );
}
