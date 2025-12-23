"use client";

import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center text-slate-700">
      <h1 className="text-6xl font-bold text-slate-900">404</h1>
      <p className="mt-4 text-lg max-w-xl">
        요청하신 페이지를 찾을 수 없습니다. 주소를 다시 확인하시거나 아래 버튼을 통해 홈으로 이동해주세요.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white shadow-sm transition hover:bg-blue-700"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
