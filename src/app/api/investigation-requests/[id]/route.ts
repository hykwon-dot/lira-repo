import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireCapability } from "@/lib/authz";
import type { Role } from "@/lib/rbac";
import type { Prisma } from "@prisma/client";
import {
  ensureAuthResult,
  ensureScenarioExists,
  parseScenarioId,
  REQUEST_INCLUDE,
  serializeRequest,
  validateStatus,
  STATUS_TRANSITIONS,
  RequestStatus,
  TimelineEventType,
  RequestWithRelations,
} from "../shared";
import { recordAuditEvent } from "@/lib/audit";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isAdmin(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

type StatusTimelineEntry = {
  type: TimelineEventType;
  title?: string | null;
  note?: string | null;
  payload?: Prisma.InputJsonValue;
};

function toRequestId(id: string) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error("INVALID_REQUEST_ID");
  }
  return numeric;
}

function ensureOwnershipOrAdmin(role: Role, ownerId: number, actorId: number, investigatorUserId?: number | null) {
  if (isAdmin(role)) return true;
  if (ownerId === actorId) return true;
  if (role === "INVESTIGATOR" && investigatorUserId && investigatorUserId === actorId) {
    return true;
  }
  return false;
}

function ensureOwnerForCancellation(role: Role, currentStatus: RequestStatus | null, ownerId: number, actorId: number, nextStatus: RequestStatus) {
  if (isAdmin(role)) return true;
  if (ownerId !== actorId) return false;
  if (nextStatus !== "CANCELLED") return false;
  if (!currentStatus) return false;
  if (["COMPLETED", "CANCELLED", "DECLINED"].includes(currentStatus)) return false;
  return true;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  let requestId: number;
  try {
    requestId = toRequestId(params.id);
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const record = (await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    include: REQUEST_INCLUDE,
  })) as RequestWithRelations | null;

  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const assignedInvestigatorUserId = record.investigator?.user?.id ?? null;

  if (!ensureOwnershipOrAdmin(auth.user.role as Role, record.userId, auth.user.id, assignedInvestigatorUserId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json(serializeRequest(record));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  let requestId: number;
  try {
    requestId = toRequestId(params.id);
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const existing = (await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    include: REQUEST_INCLUDE,
  })) as RequestWithRelations | null;

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = auth.user.role as Role;
  const investigatorUserId = existing.investigator?.user?.id ?? null;
  const isAssignedInvestigator = role === "INVESTIGATOR" && investigatorUserId === auth.user.id;
  const admin = isAdmin(role);
  const isOwner = existing.userId === auth.user.id;
  if (!isOwner && !admin && !isAssignedInvestigator) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const body = payload;
  const updateData: Prisma.InvestigationRequestUncheckedUpdateInput = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    if (typeof body.title !== "string" || body.title.trim().length < 2) {
      return NextResponse.json({ error: "INVALID_TITLE" }, { status: 400 });
    }
    updateData.title = body.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "details")) {
    if (typeof body.details !== "string" || body.details.trim().length < 5) {
      return NextResponse.json({ error: "INVALID_DETAILS" }, { status: 400 });
    }
    updateData.details = body.details.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "desiredOutcome")) {
    if (body.desiredOutcome == null) {
      updateData.desiredOutcome = null;
    } else if (typeof body.desiredOutcome === "string") {
      updateData.desiredOutcome = body.desiredOutcome.trim();
    } else {
      return NextResponse.json({ error: "INVALID_DESIRED_OUTCOME" }, { status: 400 });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "budgetMin")) {
    if (body.budgetMin == null) {
      updateData.budgetMin = null;
    } else if (typeof body.budgetMin === "number" && Number.isFinite(body.budgetMin)) {
      updateData.budgetMin = body.budgetMin;
    } else {
      return NextResponse.json({ error: "INVALID_BUDGET" }, { status: 400 });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "budgetMax")) {
    if (body.budgetMax == null) {
      updateData.budgetMax = null;
    } else if (typeof body.budgetMax === "number" && Number.isFinite(body.budgetMax)) {
      updateData.budgetMax = body.budgetMax;
    } else {
      return NextResponse.json({ error: "INVALID_BUDGET" }, { status: 400 });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "scenarioId")) {
    if (body.scenarioId == null || body.scenarioId === "") {
      updateData.scenarioId = null;
    } else {
      let scenarioId: number | null;
      try {
        scenarioId = parseScenarioId(body.scenarioId);
      } catch {
        return NextResponse.json({ error: "INVALID_SCENARIO_ID" }, { status: 400 });
      }
      if (scenarioId == null) {
        return NextResponse.json({ error: "INVALID_SCENARIO_ID" }, { status: 400 });
      }
      try {
        await ensureScenarioExists(scenarioId);
      } catch (error) {
        if (error instanceof Error && error.message === "SCENARIO_NOT_FOUND") {
          return NextResponse.json({ error: "SCENARIO_NOT_FOUND" }, { status: 404 });
        }
        return NextResponse.json({ error: "INVALID_SCENARIO_ID" }, { status: 400 });
      }
      updateData.scenarioId = scenarioId;
    }
  }

  const declineReason = typeof body.declineReason === "string" ? body.declineReason.trim() : null;
  const statusNote = typeof body.statusNote === "string" ? body.statusNote.trim() : "";
  const completionNote = typeof body.completionNote === "string" ? body.completionNote.trim() : "";
  const finalReportSummary = typeof body.finalReportSummary === "string" ? body.finalReportSummary.trim() : "";

  let statusChanged = false;
  let statusTimeline: StatusTimelineEntry | null = null;

  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    const requestedStatus = validateStatus(body.status);
    if (!requestedStatus) {
      return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
    }

    const currentStatus = validateStatus(existing.status);
    const allowedTransitions = currentStatus ? STATUS_TRANSITIONS[currentStatus] || [] : [];

    if (!currentStatus) {
      if (!admin) {
        return NextResponse.json({ error: "STATUS_CHANGE_FORBIDDEN" }, { status: 403 });
      }
      if (requestedStatus !== existing.status) {
        updateData.status = requestedStatus;
        statusChanged = requestedStatus !== existing.status;
      }
    } else if (requestedStatus !== currentStatus) {
      if (admin) {
        if (!allowedTransitions.includes(requestedStatus)) {
          return NextResponse.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 400 });
        }
        updateData.status = requestedStatus;
        statusChanged = true;
      } else if (isAssignedInvestigator) {
        if (!allowedTransitions.includes(requestedStatus)) {
          return NextResponse.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 400 });
        }
        if (requestedStatus === "CANCELLED" || requestedStatus === "MATCHING") {
          return NextResponse.json({ error: "STATUS_CHANGE_FORBIDDEN" }, { status: 403 });
        }
        if (requestedStatus === "DECLINED" && currentStatus !== "MATCHING") {
          return NextResponse.json({ error: "INVALID_STATUS_TRANSITION" }, { status: 400 });
        }
        updateData.status = requestedStatus;
        statusChanged = true;
      } else if (ensureOwnerForCancellation(role, currentStatus, existing.userId, auth.user.id, requestedStatus)) {
        updateData.status = requestedStatus;
        statusChanged = true;
      } else {
        return NextResponse.json({ error: "STATUS_CHANGE_FORBIDDEN" }, { status: 403 });
      }
    }

    if (statusChanged) {
      const now = new Date();

      switch (requestedStatus) {
        case "ACCEPTED": {
          if (!existing.acceptedAt) {
            updateData.acceptedAt = now;
          }
          statusTimeline = {
            type: "INVESTIGATOR_ACCEPTED",
            title: "민간조사원이 사건을 수락했습니다.",
            note: statusNote || null,
          };
          break;
        }
        case "DECLINED": {
          if (!isAssignedInvestigator && !admin) {
            return NextResponse.json({ error: "STATUS_CHANGE_FORBIDDEN" }, { status: 403 });
          }
          if (!declineReason) {
            return NextResponse.json({ error: "DECLINE_REASON_REQUIRED" }, { status: 400 });
          }
          updateData.declinedAt = now;
          updateData.declineReason = declineReason;
          statusTimeline = {
            type: "INVESTIGATOR_DECLINED",
            title: "민간조사원이 사건을 거절했습니다.",
            note: declineReason,
          };
          break;
        }
        case "IN_PROGRESS": {
          statusTimeline = {
            type: "STATUS_ADVANCED",
            title: "조사가 진행 중입니다.",
            note: statusNote || null,
          };
          break;
        }
        case "REPORTING": {
          statusTimeline = {
            type: "FINAL_REPORT",
            title: "사건 보고 준비",
            note: finalReportSummary || statusNote || null,
            payload: finalReportSummary ? { summary: finalReportSummary } : undefined,
          };
          break;
        }
        case "COMPLETED": {
          updateData.completedAt = now;
          statusTimeline = {
            type: "STATUS_ADVANCED",
            title: "사건이 완료되었습니다.",
            note: completionNote || statusNote || null,
            payload: completionNote ? { completionNote } : undefined,
          };
          break;
        }
        case "CANCELLED": {
          updateData.cancelledAt = now;
          statusTimeline = {
            type: isOwner ? "CUSTOMER_CANCELLED" : "STATUS_ADVANCED",
            title: isOwner ? "고객이 사건을 취소했습니다." : "사건이 취소되었습니다.",
            note: statusNote || null,
          };
          break;
        }
        default: {
          statusTimeline = {
            type: "STATUS_ADVANCED",
            note: statusNote || null,
          };
        }
      }
    }
  }

  if (!statusChanged && Object.keys(updateData).length === 0) {
    return NextResponse.json(serializeRequest(existing));
  }

  await prisma.$transaction(async (tx) => {
    await tx.investigationRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    if (statusTimeline) {
      await tx.investigationTimelineEntry.create({
        data: {
          requestId,
          type: statusTimeline.type,
          title: statusTimeline.title ?? null,
          note: statusTimeline.note ?? null,
          ...(statusTimeline.payload !== undefined
            ? { payload: statusTimeline.payload }
            : {}),
          authorId: auth.user.id,
        },
      });
    }
  });

  const refreshed = (await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    include: REQUEST_INCLUDE,
  })) as RequestWithRelations | null;

  if (!refreshed) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (statusChanged) {
    await recordAuditEvent({
      actorId: auth.user.id,
      action: "investigation.request.status.change",
      targetType: "InvestigationRequest",
      targetId: refreshed.id,
      metadata: {
        from: existing.status,
        to: refreshed.status,
      },
    });
  }

  return NextResponse.json(serializeRequest(refreshed));
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  let requestId: number;
  try {
    requestId = toRequestId(params.id);
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST_ID" }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const existing = await prisma.investigationRequest.findUnique({
    where: { id: requestId },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = auth.user.role as Role;
  const admin = isAdmin(role);
  const owner = existing.userId === auth.user.id;

  if (!admin && !owner) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const currentStatus = validateStatus(existing.status);
  if (!admin) {
    const deletableStatuses: RequestStatus[] = ["MATCHING", "DECLINED", "CANCELLED"];
    if (!currentStatus || !deletableStatuses.includes(currentStatus)) {
      return NextResponse.json({ error: "DELETE_FORBIDDEN" }, { status: 403 });
    }
  }

  await prisma.investigationRequest.delete({ where: { id: requestId } });

  await recordAuditEvent({
    actorId: auth.user.id,
    action: "investigation.request.delete",
    targetType: "InvestigationRequest",
    targetId: requestId,
    metadata: {
      status: existing.status,
    },
  });

  return NextResponse.json(null, { status: 204 });
}
