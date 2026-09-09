"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  X,
  Trash2,
  Briefcase,
  MessageSquare,
  Info,
} from "lucide-react";
import { useNotifications } from "@/components/notification-provider";
import { useLocale } from "@/components/locale-provider";

const notificationColors: Record<string, string> = {
  application: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  message: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  system: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  default: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

function pickIcon(type: string) {
  if (type === "application") return Briefcase;
  if (type === "message") return MessageSquare;
  return Info;
}

function timeAgo(dateStr: string, locale: string): string {
  const d = new Date(dateStr).getTime();
  const diff = Math.max(0, Date.now() - d);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  try {
    return new Date(dateStr).toLocaleDateString(locale);
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
}

export function NotificationBell() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismiss,
  } = useNotifications();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl glass hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label={t("Nav.notifications", "Toggle notifications")}
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 max-w-[calc(100vw-2rem)] glass rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              {t("Nav.notifications", "Notifications")}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  {t("Notifications.markAllRead", "Mark all read")}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-3" />
                <p className="text-sm text-slate-400 dark:text-white/40">
                  {t("Notifications.empty", "No notifications yet")}
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = pickIcon(notif.type || "default");
                return (
                  <div
                    key={notif.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => markAsRead(notif.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") markAsRead(notif.id);
                    }}
                    className={`flex items-start gap-3 px-5 py-3 border-b border-black/5 dark:border-white/5 last:border-0 ${
                      notif.read
                        ? "opacity-60"
                        : "bg-blue-500/5 dark:bg-blue-500/5"
                    } hover:bg-black/3 dark:hover:bg-white/5 cursor-pointer`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        notificationColors[notif.type] ||
                        notificationColors.default
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">
                        {timeAgo(notif.createdAt, locale)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(notif.id);
                      }}
                      className="text-slate-300 dark:text-white/20 hover:text-red-400 transition-colors"
                      aria-label={t("Common.delete", "Dismiss")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-black/5 dark:border-white/10 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  notifications.forEach((n) => dismiss(n.id));
                }}
                className="text-xs text-slate-400 dark:text-white/30 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                {t("Notifications.clearAll", "Clear all")}
              </button>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                {t("Common.view", "View all")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
