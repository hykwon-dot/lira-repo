import { prisma } from './prisma';

export type NotificationType =
  | 'INVESTIGATION_ASSIGNED'
  | 'INVESTIGATION_STATUS'
  | 'CHAT_MESSAGE'
  | 'SYSTEM';

export type NotificationCreateInput = {
  userId: number;
  type: NotificationType;
  title: string;
  message?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

const prismaClient = prisma as unknown as {
  notification: {
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
    count: (args: { where: Record<string, unknown> }) => Promise<number>;
  };
};

export async function createNotification(input: NotificationCreateInput) {
  return prismaClient.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      actionUrl: input.actionUrl ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function markNotificationsAsRead(userId: number, ids?: number[]) {
  const where = ids && ids.length > 0 ? { id: { in: ids } } : {};
  return prismaClient.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...where,
    },
    data: {
      readAt: new Date(),
    },
  });
}

export async function countUnreadNotifications(userId: number) {
  return prismaClient.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}
