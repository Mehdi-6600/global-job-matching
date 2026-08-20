"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { Notification, createNotification, NotificationType } from "@/lib/notifications";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: NotificationType, title: string, message: string, data?: Record<string, any>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("globaljob_notifications");
      if (saved) setNotifications(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("globaljob_notifications", JSON.stringify(notifications));
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, data?: Record<string, any>) => {
      const notif = createNotification(type, title, message, data);
      setNotifications((prev) => [notif, ...prev].slice(0, 100)); // keep last 100
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        dismiss,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside NotificationProvider");
  return ctx;
}
