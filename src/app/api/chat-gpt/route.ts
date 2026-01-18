import { NextRequest, NextResponse } from 'next/server';
import { CoreMessage, streamText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 환경 변수 폴백 및 따옴표 제거
const sanitizeKey = (key: string | undefined) => {
  if (!key) return '';
  let cleaned = key.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
  return cleaned;
};

const OPENAI_API_KEY = sanitizeKey(process.env.OPENAI_API_KEY);

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

const intakeSchema = z.object({
  assistantMessage: z.string().describe("사용자에게 바로 보여줄 한국어 답변"),
  conversationSummary: z.string().describe("탐정에게 전달할 핵심 사건 요약"),
  summary: z.object({
    caseTitle: z.string().describe("사건을 대표하는 간결한 제목"),
    caseType: z.string().describe("사건 유형 분류"),
    primaryIntent: z.string().describe("의뢰인의 주된 목적"),
    urgency: z.string().describe("긴급도 혹은 시간 제약"),
    objective: z.string().describe("AI가 파악한 해결 목표"),
    keyFacts: z.array(z.string()).describe("확정적으로 파악된 핵심 사실 목록"),
    missingDetails: z.array(z.string()).describe("추가로 확인이 필요한 정보"),
    recommendedDocuments: z.array(z.string()).describe("준비하면 좋은 자료나 증빙"),
    nextQuestions: z.array(z.string()).describe("이후 대화를 이어가기 위해 던질 질문 후보"),
  }).describe("현재까지 수집된 사건 정보 요약"),
});

export async function POST(req: NextRequest) {
  try {
    // Debugging: Check API Key status
    if (!OPENAI_API_KEY) {
      console.error('[API_DEBUG] OPENAI_API_KEY is missing in environment variables.');
    } else {
      console.log(`[API_DEBUG] OPENAI_API_KEY is present (starts with ${OPENAI_API_KEY.substring(0, 7)}...)`);
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in the environment variables.');
    }

    const body = await req.json();
    const { messages, mode = 'chat', currentScenario, currentSummary } = body as {
      messages?: unknown;
      mode?: string;
      currentScenario?: Record<string, unknown> | null;
      currentSummary?: Record<string, unknown> | null;
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

    if (mode === 'intake') {
      const intakePrompt = `당신은 한국의 민간조사(SAAS) 플랫폼 LIRA(리라)의 AI Intake 파트너입니다. 

당신의 역할:
- 사용자의 설명을 바탕으로 사건 유형을 파악하고, 필요 정보(5W1H)가 모두 수집될 때까지 부드럽게 추가 질문을 이어갑니다.
- 질문은 한 번에 1~2개로 압축하여 명확히 제시하고, 사용자가 이미 제공한 내용을 불필요하게 반복해서 확인하거나 묻지 않습니다.
- 대화가 반복되지 않도록 매번 새로운 문장 표현과 어휘를 사용하세요. 기계적인 답변을 지양합니다.
- 사건 유형 예시: 배우자 외도, 미행/감시, 기업 내부 감사, 지적재산 침해, 실종, 스토킹, 디지털 증거 분석, 채권추심 등.
- 답변(assistantMessage)은 공감하는 태도로 시작하되, "요약해 드리겠습니다" 같은 말보다는 자연스럽게 내용을 확인하고 바로 다음 핵심 질문으로 넘어가세요.
- 사용자의 이전 답변을 앵무새처럼 따라하지 말고, *이해했다는 맥락*만 보여준 뒤 부족한 정보를 물어보세요.
- conversationSummary: 사건의 전체 맥락을 파악할 수 있는 5~7문장의 요약.
- nextQuestions: 대화를 진전시킬 수 있는 구체적이고 창의적인 질문 3가지.

중요 기준:
1. 이미 수집한 사실을 keyFacts에 정리합니다.
2. 아직 모호한 부분이나 추가 확인이 필요한 항목은 missingDetails에 남깁니다.
3. primaryIntent와 objective는 사용자의 진짜 목적과 원하는 해결 방향을 명확히 적어주세요.
4. 사용자가 엉뚱한 말을 하거나 반복적인 입력을 해도, 지혜롭게 사건 관련 대화로 유도하거나 정중히 확인하세요.
`; 

      const summaryContext = currentSummary && Object.keys(currentSummary).length > 0
        ? `
현재까지 정리된 요약(참고용):
${JSON.stringify(currentSummary, null, 2)}
`
        : '';

      try {
        const { object } = await generateObject({
          model: openai('gpt-4o'),
          schema: intakeSchema,
          temperature: 0.7,
          frequencyPenalty: 0.5,
          presencePenalty: 0.3,
          messages: [
            { role: 'system', content: intakePrompt + summaryContext },
            ...coreMessages,
          ],
        });

        return NextResponse.json(object);
      } catch (error) {
        console.error('[INTAKE_GENERATION_ERROR]', error);
        const isAuthError = error instanceof Error && (error.message.includes('401') || error.message.includes('invalid_api_key'));
        const isMissingKey = error instanceof Error && error.message.includes('OPENAI_API_KEY is not set');
        const errorDetail = error instanceof Error ? error.message : 'Unknown error';
        
        return NextResponse.json(
          {
            error: isAuthError || isMissingKey ? 'INVALID_API_KEY' : 'AI_INTAKE_FAILED',
            message: isAuthError || isMissingKey 
              ? 'OpenAI API 키가 설정되지 않았거나 유효하지 않습니다.' 
              : `오류 발생: ${errorDetail}`, // 디버깅을 위해 상세 에러 노출
            details: error instanceof Error ? { message: error.message, stack: error.stack } : 'Unknown error',
          },
          { status: isAuthError || isMissingKey ? 401 : 500 }
        );
      }
    }

    // Default Chat Mode
    const systemMessageContent = 'You are LIRA AI, a professional investigation assistant. Answer concisely and helpful. Do not repeat yourself.';
    const result = await streamText({
      model: openai('gpt-4o'),
      temperature: 0.7,
      frequencyPenalty: 0.5,
      messages: [{ role: 'system', content: systemMessageContent }, ...coreMessages],
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('[CHAT_API_ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ 
      error: 'INTERNAL_SERVER_ERROR', 
      message: `서버 내부 오류가 발생했습니다: ${errorMessage}` 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
