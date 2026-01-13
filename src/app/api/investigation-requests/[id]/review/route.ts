import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { requireCapability } from "@/lib/authz";
import type { Role } from "@/lib/rbac";
import { ensureAuthResult, validateStatus } from "../../shared";
import { Prisma } from "@prisma/client";

function isAdmin(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

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

function serializeReview(review: { id: number; rating: number; comment: string | null; createdAt: Date; updatedAt: Date }) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

async function recomputeInvestigatorRating(tx: Prisma.TransactionClient, investigatorId: number) {
  const aggregate = await tx.investigatorReview.aggregate({
    where: { investigatorId },
    _avg: { rating: true },
  });

  const avgRating = aggregate._avg.rating;

  await tx.investigatorProfile.update({
    where: { id: investigatorId },
    data: {
      ratingAverage: avgRating != null ? new Prisma.Decimal(avgRating) : null,
    },
  });
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
  const record = await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      status: true,
      investigatorId: true,
      investigator: {
        select: {
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const role = auth.user.role as Role;
  const investigatorUserId = record.investigator?.user?.id ?? null;

  if (!ensureOwnershipOrAdmin(role, record.userId, auth.user.id, investigatorUserId)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const review = await prisma.investigatorReview.findUnique({
    where: { requestId },
  });

  return NextResponse.json({ review: review ? serializeReview(review) : null });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const record = await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      status: true,
      investigatorId: true,
      investigator: {
        select: {
          userId: true
        }
      }
    },
  });

  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const existingReview = await prisma.investigatorReview.findUnique({
    where: { requestId },
  });

  if (existingReview) {
    return NextResponse.json({ error: "REVIEW_ALREADY_EXISTS" }, { status: 409 });
  }

  if (!record.investigatorId) {
    return NextResponse.json({ error: "INVESTIGATOR_NOT_ASSIGNED" }, { status: 400 });
  }

  const role = auth.user.role as Role;
  const isInvestigator = record.investigator?.userId === auth.user.id;
  
  if (!isAdmin(role) && record.userId !== auth.user.id && !isInvestigator) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const status = validateStatus(record.status);
  if (status !== "COMPLETED") {
    return NextResponse.json({ error: "REQUEST_NOT_COMPLETED" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const ratingRaw = (payload as Record<string, unknown>).rating;
  const commentRaw = (payload as Record<string, unknown>).comment;

  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "INVALID_RATING" }, { status: 400 });
  }

  let comment: string | null = null;
  if (typeof commentRaw === "string" && commentRaw.trim().length > 0) {
    comment = commentRaw.trim().slice(0, 2000);
  }

  const created = await prisma.$transaction(async (tx) => {
    const review = await tx.investigatorReview.create({
      data: {
        requestId,
        investigatorId: record.investigatorId!,
        customerId: record.userId,
        rating,
        comment,
      },
    });

    await recomputeInvestigatorRating(tx, record.investigatorId!);

    return review;
  });

  return NextResponse.json({ review: serializeReview(created) }, { status: 201 });
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
  const record = await prisma.investigationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      userId: true,
      investigatorId: true,
      investigator: {
        select: {
          userId: true
        }
      }
    },
  });

  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const reviewRecord = await prisma.investigatorReview.findUnique({
    where: { requestId },
  });

  if (!reviewRecord) {
    return NextResponse.json({ error: "REVIEW_NOT_FOUND" }, { status: 404 });
  }

  if (!record.investigatorId) {
    return NextResponse.json({ error: "INVESTIGATOR_NOT_ASSIGNED" }, { status: 400 });
  }

  const role = auth.user.role as Role;
  const isInvestigator = record.investigator?.userId === auth.user.id;

  if (!isAdmin(role) && record.userId !== auth.user.id && !isInvestigator) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const ratingRaw = (payload as Record<string, unknown>).rating;
  const commentRaw = (payload as Record<string, unknown>).comment;

  let rating: number | null = null;
  if (ratingRaw !== undefined) {
    rating = Number(ratingRaw);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "INVALID_RATING" }, { status: 400 });
    }
  }

  let comment: string | null | undefined = undefined;
  if (commentRaw !== undefined) {
    if (commentRaw == null) {
      comment = null;
    } else if (typeof commentRaw === "string") {
      const trimmed = commentRaw.trim();
      comment = trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
    } else {
      return NextResponse.json({ error: "INVALID_COMMENT" }, { status: 400 });
    }
  }

  if (rating == null && comment === undefined) {
    return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const review = await tx.investigatorReview.update({
      where: { requestId },
      data: {
        rating: rating ?? reviewRecord.rating,
        comment: comment !== undefined ? comment : reviewRecord.comment,
      },
    });

    await recomputeInvestigatorRating(tx, record.investigatorId!);

    return review;
  });

  return NextResponse.json({ review: serializeReview(updated) });
}
