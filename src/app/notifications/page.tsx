"use client";

import { useState } from "react";
import {
  Bell,
  Briefcase,
  MessageSquare,
  CheckCircle2,
  Trash2,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";

type NotifType = "job" | "message" | "system";

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

const initialNotifs: Notification[] = [
  {
    id: "n1",
    type: "job",
    title: "Application Update",
    body: "Your application for Senior Frontend Developer at TechCorp is now under review.",
    time: "5 min ago",
    read: false,
    link: "/applications",
  },
  {
    id: "n2",
    type: "message",
    title: "New Message",
    body: "TechCorp recruiter sent you a message about your application.",
    time: "1 hour ago",
    read: false,
    link: "/messages",
  },
  {
    id: "n3",
    type: "job",
    title: "New Job Match",
    body: "We found a new job that matches your profile: Backend Engineer at DataFlow.",
    time: "3 hours ago",
    read: true,
    link: "/jobs/2",
  },
  {
    id: "n4",
    type: "system",
    title: "Profile Complete",
    body: "Great job! Your profile is 100% complete. Employers can now find you easily.",
    time: "1 day ago",
    read: true,
  },
  {
    id: "n5",
    type: "job",
    title: "Application Rejected",
    body: "Unfortunately, DevOps Engineer at CloudScale has been filled. Keep applying!",
    time: "2 days ago",
    read: true,
    link: "/jobs",
  },
];

const typeConfig: Record<NotifType, { icon: typeof Bell; color: string; bg: string }> = {
  job: { icon: Briefcase, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  message: { icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-500/10" },
  system: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

function NotifContent({ notif }: { notif: Notification }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className={`text-sm font-semibold ${!notif.read ? "text-white" : "text-slate-300"}`}>
          {notif.title}
          {!notif.read && (
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 ml-2" />
          )}
        </h3>
        <p className="text-slate-400 text-sm mt-1 leading-relaxed">{notif.body}</p>
        <p className="text-slate-500 text-xs mt-2">{notif.time}</p>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>(initialNotifs);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = filter === "all" ? notifs : notifs.filter((n) => !n.read);
  const unreadCount = notifs.filter((n) => !n.read).length;

  const markRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const removeNotif = (id: string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Notifications</h1>
            <p className="text-slate-400 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                  : "bg-white/5 text-slate-400 hover:text-white border border-white/10"
              }`}
            >
              {f === "all" ? "All" : "Unread"}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-3">
          {filtered.map((notif) => {
            const config = typeConfig[notif.type];
            const Icon = config.icon;

            return (
              <div
                key={notif.id}
                className={`glass rounded-2xl p-4 md:p-5 flex items-start gap-4 transition-all ${
                  !notif.read ? "border-l-2 border-l-cyan-500 bg-white/[0.02]" : ""
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  {notif.link ? (
                    <Link href={notif.link} className="block">
                      <NotifContent notif={notif} />
                    </Link>
                  ) : (
                    <NotifContent notif={notif} />
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => markRead(notif.id)}
                      className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeNotif(notif.id)}
                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No notifications here.</p>
          </div>
        )}
      </div>
    </main>
  );
}
