import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateDigitalTwinAnalysis, TwinSimulationInput } from "@/lib/ai/digitalTwin";
import {
  sanitizeScenarioVariables,
  type ScenarioVariableValueMap,
  type TwinScenarioCategory,
} from "@/lib/ai/twinConfig";

export const dynamic = "force-dynamic";

const TwinPayloadSchema = z.object({
  scenarioCategory: z.enum(["affair", "corporate", "missing", "insurance"]),
  fieldAgentGender: z.enum(["male", "female", "mixed"]),
  hasVehicle: z.boolean(),
  operationDate: z.string().optional().nullable(),
  shiftType: z.enum(["day", "night", "rotating"]),
  targetOccupation: z.enum(["office", "freelancer", "service", "unknown"]),
  commutePattern: z.enum(["regular", "flex", "remote"]),
  weather: z.enum(["clear", "rain", "snow", "windy"]),
  locationDensity: z.enum(["downtown", "residential", "rural"]),
  escortSupport: z.enum(["solo", "dual", "team"]),
  budgetLevel: z.enum(["tight", "standard", "premium"]),
  specialNotes: z.string().optional().nullable(),
  conversationSummary: z.string().optional().nullable(),
  scenarioTitle: z.string().optional().nullable(),
  scenarioVariables: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .default({}),
});

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (lowered === "true" || lowered === "1" || lowered === "yes") return true;
    if (lowered === "false" || lowered === "0" || lowered === "no") return false;
  }
  return fallback;
}

function normalizeTwinPayload(body: Record<string, unknown>): TwinSimulationInput {
  const normalized: Record<string, unknown> = {
    scenarioCategory: body.scenarioCategory,
    fieldAgentGender: body.fieldAgentGender,
    hasVehicle: normalizeBoolean(body.hasVehicle, true),
    operationDate:
      typeof body.operationDate === "string" && body.operationDate.trim().length > 0
        ? body.operationDate
        : null,
    shiftType: body.shiftType,
    targetOccupation: body.targetOccupation,
    commutePattern: body.commutePattern,
    weather: body.weather,
    locationDensity: body.locationDensity,
    escortSupport: body.escortSupport,
    budgetLevel: body.budgetLevel,
    specialNotes: typeof body.specialNotes === "string" ? body.specialNotes : null,
    conversationSummary: typeof body.conversationSummary === "string" ? body.conversationSummary : null,
    scenarioTitle: typeof body.scenarioTitle === "string" ? body.scenarioTitle : null,
    scenarioVariables: body.scenarioVariables,
  };

  const parsed = TwinPayloadSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error("디지털 트윈 분석 요청 값이 누락되었거나 형식이 잘못되었습니다.");
  }

  const data = parsed.data;
  const trimmedSpecialNotes = data.specialNotes?.trim() ?? "";
  const trimmedConversation = data.conversationSummary?.trim() ?? "";
  const trimmedTitle = data.scenarioTitle?.trim() ?? "";
  const rawScenarioVariables = normalized.scenarioVariables;
  const sanitizedScenarioVariables = sanitizeScenarioVariables(
    data.scenarioCategory as TwinScenarioCategory,
    (rawScenarioVariables && typeof rawScenarioVariables === "object"
      ? (rawScenarioVariables as ScenarioVariableValueMap)
      : undefined) ?? undefined,
  );

  return {
    ...data,
    specialNotes: trimmedSpecialNotes.length > 0 ? trimmedSpecialNotes : undefined,
    operationDate: data.operationDate ?? null,
    conversationSummary: trimmedConversation.length > 0 ? trimmedConversation : null,
    scenarioTitle: trimmedTitle.length > 0 ? trimmedTitle : null,
    scenarioVariables: sanitizedScenarioVariables,
  } satisfies TwinSimulationInput;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const normalized = normalizeTwinPayload(body);
    const analysis = await generateDigitalTwinAnalysis(normalized);

    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    console.error("[AI_TWIN_ANALYSIS_ERROR]", error);
    const message =
      error instanceof Error ? error.message : "디지털 트윈 분석 요청 처리 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
