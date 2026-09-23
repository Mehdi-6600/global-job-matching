import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/authz";
import { listAtsBoardsForAdmin } from "@/lib/jobs/ingestion/ats-seeding";
import SourceCompaniesClient from "./SourceCompaniesClient";

export const dynamic = "force-dynamic";

export default async function AdminSourceCompaniesPage() {
  const authz = await requireAdmin();
  if (!authz.ok) {
    redirect("/login?next=/admin/source-companies");
  }

  const { rows, summary } = await listAtsBoardsForAdmin();

  return (
    <SourceCompaniesClient
      initialRows={rows}
      initialSummary={summary}
    />
  );
}
