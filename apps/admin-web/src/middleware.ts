import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@lira/core/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 로그인 페이지와 정적 파일은 통과
  if (
    pathname.startsWith("/login") || 
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") || 
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. 쿠키에서 토큰 확인
  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // 3. 토큰 유효성 및 관리자 권한 검증
    const decoded = await verifyToken(token);
    if (!decoded || !["ADMIN", "SUPER_ADMIN"].includes(decoded.role)) {
      throw new Error("Unauthorized");
    }

    return NextResponse.next();
  } catch (error) {
    // 유효하지 않은 토큰이면 로그인 페이지로 리다이렉트 및 쿠키 삭제
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("admin_token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
