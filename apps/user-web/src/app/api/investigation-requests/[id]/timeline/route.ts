import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireCapability } from "@/lib/authz";
import type { Role } from "@/lib/rbac";
import { ensureAuthResult, validateTimelineType } from "../../shared";
import { createNotification } from "@/lib/notifications";

const TIMELINE_TYPE_LABELS: Record<string, string> = {
  PROGRESS_NOTE: "진행 메모",
  INTERIM_REPORT: "중간 보고",
  FINAL_REPORT: "최종 보고",
  ATTACHMENT_SHARED: "자료 공유",
  STATUS_ADVANCED: "단계 변경",
};

const MUTABLE_TIMELINE_TYPES = new Set([
  "PROGRESS_NOTE",
  "INTERIM_REPORT",
  "FINAL_REPORT",
  "ATTACHMENT_SHARED",
  "STATUS_ADVANCED",
]);

function hasTimelinePermission(role: Role, ownerId: number, actorId: number, investigatorUserId?: number | null) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  if (ownerId === actorId) return true;
  if (role === "INVESTIGATOR" && investigatorUserId && investigatorUserId === actorId) return true;
  return false;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  const role = auth.user.role as Role;
  const actorId = auth.user.id;

  const requestId = Number(params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const REQUEST_INCLUDE = {
    investigator: {
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    },
    user: {
      select: {
        id: true,
      },
    },
  } as const;

  const prisma = await getPrismaClient();
  const requestRecord = await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    include: REQUEST_INCLUDE,
  });

  if (!requestRecord) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const investigatorUserId = requestRecord.investigator?.user?.id ?? null;

  if (!hasTimelinePermission(role, requestRecord.userId, actorId, investigatorUserId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const body = (payload && typeof payload === "object") ? (payload as Record<string, unknown>) : {};

  const timelineType = validateTimelineType(body.type);
  if (!timelineType || !MUTABLE_TIMELINE_TYPES.has(timelineType)) {
    return NextResponse.json({ error: "INVALID_TIMELINE_TYPE" }, { status: 400 });
  }

  const rawTitle = typeof body.title === "string" ? body.title.trim() : "";
  const rawNote = typeof body.note === "string" ? body.note.trim() : "";

  const payloadValue: Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined =
    body.payload === undefined
      ? undefined
      : body.payload === null
        ? Prisma.JsonNull
        : (body.payload as Prisma.InputJsonValue);

  const ENTRY_INCLUDE = {
    author: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  } as const;

  const created = await prisma.$transaction(async (tx) => {
    const entry = await tx.investigationTimelineEntry.create({
      data: {
        requestId,
        type: timelineType,
        title: rawTitle || null,
        note: rawNote || null,
        authorId: actorId,
        ...(payloadValue !== undefined ? { payload: payloadValue } : {}),
      },
      include: ENTRY_INCLUDE,
    });

    await tx.investigationRequest.update({
      where: { id: requestId },
      data: { updatedAt: new Date() },
    });

    return entry as EntryRecord;
  });

  type EntryRecord = Prisma.InvestigationTimelineEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

  const toIso = (value: EntryRecord["createdAt"]): string =>
    value instanceof Date ? value.toISOString() : new Date(value).toISOString();

  // --- 알림 발송 로직 추가 ---
  try {
    const recipientUserId = actorId === requestRecord.userId ? investigatorUserId : requestRecord.userId;
    
    if (recipientUserId && recipientUserId !== actorId) {
      const typeLabel = TIMELINE_TYPE_LABELS[timelineType] || "새로운 기록";
      const previewText = rawTitle || rawNote || "내용 없음";

      await createNotification({
        userId: recipientUserId,
        type: "TIMELINE_ENTRY",
        title: `조사진행 ${typeLabel} 알림`,
        message: `[${requestRecord.title}] 사건에 새로운 기록이 등록되었습니다: ${previewText.slice(0, 50)}...`,
        actionUrl: `/investigation-requests/${requestId}/chat`,
        metadata: {
          requestId,
          entryId: created.id,
          type: timelineType,
        },
      });
    }
  } catch (notificationError) {
    console.error("Failed to send timeline notification:", notificationError);
    // 알림 실패가 전체 프로세스에 영향을 주지 않도록 로깅만 수행
  }
  // -------------------------

  return NextResponse.json(
    {
      entry: {
        id: created.id,
        type: created.type,
        title: created.title,
        note: created.note,
        payload: created.payload,
        createdAt: toIso(created.createdAt),
        author: created.author ?? null,
      },
    },
    { status: 201 },
  );
}
