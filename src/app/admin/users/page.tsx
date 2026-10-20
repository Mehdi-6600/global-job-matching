"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";

interface User {
  id: string;
  name: string;
  email: string;
  role: "job_seeker" | "employer" | "admin";
  status: "active" | "pending" | "banned";
  joined: string;
  jobsPosted: number;
  applications: number;
}

const users: User[] = [
  { id: "u1", name: "Alice Johnson", email: "alice@example.com", role: "job_seeker", status: "active", joined: "Aug 20, 2026", jobsPosted: 0, applications: 12 },
  { id: "u2", name: "Bob Smith", email: "bob@example.com", role: "employer", status: "active", joined: "Aug 18, 2026", jobsPosted: 5, applications: 0 },
  { id: "u3", name: "Carol White", email: "carol@example.com", role: "job_seeker", status: "pending", joined: "Aug 15, 2026", jobsPosted: 0, applications: 3 },
  { id: "u4", name: "David Lee", email: "david@example.com", role: "employer", status: "active", joined: "Aug 10, 2026", jobsPosted: 8, applications: 0 },
  { id: "u5", name: "Eve Brown", email: "eve@example.com", role: "job_seeker", status: "banned", joined: "Jul 28, 2026", jobsPosted: 0, applications: 0 },
  { id: "u6", name: "Frank Miller", email: "frank@example.com", role: "admin", status: "active", joined: "Jul 15, 2026", jobsPosted: 0, applications: 0 },
];

const statusColors: Record<string, string> = {
  active: "bg-[var(--success-soft)] text-[var(--success)]",
  pending: "bg-[var(--warning-soft)] text-[var(--warning)]",
  banned: "bg-[var(--error-soft)] text-[var(--error)]",
};

export default function AdminUsersPage() {
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchQ && matchRole && matchStatus;
  });

  return (
    <div className="gjm-page px-4">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Common.back", "Back")}
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          {t("Nav.profile", "Users")}
        </h1>
        <p className="text-[var(--text-muted)] text-sm mb-6">
          {t("Dashboard.welcomeSub", "Manage platform users (demo data)")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Common.search", "Search...")}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)]"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] text-sm"
          >
            <option value="all">{t("Admin.roleAll", "All roles")}</option>
            <option value="job_seeker">{t("Admin.roleJobSeeker", "Job Seeker")}</option>
            <option value="employer">{t("Admin.roleEmployer", "Employer")}</option>
            <option value="admin">{t("Admin.roleAdmin", "Admin")}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] text-sm"
          >
            <option value="all">{t("Admin.statusAll", "All status")}</option>
            <option value="active">{t("Admin.statusActive", "Active")}</option>
            <option value="pending">{t("Admin.statusPending", "Pending")}</option>
            <option value="banned">{t("Admin.statusBanned", "Banned")}</option>
          </select>
        </div>

        <div className="glass rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-muted)] text-left">
                  <th className="p-4">{t("Auth.name", "Name")}</th>
                  <th className="p-4">{t("Auth.email", "Email")}</th>
                  <th className="p-4">{t("Profile.role", "Role")}</th>
                  <th className="p-4">{t("Common.status", "Status")}</th>
                  <th className="p-4">{t("JobDetail.posted", "Joined")}</th>
                  <th className="p-4 text-center">{t("Nav.jobs", "Jobs")}</th>
                  <th className="p-4 text-center">
                    {t("Nav.applications", "Apps")}
                  </th>
                  <th className="p-4">{t("Common.edit", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border-soft)] hover:bg-[var(--surface-2)]"
                  >
                    <td className="p-4 text-[var(--text-primary)]">{user.name}</td>
                    <td className="p-4 text-[var(--text-muted)]">{user.email}</td>
                    <td className="p-4 text-[var(--text-body)] text-xs">{user.role}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg ${statusColors[user.status]}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-muted)] text-xs">{user.joined}</td>
                    <td className="p-4 text-center text-[var(--text-body)]">
                      {user.jobsPosted}
                    </td>
                    <td className="p-4 text-center text-[var(--text-body)]">
                      {user.applications}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--success)]"
                          title={t("Common.confirm", "Approve")}
                          aria-label={t("Common.confirm", "Approve")}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--error)]"
                          title={t("Common.cancel", "Ban")}
                          aria-label={t("Common.cancel", "Ban")}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--warning)]"
                          title={t("Nav.admin", "Make Admin")}
                          aria-label={t("Nav.admin", "Make Admin")}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">
                {t("Common.noResults", "No users found")}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
            <p className="text-[var(--text-muted)] text-xs">
              {filtered.length} / {users.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
