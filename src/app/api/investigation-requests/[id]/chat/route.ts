import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { requireCapability } from "@/lib/authz";
import type { Role } from "@/lib/rbac";
import { ensureAuthResult } from "../../shared";
import { createNotification } from "@/lib/notifications";

const MESSAGE_PAGE_SIZE = 100;

const CHAT_ROOM_INCLUDE = {
  messages: {
    orderBy: { createdAt: "asc" as const },
    take: MESSAGE_PAGE_SIZE,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  },
} as const;

function isAdmin(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function ensureParticipant(role: Role, ownerId: number, actorId: number, investigatorUserId?: number | null) {
  if (isAdmin(role)) return true;
  if (ownerId === actorId) return true;
  if (role === "INVESTIGATOR" && investigatorUserId && investigatorUserId === actorId) return true;
  return false;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function resolveRequest(prisma: PrismaClient, requestId: number) {
  return prisma.investigationRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      investigator: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      chatRoom: {
        include: CHAT_ROOM_INCLUDE,
      },
      timeline: {
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

type RequestRecord = NonNullable<Awaited<ReturnType<typeof resolveRequest>>>;
type ChatRoomRecord = Prisma.InvestigationChatRoomGetPayload<{ include: typeof CHAT_ROOM_INCLUDE }>;
type ChatMessageRecord = ChatRoomRecord["messages"][number];
type TimelineEntryRecord = RequestRecord["timeline"][number];

async function ensureChatRoom(prisma: PrismaClient, request: RequestRecord): Promise<ChatRoomRecord | null> {
  if (request.chatRoom) {
    return request.chatRoom;
  }
  if (!request.investigatorId || !request.investigator?.user) {
    return null;
  }
  const created = await prisma.investigationChatRoom.create({
    data: {
      requestId: request.id,
      customerId: request.userId,
      investigatorUserId: request.investigator.user.id,
    },
    include: CHAT_ROOM_INCLUDE,
  });
  return created;
}

function serializeMessage(message: ChatMessageRecord) {
  return {
    id: message.id,
    content: message.content ?? "",
    attachments: message.attachments ?? null,
    sender: message.sender
      ? {
          id: message.sender.id,
          name: message.sender.name,
          email: message.sender.email,
          role: message.sender.role,
        }
      : null,
    createdAt: toIsoString(message.createdAt) ?? new Date().toISOString(),
  };
}

function serializeRoom(room: ChatRoomRecord | null) {
  if (!room) return null;
  return {
    id: room.id,
    requestId: room.requestId,
    customerId: room.customerId,
    investigatorUserId: room.investigatorUserId,
    lastMessagePreview: room.lastMessagePreview ?? null,
    lastMessageAt: toIsoString(room.lastMessageAt),
    createdAt: toIsoString(room.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(room.updatedAt) ?? new Date().toISOString(),
  };
}

function serializeTimelineEntry(entry: TimelineEntryRecord) {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title ?? null,
    note: entry.note ?? null,
    payload: entry.payload ?? null,
    createdAt: toIsoString(entry.createdAt) ?? new Date().toISOString(),
    author: entry.author
      ? {
          id: entry.author.id,
          name: entry.author.name,
          email: entry.author.email,
        }
      : null,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function buildResponse(room: ChatRoomRecord | null, requestRecord: RequestRecord) {
  const messages = room?.messages ?? [];
  return {
    room: serializeRoom(room),
    messages: messages.map(serializeMessage),
    participants: requestRecord
      ? {
          customer: requestRecord.user
            ? {
                id: requestRecord.user.id,
                name: requestRecord.user.name,
                email: requestRecord.user.email,
                role: requestRecord.user.role,
              }
            : null,
          investigator: requestRecord.investigator?.user
            ? {
                id: requestRecord.investigator.user.id,
                name: requestRecord.investigator.user.name,
                email: requestRecord.investigator.user.email,
                role: requestRecord.investigator.user.role,
              }
            : null,
        }
      : null,
    request: requestRecord
      ? {
          id: requestRecord.id,
          title: requestRecord.title,
          status: requestRecord.status,
          timeline: Array.isArray(requestRecord.timeline)
            ? requestRecord.timeline.map(serializeTimelineEntry)
            : [],
        }
      : null,
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  const requestId = Number(params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const requestRecord = await resolveRequest(prisma, requestId);
  if (!requestRecord) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = auth.user.role as Role;
  const actorId = auth.user.id;
  const investigatorUserId = requestRecord.investigator?.user?.id ?? null;

  if (!ensureParticipant(role, requestRecord.userId, actorId, investigatorUserId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!requestRecord.investigatorId || !investigatorUserId) {
    return NextResponse.json({ error: "CHAT_NOT_AVAILABLE" }, { status: 409 });
  }

  const room = await ensureChatRoom(prisma, requestRecord);
  if (!room) {
    return NextResponse.json({ error: "CHAT_NOT_AVAILABLE" }, { status: 409 });
  }

  return NextResponse.json(buildResponse(room, requestRecord));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  const requestId = Number(params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const requestRecord = await resolveRequest(prisma, requestId);
  if (!requestRecord) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = auth.user.role as Role;
  const actorId = auth.user.id;
  const investigatorUserId = requestRecord.investigator?.user?.id ?? null;

  if (!ensureParticipant(role, requestRecord.userId, actorId, investigatorUserId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!requestRecord.investigatorId || !investigatorUserId) {
    return NextResponse.json({ error: "CHAT_NOT_AVAILABLE" }, { status: 409 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const content = isRecord(payload) && typeof payload.content === "string" ? payload.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "MESSAGE_REQUIRED" }, { status: 400 });
  }

  const room = await ensureChatRoom(prisma, requestRecord);
  if (!room) {
    return NextResponse.json({ error: "CHAT_NOT_AVAILABLE" }, { status: 409 });
  }

  const message = await prisma.investigationChatMessage.create({
    data: {
      roomId: room.id,
      senderId: actorId,
      content,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  await prisma.investigationChatRoom.update({
    where: { id: room.id },
    data: {
      lastMessagePreview: content.slice(0, 280),
      lastMessageAt: new Date(),
    },
  });

  const recipientUserId = actorId === requestRecord.userId ? investigatorUserId : requestRecord.userId;

  if (recipientUserId && recipientUserId !== actorId) {
    await createNotification({
      userId: recipientUserId,
      type: "CHAT_MESSAGE",
      title: `${auth.user.name ?? "상대방"}님의 새 메시지`,
      message: content.slice(0, 140),
      actionUrl: `/investigation-requests/${requestId}/chat`,
      metadata: {
        requestId,
        roomId: room.id,
        senderId: actorId,
      },
    });
  }

  return NextResponse.json({
    message: serializeMessage(message),
  }, { status: 201 });
}
