"use client";

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

type LookupStatus = 'idle' | 'loading' | 'loaded';

type ResetRequirements = {
  hasSecurityQuestion: boolean;
  securityQuestion: string | null;
  hasPhoneCheck: boolean;
  displayName: string | null | undefined;
};

export default function ResetPasswordForm() {
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<ResetRequirements | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitStatus, setSubmitStatus] = useState<FetchStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const passwordChecks = useMemo(() => {
    const value = newPassword;
    return {
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    } as const;
  }, [newPassword]);

  const passedChecks = useMemo(
    () => Object.values(passwordChecks).filter(Boolean).length,
    [passwordChecks],
  );

  const passwordStrength = useMemo(() => {
    if (!newPassword) return { label: '비밀번호를 입력해 주세요.', tone: 'text-slate-400', percentage: 0 };
    if (passedChecks >= 4 && newPassword.length >= 12) {
      return { label: '매우 안전함', tone: 'text-emerald-600', percentage: 100 };
    }
    if (passedChecks >= 3) {
      return { label: '보통', tone: 'text-indigo-600', percentage: 70 };
    }
    if (passedChecks >= 2) {
      return { label: '주의 필요', tone: 'text-amber-600', percentage: 40 };
    }
    return { label: '위험', tone: 'text-rose-600', percentage: 20 };
  }, [newPassword, passedChecks]);

  const isPasswordStrongEnough = passedChecks >= 4 && newPassword.length >= 8;

  const formattedPhone = useMemo(() => {
    const digits = phone.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.length < 11) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }, [phone]);

  const handleLookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLookupStatus('loading');
    setLookupError(null);
    setRequirements(null);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/account/reset-password?email=${encodeURIComponent(email.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? '계정 정보를 찾을 수 없습니다.');
      }

      setRequirements(data as ResetRequirements);
      if (!data?.hasSecurityQuestion && !data?.hasPhoneCheck) {
        setName(data?.displayName ?? '');
      }
      setLookupStatus('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : '계정 조회 중 오류가 발생했습니다.';
      setLookupError(message);
      setLookupStatus('idle');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setSubmitError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isPasswordStrongEnough) {
      setSubmitError('대문자, 소문자, 숫자, 특수문자 중 최소 4가지를 포함한 8자 이상의 비밀번호를 입력해 주세요.');
      return;
    }

    setSubmitStatus('loading');
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/account/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          newPassword,
          securityAnswer: securityAnswer || undefined,
          phone: phone || undefined,
          name: name || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? '비밀번호를 재설정할 수 없습니다.');
      }

      setSubmitStatus('success');
      setSuccessMessage('비밀번호가 안전하게 변경되었습니다. 새 비밀번호로 로그인해 주세요.');
    } catch (err) {
      const message = err instanceof Error ? err.message : '비밀번호 재설정 중 오류가 발생했습니다.';
      setSubmitError(message);
      setSubmitStatus('error');
    }
  };

  const requiresVerification = Boolean(requirements?.hasSecurityQuestion || requirements?.hasPhoneCheck);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="lira-section">
        <h1 className="text-2xl font-semibold text-slate-900">비밀번호 재설정</h1>
        <p className="mt-2 text-sm text-slate-500">
          가입하신 이메일을 입력하고, 계정 확인 절차를 완료한 후 비밀번호를 재설정하세요.
        </p>

        {lookupStatus !== 'loaded' ? (
          <form onSubmit={handleLookup} className="mt-6 space-y-4">
            <div className="lira-field">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="example@lione.ai"
                className="lira-input"
              />
            </div>

            <button
              type="submit"
              className="lira-button lira-button--blue w-full justify-center"
              disabled={lookupStatus === 'loading'}
            >
              {lookupStatus === 'loading' ? '확인 중…' : '계정 확인'}
            </button>

            {lookupError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{lookupError}</div>
            )}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">확인된 계정</p>
              <p className="mt-1 text-[13px]">{email}</p>
              {requirements?.displayName && (
                <p className="mt-1 text-[13px] text-slate-500">등록된 이름: {requirements.displayName}</p>
              )}
            </div>

            {requirements?.hasSecurityQuestion && (
              <div className="lira-field">
                <label htmlFor="securityAnswer">보안 질문의 답변</label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {requirements.securityQuestion ?? '등록된 보안 질문'}
                </div>
                <input
                  id="securityAnswer"
                  value={securityAnswer}
                  onChange={(event) => setSecurityAnswer(event.target.value)}
                  required
                  placeholder="등록하신 답변을 입력하세요"
                  className="lira-input mt-2"
                />
              </div>
            )}

            {requirements?.hasPhoneCheck && (
              <div className="lira-field">
                <label htmlFor="phone">연락처</label>
                <input
                  id="phone"
                  inputMode="tel"
                  value={formattedPhone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="010-0000-0000"
                  className="lira-input"
                  required={!requirements?.hasSecurityQuestion}
                />
                <p className="text-xs text-slate-400">가입 시 등록한 전화번호를 입력하면 추가 확인에 도움이 됩니다.</p>
              </div>
            )}

            {!requiresVerification && (
              <div className="lira-field">
                <label htmlFor="name">이름</label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="가입자 이름"
                  className="lira-input"
                  required
                />
              </div>
            )}

            <div className="lira-field">
              <label htmlFor="newPassword">새 비밀번호</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                placeholder="새 비밀번호 (8자 이상)"
                className="lira-input"
              />
              <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${passwordStrength.tone}`}>{passwordStrength.label}</span>
                  <span className="font-mono text-[11px] text-slate-400">{passedChecks}/5</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 transition-all`}
                    style={{ width: `${passwordStrength.percentage}%` }}
                  />
                </div>
                <ul className="space-y-1 text-[11px]">
                  <PasswordHintItem label="길이 8자 이상" active={passwordChecks.length} />
                  <PasswordHintItem label="대문자 포함" active={passwordChecks.uppercase} />
                  <PasswordHintItem label="소문자 포함" active={passwordChecks.lowercase} />
                  <PasswordHintItem label="숫자 포함" active={passwordChecks.number} />
                  <PasswordHintItem label="특수문자 포함" active={passwordChecks.special} />
                </ul>
              </div>
            </div>

            <div className="lira-field">
              <label htmlFor="confirmPassword">비밀번호 확인</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                placeholder="새 비밀번호 다시 입력"
                className="lira-input"
              />
            </div>

            <button
              type="submit"
              className="lira-button lira-button--blue w-full justify-center"
              disabled={submitStatus === 'loading' || !isPasswordStrongEnough}
            >
              {submitStatus === 'loading' ? '변경 중…' : '비밀번호 변경'}
            </button>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{submitError}</div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{successMessage}</div>
            )}
          </form>
        )}
      </div>

      <div className="lira-section space-y-3 text-center text-sm text-slate-600">
        <p>아이디가 기억나지 않으신가요?</p>
        <Link href="/account/find-id" className="lira-button lira-button--secondary w-full justify-center">
          아이디 찾기
        </Link>
        <Link href="/login" className="block text-xs text-slate-400 hover:text-slate-600">
          로그인 화면으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

function PasswordHintItem({ label, active }: { label: string; active: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold ${
          active ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : 'border-slate-300 bg-white text-slate-400'
        }`}
      >
        {active ? '✔' : '•'}
      </span>
      {label}
    </li>
  );
}
