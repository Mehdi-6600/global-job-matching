"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("Nav");

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome, {session.user?.name || session.user?.email}!
      </p>
    </div>
  );
}
