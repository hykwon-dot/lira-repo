"use client";
import ReportDashboard from './ReportDashboard';
import Image from 'next/image';

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7fafd] to-[#e6ecf5] flex flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-[#1a2340] flex items-center justify-center gap-3">
          <Image src="/report-illust.svg" alt="조사 결과" width={48} height={48} />
          조사 결과 분석 & 리포트
        </h1>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <ReportDashboard />
        </div>
      </div>
    </div>
  );
}
