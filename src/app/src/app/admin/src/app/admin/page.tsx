"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("Nav");

  if (status === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    redirect("/login");
  }

  // Simple role check - you can expand this
  if (session.user?.role !== "admin") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">{t("admin")}</h1>
      <p className="text-muted-foreground mt-2">Welcome to the admin panel.</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold">Total Users</h3>
          <p className="text-2xl font-bold mt-2">124</p>
        </div>
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold">Total Jobs</h3>
          <p className="text-2xl font-bold mt-2">47</p>
        </div>
        <div className="border rounded-lg p-6">
          <h3 className="font-semibold">Applications</h3>
          <p className="text-2xl font-bold mt-2">312</p>
        </div>
      </div>
    </div>
  );
}
