import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getPrismaClient } from "@/lib/prisma";

type NotificationRecord = {
  id: number;
  type: string;
  title: string;
  message: string | null;
  actionUrl: string | null;
  metadata: unknown;
  readAt: Date | null;
  createdAt: Date;
};

type NotificationDelegate = {
  findMany: (args: {
    where: Record<string, unknown>;
    orderBy: Record<string, string>;
    take: number;
  }) => Promise<NotificationRecord[]>;
  count: (args: { where: Record<string, unknown> }) => Promise<number>;
  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
};

async function getNotificationClient(): Promise<NotificationDelegate> {
  const prisma = await getPrismaClient();
  return (prisma as unknown as { notification: NotificationDelegate }).notification;
}

function serialize(record: NotificationRecord) {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    actionUrl: record.actionUrl,
    metadata: record.metadata ?? null,
    readAt: record.readAt ? record.readAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 12;
  const sinceParam = url.searchParams.get("since");

  const where: Record<string, unknown> = {
    userId: auth.user.id,
  };

  if (unreadOnly) {
    where.readAt = null;
  }

  if (sinceParam) {
    const sinceDate = new Date(sinceParam);
    if (!Number.isNaN(sinceDate.getTime())) {
      where.createdAt = { gt: sinceDate };
    }
  }

  const notificationClient = await getNotificationClient();
  const [notifications, unreadCount] = await Promise.all([
    notificationClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    notificationClient.count({
      where: {
        userId: auth.user.id,
        readAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    notifications: (notifications as NotificationRecord[]).map(serialize),
    unreadCount,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const payloadRecord = (typeof payload === "object" && payload !== null) ? (payload as Record<string, unknown>) : {};

  const markAll = payloadRecord.markAll === true;
  const idsRaw = Array.isArray(payloadRecord.ids) ? payloadRecord.ids : [];
  const ids = idsRaw
    .map((value: unknown) => Number(value))
    .filter((value: number) => Number.isInteger(value) && value > 0);

  if (!markAll && ids.length === 0) {
    return NextResponse.json({ error: "NO_TARGETS" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    userId: auth.user.id,
    readAt: null,
  };

  if (!markAll) {
    where.id = { in: ids };
  }

  const notificationClient = await getNotificationClient();
  const result = await notificationClient.updateMany({
    where,
    data: {
      readAt: new Date(),
    },
  });

  return NextResponse.json({ updated: result.count });
}
