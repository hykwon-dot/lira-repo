"use client";

import Link from "next/link";
import Image from "next/image";
import { useUserStore, User } from "@/lib/userStore";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Menu, X } from "lucide-react";

export default function Header() {
  const { user, logout } = useUserStore();
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setLoggedInUser(user);
  }, [user]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const showMyPageButton = Boolean(
    loggedInUser && ["user", "enterprise", "investigator", "admin", "super_admin"].includes(loggedInUser.role),
  );

  const handleLogout = () => {
    logout();
    setLoggedInUser(null); // 로컬 상태도 즉시 업데이트
    router.push('/');
  };

  const navLinks = [
    { href: "/", label: "홈" },
    { href: "/simulation", label: "AI 시뮬레이션" },
    { href: "/scenarios", label: "시나리오 라이브러리" },
    { href: "/report", label: "데이터 리포트" },
  ];

  const isLinkActive = useMemo(() => {
    if (!pathname) return () => false;
    return (href: string) => {
      if (href === "/") {
        return pathname === "/";
      }
      return pathname.startsWith(href);
    };
  }, [pathname]);

  // 로그인/회원가입 페이지에서는 헤더를 숨김
  if (pathname === '/login' || pathname === '/register' || pathname?.startsWith('/account/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 shadow-md backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:h-20">
        <div className="flex flex-1 items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/lione-logo.svg"
              alt="LIONE 로고"
              width={180}
              height={54}
              priority
              className="h-8 w-auto md:h-10"
            />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-500 lg:flex">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap pb-0.5 transition-colors ${
                    active
                      ? "text-blue-600 after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-full after:rounded-full after:bg-blue-500"
                      : "text-slate-500 hover:text-blue-500"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden flex-shrink-0 items-center gap-4 md:flex">
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
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="모바일 메뉴 열기"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-500"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="모바일 메뉴 닫기"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          />
          <nav className="fixed top-0 right-0 z-50 flex h-full w-[78vw] max-w-xs flex-col gap-6 border-l border-slate-100 bg-white px-6 py-8 shadow-xl md:hidden">
            <div className="flex items-center justify-between">
              <Image
                src="/images/lione-logo.svg"
                alt="LIONE 로고"
                width={160}
                height={48}
                className="h-8 w-auto"
              />
              <button
                type="button"
                aria-label="모바일 메뉴 닫기"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              {loggedInUser ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">{loggedInUser.name}님</p>
                  <p className="text-xs text-slate-500">{loggedInUser.email}</p>
                  {showMyPageButton && (
                    <Link
                      href="/my-page"
                      className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                    >
                      내페이지로 이동
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:border-blue-300"
                  >
                    로그인
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex items-center justify-between rounded-xl border border-transparent px-3 py-3 text-sm font-medium text-slate-600 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <span>{link.label}</span>
                    <span className="text-xs text-slate-400">바로가기</span>
                  </Link>
                </li>
              ))}
            </ul>
            {loggedInUser ? (
              <div className="mt-auto space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">알림</span>
                  <ErrorBoundary>
                    <div className="scale-90 transform">
                      <NotificationBell />
                    </div>
                  </ErrorBoundary>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-300"
                >
                  로그아웃
                </button>
              </div>
            ) : null}
          </nav>
        </>
      )}
    </header>
  );
}
