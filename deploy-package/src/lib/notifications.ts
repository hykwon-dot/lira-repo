import { getPrismaClient } from './prisma';
import { Prisma } from '@prisma/client';

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

export async function createNotification(input: NotificationCreateInput) {
  const prisma = await getPrismaClient();
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      actionUrl: input.actionUrl ?? null,
      metadata:
        input.metadata === null
          ? Prisma.JsonNull
          : input.metadata !== undefined
            ? (input.metadata as Prisma.InputJsonValue)
            : undefined,
    },
  });
}

export async function markNotificationsAsRead(userId: number, ids?: number[]) {
  const where = ids && ids.length > 0 ? { id: { in: ids } } : {};
  const prisma = await getPrismaClient();
  return prisma.notification.updateMany({
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
  const prisma = await getPrismaClient();
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}
