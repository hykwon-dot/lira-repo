import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY 
        ? `Present (starts with ${process.env.OPENAI_API_KEY.substring(0, 7)}...)` 
        : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL 
        ? 'Present' 
        : 'MISSING',
    },
    checks: {} as Record<string, unknown>
  };

  // 1. Check OpenAI
  const sanitizeKey = (key: string | undefined) => {
    if (!key) return '';
    let cleaned = key.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
    if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
    return cleaned;
  };

  const apiKey = sanitizeKey(process.env.OPENAI_API_KEY);
  
  if (apiKey) {
    try {
      const openai = createOpenAI({ apiKey });
      const { text } = await generateText({
        model: openai('gpt-3.5-turbo'),
        prompt: 'Hello',
      });
      (results.checks as Record<string, unknown>).openai = { status: 'OK', response: text };
    } catch (error) {
      const err = error as Error & { code?: string; status?: number };
      (results.checks as Record<string, unknown>).openai = { 
        status: 'ERROR', 
        message: err.message,
        code: err.code || err.status 
      };
    }
  } else {
    (results.checks as Record<string, unknown>).openai = { status: 'SKIPPED', reason: 'No API Key' };
  }

  // 2. Check Database
  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient();
    try {
      // Try a simple query
      const userCount = await prisma.user.count();
      (results.checks as Record<string, unknown>).database = { status: 'OK', userCount };
    } catch (error) {
      const err = error as Error;
      (results.checks as Record<string, unknown>).database = { 
        status: 'ERROR', 
        message: err.message 
      };
    } finally {
      await prisma.$disconnect();
    }
  } else {
    (results.checks as Record<string, unknown>).database = { status: 'SKIPPED', reason: 'No Database URL' };
  }

  return NextResponse.json(results, { status: 200 });
}
