import { Suspense } from 'react';
import LoginForm from './LoginForm';
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center mb-4">
              <Image
                src="/images/lione-logo.svg"
                alt="LIONE 로고"
                width={180}
                height={54}
                priority
                className="h-8 w-auto md:h-10"
              />
            </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">LIRA 로그인</h1>
          <p className="text-gray-600">전문 민간조사원 매칭 서비스</p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
