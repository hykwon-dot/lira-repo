"use client";
import PersonaFeed from './PersonaFeed';
import Image from 'next/image';

export default function PersonaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7fafd] to-[#e6ecf5] flex flex-col items-center p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-[#1a2340] flex items-center justify-center gap-3">
          <Image src="/persona-illust.png" alt="탐정" width={40} height={40} />
          전문 민간조사원 소개
        </h1>
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <PersonaFeed />
        </div>
      </div>
    </div>
  );
}
