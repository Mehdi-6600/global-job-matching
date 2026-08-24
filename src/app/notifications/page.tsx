"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Trash2,
  Loader2,
  Briefcase,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  Inbox,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  job: {
    icon: <Briefcase className="w-4 h-4" />,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  message: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
  application: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  alert: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return `${Math.floor(days / 30)} months ago`;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = () => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const markAsRead = async (id?: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { readAll: true }),
    });
    fetchNotifications();
  };

  const deleteNotification = async (id?: string) => {
    const url = id ? `/api/notifications?id=${id}` : "/api/notifications";
    await fetch(url, { method: "DELETE" });
    fetchNotifications();
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading notifications...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
              <Bell className="w-7 h-7 text-cyan-400" />
              Notifications
            </h1>
            <p className="text-slate-400 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAsRead()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-medium border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Delete all notifications?")) deleteNotification();
                }}
                className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                title="Delete all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-white font-medium mb-1">No notifications yet</p>
            <p className="text-slate-400 text-sm">
              We'll notify you about job updates, applications, and messages.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.alert;
              return (
                <div
                  key={notif.id}
                  className={`glass rounded-2xl p-5 border transition-all ${
                    notif.read
                      ? "border-transparent opacity-70"
                      : "border-cyan-500/20 bg-cyan-500/5"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${config.color}`}
                    >
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={`text-sm font-semibold ${notif.read ? "text-slate-300" : "text-white"}`}>
                            {notif.title}
                          </h3>
                          <p className="text-slate-400 text-xs mt-0.5">{notif.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="p-1.5 rounded-lg bg-white/5 text-cyan-400 hover:bg-cyan-500/10 transition-all"
                              title="Mark as read"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-slate-500">{timeAgo(notif.createdAt)}</span>
                        {notif.actionUrl && (
                          <Link
                            href={notif.actionUrl}
                            className="flex items-center gap-1 text-cyan-400 text-xs hover:underline"
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
