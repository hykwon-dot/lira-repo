"use client";

export default function SocialLoginButtons() {
  const handleSocialLogin = (provider: string) => {
    // In a real app, this would redirect to the OAuth provider
    // window.location.href = `/api/auth/${provider}`;
    alert(`${provider} 로그인은 현재 준비 중입니다. (Client ID 설정 필요)`);
  };

  return (
    <div className="flex flex-col gap-3 mt-6">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative bg-white px-4 text-sm text-gray-500">또는 소셜 계정으로 로그인</div>
      </div>
      
      <div className="flex justify-center gap-4 mt-2">
        <button type="button" onClick={() => handleSocialLogin('kakao')} className="w-12 h-12 rounded-full bg-[#FEE500] flex items-center justify-center hover:opacity-90 transition-opacity" title="카카오 로그인">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3C6.477 3 2 6.358 2 10.5C2 13.226 3.765 15.635 6.448 16.91L5.55 20.205C5.46 20.535 5.83 20.795 6.12 20.605L10.08 17.975C10.705 18.035 11.345 18.065 12 18.065C17.523 18.065 22 14.707 22 10.565C22 6.423 17.523 3 12 3Z" fill="#3C1E1E"/>
          </svg>
        </button>
        <button type="button" onClick={() => handleSocialLogin('naver')} className="w-12 h-12 rounded-full bg-[#03C75A] flex items-center justify-center hover:opacity-90 transition-opacity" title="네이버 로그인">
          <span className="text-white font-bold text-lg">N</span>
        </button>
        <button type="button" onClick={() => handleSocialLogin('google')} className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors" title="구글 로그인">
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
