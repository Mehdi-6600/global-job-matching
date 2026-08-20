"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  CheckCircle2,
  MessageSquare,
  Info,
  X,
  Check,
  Trash2,
} from "lucide-react";
import { useNotifications } from "@/components/notification-provider";
import { notificationColors } from "@/lib/notifications";

const iconMap = {
  briefcase: Briefcase,
  "check-circle": CheckCircle2,
  "message-square": MessageSquare,
  bell: Info,
};

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationBell() {
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
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl glass hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600 dark:text-white/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 glass rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/10">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-white/20 mx-auto mb-3" />
                <p className="text-sm text-slate-400 dark:text-white/40">
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notif) => {
                const Icon = iconMap[notif.type as keyof typeof iconMap] || Info;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors border-b border-black/5 dark:border-white/5 last:border-0 ${
                      notif.read
                        ? "opacity-60"
                        : "bg-blue-500/5 dark:bg-blue-500/5"
                    } hover:bg-black/3 dark:hover:bg-white/5`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${notificationColors[notif.type]}`}
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
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss(notif.id);
                      }}
                      className="text-slate-300 dark:text-white/20 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-black/5 dark:border-white/10">
              <button
                onClick={() => {
                  notifications.forEach((n) => dismiss(n.id));
                }}
                className="text-xs text-slate-400 dark:text-white/30 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
