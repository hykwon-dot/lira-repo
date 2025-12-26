"use client";

import Link from 'next/link';

export default function KakaoChannelButton() {
  // Replace with your actual Kakao Channel URL
  const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_grQtn"; 

  return (
    <Link
      href={KAKAO_CHANNEL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#FEE500] rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
      aria-label="카카오톡 채널 문의하기"
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3C6.477 3 2 6.358 2 10.5C2 13.226 3.765 15.635 6.448 16.91L5.55 20.205C5.46 20.535 5.83 20.795 6.12 20.605L10.08 17.975C10.705 18.035 11.345 18.065 12 18.065C17.523 18.065 22 14.707 22 10.565C22 6.423 17.523 3 12 3Z" fill="#3C1E1E"/>
      </svg>
    </Link>
  );
}
