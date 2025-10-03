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
  title: "AI를 통한 민간조사원 매칭 플랫폼 | LIONE",
  description: "AI와 데이터가 탐정과 의뢰인을 연결하는 차세대 민간조사 매칭 플랫폼",
  keywords: "민간조사, AI, 탐정, 조사원, 조사 의뢰, 매칭 플랫폼",
  openGraph: {
    title: "AI를 통한 민간조사원 매칭 플랫폼 | LIONE",
    description: "AI와 데이터가 탐정과 의뢰인을 연결하는 차세대 민간조사 매칭 플랫폼",
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
