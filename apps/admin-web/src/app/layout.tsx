"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { AdminSidebar } from "@/components/AdminSidebar";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
          {!isLoginPage && <AdminSidebar />}
          <main className={cn(
            "flex-1 overflow-y-auto custom-scrollbar",
            isLoginPage ? "bg-slate-950" : "bg-slate-50"
          )}>
            <div className={cn(isLoginPage ? "" : "p-8")}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
