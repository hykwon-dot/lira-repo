"use client";

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

type FindIdResponse = {
  emails: Array<{ id: number; email: string }>;
};

export default function FindIdForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FindIdResponse | null>(null);

  const formattedPhone = useMemo(() => {
    const digits = phone.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length < 11) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }, [phone]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/account/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? '아이디를 찾을 수 없습니다.');
      }

      setResult(data as FindIdResponse);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : '아이디를 찾는 중 오류가 발생했습니다.';
      setError(message);
      setStatus('error');
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="lira-section">
        <h1 className="text-2xl font-semibold text-slate-900">아이디 찾기</h1>
        <p className="mt-2 text-sm text-slate-500">
          가입 시 입력한 이름과 전화번호를 입력하면, 확인된 이메일 아이디를 확인할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="lira-field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="가입자 이름"
              className="lira-input"
            />
          </div>

          <div className="lira-field">
            <label htmlFor="phone">연락처</label>
            <input
              id="phone"
              inputMode="tel"
              value={formattedPhone}
              onChange={(event) => setPhone(event.target.value)}
              required
              placeholder="010-0000-0000"
              className="lira-input"
            />
            <p className="text-xs text-slate-400">가입 시 입력하신 휴대전화 번호를 정확히 입력해 주세요.</p>
          </div>

          <button
            type="submit"
            className="lira-button lira-button--blue w-full justify-center"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '조회 중…' : '아이디 찾기'}
          </button>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</div>
          )}
        </form>

        {status === 'success' && result && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <p className="font-semibold">확인된 계정 이메일</p>
            <ul className="mt-2 space-y-1">
              {result.emails.map((item) => (
                <li key={item.id} className="rounded-lg bg-white px-3 py-2 text-slate-700 shadow-sm">
                  {item.email}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">보안상의 이유로 일부 문자만 표시됩니다.</p>
          </div>
        )}
      </div>

      <div className="lira-section space-y-3 text-center text-sm text-slate-600">
        <p>비밀번호가 기억나지 않으신가요?</p>
        <Link href="/account/reset-password" className="lira-button lira-button--secondary w-full justify-center">
          비밀번호 재설정
        </Link>
        <Link href="/login" className="block text-xs text-slate-400 hover:text-slate-600">
          로그인 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
