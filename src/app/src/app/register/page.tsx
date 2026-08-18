"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("jobSeeker");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (res.ok) {
      await signIn("credentials", { email, password, redirect: false });
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || t("errors.generic"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">{t("registerTitle")}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("name")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-1"
              required
            />
          </div>
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
          <div>
            <label className="text-sm font-medium">{t("role")}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border rounded-md px-3 py-2 mt-1"
            >
              <option value="jobSeeker">{t("jobSeeker")}</option>
              <option value="employer">{t("employer")}</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {t("submitRegister")}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("loginTitle")}
          </Link>
        </p>
      </div>
    </div>
  );
}
