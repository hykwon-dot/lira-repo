"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  FileSearch, 
  Settings, 
  LogOut,
  ShieldCheck,
  Search,
  MessageSquare,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "탐정 승인 관리", href: "/investigators", icon: ShieldCheck },
  { name: "전체 의뢰 현황", href: "/requests", icon: Search },
  { name: "상담 모니터링", href: "/chats", icon: MessageSquare },
  { name: "시나리오 관리", href: "/scenarios", icon: FileSearch },
  { name: "사용자 관리", href: "/users", icon: Users },
  { name: "배너/공지 관리", href: "/settings/banners", icon: Star },
  { name: "시스템 설정", href: "/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col bg-slate-900 text-slate-300 shadow-2xl">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">L</div>
          LIRA Admin
        </h1>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Management System</p>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800">
        <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
