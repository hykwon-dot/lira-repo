import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamicImport from "next/dynamic";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const Header = dynamicImport(() => import("./Header"), { ssr: false });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI기반 민간조사 통합 플랫폼 LI-ONE",
  description: "AI와 데이터 기반의 가상 조사/사례 시뮬레이션 및 탐정 매칭 서비스",
  keywords: "민간조사, AI, 탐정, 조사원, 시뮬레이션, 매칭 플랫폼",
  openGraph: {
    title: "AI기반 민간조사 통합 플랫폼 LI-ONE",
    description: "AI와 데이터 기반의 가상 조사/사례 시뮬레이션 및 탐정 매칭 서비스",
    images: ["/images/lione-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Header />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
