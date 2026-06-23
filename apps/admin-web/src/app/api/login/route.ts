import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lira/database";
import { verifyPassword, signToken } from "@lira/core";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
    }

    // 1. 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "등록되지 않은 관리자 계정입니다." }, { status: 404 });
    }

    // 2. 관리자 권한 확인 (ADMIN 또는 SUPER_ADMIN만 허용)
    if (!["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 });
    }

    // 3. 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
    }

    // 4. 토큰 생성
    const token = await signToken({ userId: user.id, role: user.role });

    // 5. 쿠키에 토큰 저장 및 응답
    const response = NextResponse.json({ success: true });
    
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24시간
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[ADMIN_LOGIN_ERROR]", error);
    return NextResponse.json({ error: "로그인 처리 중 서버 오류가 발생했습니다." }, { status: 500 });
  }
}
