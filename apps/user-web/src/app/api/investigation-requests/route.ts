import { NextRequest, NextResponse } from "next/server";
import { InvestigatorStatus } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import { requireCapability } from "@/lib/authz";
import type { Role } from "@/lib/rbac";
import {
  ensureAuthResult,
  ensureScenarioExists,
  parseScenarioId,
  REQUEST_INCLUDE,
  RequestWithRelations,
  serializeRequest,
  validateStatus,
  canViewAll,
} from "./shared";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

interface MinimalInvestigationRequestDelegate {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: number }>;
  findUniqueOrThrow: (args: {
    where: Record<string, unknown>;
    include?: unknown;
  }) => Promise<RequestWithRelations>;
}

interface MinimalTimelineDelegate {
  createMany: (args: { data: Array<Record<string, unknown>> }) => Promise<unknown>;
}

interface MinimalNotificationDelegate {
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
}

export async function GET(req: NextRequest) {
  const auth = await requireCapability(req, "investigation.request.read");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  const { user } = auth;
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const userIdFilter = url.searchParams.get("userId");
  const view = url.searchParams.get("view");
  const investigatorFilter = url.searchParams.get("investigatorId");

  const where: Record<string, unknown> = {};

  const parsedStatus = validateStatus(statusFilter);
  if (statusFilter && !parsedStatus) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 400 });
  }
  if (parsedStatus) {
    where.status = parsedStatus;
  }

  if (investigatorFilter) {
    const numericInvestigatorId = Number(investigatorFilter);
    if (!Number.isInteger(numericInvestigatorId)) {
      return NextResponse.json({ error: "INVALID_INVESTIGATOR_ID" }, { status: 400 });
    }
    where.investigatorId = numericInvestigatorId;
  }

  const role = user.role as Role;

  if (canViewAll(role) && userIdFilter) {
    const numericUserId = Number(userIdFilter);
    if (Number.isNaN(numericUserId)) {
      return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
    }
    where.userId = numericUserId;
  } else if (role === "INVESTIGATOR") {
    if (view === "customer") {
      where.userId = user.id;
    } else {
      where.investigator = {
        userId: user.id,
      };
    }
  } else {
    where.userId = user.id;
  }

  const prisma = await getPrismaClient();
  const requests = (await prisma.investigationRequest.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    include: REQUEST_INCLUDE,
  })) as RequestWithRelations[];

  return NextResponse.json(requests.map(serializeRequest));
}

export async function POST(req: NextRequest) {
  const auth = await requireCapability(req, "investigation.request.create");
  if (!ensureAuthResult(auth)) {
    return auth as NextResponse;
  }

  const { user } = auth;

  let payloadRaw: unknown;
  try {
    payloadRaw = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!isRecord(payloadRaw)) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const payload = payloadRaw;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const details = typeof payload.details === "string" ? payload.details.trim() : "";
  if (title.length < 2 || details.length < 5) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const desiredOutcome =
    typeof payload.desiredOutcome === "string" ? payload.desiredOutcome.trim() : null;
  const budgetMin = typeof payload.budgetMin === "number" ? payload.budgetMin : null;
  const budgetMax = typeof payload.budgetMax === "number" ? payload.budgetMax : null;
  const investigatorIdValue = payload.investigatorId;
  let scenarioIdInput: number | null = null;
  try {
    scenarioIdInput = parseScenarioId(payload.scenarioId ?? null);
  } catch {
    return NextResponse.json({ error: "INVALID_SCENARIO_ID" }, { status: 400 });
  }

  if (investigatorIdValue == null) {
    return NextResponse.json({ error: "INVESTIGATOR_REQUIRED" }, { status: 400 });
  }

  const investigatorId = Number(investigatorIdValue);
  if (!Number.isInteger(investigatorId) || investigatorId <= 0) {
    return NextResponse.json({ error: "INVALID_INVESTIGATOR_ID" }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const investigatorProfile = await prisma.investigatorProfile.findUnique({
    where: { id: investigatorId },
    include: {
      user: true,
    },
  });

  if (!investigatorProfile || investigatorProfile.status !== InvestigatorStatus.APPROVED) {
    return NextResponse.json({ error: "INVESTIGATOR_NOT_AVAILABLE" }, { status: 404 });
  }

  try {
    if (scenarioIdInput) {
      await ensureScenarioExists(scenarioIdInput);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "SCENARIO_NOT_FOUND") {
      return NextResponse.json({ error: "SCENARIO_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ error: "INVALID_SCENARIO_ID" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const client = tx as unknown as {
      investigationRequest: MinimalInvestigationRequestDelegate;
      investigationTimelineEntry: MinimalTimelineDelegate;
      notification: MinimalNotificationDelegate;
    };

    const requestData: Record<string, unknown> = {
      userId: user.id,
      investigatorId,
      title,
      details,
      desiredOutcome: desiredOutcome ?? undefined,
      budgetMin: budgetMin ?? undefined,
      budgetMax: budgetMax ?? undefined,
      status: "MATCHING",
    };

    if (scenarioIdInput) {
      requestData.scenarioId = scenarioIdInput;
    }

    const request = await client.investigationRequest.create({
      data: requestData,
    });

    await client.investigationTimelineEntry.createMany({
      data: [
        {
          requestId: request.id,
          type: "REQUEST_CREATED",
          title: "사건 의뢰 생성",
          note: `${user.name ?? "사용자"}님이 새 사건을 의뢰했습니다.`,
          authorId: user.id,
          payload: {
            title,
          },
        },
        {
          requestId: request.id,
          type: "INVESTIGATOR_ASSIGNED",
          title: "지정된 민간조사원",
          note: `${investigatorProfile.user?.name ?? "민간조사원"}에게 사건을 요청했습니다.`,
          authorId: user.id,
          payload: {
            investigatorId,
            investigatorUserId: investigatorProfile.user?.id ?? null,
          },
        },
      ],
    });

    if (investigatorProfile.user?.id) {
      await client.notification.create({
        data: {
          userId: investigatorProfile.user.id,
          type: "INVESTIGATION_ASSIGNED",
          title: "새 사건 의뢰가 도착했습니다.",
          message: `${user.name ?? "의뢰인"}님이 사건을 의뢰했습니다: ${title}`,
          actionUrl: `/investigation-requests/${request.id}`,
          metadata: {
            requestId: request.id,
            scenarioId: scenarioIdInput,
          },
        },
      });
    }

    return client.investigationRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: REQUEST_INCLUDE,
    });
  });

  return NextResponse.json(serializeRequest(created), { status: 201 });
}
