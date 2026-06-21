"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("App Error: ", error);
  }, [error]);

  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-800">
        <section className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="text-4xl font-bold text-slate-900">문제가 발생했어요</h1>
          <p className="mt-4 max-w-xl text-lg">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도하시거나, 아래 버튼을 눌러 페이지를 새로고침해 주세요.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-6 py-3 text-white shadow-sm transition hover:bg-blue-700"
          >
            다시 시도하기
          </button>
        </section>
      </body>
    </html>
  );
}
