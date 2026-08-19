import { db } from "@/lib/db";

export default async function AdminPage() {
  const stats = await db.$transaction([
    db.user.count(),
    db.jobListing.count(),
    db.payment.count({ where: { status: "PENDING" } }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats[0]}</div>
          <div className="text-sm text-muted-foreground">Users</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats[1]}</div>
          <div className="text-sm text-muted-foreground">Listings</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats[2]}</div>
          <div className="text-sm text-muted-foreground">Pending Payments</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-2xl font-bold">{stats[3]}</div>
          <div className="text-sm text-muted-foreground">Open Reports</div>
        </div>
      </div>
    </div>
  );
}
