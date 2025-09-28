import { NextRequest, NextResponse } from 'next/server';
import { CoreMessage, streamText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 환경 변수 폴백
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

const taskSchema = z.object({
  taskKey: z.string().describe("A unique key for the task (e.g., T1.1)."),
  desc: z.string().describe("The full description of the task."),
  competency: z.string().describe("Required competencies for the task (as a JSON string or description)."),
});

const riskSchema = z.object({
  riskKey: z.string().describe("A unique key for the risk (e.g., R1)."),
  name: z.string().describe("The name or title of the risk."),
  severity: z.string().describe("The severity level (e.g., High, Medium, Low)."),
  trigger: z.string().describe("The trigger or condition that causes the risk."),
  mitigation: z.string().describe("The plan to mitigate this risk."),
});

const analysisSchema = z.object({
  keywords: z.array(z.string()).describe("대화의 핵심 키워드 목록 (3-5개)"),
  generatedScenario: z.object({
      title: z.string().describe("대화 내용을 기반으로 생성된 시나리오의 전체 제목"),
      description: z.string().describe("시나리오에 대한 한두 문장 요약 설명"),
      phases: z.array(z.object({
        name: z.string().describe("해당 단계(Phase)의 이름 (예: 1단계: 시장 조사)"),
        description: z.string().describe("해당 단계에서 수행할 작업에 대한 구체적인 설명"),
        durationDays: z.number().optional().describe("해당 단계의 예상 소요 기간(일). '수개월'은 90일, '1년'은 365일과 같이 구체적인 일 단위 숫자로 변환."),
        budget: z.string().optional().describe("해당 단계의 예상 예산. '수억원'은 '1억원', '몇천만원'은 '1천만원'과 같이 구체적인 최소 금액으로 변환."),
        deliverables: z.array(z.string()).optional().describe("해당 단계의 주요 산출물 목록. 정보가 부족하면 빈 배열로 처리."),
        tasks: z.array(taskSchema).optional().describe("해당 단계의 주요 태스크 목록. 정보가 부족하면 빈 배열로 처리."),
        phaseKPI: z.array(z.string()).optional().describe("해당 단계의 핵심성과지표(KPI) 목록. 정보가 부족하면 빈 배열로 처리."),
        risks: z.array(riskSchema).optional().describe("해당 단계에서 발생 가능한 리스크 목록. 정보가 부족하면 빈 배열로 처리."),
      })).describe("시나리오를 구성하는 단계(Phase) 목록")
  }).describe("대화 내용을 기반으로 자동 생성된 시나리오 데이터."),
  recommendedQuestions: z.array(z.string()).describe("생성된 시나리오를 더 구체화하거나 다음 단계로 나아가기 위해 사용자가 물어보면 좋을 만한 추천 질문 3개.")
});

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in the environment variables.');
    }

    const body = await req.json();
    const { messages, mode = 'chat', currentScenario } = body as {
      messages?: unknown;
      mode?: string;
      currentScenario?: Record<string, unknown> | null;
    };

    const isCoreMessage = (value: unknown): value is CoreMessage => {
      if (!value || typeof value !== 'object') {
        return false;
      }
      const candidate = value as { role?: unknown; content?: unknown };
      if (typeof candidate.role !== 'string') {
        return false;
      }
      if (typeof candidate.content !== 'string') {
        return false;
      }
      return candidate.role === 'system' || candidate.role === 'user' || candidate.role === 'assistant';
    };

    const coreMessages: CoreMessage[] = Array.isArray(messages)
      ? (messages as unknown[]).filter(isCoreMessage)
      : [];

    if (mode === 'analysis') {
      let systemPrompt = `You are a master AI strategist, an expert in analyzing conversations to build and refine dynamic business scenarios. Your sole output must be a single JSON object conforming to the provided schema.

**Core Mission: Evolve the Scenario**
Your primary goal is to update a scenario plan based on the latest user-AI conversation.

**JSON Output Rules:**
1.  **Strict Schema Compliance:** Your entire output must be a single, valid JSON object matching the schema. No extra text or markdown.
2.  **Comprehensive Details:** For every phase, strive to fill all fields: \`name\`, \`description\`, \`durationDays\`, \`budget\`, \`deliverables\`, \`tasks\`, \`phaseKPI\`, and \`risks\`.
3.  **Handle Missing Info:** If specific information isn't available, use an empty array \`[]\` for array fields. Do not invent details.
4.  **Quantify Vague Terms:** Convert abstract time or budget references into concrete numbers (e.g., 'several months' -> 90, 'a few hundred thousand dollars' -> '100000 USD').
5.  **Language**: All output text, including all fields within the scenario (descriptions, tasks, risks, etc.), MUST be in Korean.
6.  **Recommended Questions**: You MUST generate a \`recommendedQuestions\` array. It should contain at least 3 follow-up questions to guide the user. If you have no specific recommendations, return an empty array \`[]\`. This field is mandatory.

**Dynamic Scenario Evolution Logic:**
You must analyze the most recent messages in the context of the \`currentScenario\` (if provided).

1.  **Phase Addition:** If the conversation outlines a new, distinct phase, append it to the existing \`phases\` array.
2.  **Phase Modification:** If the conversation refines an existing phase, update that specific phase with the new information.
3.  **Phase Removal:** If the user explicitly rejects or skips a phase, remove it from the \`phases\` array.

**Instructions for using \`currentScenario\`:**
- The provided \`currentScenario\` is the ground truth. Your job is to return a **new, updated version** of it.
- **Preserve all existing data** that wasn't explicitly changed in the latest conversation turn. Do not lose information.
- After updating the scenario, generate a fresh set of \`recommendedQuestions\` that logically follow from the *new* state of the scenario.
`;
      
      if (currentScenario && Object.keys(currentScenario).length > 0) {
        systemPrompt += `

**Current Scenario State:**
Here is the scenario you must update. Analyze the latest messages and apply the evolution logic to this JSON object.

${JSON.stringify(currentScenario, null, 2)}`;
      }

      try {
        console.log('[ANALYSIS_START] Received analysis request. Generating object...');
        console.time('[ANALYSIS_TIMER]');
        const { object } = await generateObject({
          model: openai('gpt-4o'),
          schema: analysisSchema,
          messages: [{ role: 'system', content: systemPrompt }, ...coreMessages],
        });
        console.timeEnd('[ANALYSIS_TIMER]');
        console.log('[ANALYSIS_SUCCESS] Successfully generated object.');
        return NextResponse.json(object);
      } catch (error) {
        console.timeEnd('[ANALYSIS_TIMER]');
        console.error('[ANALYSIS_GENERATION_ERROR] Failed to generate object:', error);
        return NextResponse.json(
          {
            error: 'AI_ANALYSIS_FAILED',
            message: 'AI 모델이 분석 데이터를 생성하는 데 실패했습니다.',
            details: error instanceof Error ? { message: error.message, stack: error.stack } : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Default Chat Mode
    const systemMessageContent = 'You are a friendly and helpful AI partner named Weaving.';
    const result = await streamText({
      model: openai('gpt-3.5-turbo-16k'),
      messages: [{ role: 'system', content: systemMessageContent }, ...coreMessages],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('[CHAT_API_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ error: `Internal Server Error: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
