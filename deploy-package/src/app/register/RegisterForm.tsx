"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/userStore';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { CASE_TYPE_OPTIONS, INVESTIGATOR_SPECIALTIES } from '@/lib/options';

type PublicRole = 'USER' | 'INVESTIGATOR';

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useUserStore();

  const [role, setRole] = useState<PublicRole>('USER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [region, setRegion] = useState('');
  const [preferredCaseTypes, setPreferredCaseTypes] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [acceptsPrivacy, setAcceptsPrivacy] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [specialties, setSpecialties] = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [intro, setIntro] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleParam = searchParams?.get('role');

  useEffect(() => {
    const requestedRole = roleParam;
    if (requestedRole && requestedRole.toLowerCase() === 'investigator') {
      setRole('INVESTIGATOR');
    } else if (requestedRole && requestedRole.toLowerCase() === 'user') {
      setRole('USER');
    }
  }, [roleParam]);

  const resetInvestigatorFields = () => {
    setSpecialties([]);
    setLicenseNumber('');
    setExperienceYears('');
    setServiceArea('');
    setIntro('');
    setPortfolioUrl('');
  };

  const resetCustomerFields = () => {
    setDisplayName('');
    setPhone('');
    setBirthDate('');
    setGender('');
    setOccupation('');
    setRegion('');
    setPreferredCaseTypes([]);
    setBudgetMin('');
    setBudgetMax('');
    setUrgencyLevel('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setMarketingOptIn(false);
  };

  const handleRoleChange = (nextRole: PublicRole) => {
    setRole(nextRole);
    setError('');
    setSuccess('');
    if (nextRole === 'USER') {
      resetInvestigatorFields();
    } else {
      resetCustomerFields();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setSuccess('');

    if (!acceptsTerms || !acceptsPrivacy) {
      setError('약관과 개인정보 수집 및 이용에 동의해야 가입할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (role === 'USER') {
        if ((securityQuestion && !securityAnswer) || (!securityQuestion && securityAnswer)) {
          setError('보안 질문과 답변은 함께 입력하거나 모두 비워 두어야 합니다.');
          return;
        }

        const parsedBudgetMin = budgetMin ? Number(budgetMin) : null;
        const parsedBudgetMax = budgetMax ? Number(budgetMax) : null;
        if (budgetMin && Number.isNaN(parsedBudgetMin)) {
          setError('예산 최소는 숫자여야 합니다.');
          return;
        }
        if (budgetMax && Number.isNaN(parsedBudgetMax)) {
          setError('예산 최대는 숫자여야 합니다.');
          return;
        }

        const payload = {
          role: 'USER',
          email,
          password,
          name,
          displayName: displayName || null,
          phone: phone || null,
          birthDate: birthDate || null,
          gender: gender || null,
          occupation: occupation || null,
          region: region || null,
          preferredCaseTypes,
          budgetMin: parsedBudgetMin,
          budgetMax: parsedBudgetMax,
          urgencyLevel: urgencyLevel || null,
          securityQuestion: securityQuestion || null,
          securityAnswer: securityAnswer || null,
          acceptsTerms,
          acceptsPrivacy,
          marketingOptIn,
        };

        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || '회원가입에 실패했습니다.');
          return;
        }

        const token = data.token ?? null;
        if (token) {
          try {
            sessionStorage.setItem('lira.authToken', token);
          } catch (storageError) {
            console.warn('Failed to persist auth token', storageError);
          }
        }
        setUser(
          {
            id: String(data.id ?? ''),
            email: data.email,
            name: data.name ?? '',
            role: 'user',
            monthlyUsage: data.monthlyUsage ?? 0,
            remainingTokens: data.remainingTokens ?? 0,
          },
          token,
        );
        setSuccess('회원가입이 완료되었습니다. 맞춤 시뮬레이션으로 이동합니다.');
        router.push('/simulation');
        return;
      }

      // Investigator flow
      if (specialties.length === 0) {
        setError('최소 한 개 이상의 전문 분야를 선택해 주세요.');
        return;
      }
      const expNumber = experienceYears ? Number(experienceYears) : 0;
      if (experienceYears && Number.isNaN(expNumber)) {
        setError('경력 연수는 숫자로 입력해 주세요.');
        return;
      }

      const payload = {
        role: 'INVESTIGATOR',
        email,
        password,
        name,
        licenseNumber: licenseNumber || null,
        specialties,
        experienceYears: expNumber,
        serviceArea: serviceArea || null,
        introduction: intro || null,
        portfolioUrl: portfolioUrl || null,
        contactPhone: phone || null,
        acceptsTerms,
        acceptsPrivacy,
      };

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '민간조사원 등록에 실패했습니다.');
        return;
      }

      setSuccess('등록 신청이 완료되었습니다. 관리자 승인 후 안내 메일을 드릴게요.');
      setTimeout(() => {
        router.push('/login?pending=investigator');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
      } else {
        setError(`서버 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  return (
    <div className="w-full space-y-10">
      <div className="lira-section backdrop-blur">
        <h1 className="text-2xl font-semibold text-[#1a2340]">어떤 목적으로 가입하시나요?</h1>
        <p className="mt-2 text-sm text-slate-500">
          고객은 즉시 AI 시뮬레이션과 의뢰 서비스를 이용할 수 있으며, 민간조사원은 운영팀 승인 후 디렉터리에 노출됩니다.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {(
            [
              {
                value: 'USER' as PublicRole,
                title: '의뢰인/기업 고객',
                description: 'AI 시나리오 추천, 사건 의뢰 관리, 맞춤형 레포트를 받아보세요.',
                accent: 'from-sky-500/10 to-sky-500/0 border-sky-100',
              },
              {
                value: 'INVESTIGATOR' as PublicRole,
                title: '민간조사원 등록',
                description: '전문 분야와 경력을 제출하면 내부 심사를 거쳐 매칭 서비스에 참여합니다.',
                accent: 'from-emerald-500/10 to-emerald-500/0 border-emerald-100',
              },
            ] as const
          ).map((card) => {
            const active = role === card.value;
            return (
              <button
                key={card.value}
                type="button"
                onClick={() => handleRoleChange(card.value)}
                className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none ${
                  active
                    ? `border-sky-400 shadow-sm ring-2 ring-sky-300` 
                    : 'border-slate-200 shadow-sm'
                } bg-gradient-to-br ${card.accent}`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  {card.value === 'USER' ? 'Client' : 'Investigator'}
                </span>
                <p className="mt-2 text-lg font-bold text-[#1a2340]">{card.title}</p>
                <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="lira-section">
          <div className="flex flex-col gap-2">
            <h2 className="lira-section-title">기본 정보</h2>
            <p className="lira-subtitle">로그인 및 연락을 위해 필요한 최소한의 정보를 입력해주세요.</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="lira-field md:col-span-2">
              이름 (실명)
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="lira-input"
                required
              />
            </label>
            <label className="lira-field">
              이메일
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lira-input"
                required
              />
            </label>
            <label className="lira-field">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="lira-input"
                required
              />
            </label>
            {role === 'USER' && (
              <label className="lira-field">
                표시 이름 (선택)
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="lira-input"
                />
              </label>
            )}
            <label className="lira-field">
              휴대폰 번호
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="lira-input"
                required={role === 'INVESTIGATOR'}
              />
            </label>
          </div>
        </section>

        {role === 'USER' ? (
          <section className="lira-section">
            <div className="flex flex-col gap-2">
              <h2 className="lira-section-title">프로필 & 관심사</h2>
              <p className="lira-subtitle">관심 있는 사건 유형과 예산 범위를 알려주시면 더 잘 맞는 시나리오를 추천해 드립니다.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="lira-field">
                생년월일
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="lira-input" />
              </label>
              <label className="lira-field">
                성별 (선택)
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="lira-select">
                  <option value="">선택하지 않음</option>
                  <option value="FEMALE">여성</option>
                  <option value="MALE">남성</option>
                  <option value="NON_BINARY">논바이너리/기타</option>
                  <option value="NO_DISCLOSE">응답하지 않음</option>
                </select>
              </label>
              <label className="lira-field">
                직업 (선택)
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="lira-input"
                  placeholder="예: 인사 담당자"
                />
              </label>
              <label className="lira-field">
                거주 지역/도시 (선택)
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="lira-input"
                  placeholder="예: 서울, 경기"
                />
              </label>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#1a2340]">관심 사건 유형 (복수 선택)</p>
                <p className="mt-1 text-xs text-slate-500">관심 분야를 선택하면 시나리오와 전문 조사를 더 정확히 추천할 수 있습니다.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {CASE_TYPE_OPTIONS.map((option) => {
                    const checked = preferredCaseTypes.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                          checked ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setPreferredCaseTypes((prev) => toggleSelection(prev, option.value))}
                          className="lira-checkbox"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="lira-field">
                  예산 최소 (₩)
                  <input
                    type="number"
                    min={0}
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value)}
                    className="lira-input"
                    placeholder="예: 2000000"
                  />
                </label>
                <label className="lira-field">
                  예산 최대 (₩)
                  <input
                    type="number"
                    min={0}
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    className="lira-input"
                    placeholder="예: 5000000"
                  />
                </label>
              </div>

              <label className="lira-field md:w-1/2">
                긴급도 (선택)
                <select value={urgencyLevel} onChange={(e) => setUrgencyLevel(e.target.value)} className="lira-select">
                  <option value="">선택하지 않음</option>
                  <option value="LOW">낮음 (2주 이상 여유)</option>
                  <option value="MEDIUM">보통 (1~2주 내)</option>
                  <option value="HIGH">높음 (3~5일 내)</option>
                  <option value="CRITICAL">긴급 (48시간 이내)</option>
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="lira-field">
                  보안 질문 (선택)
                  <input
                    type="text"
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="lira-input"
                    placeholder="예: 내가 첫 근무했던 회사는?"
                  />
                </label>
                <label className="lira-field">
                  보안 질문 답변 (선택)
                  <input
                    type="text"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    className="lira-input"
                    placeholder="예: ACME"
                  />
                </label>
              </div>
            </div>
          </section>
        ) : (
          <section className="lira-section">
            <div className="flex flex-col gap-2">
              <h2 className="lira-section-title">민간조사원 프로필</h2>
              <p className="lira-subtitle">운영팀이 아래 정보를 기반으로 심사합니다. 정확하고 최신 정보를 기입해주세요.</p>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#1a2340]">전문 분야 (최소 1개 선택)</p>
                <p className="mt-1 text-xs text-slate-500">특화된 분야를 알려주시면 적합한 사건과 빠르게 매칭됩니다.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {INVESTIGATOR_SPECIALTIES.map((option) => {
                    const checked = specialties.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                          checked ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSpecialties((prev) => toggleSelection(prev, option.value))}
                          className="lira-checkbox"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="lira-field">
                  자격증 번호 (있는 경우)
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="lira-input"
                    placeholder="예: 2024-XX-12345"
                  />
                </label>
                <label className="lira-field">
                  현장 경력 (년)
                  <input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="lira-input"
                    placeholder="예: 5"
                  />
                </label>
              </div>

              <label className="lira-field">
                주요 활동 지역
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="lira-input"
                  placeholder="예: 전국, 수도권, 온라인"
                />
              </label>

              <label className="lira-field">
                전문 분야 소개
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  className="lira-textarea"
                  placeholder="주요 성과, 장점, 협업 스타일 등을 간단히 소개해주세요."
                />
              </label>

              <label className="lira-field">
                포트폴리오/웹사이트 URL (선택)
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="lira-input"
                  placeholder="https://example.com"
                />
              </label>
            </div>
          </section>
        )}

        <section className="lira-section">
          <h2 className="lira-section-title">약관 동의</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptsTerms}
                onChange={(e) => setAcceptsTerms(e.target.checked)}
                className="mt-1 lira-checkbox"
                required
              />
              <span>
                <strong>서비스 이용약관</strong>과 운영 정책을 확인했으며 이에 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptsPrivacy}
                onChange={(e) => setAcceptsPrivacy(e.target.checked)}
                className="mt-1 lira-checkbox"
                required
              />
              <span>
                <strong>개인정보 수집 및 이용</strong>에 동의하며, 심사 목적의 추가 연락을 허용합니다.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-1 lira-checkbox"
              />
              <span>AI 시뮬레이션 활용 가이드, 서비스 업데이트 등의 정보를 수신하겠습니다. (선택)</span>
            </label>
          </div>
        </section>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="lira-button lira-button--blue w-full justify-center"
          >
            {isSubmitting ? '처리 중...' : role === 'USER' ? '회원가입 완료' : '심사 신청 보내기'}
          </button>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>}
          <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:justify-center">
            <Link href="/" className="lira-button lira-button--ghost justify-center md:w-auto">
              메인으로 돌아가기
            </Link>
            <Link href="/simulation" className="lira-button lira-button--secondary justify-center md:w-auto">
              제품 소개 살펴보기
            </Link>
          </div>
        </div>
      </form>

      <div className="lira-section text-center text-sm text-slate-600">
        <p className="mb-3">이미 계정이 있으신가요?</p>
        <Link href="/login" className="lira-button lira-button--secondary w-full justify-center">
          로그인으로 이동
        </Link>
      </div>
    </div>
  );
}
