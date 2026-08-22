"use client";

import { useState } from "react";
import {
  Search,
  UserCheck,
  UserX,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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

const roleLabels: Record<string, string> = {
  job_seeker: "Job Seeker",
  employer: "Employer",
  admin: "Admin",
};

const roleColors: Record<string, string> = {
  job_seeker: "bg-cyan-500/10 text-cyan-400",
  employer: "bg-purple-500/10 text-purple-400",
  admin: "bg-amber-500/10 text-amber-400",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  banned: "bg-red-500/10 text-red-400",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Users</h1>
            <p className="text-slate-400 text-sm">Manage platform users</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="glass px-3 py-1.5 rounded-lg">Total: {users.length}</span>
            <span className="glass px-3 py-1.5 rounded-lg text-emerald-400">Active: {users.filter((u) => u.status === "active").length}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
            >
              <option value="all" className="bg-slate-800">All Roles</option>
              <option value="job_seeker" className="bg-slate-800">Job Seeker</option>
              <option value="employer" className="bg-slate-800">Employer</option>
              <option value="admin" className="bg-slate-800">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-cyan-500/50 appearance-none"
            >
              <option value="all" className="bg-slate-800">All Status</option>
              <option value="active" className="bg-slate-800">Active</option>
              <option value="pending" className="bg-slate-800">Pending</option>
              <option value="banned" className="bg-slate-800">Banned</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">User</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Role</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Joined</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase text-center">Jobs</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase text-center">Apps</th>
                  <th className="p-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{user.name}</p>
                          <p className="text-slate-500 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-lg ${roleColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-lg ${statusColors[user.status]}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs">{user.joined}</td>
                    <td className="p-4 text-center text-slate-300 text-sm">{user.jobsPosted}</td>
                    <td className="p-4 text-center text-slate-300 text-sm">{user.applications}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Approve">
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Ban">
                          <UserX className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Make Admin">
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
              <Search className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No users found matching your filters.</p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <p className="text-slate-400 text-xs">Showing {filtered.length} of {users.length} users</p>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
