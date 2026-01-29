"use client";
import LawCopilot from './LawCopilot';
import Image from 'next/image';

export default function LawPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7fafd] to-[#e6ecf5] flex flex-col items-center p-8">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-[#1a2340] flex items-center justify-center gap-3">
          <Image src="/law-illust.png" alt="법률 Copilot" width={40} height={40} />
          법률/규제 진단 Copilot
        </h1>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <LawCopilot />
        </div>
      </div>
    </div>
  );
}
