import type { InvestigationRequestSummary, CaseTimelineEntry } from "@/types/investigation";
import type { Role } from "@/lib/rbac";
import { getPrismaClient } from "@/lib/prisma";

export const REQUEST_STATUSES = [
  "MATCHING",
  "ACCEPTED",
  "IN_PROGRESS",
  "REPORTING",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
] as const;

export const TIMELINE_EVENT_TYPES = [
  "REQUEST_CREATED",
  "INVESTIGATOR_ASSIGNED",
  "INVESTIGATOR_ACCEPTED",
  "INVESTIGATOR_DECLINED",
  "STATUS_ADVANCED",
  "PROGRESS_NOTE",
  "INTERIM_REPORT",
  "FINAL_REPORT",
  "ATTACHMENT_SHARED",
  "CUSTOMER_CANCELLED",
  "SYSTEM",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export type AllowedStatusMap = Record<RequestStatus, RequestStatus[]>;

export const STATUS_TRANSITIONS: AllowedStatusMap = {
  MATCHING: ["ACCEPTED", "DECLINED", "CANCELLED"],
  ACCEPTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REPORTING", "CANCELLED"],
  REPORTING: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

export const REQUEST_INCLUDE = {
  scenario: {
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  investigator: {
    select: {
      id: true,
      status: true,
      contactPhone: true,
      serviceArea: true,
      specialties: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  review: {
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  timeline: {
    orderBy: {
      createdAt: "asc",
    },
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
} as const;

export interface RequestWithRelations {
  id: number;
  title: string;
  details: string;
  desiredOutcome?: string | null;
  status: string;
  userId: number;
  scenarioId?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  acceptedAt?: Date | string | null;
  declinedAt?: Date | string | null;
  declineReason?: string | null;
  cancelledAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  scenario?: {
    id: number;
    title: string;
    category?: string | null;
    difficulty?: string | null;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role?: string | null;
  } | null;
  investigator?: {
    id: number;
    status?: string | null;
    contactPhone?: string | null;
    serviceArea?: string | null;
    specialties?: unknown;
    user?: {
      id: number;
      name: string;
      email: string;
    } | null;
  } | null;
  review?: {
    id: number;
    rating: number;
    comment?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  } | null;
  timeline: Array<{
    id: number;
    type: string;
    title?: string | null;
    note?: string | null;
    payload?: unknown;
    createdAt: Date | string;
    author?: {
      id: number;
      name: string;
      email: string;
    } | null;
  }>;
}

const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function ensureAuthResult<T extends { user: { role: Role; id: number } }>(value: unknown): value is T {
  return Boolean(value && typeof value === "object" && "user" in value);
}

export function serializeRequest(request: RequestWithRelations): InvestigationRequestSummary {
  const toTimelineEntry = (entry: RequestWithRelations["timeline"][number]): CaseTimelineEntry => ({
    id: entry.id,
    type: entry.type,
    title: entry.title,
    note: entry.note,
    payload: entry.payload ?? null,
    author: entry.author
      ? {
          id: entry.author.id,
          name: entry.author.name,
          email: entry.author.email,
        }
      : null,
    createdAt: toIsoString(entry.createdAt) ?? new Date().toISOString(),
  });

  return {
    id: request.id,
    title: request.title,
    details: request.details,
    desiredOutcome: request.desiredOutcome,
    status: request.status,
    scenarioId: request.scenarioId,
    scenario: request.scenario
      ? {
          id: request.scenario.id,
          title: request.scenario.title,
          category: request.scenario.category,
          difficulty: request.scenario.difficulty,
        }
      : null,
    user: request.user
      ? {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          role: request.user.role ?? undefined,
        }
      : null,
    investigator: request.investigator
      ? {
          id: request.investigator.id,
          status: request.investigator.status ?? "PENDING",
          contactPhone: request.investigator.contactPhone ?? null,
          serviceArea: request.investigator.serviceArea ?? null,
          specialties: request.investigator.specialties,
          user: request.investigator.user
            ? {
                id: request.investigator.user.id,
                name: request.investigator.user.name,
                email: request.investigator.user.email,
              }
            : null,
        }
      : null,
    review: request.review
      ? {
          id: request.review.id,
          rating: request.review.rating,
          comment: request.review.comment ?? null,
          createdAt: toIsoString(request.review.createdAt) ?? new Date().toISOString(),
          updatedAt: toIsoString(request.review.updatedAt) ?? new Date().toISOString(),
        }
      : null,
    budgetMin: request.budgetMin,
    budgetMax: request.budgetMax,
    createdAt: toIsoString(request.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(request.updatedAt) ?? new Date().toISOString(),
    timeline: request.timeline.map(toTimelineEntry),
  };
}

export function parseScenarioId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw new Error("INVALID_SCENARIO_ID");
  }
  return numeric;
}

export function validateStatus(value: unknown): RequestStatus | null {
  if (typeof value !== "string") return null;
  return REQUEST_STATUSES.includes(value as RequestStatus) ? (value as RequestStatus) : null;
}

export function validateTimelineType(value: unknown): TimelineEventType | null {
  if (typeof value !== "string") return null;
  return TIMELINE_EVENT_TYPES.includes(value as TimelineEventType)
    ? (value as TimelineEventType)
    : null;
}

export async function ensureScenarioExists(id: number) {
  if (!Number.isInteger(id)) {
    throw new Error("INVALID_SCENARIO_ID");
  }
  const prisma = await getPrismaClient();
  const exists = await prisma.scenario.count({ where: { id } });
  if (!exists) {
    throw new Error("SCENARIO_NOT_FOUND");
  }
}

export function canViewAll(role: Role) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
