"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from 'react';

type Banner = {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  type: 'MAIN_LARGE' | 'MAIN_SMALL';
  isActive: boolean;
  order: number;
};

type Award = {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string;
  date: string;
};

const CustomArrow = () => (
  <svg width="50" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 35 H60 V15 L100 50 L60 85 V65 H0 Z" fill="#4F81BD" stroke="#385D8A" strokeWidth="3"/>
  </svg>
);

export default function Home() {
  const [mainBanner, setMainBanner] = useState<Banner | null>(null);
  const [subBanners, setSubBanners] = useState<Banner[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bannersRes, awardsRes] = await Promise.all([
          fetch('/api/banners'),
          fetch('/api/awards')
        ]);
        
        const bannersData = await bannersRes.json();
        const awardsData = await awardsRes.json();

        if (bannersData.banners) {
          const large = bannersData.banners.find((b: Banner) => b.type === 'MAIN_LARGE' && b.isActive);
          const small = bannersData.banners.filter((b: Banner) => b.type === 'MAIN_SMALL' && b.isActive);
          setMainBanner(large || null);
          setSubBanners(small);
        }

        if (awardsData.awards) {
          setAwards(awardsData.awards);
        }
      } catch (error) {
        console.error('Failed to fetch home data', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-gray-800">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative h-[60vh] flex flex-col justify-center items-center text-center -mt-20">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20" 
            style={{ 
              backgroundImage: `url('${mainBanner?.imageUrl || "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2574&auto=format&fit=crop"}')` 
            }}
          ></div>
          <div className="container mx-auto px-4 relative text-center">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight break-keep">
              {mainBanner?.title || (
                <>
                  AI를 통한 쉽고 간편한 민간조사 의뢰
                  <br className="hidden md:block" />
                  {' '}이제 24시간 언제든지 맞춤형 민간조사원을 매칭받고,
                  <br className="hidden md:block" />
                  {' '}믿을 수 있는 전문가와 일을 진행할 수 있습니다.
                </>
              )}
            </h1>
            <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed break-keep">
              AI와 초기 상담을 통해 사건을 분석하고,
              <br className="hidden md:block" />{' '}
              경험이 풍부한 전문 민간조사원과 매칭을 받으세요.
              <br className="hidden md:block" />{' '}
              유사한 사건 사례를 참고하여 더 나은 결과를 얻으실 수 있습니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <Link href={mainBanner?.linkUrl || "/simulation"} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                {mainBanner ? '자세히 보기' : 'AI를 통해 상담해서 사건 맡기기'}
              </Link>
              {!mainBanner && (
                <>
                  <Link href="/scenario" className="bg-white hover:bg-gray-200 text-blue-600 font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 border border-blue-600">
                    나와 유사한 사건 찾기
                  </Link>
                  <Link href="/investigators" className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                    탐정 명단 보기
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Sub Banners */}
        {subBanners.length > 0 && (
          <section className="py-10 bg-gray-50 overflow-hidden">
            <div className="w-full">
              <div className="flex animate-scroll gap-6 w-max px-4">
                {/* Original */}
                {subBanners.map((banner) => (
                  <Link key={`original-${banner.id}`} href={banner.linkUrl || '#'} className="block group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow w-[300px] md:w-[400px] flex-shrink-0">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200 h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={banner.imageUrl} alt={banner.title || 'Banner'} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    {banner.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <h3 className="text-white font-bold text-lg">{banner.title}</h3>
                      </div>
                    )}
                  </Link>
                ))}
                {/* Duplicate */}
                {subBanners.map((banner) => (
                  <Link key={`duplicate-${banner.id}`} href={banner.linkUrl || '#'} className="block group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow w-[300px] md:w-[400px] flex-shrink-0">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200 h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={banner.imageUrl} alt={banner.title || 'Banner'} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    {banner.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <h3 className="text-white font-bold text-lg">{banner.title}</h3>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Why WeeklyAiving? */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">LIRA의 장점</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">AI 기반 상담</h3>
                <p className="text-gray-600">사건의 특성과 요구사항을 AI가 분석하여 가장 적합한 민간조사원을 매칭해드립니다. 24시간 언제든지 상담 가능합니다.</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">전문가 매칭</h3>
                <p className="text-gray-600">경험이 풍부하고 검증된 민간조사원들과 연결되어 전문적이고 신뢰할 수 있는 서비스를 받으실 수 있습니다.</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">사건 분석</h3>
                <p className="text-gray-600">유사한 사건들의 사례를 분석하여 효과적인 해결 방안을 제시하고 성공 확률을 높입니다.</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">맞춤형 서비스</h3>
                <p className="text-gray-600">개인의 상황과 요구사항에 맞는 맞춤형 조사 서비스를 제공하여 최적의 결과를 보장합니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">서비스 진행 절차</h2>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-center">
              <div className="flex-1 p-6">
                <h3 className="text-xl font-bold mb-2">사건 상담</h3>
                <p className="text-gray-600">AI 상담을 통해 사건의 내용과 요구사항을 상세히 분석하고 적합한 조사 방향을 제시받으세요.</p>
              </div>
              <div className="hidden lg:block text-gray-400">
                <CustomArrow />
              </div>
              <div className="flex-1 p-6">
                <h3 className="text-xl font-bold mb-2">전문가 매칭</h3>
                <p className="text-gray-600">사건의 특성에 맞는 경험이 풍부한 민간조사원과 매칭되어 전문적인 서비스를 받으실 수 있습니다.</p>
              </div>
              <div className="hidden lg:block text-gray-400">
                <CustomArrow />
              </div>
              <div className="flex-1 p-6">
                <h3 className="text-xl font-bold mb-2">조사 진행</h3>
                <p className="text-gray-600">전문가와 함께 체계적이고 효율적인 조사를 진행하며 실시간으로 진행 상황을 확인하세요.</p>
              </div>
              <div className="hidden lg:block text-gray-400">
                <CustomArrow />
              </div>
              <div className="flex-1 p-6">
                <h3 className="text-xl font-bold mb-2">결과 분석</h3>
                <p className="text-gray-600">조사 결과를 종합 분석하여 명확한 해결 방안과 후속 조치를 제공받으세요.</p>
              </div>
            </div>
          </div>
        </section>

        {/* What Our Users Say */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">이용자 후기</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-4">&ldquo;LIRA의 AI 상담을 통해 복잡한 사건을 명확히 정리할 수 있었고, 매칭된 전문가의 도움으로 만족스러운 결과를 얻었습니다.&rdquo;</p>
                <div className="flex items-center">
                  <Image src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Chen" width={40} height={40} className="rounded-full mr-4" />
                  <div>
                    <p className="font-bold">이서연</p>
                    <p className="text-sm text-gray-500">개인 의뢰인</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-4">&ldquo;24시간 언제든지 상담받을 수 있어서 편리했고, 전문가의 체계적인 조사로 문제를 해결할 수 있었습니다.&rdquo;</p>
                <div className="flex items-center">
                  <Image src="https://i.pravatar.cc/150?u=david" alt="David Lee" width={40} height={40} className="rounded-full mr-4" />
                  <div>
                    <p className="font-bold">김민수</p>
                    <p className="text-sm text-gray-500">기업 담당자</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-4">&ldquo;유사한 사건 사례를 참고할 수 있어서 도움이 되었고, 전문가의 경험과 노하우가 문제 해결에 큰 도움이 되었습니다.&rdquo;</p>
                <div className="flex items-center">
                  <Image src="https://i.pravatar.cc/150?u=emily" alt="Emily White" width={40} height={40} className="rounded-full mr-4" />
                  <div>
                    <p className="font-bold">박지영</p>
                    <p className="text-sm text-gray-500">법무팀 팀장</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Awards Section */}
        {awards.length > 0 && (
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">수상 및 인증 내역</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {awards.map((award) => (
                  <div key={award.id} className="flex flex-col items-center text-center">
                    <div className="w-32 h-32 relative mb-4 grayscale hover:grayscale-0 transition-all duration-300">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={award.imageUrl} alt={award.title} className="object-contain w-full h-full" />
                    </div>
                    <h3 className="font-bold text-lg mb-1">{award.title}</h3>
                    <p className="text-sm text-gray-500">{new Date(award.date).toLocaleDateString()}</p>
                    {award.description && <p className="text-sm text-gray-600 mt-2">{award.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">전문적인 민간조사 서비스를 시작할 준비가 되셨나요?</h2>
            <p className="text-lg text-blue-100 mb-8">LIRA를 통해 AI 상담과 전문가 매칭으로 복잡한 사건을 해결하고 있는 수많은 고객들과 함께하세요.</p>
            <Link href="/register" className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
              지금 바로 시작하세요
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
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
    </div>
  );
}
