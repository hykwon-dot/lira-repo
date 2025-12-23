'use client';

import Link from 'next/link';

export default function InvestigatorsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white pb-20 pt-16">
      <div className="lira-container flex flex-col items-center justify-center gap-8 text-center">
        <div className="rounded-[32px] border border-red-200 bg-red-50/80 p-12 shadow-lg">
          <h2 className="text-2xl font-bold text-red-800 mb-4">
            탐정 목록을 불러오는 중 오류가 발생했습니다
          </h2>
          <p className="text-red-600 mb-6">
            데이터베이스 연결에 문제가 있거나 서버에서 일시적인 오류가 발생했습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="lira-button lira-button--primary"
            >
              다시 시도
            </button>
            <Link href="/" className="lira-button lira-button--secondary">
              홈으로 돌아가기
            </Link>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-red-700 font-medium">
                개발자 정보 (개발 환경에서만 표시)
              </summary>
              <pre className="mt-2 text-xs text-red-600 bg-red-100 p-3 rounded overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}