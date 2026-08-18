"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      toast({ title: "Error", description: "Invalid email or password", variant: "destructive" });
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-bold mb-6">Sign In</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input name="email" type="email" required className="w-full rounded-md border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input name="password" type="password" required className="w-full rounded-md border px-3 py-2" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "..." : "Sign In"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="underline">
          Create Account
        </Link>
      </p>
    </div>
  );
}
