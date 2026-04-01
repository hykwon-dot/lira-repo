import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import dynamicImport from "next/dynamic";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import KakaoChannelButton from "@/components/KakaoChannelButton";
import Footer from "./Footer";

const Header = dynamicImport(() => import("./Header"), { ssr: false });

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: "AI 시뮬레이션 기반 민간조사 매칭 | LIRA",
  description: "실시간 AI 분석과 시뮬레이션으로 의뢰인과 전문 민간조사원을 연결하는 LIRA 플랫폼",
  keywords: "LIRA, 민간조사, AI 시뮬레이션, 조사 의뢰, 탐정 매칭",
  verification: {
    google: "tQQTAV3kKyHT4Td-3mheTrarsfGFFjuBvybTT7zs0Tk",
    other: {
      "naver-site-verification": "3e6a4aaaf873562309cec539071c8fb3b97e81f2",
    },
  },
  openGraph: {
    title: "AI 시뮬레이션 기반 민간조사 매칭 | LIRA",
    description: "실시간 AI 분석과 시뮬레이션으로 의뢰인과 전문 민간조사원을 연결하는 LIRA 플랫폼",
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
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-N98KHZXM"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Header />
        <ClientLayout>{children}</ClientLayout>
        <Footer />
        <KakaoChannelButton />
        <Script id="gtm" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-N98KHZXM');`}
        </Script>
      </body>
    </html>
  );
}