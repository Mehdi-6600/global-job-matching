"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Briefcase,
  MessageSquare,
  Eye,
  Calendar,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import EmptyState from "../components/empty-state";
import Skeleton from "../components/skeleton";

type NotificationType = "application" | "message" | "interview" | "job_alert" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

const initialNotifications: Notification[] = [
  {
    id: "n1", type: "interview", title: "Interview Scheduled",
    description: "TechCorp invited you for an interview for Senior Frontend Developer role.",
    time: "10 min ago", read: false, actionUrl: "/my-applications",
  },
  {
    id: "n2", type: "application", title: "Application Viewed",
    description: "CloudScale viewed your application for Backend Engineer position.",
    time: "2 hours ago", read: false, actionUrl: "/my-applications",
  },
  {
    id: "n3", type: "message", title: "New Message",
    description: "Sarah from Creative Studio sent you a message regarding your application.",
    time: "5 hours ago", read: false, actionUrl: "/messages",
  },
  {
    id: "n4", type: "job_alert", title: "New Job Match",
    description: "A new DevOps Engineer position in Berlin matches your profile.",
    time: "1 day ago", read: true, actionUrl: "/jobs",
  },
  {
    id: "n5", type: "system", title: "Profile Updated",
    description: "Your profile information was successfully updated.",
    time: "2 days ago", read: true,
  },
  {
    id: "n6", type: "application", title: "Application Rejected",
    description: "Unfortunately, DataFlow decided not to move forward with your application.",
    time: "3 days ago", read: true, actionUrl: "/my-applications",
  },
  {
    id: "n7", type: "interview", title: "Interview Reminder",
    description: "Your interview with NextGen Labs is tomorrow at 2:00 PM UTC.",
    time: "3 days ago", read: true, actionUrl: "/my-applications",
  },
  {
    id: "n8", type: "message", title: "New Message",
    description: "You have a new message from TechCorp HR team.",
    time: "4 days ago", read: true, actionUrl: "/messages",
  },
];

const typeConfig: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  application: {
    icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20",
  },
  message: {
    icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20",
  },
  interview: {
    icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20",
  },
  job_alert: {
    icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  system: {
    icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20",
  },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(initialNotifications);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const filtered = filter === "all"
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="glass rounded-2xl p-3 mb-6 flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-xl" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 flex items-start gap-4">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-cyan-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Notifications</h1>
              <p className="text-slate-400 text-sm">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm transition-all"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        <div className="glass rounded-2xl p-3 mb-6 flex flex-wrap gap-2">
          {([
            { key: "all", label: "All" },
            { key: "application", label: "Applications" },
            { key: "message", label: "Messages" },
            { key: "interview", label: "Interviews" },
            { key: "job_alert", label: "Job Alerts" },
            { key: "system", label: "System" },
          ] as const).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((n) => {
              const config = typeConfig[n.type];
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  className={`glass rounded-2xl p-4 flex items-start gap-4 transition-all border ${
                    n.read
                      ? "border-transparent opacity-70"
                      : "border-cyan-500/10 bg-cyan-500/[0.02]"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-medium ${n.read ? "text-slate-300" : "text-white"}`}>
                        {n.title}
                      </h3>
                      <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">{n.description}</p>
                    {n.actionUrl && (
                      <a
                        href={n.actionUrl}
                        className="inline-flex items-center gap-1 text-cyan-400 text-xs mt-2 hover:underline"
                      >
                        View details
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-cyan-400 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You are all caught up!"
            action={
              filter !== "all"
                ? { label: "Show All", onClick: () => setFilter("all") }
                : undefined
            }
          />
        )}
      </div>
    </main>
  );
}
