import { NextResponse } from "next/server";
import { prisma } from "@lira/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error("[API_CHATS_MEMBERS]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch member conversations" },
      { status: 500 }
    );
  }
}
