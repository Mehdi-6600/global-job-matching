"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LoginPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("errors.invalidCredentials"));
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">{t("loginTitle")}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-1"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-1"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {t("submitLogin")}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t("noAccount")}{" "}
          <Link href="/register" className="text-primary hover:underline">
            {t("registerTitle")}
          </Link>
        </p>
      </div>
    </div>
  );
}
