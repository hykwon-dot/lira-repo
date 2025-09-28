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
  title: "엘AI와 민간조사 상담 - LIRA",
  description: "AI 시뮬레이션 SaaS 플랫폼 - 챗GPT 연동 대화형 시뮬레이션",
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
