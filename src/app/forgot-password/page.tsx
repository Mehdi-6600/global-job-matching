"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
        toast({ title: "Check your email", description: "Password reset link sent." });
      } else {
        toast({ title: "Error", description: "Failed to send reset link.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email and we will send you a reset link.
      </p>

      {sent ? (
        <div className="text-center py-8">
          <p className="text-green-500 font-medium">Reset link sent!</p>
          <p className="text-sm text-muted-foreground mt-2">Check your inbox.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-md border px-3 py-2 bg-background" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      )}

      <p className="mt-4 text-sm text-center text-muted-foreground">
        <Link href="/login" className="underline">Back to login</Link>
      </p>
    </div>
  );
}
