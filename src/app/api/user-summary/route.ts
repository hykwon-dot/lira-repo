import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import type { Prisma, PrismaClient } from '@prisma/client';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface StepPayload {
  stepNumber?: unknown;
  step?: unknown;
  title?: unknown;
  description?: unknown;
  fullDesc?: unknown;
  shortDesc?: unknown;
}

interface SummaryRequestBody {
  userId?: unknown;
  conversationId?: unknown;
  steps?: unknown;
  stepNumber?: unknown;
  step?: unknown;
  title?: unknown;
  shortDesc?: unknown;
  fullDesc?: unknown;
  status?: unknown;
  relatedQuestion?: unknown;
  parentStepId?: unknown;
}

async function resolveConversationNumericId(prismaClient: PrismaClient, externalId: unknown, userId?: number) {
  if (typeof externalId !== 'string' || !externalId.trim()) {
    return null;
  }

  const conversation = await prismaClient.conversation.findFirst({
    where: {
      externalId: externalId.trim(),
      ...(userId ? { userId } : {}),
    },
  });

  return conversation?.id ?? null;
}

function parseUserId(raw: unknown) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('INVALID_USER_ID');
  }
  return value;
}

// 사용자별 요약 카드 가져오기
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUserId = searchParams.get('userId');
    const conversationExternalId = searchParams.get('conversationId');
    
    if (!rawUserId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const userId = parseUserId(rawUserId);

  const whereClause: Prisma.UserSummaryWhereInput = { userId };
    if (conversationExternalId) {
      const numericConversationId = await resolveConversationNumericId(prisma, conversationExternalId, userId);
      if (!numericConversationId) {
        return NextResponse.json([]);
      }
      whereClause.conversationId = numericConversationId;
    }

  const summaries = await prisma.userSummary.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(summaries);
  } catch (error) {
    console.error('요약 조회 오류:', error);
    if (error instanceof Error && error.message === 'INVALID_USER_ID') {
      return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다' }, { status: 400 });
    }
    return NextResponse.json({ error: '요약을 가져오는데 실패했습니다' }, { status: 500 });
  }
}

// 새로운 요약 카드 저장
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: '잘못된 요청 형식입니다' }, { status: 400 });
    }

  const prisma = await getPrismaClient();
  const payload = body as SummaryRequestBody;
  const userId = parseUserId(payload.userId);
  const conversationNumericId = await resolveConversationNumericId(prisma, payload.conversationId, userId);
    const relatedQuestion = typeof payload.relatedQuestion === 'string' ? payload.relatedQuestion : '';

    // steps 배열로 여러 요약 생성
    if (Array.isArray(payload.steps)) {
  const summaries = [] as Awaited<ReturnType<typeof prisma.userSummary.create>>[];
      const stepInputs = (payload.steps as unknown[]).filter(isRecord) as StepPayload[];
      for (const step of stepInputs) {
        const description = typeof step.description === 'string' ? step.description : undefined;
        const fullDesc = typeof step.fullDesc === 'string' ? step.fullDesc : undefined;
        const rawDesc = description ?? fullDesc ?? '';
        const record = await prisma.userSummary.create({
          data: {
            userId,
            conversationId: conversationNumericId,
            stepNumber:
              typeof step.stepNumber === 'number'
                ? step.stepNumber
                : typeof step.step === 'number'
                  ? step.step
                  : 0,
            title: typeof step.title === 'string' ? step.title : '',
            fullDesc: rawDesc,
            shortDesc:
              typeof step.shortDesc === 'string'
                ? step.shortDesc
                : rawDesc.substring(0, 50),
            status: '대기중',
            relatedQuestion,
            parentStepId: null,
          }
        });
        summaries.push(record);
      }
      return NextResponse.json(summaries);
    }
    // 단일 생성 요청
  const summary = await prisma.userSummary.create({
      data: {
        userId,
        conversationId: conversationNumericId,
        stepNumber:
          typeof payload.stepNumber === 'number'
            ? payload.stepNumber
            : typeof payload.step === 'number'
              ? payload.step
              : 0,
        title: typeof payload.title === 'string' ? payload.title : '',
        shortDesc:
          typeof payload.shortDesc === 'string'
            ? payload.shortDesc
            : typeof payload.fullDesc === 'string'
              ? payload.fullDesc.substring(0, 50)
              : '',
        fullDesc: typeof payload.fullDesc === 'string' ? payload.fullDesc : '',
        status: typeof payload.status === 'string' ? payload.status : '대기중',
        relatedQuestion,
        parentStepId: typeof payload.parentStepId === 'number' ? payload.parentStepId : null,
      }
    });
    return NextResponse.json(summary);
  } catch (error) {
    console.error('요약 저장 오류:', error);
    if (error instanceof Error && error.message === 'INVALID_USER_ID') {
      return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다' }, { status: 400 });
    }
    return NextResponse.json({ error: '요약 저장에 실패했습니다' }, { status: 500 });
  }
}

// 요약 삭제 (로그아웃 시 선택적으로)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUserId = searchParams.get('userId');
    
    if (!rawUserId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 });
    }

  const prisma = await getPrismaClient();
  const userId = parseUserId(rawUserId);

    await prisma.userSummary.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ message: '요약이 삭제되었습니다' });
  } catch (error) {
    console.error('요약 삭제 오류:', error);
    if (error instanceof Error && error.message === 'INVALID_USER_ID') {
      return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다' }, { status: 400 });
    }
    return NextResponse.json({ error: '요약 삭제에 실패했습니다' }, { status: 500 });
  }
}
