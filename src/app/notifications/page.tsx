"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Trash2,
  Loader2,
  Briefcase,
  MessageSquare,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { messageFromApiError } from "@/lib/api-error-i18n";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  description?: string | null;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
}

function interpolate(
  template: string,
  replacements: Record<string, string | number>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(`{${key}}`).join(String(value));
  }
  return result;
}

export default function NotificationsPage() {
  const { t, locale } = useLocale();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const formatTime = useCallback(
    (dateStr: string): string => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return t("Common.timeAgo.justNow", "Just now");

      if (minutes < 60) {
        return interpolate(
          t("Common.timeAgo.minutes", "{count} minutes ago"),
          { count: minutes },
        );
      }
      if (hours < 24) {
        return interpolate(
          t("Common.timeAgo.hours", "{count} hours ago"),
          { count: hours },
        );
      }
      if (days < 7) {
        return interpolate(
          t("Common.timeAgo.days", "{count} days ago"),
          { count: days },
        );
      }
      return date.toLocaleDateString(locale);
    },
    [t, locale],
  );

  const typeConfig: Record<
    string,
    { icon: React.ReactNode; color: string; bg: string }
  > = {
    job: {
      icon: <Briefcase className="w-5 h-5" />,
      color: "text-[var(--brand-primary)]",
      bg: "bg-[var(--brand-primary-soft)] border-[var(--border)]",
    },
    message: {
      icon: <MessageSquare className="w-5 h-5" />,
      color: "text-[var(--brand-accent)]",
      bg: "bg-[var(--brand-accent-soft)] border-[var(--border)]",
    },
    application: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "text-[var(--success)]",
      bg: "bg-[var(--success-soft)] border-[var(--success)]",
    },
    profile: {
      icon: <User className="w-5 h-5" />,
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning-soft)] border-[var(--warning)]",
    },
    alert: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: "text-[var(--error)]",
      bg: "bg-[var(--error-soft)] border-[var(--error)]",
    },
  };

  function getTypeStyle(type: string) {
    return (
      typeConfig[type] || {
        icon: <Bell className="w-5 h-5" />,
        color: "text-[var(--text-muted)]",
        bg: "bg-white/5 border-white/10",
      }
    );
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/notifications";
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(messageFromApiError(res.status, data, t));
        return;
      }
      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : [],
      );
      setUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0,
      );
      setError("");
    } catch {
      setError(
        t("Common.errorNetwork", "Network error. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      setActionLoading(id);
      setError("");
      try {
        const res = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(messageFromApiError(res.status, data, t));
          return;
        }
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        setError(
          t("Common.errorNetwork", "Network error. Please try again."),
        );
      } finally {
        setActionLoading(null);
      }
    },
    [t],
  );

  const markAllAsRead = useCallback(async () => {
    setActionLoading("all");
    setError("");
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(messageFromApiError(res.status, data, t));
        return;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      setError(
        t("Common.errorNetwork", "Network error. Please try again."),
      );
    } finally {
      setActionLoading(null);
    }
  }, [t]);

  const deleteNotification = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setActionLoading(id);
      setError("");
      try {
        const res = await fetch(
          `/api/notifications?id=${encodeURIComponent(id)}`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(messageFromApiError(res.status, data, t));
          return;
        }
        const deleted = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (deleted && !deleted.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch {
        setError(
          t("Common.errorNetwork", "Network error. Please try again."),
        );
      } finally {
        setActionLoading(null);
      }
    },
    [notifications, t],
  );

  if (loading) {
    return (
      <div className="gjm-page">
        <Loader2 className="w-8 h-8 text-[var(--brand-accent)] animate-spin" />
      </div>
    );
  }

  const unreadLabel =
    unreadCount > 0
      ? interpolate(
          t(
            "Notifications.unreadCount",
            "{count} unread notifications",
          ),
          { count: unreadCount },
        )
      : t("Notifications.allCaughtUp", "You're all caught up!");

  return (
    <div className="gjm-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="glass rounded-2xl p-6 mb-6 border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-7 h-7 text-[var(--brand-accent)]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-[var(--error)] text-[var(--text-on-brand)] text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  {t("Notifications.title", "Notifications")}
                </h1>
                <p className="text-[var(--text-muted)] text-sm">{unreadLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  disabled={actionLoading === "all"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-accent-soft)] border border-[var(--brand-accent)] text-[var(--brand-accent)] hover:bg-[var(--brand-accent-soft)] disabled:opacity-50 transition-all text-sm font-medium"
                >
                  {actionLoading === "all" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCheck className="w-4 h-4" />
                  )}
                  {t("Notifications.markAllRead", "Mark all as read")}
                </button>
              )}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-body)] hover:bg-[var(--surface-3)] transition-all text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("Common.back", "Back")}
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[var(--error-soft)] border border-[var(--error)] text-[var(--error)] text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center border border-[var(--border)]">
              <Inbox className="w-14 h-14 text-[var(--text-subtle)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">
                {t("Notifications.emptyTitle", "No notifications yet")}
              </h3>
              <p className="text-[var(--text-muted)] text-sm">
                {t(
                  "Notifications.emptyDesc",
                  "When something happens, you'll see it here.",
                )}
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const style = getTypeStyle(notification.type);
              const isUnread = !notification.read;
              const bodyText =
                notification.message || notification.description || "";

              const content = (
                <div
                  className={`glass rounded-xl p-4 border transition-all group ${
                    isUnread
                      ? "border-[var(--brand-accent)] bg-[var(--brand-accent-soft)]"
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center shrink-0 ${style.color}`}
                    >
                      {style.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3
                            className={`font-medium text-sm ${
                              isUnread ? "text-[var(--brand-primary)]" : "text-[var(--text-body)]"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {bodyText && (
                            <p className="text-[var(--text-muted)] text-sm mt-0.5 leading-relaxed">
                              {bodyText}
                            </p>
                          )}
                          <span className="text-xs text-[var(--text-muted)] mt-2 inline-block">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                void markAsRead(notification.id);
                              }}
                              disabled={actionLoading === notification.id}
                              className="p-2 rounded-lg hover:bg-[var(--surface-3)] text-[var(--brand-accent)] transition-colors"
                              title={t(
                                "Notifications.markAsRead",
                                "Mark as read",
                              )}
                              aria-label={t(
                                "Notifications.markAsRead",
                                "Mark as read",
                              )}
                            >
                              {actionLoading === notification.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCheck className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) =>
                              void deleteNotification(notification.id, e)
                            }
                            disabled={actionLoading === notification.id}
                            className="p-2 rounded-lg hover:bg-[var(--error-soft)] text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                            title={t("Notifications.delete", "Delete")}
                            aria-label={t("Notifications.delete", "Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );

              if (notification.actionUrl) {
                return (
                  <Link
                    key={notification.id}
                    href={notification.actionUrl}
                    className="block"
                    onClick={() => {
                      if (isUnread) void markAsRead(notification.id);
                    }}
                  >
                    {content}
                  </Link>
                );
              }

              return <div key={notification.id}>{content}</div>;
            })
          )}
        </div>
      </div>
    </div>
  );
}
