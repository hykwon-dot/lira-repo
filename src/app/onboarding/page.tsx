"use client";
import OnboardingAdmin from './OnboardingAdmin';
import Image from 'next/image';

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7fafd] to-[#e6ecf5] flex flex-col items-center p-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-[#1a2340] flex items-center justify-center gap-3">
          <Image src="/onboarding-illust.svg" alt="온보딩" width={48} height={48} />
          온보딩 AI 관리
        </h1>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <OnboardingAdmin />
        </div>
      </div>
    </div>
  );
}
