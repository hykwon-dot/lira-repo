import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Zod schemas for validation
const TaskSchema = z.object({
  taskKey: z.string(),
  desc: z.string(),
  competency: z.string(),
});

const RiskSchema = z.object({
  riskKey: z.string(),
  name: z.string(),
  severity: z.string(),
  trigger: z.string(),
  mitigation: z.string(),
});

const PhaseSchema = z.object({
  name: z.string(),
  description: z.string(),
  durationDays: z.number().optional(),
  budget: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  tasks: z.array(TaskSchema).optional(),
  phaseKPI: z.array(z.string()).optional(),
  risks: z.array(RiskSchema).optional(),
});

const ScenarioSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  phases: z.array(PhaseSchema).optional(),
});

const AnalysisRequestSchema = z.object({
  userMessages: z.array(z.string()),
  assistantMessages: z.array(z.string()),
  conversationId: z.string(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
  const { userMessages, assistantMessages } = AnalysisRequestSchema.parse(body);

    // Combine conversation context
    const conversationContext = userMessages.map((msg, index) => 
      `사용자: ${msg}\n어시스턴트: ${assistantMessages[index] || ''}`
    ).join('\n\n');

    const analysisPrompt = `다음은 사용자와 AI 어시스턴트 간의 대화입니다:

${conversationContext}

이 대화를 바탕으로 다음을 분석해 주세요:

1. 키워드 추출 (3-5개)
2. 비즈니스 시나리오 생성 (제목, 설명, 실행 단계)
3. 권장 질문 생성 (3-4개)

응답은 반드시 다음 JSON 형식으로만 제공해주세요:

{
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "generatedScenario": {
    "title": "시나리오 제목",
    "description": "시나리오 설명",
    "phases": [
      {
        "name": "단계명",
        "description": "단계 설명",
        "durationDays": 30,
        "budget": "예산 정보",
        "tasks": [
          {
            "taskKey": "과업 키",
            "desc": "과업 설명",
            "competency": "필요 역량"
          }
        ],
        "risks": [
          {
            "riskKey": "리스크 키",
            "name": "리스크명",
            "severity": "높음",
            "trigger": "발생 조건",
            "mitigation": "대응 방안"
          }
        ]
      }
    ]
  },
  "recommendedQuestions": [
    "추가로 논의하고 싶은 질문1",
    "추가로 논의하고 싶은 질문2",
    "추가로 논의하고 싶은 질문3"
  ]
}

대화 내용이 구체적인 비즈니스 주제를 다루지 않는 경우, 일반적인 비즈니스 시나리오를 제안해주세요.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "당신은 비즈니스 전략 분석 전문가입니다. 사용자의 대화를 분석하여 실용적인 비즈니스 시나리오와 실행 계획을 제안합니다. 반드시 JSON 형식으로만 응답해주세요."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let analysisResult;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseContent;
      analysisResult = JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', responseContent, error);
      // Fallback response
      analysisResult = {
        keywords: ["비즈니스", "전략", "계획"],
        generatedScenario: {
          title: "비즈니스 전략 수립",
          description: "체계적인 비즈니스 전략을 수립하고 실행하는 프로세스",
          phases: [
            {
              name: "현황 분석",
              description: "현재 비즈니스 상황을 종합적으로 분석합니다",
              durationDays: 14,
              tasks: [
                {
                  taskKey: "시장분석",
                  desc: "목표 시장의 현황과 트렌드를 분석합니다",
                  competency: "시장조사 및 데이터 분석"
                }
              ]
            }
          ]
        },
        recommendedQuestions: [
          "구체적인 비즈니스 목표를 설정해볼까요?",
          "현재 직면한 주요 과제는 무엇인가요?",
          "목표 달성을 위한 자원은 어느 정도 확보되어 있나요?"
        ]
      };
    }

    // Validate the response structure
    const validatedResult = {
      keywords: Array.isArray(analysisResult.keywords) ? analysisResult.keywords : ["비즈니스", "전략"],
      generatedScenario: analysisResult.generatedScenario ? ScenarioSchema.parse(analysisResult.generatedScenario) : null,
      recommendedQuestions: Array.isArray(analysisResult.recommendedQuestions) ? analysisResult.recommendedQuestions : []
    };

    return NextResponse.json(validatedResult);

  } catch (error) {
    console.error('Analysis API error:', error);
    
    // Return a fallback response
    return NextResponse.json({
      keywords: ["대화", "분석", "전략"],
      generatedScenario: {
        title: "대화 기반 전략 수립",
        description: "AI와의 대화를 통해 전략적 인사이트를 도출합니다",
        phases: [
          {
            name: "대화 분석",
            description: "대화 내용을 바탕으로 핵심 이슈를 파악합니다",
            durationDays: 7,
            tasks: [
              {
                taskKey: "이슈파악",
                desc: "핵심 비즈니스 이슈를 정의합니다",
                competency: "분석적 사고"
              }
            ]
          }
        ]
      },
      recommendedQuestions: [
        "더 구체적인 상황을 설명해주시겠어요?",
        "어떤 결과를 기대하고 계신가요?",
        "현재 가장 우선순위가 높은 과제는 무엇인가요?"
      ]
    });
  }
}
