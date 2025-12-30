import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY 
        ? `Present (starts with ${process.env.OPENAI_API_KEY.substring(0, 7)}...)` 
        : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL 
        ? 'Present' 
        : 'MISSING',
    },
    checks: {}
  };

  // 1. Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { text } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: 'Hello',
      });
      results.checks.openai = { status: 'OK', response: text };
    } catch (error: any) {
      results.checks.openai = { 
        status: 'ERROR', 
        message: error.message,
        code: error.code || error.status 
      };
    }
  } else {
    results.checks.openai = { status: 'SKIPPED', reason: 'No API Key' };
  }

  // 2. Check Database
  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient();
    try {
      // Try a simple query
      const userCount = await prisma.user.count();
      results.checks.database = { status: 'OK', userCount };
    } catch (error: any) {
      results.checks.database = { 
        status: 'ERROR', 
        message: error.message 
      };
    } finally {
      await prisma.$disconnect();
    }
  } else {
    results.checks.database = { status: 'SKIPPED', reason: 'No Database URL' };
  }

  return NextResponse.json(results, { status: 200 });
}
