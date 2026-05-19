"use client";

import Link from 'next/link';
import { RiKakaoTalkFill } from "react-icons/ri";
import { FaMugHot } from "react-icons/fa";

export default function FloatingChannelButtons() {
  const KAKAO_CHANNEL_URL = "http://pf.kakao.com/_bxbSxgn";
  const NAVER_CAFE_URL = "https://cafe.naver.com/lione365?iframe_url=/MyCafeIntro.nhn%3Fclubid=31641901";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* Naver Cafe Button */}
      <Link
        href={NAVER_CAFE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 bg-[#03C75A] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
        aria-label="네이버 카페 바로가기"
        title="네이버 카페"
      >
        <FaMugHot size={26} />
      </Link>

      {/* Kakao Channel Button */}
      <Link
        href={KAKAO_CHANNEL_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-14 h-14 bg-[#FEE500] text-[#3C1E1E] rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300"
        aria-label="카카오톡 채널 문의하기"
        title="카카오톡 채널"
      >
        <RiKakaoTalkFill size={32} />
      </Link>
    </div>
  );
}
