"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useUserStore } from "@/lib/userStore";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import InvestigatorDetailModal from "./investigators/InvestigatorDetailModal";
import { translateCode, translateList } from "@/lib/translationHelper";

type Banner = {
  id: number;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  type: 'MAIN_LARGE' | 'MAIN_SMALL';
  clickAction: 'LINK' | 'INVESTIGATOR' | 'ORGANIZATION';
  targetId: number | null;
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

type Testimonial = {
  id: number;
  name: string;
  role: string | null;
  content: string;
  avatarUrl: string | null;
};

// Re-use helper functions for the modal
function translateRegion(regionString: string | null): string {
  if (!regionString) return "정보 없음";
  return translateList(regionString);
}

function formatSpecialties(specialties: unknown): string[] {
  let items: string[] = [];
  if (Array.isArray(specialties)) {
    items = specialties.map((item) => {
      let val = "";
      if (typeof item === "string") val = item;
      else if (item && typeof item === "object") {
         if ("value" in item) val = String((item as Record<string, unknown>).value ?? "");
         else if ("label" in item) val = String((item as Record<string, unknown>).label ?? "");
         else val = JSON.stringify(item);
      } else val = JSON.stringify(item);
      return val;
    });
  } else if (specialties && typeof specialties === "object") {
    items = Object.values(specialties as Record<string, unknown>).map((value) =>
      typeof value === "string" ? value : JSON.stringify(value)
    );
  }
  return items.map(item => translateCode(item));
}

const CustomArrow = () => (
  <svg width="50" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 35 H60 V15 L100 50 L60 85 V65 H0 Z" fill="#4F81BD" stroke="#385D8A" strokeWidth="3"/>
  </svg>
);

// Carousel Animation Variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    zIndex: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
  }),
};

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [mainBanners, setMainBanners] = useState<Banner[]>([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const [subBanners, setSubBanners] = useState<Banner[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialDirection, setTestimonialDirection] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);

  // Modal states for banner action
  const [selectedInvestigator, setSelectedInvestigator] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingInvestigator, setLoadingInvestigator] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerPage(1);
      } else if (width < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(4);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const paginate = (newDirection: number) => {
    if (mainBanners.length === 0) return;
    setDirection(newDirection);
    setCurrentBannerIndex((prev) => (prev + newDirection + mainBanners.length) % mainBanners.length);
  };
  
  const paginateTestimonial = (newDirection: number) => {
    setTestimonialDirection(newDirection);
    setTestimonialIndex((prev) => {
      const nextIndex = prev + newDirection;
      const maxIndex = Math.ceil(testimonials.length / itemsPerPage) - 1;
      if (nextIndex < 0) return maxIndex;
      if (nextIndex > maxIndex) return 0;
      return nextIndex;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bannersRes, awardsRes, testimonialsRes] = await Promise.all([
          fetch('/api/banners'),
          fetch('/api/awards'),
          fetch('/api/testimonials'),
        ]);
        
        const bannersData = await bannersRes.json();
        const awardsData = await awardsRes.json();
        const testimonialsData = await testimonialsRes.json().catch(() => ({}));

        if (bannersData.banners) {
          const large = bannersData.banners
            .filter((b: Banner) => b.type === 'MAIN_LARGE' && b.isActive)
            .sort((a: Banner, b: Banner) => a.order - b.order);
          const small = bannersData.banners.filter((b: Banner) => b.type === 'MAIN_SMALL' && b.isActive);
          
          setMainBanners(large);
          setSubBanners(small);
        }

        if (awardsData.awards) {
          setAwards(awardsData.awards);
        }

        if (testimonialsData.testimonials) {
          setTestimonials(testimonialsData.testimonials);
        }
      } catch (error) {
        console.error('Failed to fetch home data', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (mainBanners.length <= 1) return;
    const interval = setInterval(() => {
      paginate(1);
    }, 5000);
    return () => clearInterval(interval);
  }, [mainBanners.length]); 

  useEffect(() => {
    if (testimonials.length <= itemsPerPage) return;
    const interval = setInterval(() => {
      paginateTestimonial(1);
    }, 6000); 
    return () => clearInterval(interval);
  }, [itemsPerPage, testimonials.length]);

  const handleBannerClick = async (banner: Banner) => {
    if (banner.clickAction === 'INVESTIGATOR' && banner.targetId) {
        setLoadingInvestigator(true);
        try {
            const res = await fetch(`/api/investigators/${banner.targetId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedInvestigator(data.investigator);
                setIsModalOpen(true);
            } else {
                alert('조사원 정보를 불러올 수 없습니다.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingInvestigator(false);
        }
    } else if (banner.clickAction === 'LINK' && banner.linkUrl) {
        window.open(banner.linkUrl, '_blank');
    }
  };

  const currentBanner = mainBanners[currentBannerIndex];

  const visibleTestimonials = testimonials.slice(
    testimonialIndex * itemsPerPage,
    (testimonialIndex + 1) * itemsPerPage
  );

  return (
    <div className="min-h-screen flex flex-col text-gray-800">
      {loadingInvestigator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
      )}

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative h-[60vh] -mt-20 overflow-hidden bg-white group">
          <AnimatePresence initial={false} custom={direction}>
            {mainBanners.length > 0 ? (
              <motion.div
                key={currentBannerIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "tween", duration: 0.5, ease: "easeInOut" },
                  opacity: { duration: 0.3 }
                }}
                className="absolute inset-0 flex flex-col justify-center items-center text-center w-full h-full"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20" 
                  style={{ 
                    backgroundImage: `url('${currentBanner.imageUrl}')` 
                  }}
                ></div>
                <div className="container mx-auto px-4 relative text-center z-10">
                  <h1 className="font-bold text-gray-900 mb-4 leading-tight break-keep">
                    {currentBanner.title ? (
                      <span className="text-2xl md:text-4xl">{currentBanner.title}</span>
                    ) : (
                      <>
                        <span className="block text-3xl md:text-5xl mb-6">
                          AI를 통한 쉽고 간편한 민간조사 의뢰
                        </span>
                        <span className="block text-2xl md:text-4xl">
                          이제 24시간 언제든지 맞춤형 민간조사원을 매칭받고,
                          <br className="hidden md:block" />
                          {' '}믿을 수 있는 전문가와 일을 진행할 수 있습니다.
                        </span>
                      </>
                    )}
                  </h1>
                  <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed break-keep">
                    AI와 초기 상담을 통해 사건을 분석하고,
                    <br className="hidden md:block" />{' '}
                    경험이 풍부한 전문 민간조사원과 매칭을 받으세요.
                  </p>
                  <div className="flex justify-center">
                    <button 
                        onClick={() => handleBannerClick(currentBanner)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
                    >
                      {currentBanner.title ? '자세히 보기' : 'AI를 통해 상담해서 사건 맡기기'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20" 
                  style={{ 
                    backgroundImage: `url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2574&auto=format&fit=crop')` 
                  }}
                ></div>
                <div className="container mx-auto px-4 relative text-center z-10">
                  <h1 className="font-bold text-gray-900 mb-4 leading-tight break-keep">
                    <span className="block text-3xl md:text-5xl mb-6">
                      AI를 통한 쉽고 간편한 민간조사 의뢰
                    </span>
                    <span className="block text-2xl md:text-4xl">
                      이제 24시간 언제든지 맞춤형 민간조사원을 매칭받고,
                      <br className="hidden md:block" />
                      {' '}믿을 수 있는 전문가와 일을 진행할 수 있습니다.
                    </span>
                  </h1>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/simulation" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                      AI를 통해 상담해서 사건 맡기기
                    </Link>
                    <Link href={user ? "/scenario" : "/login"} className="bg-white hover:bg-gray-200 text-blue-600 font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 border border-blue-600">
                      나와 유사한 사건 찾기
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
          
          {mainBanners.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full backdrop-blur-sm transition-all z-20 hidden group-hover:block"
                onClick={() => paginate(-1)}
              >
                <FiChevronLeft size={32} />
              </button>
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-3 rounded-full backdrop-blur-sm transition-all z-20 hidden group-hover:block"
                onClick={() => paginate(1)}
              >
                <FiChevronRight size={32} />
              </button>
            </>
          )}
        </section>

        {/* Sub Banners */}
        {subBanners.length > 0 && (
          <section className="py-10 bg-gray-50 overflow-hidden">
            <div className="w-full">
              <div className="flex animate-scroll gap-6 w-max px-4">
                {subBanners.map((banner) => (
                  <button 
                    key={`original-${banner.id}`} 
                    onClick={() => handleBannerClick(banner)}
                    className="block group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow w-[300px] md:w-[400px] flex-shrink-0 bg-white text-left"
                  >
                    <div className="relative aspect-video w-full overflow-hidden flex items-center justify-center">
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title || 'Banner'}
                        fill
                        sizes="(max-width: 768px) 300px, 400px"
                        style={{ objectFit: 'contain' }}
                        className="group-hover:scale-105 transition-transform duration-300 p-2"
                        unoptimized={banner.imageUrl.includes('http')}
                      />
                    </div>
                  </button>
                ))}
                {/* 무한 스크롤을 위한 복제 */}
                {subBanners.map((banner) => (
                  <button 
                    key={`duplicate-${banner.id}`} 
                    onClick={() => handleBannerClick(banner)}
                    className="block group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow w-[300px] md:w-[400px] flex-shrink-0 bg-white text-left"
                  >
                    <div className="relative aspect-video w-full overflow-hidden flex items-center justify-center">
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title || 'Banner'}
                        fill
                        sizes="(max-width: 768px) 300px, 400px"
                        style={{ objectFit: 'contain' }}
                        className="group-hover:scale-105 transition-transform duration-300 p-2"
                        unoptimized={banner.imageUrl.includes('http')}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* LIRA의 장점 */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">LIRA의 장점</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">AI 기반 상담</h3>
                <p className="text-gray-600">사건의 특성과 요구사항을 AI가 분석하여 가장 적합한 민간조사원을 매칭해드립니다.</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">전문가 매칭</h3>
                <p className="text-gray-600">경험이 풍부하고 검증된 민간조사원들과 연결되어 전문적인 서비스를 받으실 수 있습니다.</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">사건 분석</h3>
                <p className="text-gray-600">유사한 사건 사례를 분석하여 해결 방안을 제시하고 성공 확률을 높입니다.</p>
              </div>
              <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200 hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold mb-2">맞춤형 서비스</h3>
                <p className="text-gray-600">개인의 상황과 요구사항에 맞는 맞춤형 조사 서비스를 제공합니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 서비스 진행 절차 */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-12">서비스 진행 절차</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="p-6"><h3 className="font-bold">사건 상담</h3></div>
              <div className="p-6"><h3 className="font-bold">전문가 매칭</h3></div>
              <div className="p-6"><h3 className="font-bold">조사 진행</h3></div>
              <div className="p-6"><h3 className="font-bold">결과 분석</h3></div>
            </div>
          </div>
        </section>

        {/* 이용자 후기 */}
        <section className="py-20 bg-white overflow-hidden relative group/testimonials">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">이용자 후기</h2>
            {testimonials.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {visibleTestimonials.map((t) => (
                  <div key={t.id} className="bg-gray-50 p-5 rounded-lg border">
                    <p className="text-gray-600 line-clamp-5">"{t.content}"</p>
                    <p className="mt-4 font-bold">{t.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 수상 내역 */}
        {awards.length > 0 && (
          <section className="py-20 bg-gray-50 text-center">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold mb-12">수상 및 인증 내역</h2>
              <div className="flex flex-wrap justify-center gap-8">
                {awards.map((a) => (
                  <div key={a.id} className="w-32">
                    <img src={a.imageUrl} alt={a.title} className="mx-auto h-20 object-contain" />
                    <p className="mt-2 text-sm font-bold">{a.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-20 bg-blue-600 text-white text-center">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">민간조사 서비스를 시작할 준비가 되셨나요?</h2>
            <Link href="/register" className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg">
              지금 바로 시작하세요
            </Link>
          </div>
        </section>
      </main>

      {/* 모달 */}
      <InvestigatorDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        investigator={selectedInvestigator}
        formatSpecialties={formatSpecialties}
        translateRegion={translateRegion}
      />
    </div>
  );
}
