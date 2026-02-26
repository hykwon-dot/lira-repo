import { getPrismaClient } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, MapPin, Award, CheckCircle2, MessageCircle } from "lucide-react";
import { INVESTIGATOR_REGION_OPTIONS, INVESTIGATOR_SPECIALTY_GROUPS } from "@/lib/options";
import { translateCode, translateList } from "@/lib/translationHelper";

async function getInvestigator(id: string) {
  const prisma = await getPrismaClient();
  const numericId = parseInt(id);
  if (isNaN(numericId)) return null;

  return prisma.investigatorProfile.findUnique({
    where: { id: numericId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
              customer: {
                  select: { name: true }
              }
          }
      }
    }
  });
}

function translateRegion(regionString: string | null): string {
  if (!regionString) return "정보 없음";
  // Use shared translateList
  return translateList(regionString);
}


function formatSpecialties(specialties: unknown): string[] {
    let items: string[] = [];
    if (Array.isArray(specialties)) {
      items = specialties.map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
            // Prefer value
            if ("value" in item) return String((item as Record<string, unknown>).value ?? "");
            if ("label" in item) return String((item as Record<string, unknown>).label ?? "");
        }
        return JSON.stringify(item);
      });
    } else if (specialties && typeof specialties === "object") {
      items = Object.values(specialties as Record<string, unknown>).map((value) =>
        typeof value === "string" ? value : JSON.stringify(value)
      );
    }
    
    return items.map(item => translateCode(item));
}

export default async function InvestigatorDetailPage({ params }: { params: { id: string } }) {
  const investigator = await getInvestigator(params.id);

  if (!investigator) {
    notFound();
  }

  const specialties = formatSpecialties(investigator.specialties);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                <div className="px-8 pb-8">
                    <div className="relative -mt-16 mb-6 flex items-end justify-between">
                         <div className="relative h-32 w-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden">
                            {investigator.avatarUrl ? (
                                <Image 
                                    src={investigator.avatarUrl} 
                                    alt={investigator.user.name || "전문가"} 
                                    fill 
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-bold text-2xl">
                                    IMG
                                </div>
                            )}
                         </div>
                         <div className="mb-2 hidden sm:block">
                             {/* Buttons or Actions can go here */}
                         </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                             <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                {investigator.user.name}
                                {investigator.status === 'APPROVED' && (
                                    <CheckCircle2 className="w-6 h-6 text-blue-500" aria-label="인증된 전문가" />
                                )}
                             </h1>
                             <p className="text-slate-500 font-medium mt-1">전문 탐정 / 민간조사원</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                             <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                 <MapPin className="w-4 h-4 text-slate-400" />
                                 <span>{translateRegion(investigator.serviceArea)}</span>
                             </div>
                             <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                 <Award className="w-4 h-4 text-slate-400" />
                                 <span>경력 {investigator.experienceYears || 0}년</span>
                             </div>
                             <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                 <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                 <span>평점 {Number(investigator.ratingAverage || 0).toFixed(1)}</span>
                             </div>
                        </div>

                        {/* Verification Badges */}
                        <div className="flex gap-3 py-4 border-t border-slate-100">
                             <div className={`flex items-center gap-2 text-sm font-medium ${investigator.businessLicenseData ? 'text-blue-700' : 'text-slate-400'}`}>
                                 <CheckCircle2 className="w-4 h-4" />
                                 사업자등록증 {investigator.businessLicenseData ? "인증됨" : "미인증"}
                             </div>
                             <div className={`flex items-center gap-2 text-sm font-medium ${investigator.pledgeData ? 'text-blue-700' : 'text-slate-400'}`}>
                                 <CheckCircle2 className="w-4 h-4" />
                                 서약서 서명 {investigator.pledgeData ? "완료" : "미완료"}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Introduction Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                 <h2 className="text-xl font-bold text-slate-900">전문가 소개</h2>
                 <div className="prose prose-slate max-w-none text-slate-600 leading-loose whitespace-pre-line">
                     {investigator.introduction || "등록된 소개글이 없습니다."}
                 </div>
            </div>

            {/* Specialties Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                 <h2 className="text-xl font-bold text-slate-900">전문 분야</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                     {specialties.length > 0 ? specialties.map((spec, i) => (
                         <div key={i} className="flex items-center justify-center p-3 rounded-xl bg-slate-50 text-slate-700 font-medium text-sm text-center border border-slate-200">
                             {spec}
                         </div>
                     )) : (
                         <p className="text-slate-400 text-sm">등록된 전문 분야가 없습니다.</p>
                     )}
                 </div>
            </div>

             {/* Reviews Section Placeholder */}
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">의뢰인 후기</h2>
                    <span className="text-sm text-slate-500">최근 5건</span>
                 </div>
                 
                 <div className="space-y-6">
                    {investigator.reviews.length > 0 ? (
                        investigator.reviews.map(review => (
                             <div key={review.id} className="border-b border-slate-100 pb-6 last:pb-0 last:border-0">
                                 <div className="flex items-center justify-between mb-2">
                                     <span className="font-semibold text-slate-800">{review.customer?.name || "익명 의뢰인"}</span>
                                     <div className="flex text-amber-400">
                                         {[...Array(5)].map((_, i) => (
                                             <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`} />
                                         ))}
                                     </div>
                                 </div>
                                 <p className="text-slate-600 text-sm">{review.comment}</p>
                                 <p className="text-xs text-slate-400 mt-2">{new Date(review.createdAt).toLocaleDateString()}</p>
                             </div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg text-sm">
                            아직 등록된 후기가 없습니다.
                        </div>
                    )}
                 </div>
            </div>

          </div>

          {/* Sticky Sidebar (Right) */}
          <div className="lg:col-span-1">
             <div className="sticky top-24 space-y-6">
                 
                 {/* Consultation Card */}
                 <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 space-y-6">
                     <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg leading-relaxed">
                         💡 <strong>의뢰 전 Tip:</strong> 여러 탐정들과 충분한 상담을 받아보시고 업체 선정을 하시는 것을 추천드립니다.
                     </div>
                     
                     <div className="text-center space-y-1">
                         <p className="text-sm text-slate-500">24시간 무료상담</p>
                         <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                              {investigator.contactPhone || "050-1234-5678"}
                         </p>
                     </div>

                     <div className="space-y-3">
                         <Link href={`/investigation-requests/new?investigatorId=${investigator.id}`} className="flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm gap-2">
                             <MessageCircle className="w-5 h-5" />
                             익명 상담신청하기
                         </Link>
                         <button className="flex items-center justify-center w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm gap-2">
                             <MessageCircle className="w-5 h-5" />
                             익명 채팅상담하기
                         </button>
                     </div>
                 </div>

                 {/* Admin/Owner Actions */}
                 {/* TODO: Implement client-side check for owner/admin to show this */}
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                     <p className="text-xs text-center text-slate-400 mb-3">본인 프로필이신가요?</p>
                     <Link 
                        href="/my-page" 
                        className="block w-full text-center text-sm font-semibold text-slate-600 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors"
                     >
                        프로필 정보 수정하기
                     </Link>
                 </div>

             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
