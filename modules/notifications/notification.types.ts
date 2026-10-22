export type NotificationItem = {
  id: string;
  isRead: boolean;
  createdAt: string;
  taskTitle: string | null;
  taskHref: string | null;
};
export type NotificationList = {
  items: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
};
