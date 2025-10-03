export type NotificationType =
  | "INVESTIGATION_ASSIGNED"
  | "INVESTIGATION_STATUS"
  | "CHAT_MESSAGE"
  | "SYSTEM";

export interface NotificationDTO {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  actionUrl: string | null;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: NotificationDTO[];
  unreadCount: number;
}
