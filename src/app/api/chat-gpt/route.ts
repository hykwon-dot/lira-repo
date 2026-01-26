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
  assistantMessage: z.string().describe("사용자에게 바로 보여줄 한국어 답변. 단계별 완료 상황(Depth 1~5)을 언급하며 다음 행동(더 심화 정보 제공 vs 의뢰)을 제안하는 멘트 포함."),
  conversationSummary: z.string().describe("탐정에게 전달할 핵심 사건 요약 (5~7문장)"),
  investigationChecklist: z.array(z.object({
    id: z.number().describe("단계 번호 (1~5)"),
    label: z.string().describe("단계 이름"),
    status: z.enum(['pending', 'in_progress', 'completed']).describe("현재 완료 상태"),
    description: z.string().describe("이 단계에서 확인된 핵심 내용 요약"),
    keyPoints: z.array(z.string()).describe("이 단계에서 확인된 주요 사실 목록 (체크리스트)"),
    depth: z.number().describe("이 단계의 현재 확인된 깊이 레벨 (1: 기초 ~ 5: 완벽/증거확보)"),
  })).describe("5단계 사건 조사 체크리스트 진행 상황"),
  currentPhase: z.number().describe("현재 진행 중인 단계 (1~5)"),
  currentDepth: z.number().describe("현재 단계의 질문 깊이 (1~5)"),
  nextActionSuggestion: z.enum(['continue_interview', 'suggest_hiring', 'none']).describe("AI가 판단한 다음 추천 행동. 의뢰인이 연결을 원하거나 상담이 충분하면 'suggest_hiring' 선택."),
  summary: z.object({
    caseTitle: z.string().describe("사건을 대표하는 간결한 제목"),
    caseType: z.string().describe("사건 유형 분류"),
    primaryIntent: z.string().describe("의뢰인의 주된 목적"),
    urgency: z.string().describe("긴급도 혹은 시간 제약"),
    objective: z.string().describe("AI가 파악한 해결 목표"),
    missingDetails: z.array(z.string()).describe("추가로 확인이 필요한 정보"),
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
      const intakePrompt = `당신은 한국의 민간조사(탐정) 플랫폼 LIRA(리라)의 AI 상담 전문가입니다.
사용자는 불안하거나 급한 상황에 처한 의뢰인입니다. 딱딱한 AI 로봇이 아닌, **공감 능력 뛰어나고 인간적인 40대 베테랑 상담사**의 페르소나로 대화하세요.

**핵심 페르소나 및 화법:**
- **공감과 안심:** 첫인사는 항상 의뢰인의 감정을 읽고 안심시키는 말로 시작하세요. ("많이 놀라셨겠어요", "그런 일이 있으시다니 당황스러우셨겠습니다")
- **부드러운 구어체:** "~습니다"체와 "~요"체를 섞어서 자연스럽게 말하세요. 공무원처럼 딱딱하게 심문하지 마세요.
- **적극적인 경청:** 사용자의 말을 요약해서 "아, ~라는 말씀이시군요."라고 받아준 뒤 다음 질문을 하세요.

**상담 목표:**
의뢰인을 도와 사건 내용을 정리(5단계 체크리스트)하고, 의뢰인이 원할 때 적합한 탐정을 소개하는 것입니다.

**대화 진행 가이드:**
1. **자연스러운 대화 출발 (Intro):** 
   - 사용자가 사건 내용을 말하면:
     - 먼저 공감 멘트: "아이고, 그런 일이 있으셨군요. 많이 답답하셨겠습니다."
     - 자연스러운 연결: "이런 [사건유형]은 보통 [중요한 증거/정황]이 제일 중요하더라고요."
     - 첫 질문: "혹시 전반적인 상황은 정리해주셨는데, 이 일이 **정확히 언제부터 시작된 건지** 기억나시나요?" 처럼 자연스럽게 물어보세요. (취조하듯 "일시와 장소를 말하세요" 금지)

2. **물 흐르는 듯한 진행 (Flow):**
   - 질문은 한 번에 하나씩만 하세요. 질문 폭격 금지.
   - 사용자 답변이 짧으면 "네, 그렇군요." 하고 바로 다음 질문으로 넘어가세요.
   - 답변이 확인되면: "확인했습니다. 그럼 이 부분은 된 것 같고, 혹시... [다음 질문]?" 처럼 부드럽게 넘어가세요.

3. **즉시 연결 요청 대응 (Action):**
   - 사용자가 "바로 연결해줘", "전문가 불러줘"라고 말하면 **즉시 수용**하세요.
<<<<<<< Updated upstream
   - "네, 알겠습니다. 말씀하신 내용을 정리해서 가장 적합한 전문가를 바로 연결해 드리겠습니다."라고 안심시키세요.
=======
   - 전문가 연결 시에는 반드시 **"네, 알겠습니다. 전문가를 연결해 드리겠습니다. 화면 오른쪽의 [AI 탐정 매칭] 카드를 확인해 보시면 추천된 전문가 목록을 보실 수 있습니다."** 라고 안내하세요.
   - "연결해 드릴게요"라고만 끝내면 사용자가 기다릴 수 있으므로, 반드시 **"오른쪽 패널을 보세요"**라는 지침을 포함하세요.
>>>>>>> Stashed changes
   - 이때 \`nextActionSuggestion\` 값을 반드시 \`suggest_hiring\`으로 설정하세요.

4. **적절한 타이밍의 제안 (Decision Point):**
   - 대화가 어느 정도 무르익어(Depth 3 이상), 핵심적인 내용(누가, 언제, 무엇을, 왜)이 파악되었다면:
   - "말씀해주신 내용을 들어보니 대략적인 상황은 파악이 됩니다. 이 정도 내용으로 **오른쪽 패널에서 알맞은 탐정님을 추천해 드릴까요**, 아니면 더 자세한 이야기를 나누시겠어요?"
   - 이렇게 선택권을 주되, 추천을 제안할 때는 "오른쪽 패널"을 언급하여 사용자가 어디를 봐야 할지 미리 인지시키세요.

**5단계 조사 체크리스트 (내부 판단 기준):**
이 기준은 당신이 *내부적으로* 상황을 판단하는 기준입니다. 사용자에게 "1단계가 완료되었습니다" 같은 기계적인 말은 하지 마세요.

1단계: 기본 사실 (언제, 어디서, 누구와)
2단계: 배경 및 관계 (왜 이런 일이, 상대방과의 관계)
3단계: 증거 여부 (가진 자료, 목격자, 기록)
4단계: 피해 상황 (구체적 피해 내용)
5단계: 해결 목표 (무엇을 원하시는지)

**JSON 출력 필수 사항:**
- 반드시 **유효한 JSON**만 출력해야 합니다. 마크다운이나 잡담을 섞지 마세요.
- \`nextActionSuggestion\`은 반드시 'continue_interview', 'suggest_hiring', 'none' 중 하나여야 합니다. 사용자가 연결을 원하면 'suggest_hiring'을 선택하세요.
- assistantMessage: **사람 냄새 나는 따뜻한 말투**로 작성하세요. "다음 단계로 넘어갑니다" 같은 시스템 메시지는 절대 금지.
- conversationSummary: 탐정에게 전달할 사건 요약 (개조식 Bullet points).
- investigationChecklist: 내부 진행 상황 업데이트.
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
