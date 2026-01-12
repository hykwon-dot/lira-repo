"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useUserStore, UserRole } from '@/lib/userStore';
import SocialLoginButtons from '@/components/SocialLoginButtons';

export default function LoginForm({ onLogin }: { onLogin?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') ?? '/';
  const { setUser } = useUserStore();

  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      (async () => {
         try {
             sessionStorage.setItem('lira.authToken', token);
             const res = await fetch('/api/me', {
                 headers: { Authorization: `Bearer ${token}` }
             });
             if (res.ok) {
                 const data = await res.json();
                 const user = data.user;
                 const rawRole = user.role?.toLowerCase?.() ?? 'user';
                 const normalizedRole = (['user', 'investigator', 'enterprise', 'admin', 'super_admin'].includes(rawRole) ? rawRole : 'user') as UserRole;
                 
                 setUser(
                   {
                     id: String(user.id ?? ''),
                     email: user.email,
                     name: user.name ?? '',
                     role: normalizedRole,
                     monthlyUsage: user.monthlyUsage ?? 0,
                     remainingTokens: user.remainingTokens ?? 0,
                     investigatorStatus: user.investigatorStatus ?? undefined,
                   },
                   token
                 );
                 if (onLogin) onLogin();
                 router.push(redirectTo);
             } else {
                 setError("Social login failed: Failed to fetch profile");
             }
         } catch (e) {
             console.error(e);
             setError("Social login processing failed");
         }
      })();
    }
    
    const errorParam = searchParams?.get('error');
    if (errorParam) {
        setError(decodeURIComponent(errorParam));
    }
  }, [searchParams, setUser, router, onLogin, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data?.code === 'INVESTIGATOR_PENDING') {
        setError('승인 대기 중인 민간조사원 계정입니다. 관리자 승인 후 다시 로그인해 주세요.');
      } else if (data?.code === 'USER_NOT_FOUND') {
        setError('등록되지 않은 이메일입니다. 회원가입 후 이용해 주세요.');
      } else if (data?.code === 'INVALID_PASSWORD') {
        setError('비밀번호가 올바르지 않습니다. 다시 확인해 주세요.');
      } else {
        setError(data?.error || '로그인 실패');
      }
      return;
    }

    const { token, user } = data || {};
    if (!token || !user) {
      setError('로그인 응답 형식이 올바르지 않습니다.');
      return;
    }

    try {
      sessionStorage.setItem('lira.authToken', token);
    } catch (storageError) {
      console.warn('Failed to persist auth token', storageError);
    }

    const normalizedRole = (user.role?.toLowerCase?.() as UserRole | undefined) ?? 'user';
    setUser(
      {
        id: String(user.id ?? ''),
        email: user.email,
        name: user.name ?? '',
        role: normalizedRole,
        monthlyUsage: user.monthlyUsage ?? 0,
        remainingTokens: user.remainingTokens ?? 0,
        investigatorStatus: user.investigatorStatus ?? undefined,
      },
      token,
    );
    if (onLogin) onLogin();
    router.push(redirectTo);
  };
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <form onSubmit={handleSubmit} className="lira-section space-y-4">
        <div className="space-y-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="lira-input"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="lira-input"
            required
          />
        </div>
        <button type="submit" className="lira-button lira-button--blue w-full justify-center">
          로그인
        </button>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm text-rose-600">{error}</div>}
      </form>

      <SocialLoginButtons />

      <div className="lira-section space-y-4 text-center text-sm text-slate-600">
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
          <Link href="/account/find-id" className="hover:text-slate-700">
            아이디 찾기
          </Link>
          <span aria-hidden="true" className="text-slate-300">
            |
          </span>
          <Link href="/account/reset-password" className="hover:text-slate-700">
            비밀번호 재설정
          </Link>
        </div>
        <div className="space-y-3">
          <p>아직 계정이 없으신가요?</p>
          <Link href="/register" className="lira-button lira-button--secondary w-full justify-center">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
