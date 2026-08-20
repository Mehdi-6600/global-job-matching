export type NotificationType = "job_match" | "application_status" | "message" | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export function createNotification(
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>
): Notification {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    data,
  };
}

export const notificationIcons: Record<NotificationType, string> = {
  job_match: "briefcase",
  application_status: "check-circle",
  message: "message-square",
  system: "bell",
};

export const notificationColors: Record<NotificationType, string> = {
  job_match: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  application_status: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  message: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  system: "text-amber-400 bg-amber-500/10 border-amber-500/20",
};
