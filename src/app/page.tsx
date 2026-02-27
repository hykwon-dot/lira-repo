"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from 'react';
import { useUserStore } from "@/lib/userStore";
import { AnimatePresence, motion } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

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

type Testimonial = {
  id: number;
  name: string;
  role: string | null;
  content: string;
  avatarUrl: string | null;
};

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
  }, [mainBanners.length]); // Dependencies simplified to length, paginate logic inside uses function update

  useEffect(() => {
    if (testimonials.length <= itemsPerPage) return;
    const interval = setInterval(() => {
      paginateTestimonial(1);
    }, 6000); // Testimonial auto slide
    return () => clearInterval(interval);
  }, [itemsPerPage, testimonials.length]);

  const currentBanner = mainBanners[currentBannerIndex];

  // Logic to slice testimonials for current view
  const visibleTestimonials = testimonials.slice(
    testimonialIndex * itemsPerPage,
    (testimonialIndex + 1) * itemsPerPage
  );
  // Handle edge case where last page has fewer items, maybe fill from start? 
  // For simplicity, just show what's available. 
  // If we want infinite loop with 3 items, the slicing needs to wrap around.
  // Implementing simpler page-based slide.

  return (
    <div className="min-h-screen flex flex-col text-gray-800">
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
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href={currentBanner.linkUrl || "/simulation"} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                      {currentBanner.title ? '자세히 보기' : 'AI를 통해 상담해서 사건 맡기기'}
                    </Link>
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
                  <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-8 leading-relaxed break-keep">
                    AI와 초기 상담을 통해 사건을 분석하고,
                    <br className="hidden md:block" />{' '}
                    경험이 풍부한 전문 민간조사원과 매칭을 받으세요.
                    <br className="hidden md:block" />{' '}
                    유사한 사건 사례를 참고하여 더 나은 결과를 얻으실 수 있습니다.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/simulation" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                      AI를 통해 상담해서 사건 맡기기
                    </Link>
                    <Link href={user ? "/scenario" : "/login"} className="bg-white hover:bg-gray-200 text-blue-600 font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 border border-blue-600">
                      나와 유사한 사건 찾기
                    </Link>
                    <Link href="/investigators" className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                      탐정 명단 보기
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
          
          {/* Banner Controls */}
          {mainBanners.length > 1 && (
            <>
              {/* Arrows */}
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

              {/* Indicator Dots */}
              <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
                {mainBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                        setDirection(idx > currentBannerIndex ? 1 : -1);
                        setCurrentBannerIndex(idx);
                    }}
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      idx === currentBannerIndex 
                        ? "bg-blue-600 w-8" 
                        : "bg-gray-300 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        {/* Sub Banners */}
        {subBanners.length > 0 && (
          <section className="py-10 bg-gray-50 overflow-hidden">
            <div className="w-full">
              <div className="flex animate-scroll gap-6 w-max px-4">
                {/* Original */}
                {subBanners.map((banner) => (
                  <Link 
                    key={`original-${banner.id}`} 
                    href={banner.linkUrl || '#'} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow w-[300px] md:w-[400px] flex-shrink-0"
                  >
                    <div className="relative aspect-video bg-gray-200 w-full overflow-hidden">
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title || 'Banner'}
                        fill
                        sizes="(max-width: 768px) 300px, 400px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={banner.imageUrl.includes('http')} // 외부 링크 최적화 실패 방지
                      />
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
                  <Link 
                    key={`duplicate-${banner.id}`} 
                    href={banner.linkUrl || '#'} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow w-[300px] md:w-[400px] flex-shrink-0"
                  >
                    <div className="relative aspect-video bg-gray-200 w-full overflow-hidden">
                      <Image
                        src={banner.imageUrl}
                        alt={banner.title || 'Banner'}
                        fill
                        sizes="(max-width: 768px) 300px, 400px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized={banner.imageUrl.includes('http')} // 외부 링크 최적화 실패 방지
                      />
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

        {/* What Our Users Say - Sliding Carousel */}
        <section className="py-20 bg-white overflow-hidden relative group/testimonials">
          <div className="container mx-auto px-4 mb-4">
            <h2 className="text-3xl font-bold text-center mb-12">이용자 후기</h2>
            
            {testimonials.length === 0 ? (
              <p className="text-center text-sm text-gray-500">등록된 이용자 후기가 없습니다.</p>
            ) : (
              <>
                <div className="relative min-h-[360px] md:min-h-[300px] overflow-hidden">
                  <AnimatePresence initial={false} custom={testimonialDirection}>
                    <motion.div
                      key={testimonialIndex}
                      custom={testimonialDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "tween", duration: 0.5, ease: "easeInOut" },
                        opacity: { duration: 0.3 }
                      }}
                      className="absolute inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
                    >
                      {visibleTestimonials.map((testimonial) => {
                        const avatarSrc =
                          testimonial.avatarUrl ||
                          `https://i.pravatar.cc/150?u=${encodeURIComponent(testimonial.name)}`;
                        return (
                          <div
                            key={testimonial.id}
                            className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col"
                          >
                            <p className="text-gray-600 mb-4 leading-relaxed flex-grow line-clamp-5">
                              &ldquo;{testimonial.content}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => setSelectedTestimonial(testimonial)}
                              className="self-start text-xs text-blue-600 hover:text-blue-800 mb-3"
                            >
                              전체 보기
                            </button>
                            <div className="flex items-center mt-auto">
                              <Image
                                src={avatarSrc}
                                alt={testimonial.name}
                                width={44}
                                height={44}
                                className="rounded-full mr-3 border border-gray-200 object-cover"
                              />
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{testimonial.name}</p>
                                {testimonial.role && (
                                  <p className="text-xs text-gray-500">{testimonial.role}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Testimonial Controls */}
                {testimonials.length > itemsPerPage && (
                  <>
                    <button
                      className="absolute top-1/2 left-2 md:left-8 z-10 p-3 rounded-full bg-white/80 text-gray-800 shadow-lg hover:bg-white transition-all transform -translate-y-1/2 opacity-0 group-hover/testimonials:opacity-100 focus:opacity-100 disabled:opacity-30"
                      onClick={() => paginateTestimonial(-1)}
                      aria-label="Previous testimonial"
                    >
                      <FiChevronLeft size={24} />
                    </button>
                    <button
                      className="absolute top-1/2 right-2 md:right-8 z-10 p-3 rounded-full bg-white/80 text-gray-800 shadow-lg hover:bg-white transition-all transform -translate-y-1/2 opacity-0 group-hover/testimonials:opacity-100 focus:opacity-100 disabled:opacity-30"
                      onClick={() => paginateTestimonial(1)}
                      aria-label="Next testimonial"
                    >
                      <FiChevronRight size={24} />
                    </button>

                    {/* Indicators */}
                    <div className="flex justify-center gap-2 mt-8">
                      {Array.from({ length: Math.ceil(testimonials.length / itemsPerPage) }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setTestimonialDirection(idx > testimonialIndex ? 1 : -1);
                            setTestimonialIndex(idx);
                          }}
                          className={`h-2.5 w-2.5 rounded-full transition-all ${
                            idx === testimonialIndex
                              ? "bg-blue-600 w-8"
                              : "bg-gray-300 hover:bg-gray-400"
                          }`}
                          aria-label={`Go to testimonial page ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
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

      {/* Testimonial Full View Modal */}
      <AnimatePresence>
        {selectedTestimonial && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white max-w-xl w-full mx-4 rounded-lg shadow-xl p-6 relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setSelectedTestimonial(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-sm"
              >
                닫기
              </button>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {selectedTestimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedTestimonial.name}</p>
                  {selectedTestimonial.role && (
                    <p className="text-xs text-gray-500">{selectedTestimonial.role}</p>
                  )}
                </div>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {selectedTestimonial.content}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
