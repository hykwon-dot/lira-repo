"use client";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 py-16 text-center text-slate-700">
      <h1 className="text-8xl font-bold text-slate-900 mb-6">404</h1>
      
      <h2 className="text-3xl font-semibold text-slate-800 mb-4">
        페이지를 찾을 수 없습니다
      </h2>
      
      <p className="mt-4 text-lg max-w-2xl text-slate-600 leading-relaxed">
        요청하신 페이지가 존재하지 않거나, 서비스가 일시적으로 중단되었습니다.
        <br />
        새로운 업데이트를 준비 중이니 조금만 기다려 주세요.
      </p>

      <div className="mt-12 p-8 bg-white rounded-lg shadow-md max-w-md">
        <p className="text-base text-slate-600 mb-4">
          문의사항이 있으시면 아래로 연락주세요:
        </p>
        <p className="text-base text-blue-600 font-medium my-2">
          📧 jylee@lira365.com
        </p>
        <p className="text-base text-blue-600 font-medium my-2">
          📞 070-7599-4030
        </p>
        <p className="text-sm text-slate-500 mt-4">
          주식회사 리라 (LIRA Co., Ltd.)
        </p>
      </div>
    </div>
  );
}
