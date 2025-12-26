"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
            <h3 className="text-lg font-bold text-white mb-4">LIRA</h3>
            <p className="text-sm">전문적인 민간조사 서비스를 제공합니다.</p>
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
            <h3 className="text-lg font-bold text-white mb-4">최신 소식 받기</h3>
            <form className="flex flex-col">
              <input 
                type="email" 
                placeholder="이메일을 입력하세요" 
                className="bg-gray-800 text-white px-3 py-2 rounded-md focus:outline-none w-full mb-2" 
              />
              <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-md"
              >
                구독하기
              </button>
            </form>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center text-sm">
          <p className="mb-4 sm:mb-0">&copy; {new Date().getFullYear()} LIRA. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white">개인정보처리방침</Link>
            <Link href="#" className="hover:text-white">이용약관</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
