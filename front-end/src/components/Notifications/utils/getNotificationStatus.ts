// utils/notificationStatus.ts
export type NotificationStatus = "draft" | "scheduled" | "sent";

export function getNotificationStatus(n: {
  sentAt?: any;
  scheduledAt?: any;
}): NotificationStatus {
  if (n.sentAt) return "sent";
  if (n.scheduledAt) return "scheduled";
  return "draft";
}
