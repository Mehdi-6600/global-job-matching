import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import SyncClient from "./SyncClient";

export const dynamic = "force-dynamic";

export default async function AdminSyncPage() {
  const authz = await requireAdmin();
  if (!authz.ok) {
    redirect("/login?next=/admin/sync");
  }
  return <SyncClient />;
}
