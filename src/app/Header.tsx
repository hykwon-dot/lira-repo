"use client";

import Link from "next/link";
import { useUserStore, User } from "@/lib/userStore";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function Header() {
  const { user, logout } = useUserStore();
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setLoggedInUser(user);
  }, [user]);

  const showMyPageButton = Boolean(
    loggedInUser && ["user", "enterprise", "investigator", "admin", "super_admin"].includes(loggedInUser.role),
  );

  const handleLogout = () => {
    logout();
    setLoggedInUser(null); // 로컬 상태도 즉시 업데이트
    router.push('/');
  };

  // 로그인/회원가입 페이지에서는 헤더를 숨김
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container mx-auto px-4 h-20 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img 
            src="/images/lione-logo.svg" 
            alt="LI-ONE 로고" 
            className="h-8 w-8"
            onError={(e) => {
              // 이미지 로드 실패 시 폴백 SVG 표시
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <Link href="/" className="text-2xl font-bold text-gray-800">
            LI-ONE
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {loggedInUser && (
            <ErrorBoundary>
              <NotificationBell />
            </ErrorBoundary>
          )}
          {loggedInUser ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-600 md:block">안녕하세요, {loggedInUser.name}님</span>
              {showMyPageButton && (
                <Link
                  href="/my-page"
                  className="lira-button lira-button--secondary text-xs md:text-sm"
                >
                  내페이지
                </Link>
              )}
              <button onClick={handleLogout} className="lira-button lira-button--danger text-xs md:text-sm">
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="lira-button lira-button--ghost text-sm">
                로그인
              </Link>
              <Link href="/register" className="lira-button lira-button--primary text-sm">
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
