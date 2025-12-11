'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 배포 만료 체커
 * 빌드 시점으로부터 2주가 지나면 자동으로 404 페이지로 리다이렉트
 * UI에는 아무것도 표시하지 않음
 */
export default function DeploymentExpiryChecker() {
  const router = useRouter();

  useEffect(() => {
    // 빌드 타임스탬프 (빌드 시 자동으로 현재 시간이 들어감)
    const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_TIME || '2025-12-11T00:00:00+09:00';
    const buildDate = new Date(buildTimestamp);
    
    // 만료 날짜 (빌드 시점으로부터 2주 후)
    const expiryDate = new Date(buildDate);
    expiryDate.setDate(expiryDate.getDate() + 14);
    
    const now = new Date();
    
    // 현재 날짜가 만료 날짜를 넘었는지 체크 (조용히)
    if (now > expiryDate) {
      // 만료됨 - 404로 리다이렉트 (콘솔 로그도 출력 안 함)
      router.push('/404');
    }
  }, [router]);

  // UI에 아무것도 렌더링하지 않음
  return null;
}
