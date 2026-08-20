"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((res) => {
        if (res.ok) setStatus("success");
        else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="mx-auto max-w-sm py-20 text-center">
      {status === "loading" && (
        <>
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </>
      )}

      {status === "success" && (
        <>
          <h1 className="text-2xl font-bold text-green-500 mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">Your email has been successfully verified.</p>
          <Link href="/login">
            <Button>Go to Login</Button>
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <h1 className="text-2xl font-bold text-red-500 mb-2">Verification Failed</h1>
          <p className="text-muted-foreground mb-6">
            The verification link is invalid or has expired.
          </p>
          <Link href="/login">
            <Button variant="outline">Back to Login</Button>
          </Link>
        </>
      )}
    </div>
  );
}
