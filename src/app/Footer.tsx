"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { RiKakaoTalkFill } from "react-icons/ri";
import { SiYoutube, SiThreads } from "react-icons/si";
import { FaBlogger, FaMugHot } from "react-icons/fa";

export default function Footer() {
  const pathname = usePathname();

  // 계정 찾기/비밀번호 재설정 페이지에서는 푸터를 숨김 (로그인, 회원가입 페이지는 표시)
  if (pathname?.startsWith('/account/')) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          <div>
            <div className="mb-4">
              <Image
                src="/images/footer-logo.png"
                alt="LIRA Logo"
                width={120}
                height={40}
                className="h-auto w-auto"
              />
            </div>
            <p className="text-sm whitespace-pre-line">
              이용자들의 검증이 완료된 전문적인{"\n"}
              민간조사 서비스를 제공합니다.
            </p>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-lg font-bold text-white mb-4">회사 정보</h3>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-white">주식회사 엘아이알에이(LIRA Co., Ltd.)</p>
              <p>문의전화 : 070-7599-4030</p>
              <p>이 메 일 : jylee@lira365.com</p>
              <p>사업자번호 : 450-86-03429</p>
              <p>대표자 : 이재훈</p>
              <p>오시는 길 : 경기도 성남시 수정구 산성대로67, 2층</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-4">공식 채널</h3>
            <div className="flex gap-3">
              <Link href="https://pf.kakao.com/_bxbSxgn" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2.5 rounded-full hover:bg-[#FEE500] hover:text-[#3C1E1E] transition-colors" title="카카오톡 채널">
                <RiKakaoTalkFill size={20} />
              </Link>
              <Link href="#" className="bg-gray-800 p-2.5 rounded-full hover:bg-[#03C75A] hover:text-white transition-colors" title="네이버 블로그">
                <FaBlogger size={18} />
              </Link>
              <Link href="https://www.youtube.com/@lira.lira.36524" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2.5 rounded-full hover:bg-[#FF0000] hover:text-white transition-colors" title="유튜브">
                <SiYoutube size={18} />
              </Link>
              <Link href="#" className="bg-gray-800 p-2.5 rounded-full hover:bg-black hover:text-white transition-colors" title="스레드">
                <SiThreads size={18} />
              </Link>
              <Link href="#" className="bg-gray-800 p-2.5 rounded-full hover:bg-[#03C75A] hover:text-white transition-colors" title="네이버 카페">
                <FaMugHot size={18} />
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              아이콘을 클릭하여 LIRA의 최신 소식을 확인하세요.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-sm">
          <p className="mb-4 sm:mb-0">&copy; {new Date().getFullYear()} LIRA. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-white">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
