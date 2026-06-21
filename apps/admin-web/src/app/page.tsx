import { 
  Users, 
  MessageSquare, 
  ShieldCheck, 
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { prisma } from "@lira/database";

async function getStats() {
  const [userCount, requestCount, pendingInvestigatorCount] = await Promise.all([
    prisma.user.count(),
    prisma.investigationRequest.count(),
    prisma.investigatorProfile.count({ where: { status: "PENDING" } }),
  ]);

  return {
    userCount,
    requestCount,
    pendingInvestigatorCount,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { name: "전체 사용자", value: stats.userCount, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { name: "전체 사건 의뢰", value: stats.requestCount, icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
    { name: "승인 대기 탐정", value: stats.pendingInvestigatorCount, icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-50" },
    { name: "매칭 성공률", value: "84%", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">대시보드</h2>
        <p className="text-slate-500 mt-1 text-sm">LIRA 서비스의 전체 현황을 한눈에 파악합니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.name} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-2xl", card.bg)}>
                <card.icon className={cn("w-6 h-6", card.color)} />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stats</span>
            </div>
            <div className="mt-4">
              <h3 className="text-slate-500 text-sm font-medium">{card.name}</h3>
              <p className="text-3xl font-bold text-slate-900 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            최근 사건 의뢰 추이
          </h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-slate-400 text-sm italic">통계 그래프 준비 중...</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            긴급 알림
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
              <p className="text-xs font-bold text-amber-800 mb-1">고위험 상담 감지</p>
              <p className="text-[11px] text-amber-700 leading-relaxed">익명 사용자가 폭력 위협 관련 상담을 진행 중입니다. 모니터링이 필요합니다.</p>
              <p className="text-[10px] text-amber-500 mt-2">2분 전</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xs font-bold text-slate-800 mb-1">신규 탐정 신청</p>
              <p className="text-[11px] text-slate-600 leading-relaxed">'김리라' 탐정님이 전문가 프로필 승인을 요청했습니다.</p>
              <p className="text-[10px] text-slate-400 mt-2">15분 전</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-using the cn utility from components if needed or just copy it here if tiny
import { cn } from "@/lib/utils";
