import { 
  ShieldCheck, 
  Search, 
  MoreHorizontal,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { prisma } from "@lira/database";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function getPendingInvestigators() {
  return prisma.investigatorProfile.findMany({
    where: { status: "PENDING" },
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function approveInvestigator(id: number) {
  "use server";
  await prisma.investigatorProfile.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  revalidatePath("/investigators");
}

async function rejectInvestigator(id: number) {
  "use server";
  await prisma.investigatorProfile.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  revalidatePath("/investigators");
}

export default async function InvestigatorsPage() {
  const investigators = await getPendingInvestigators();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            탐정 승인 관리
          </h2>
          <p className="text-slate-500 mt-1 text-sm">전문가 프로필 승인을 요청한 탐정 목록입니다.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="탐정 이름, 이메일 검색..." 
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-64 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">신청자</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">경력 / 전문분야</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">신청일</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {investigators.length > 0 ? (
                investigators.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {inv.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{inv.user.name}</p>
                          <p className="text-xs text-slate-500">{inv.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-slate-700 font-medium">{inv.experienceYears}년 경력</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.isArray(inv.specialties) && (inv.specialties as string[]).slice(0, 2).map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={approveInvestigator.bind(null, inv.id)}>
                          <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all title='승인'">
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        </form>
                        <form action={rejectInvestigator.bind(null, inv.id)}>
                          <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all title='거절'">
                            <XCircle className="w-5 h-5" />
                          </button>
                        </form>
                        <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <ShieldCheck className="w-12 h-12" />
                      <p className="text-sm font-medium">현재 승인 대기 중인 탐정이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
