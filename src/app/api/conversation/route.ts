import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { MessageRole, type Conversation, type Message, type PrismaClient } from '@prisma/client';
import { getPrismaClient } from '@/lib/prisma';

function parseUserId(raw: unknown) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error('INVALID_USER_ID');
  }
  return value;
}

function sanitizeContent(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

async function resolveConversationByExternalId(prismaClient: PrismaClient, externalId: string | null | undefined) {
  if (!externalId) return null;
  const cleaned = externalId.trim();
  if (!cleaned) return null;
  return prismaClient.conversation.findUnique({ where: { externalId: cleaned } });
}

type ConversationWithMessages = Conversation & { messages?: Message[] };

function buildResponse(conversation: ConversationWithMessages | Conversation | null, messages: Message[] = []) {
  if (!conversation) return null;
  return {
    conversation: {
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      status: conversation.status,
      externalId: conversation.externalId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages,
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const userId = parseUserId(payload?.userId);
    const question = sanitizeContent(payload?.question);
    const answer = sanitizeContent(payload?.answer);
    const requestedExternalId: string | null = typeof payload?.conversationId === 'string' ? payload.conversationId : null;

    if (!question && !answer) {
      return NextResponse.json({ error: '내용이 필요합니다' }, { status: 400 });
    }

    const prisma = await getPrismaClient();

    let conversation = await resolveConversationByExternalId(prisma, requestedExternalId);
    if (conversation && conversation.userId !== userId) {
      return NextResponse.json({ error: '해당 대화에 접근할 수 없습니다' }, { status: 403 });
    }

    if (!conversation) {
      const externalId = requestedExternalId?.trim() || randomUUID();
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: question || '새로운 대화',
          externalId,
        },
      });
    }

  const messagesToCreate: Array<{ conversationId: number; role: MessageRole; content: string }> = [];
    if (question) {
      messagesToCreate.push({ conversationId: conversation.id, role: MessageRole.USER, content: question });
    }
    if (answer) {
      messagesToCreate.push({ conversationId: conversation.id, role: MessageRole.AI, content: answer });
    }

    if (messagesToCreate.length > 0) {
      await prisma.message.createMany({ data: messagesToCreate });
    }

    const fullConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(
      buildResponse(fullConversation, fullConversation?.messages ?? [])
    );
  } catch (error) {
    console.error('대화 저장 오류:', error);
    if (error instanceof Error && error.message === 'INVALID_USER_ID') {
      return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다' }, { status: 400 });
    }
    return NextResponse.json({ error: '대화 저장에 실패했습니다' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUserId = searchParams.get('userId');
    const externalId = searchParams.get('conversationId');

    if (!rawUserId) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다' }, { status: 400 });
    }

    const userId = parseUserId(rawUserId);
    const prisma = await getPrismaClient();

    if (externalId) {
      const conversation = await prisma.conversation.findFirst({
        where: { userId, externalId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        return NextResponse.json({ error: '대화를 찾을 수 없습니다' }, { status: 404 });
      }

      const messages = conversation.messages ?? [];
      return NextResponse.json(buildResponse(conversation, messages));
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(
      conversations.map((item) => {
        const messages = item.messages ?? [];
        return buildResponse(item, messages);
      })
    );
  } catch (error) {
    console.error('대화 조회 오류:', error);
    if (error instanceof Error && error.message === 'INVALID_USER_ID') {
      return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다' }, { status: 400 });
    }
    return NextResponse.json({ error: '대화를 가져오는데 실패했습니다' }, { status: 500 });
  }
}
