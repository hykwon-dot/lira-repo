"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/lib/userStore';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import {
  CASE_TYPE_OPTIONS,
  INVESTIGATOR_REGION_OPTIONS,
  INVESTIGATOR_SPECIALTY_GROUPS,
} from '@/lib/options';

// --- Client-side Image Compression Utility ---
const compressImage = async (file: File): Promise<File> => {
  // Only compress images. PDF or other types are returned as is.
  if (!file.type.startsWith('image/')) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max dimension: 1024px (Enough for verification)
        const MAX_DIMENSION = 1024;
        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
           resolve(file); 
           return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob (JPEG, quality 0.5 - aggressive compression)
        canvas.toBlob((blob) => {
          if (!blob) {
             resolve(file);
             return;
          }
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`[ImageCompression] ${file.name}: ${(file.size/1024).toFixed(1)}KB -> ${(newFile.size/1024).toFixed(1)}KB`);
          resolve(newFile);
        }, 'image/jpeg', 0.5);
      };
      img.onerror = (err) => resolve(file); // Return original on error
    };
    reader.onerror = (err) => resolve(file); // Return original on error
  });
};

// --- Client-side Base64 Converter ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

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
  const [agencyPhone, setAgencyPhone] = useState('');
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
  const [officeAddress, setOfficeAddress] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [intro, setIntro] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [pledgeFile, setPledgeFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Detailed status for better UX
  const [submitStatus, setSubmitStatus] = useState('');

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
    setOfficeAddress('');
    setExperienceYears('');
    setServiceAreas([]);
    setIntro('');
    setPortfolioUrl('');
    setBusinessLicenseFile(null);
    setAgencyPhone('');
    setPledgeFile(null);
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
      } else {
        // INVESTIGATOR
        const expNumber = parseInt(experienceYears || '0', 10);
        if (Number.isNaN(expNumber)) {
          setError('경력(년수)은 숫자만 입력해주세요.');
          setIsSubmitting(false);
          return;
        }

      setError('');

      // Prepare Plain JSON payload (Avoid FormData/Multipart to bypass CloudFront WAF 403)
      const payload: Record<string, any> = {
        role: 'INVESTIGATOR',
        email,
        password,
        name,
        licenseNumber: licenseNumber || '',
        officeAddress: officeAddress || '',
        specialties, // Send array directly
        serviceAreas,
        serviceArea: serviceAreas.join(', '),
        experienceYears: expNumber,
        introduction: intro || '',
        portfolioUrl: portfolioUrl || '',
        contactPhone: phone || '',
        agencyPhone: agencyPhone || '',
        acceptsTerms,
        acceptsPrivacy
      };

      if (businessLicenseFile) {
        setSubmitStatus('사업자등록증 최적화 중...');
        console.log('Compressing business license...');
        const compressed = await compressImage(businessLicenseFile);
        payload.businessLicenseBase64 = await fileToBase64(compressed);
      }
      if (pledgeFile) {
        setSubmitStatus('윤리서약서 최적화 중...');
        console.log('Compressing pledge file...');
        const compressed = await compressImage(pledgeFile);
        payload.pledgeFileBase64 = await fileToBase64(compressed);
      }

      // 180초 타임아웃
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        console.log(`[Version: v20260114-JSON] Sending registration request via JSON...`);
        setSubmitStatus('서버 연결 확인 중...');
        
        // 1. Connectivity Check
        try {
           const healthCheck = await fetch('/api/health/deployment', { 
             method: 'GET', 
             signal: AbortSignal.timeout(5000) 
           });
           if (!healthCheck.ok) {
             console.warn('Health check failed:', healthCheck.status);
           } else {
             console.log('Health check passed. Server is reachable.');
           }
        } catch (hErr) {
           console.error('Health check unreachable:', hErr);
           setError('서버에 연결할 수 없습니다. (Health Check Timeout) - 인터넷 연결이나 방화벽 설정을 확인해주세요.');
           clearTimeout(timeoutId);
           return;
        }

        setSubmitStatus('심사 정보 전송 중...');

        // 2. Main Registration Request
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-lira-client-timeout': '180000'
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: 'no-store' 
        });
        
        console.log('Registration response status:', res.status);
        
        let data;
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          // JSON이 아닌 응답(예: 413 Payload Too Large HTML) 처리
          const text = await res.text();
          console.error('Non-JSON response:', text);
          if (res.status === 413) {
            setError('파일 크기가 너무 큽니다. (서버 제한 초과)');
            return;
          }
          throw new Error(`서버 응답 형식이 올바르지 않습니다. (Status: ${res.status})`);
        }
        
        console.log('Registration response data:', data);
        
        if (!res.ok) {
          setError(data.error || '민간조사원 등록에 실패했습니다.');
          setIsSubmitting(false); // Ensure button state is reset immediately
          return;
        }

        setSuccess('등록 신청이 완료되었습니다. 관리자 승인 후 안내 메일을 드릴게요.');
        
        // Store user data if token is provided
        if (data.token) {
          setUser(data, data.token);
        }
        
        setTimeout(() => {
          router.push('/login?pending=investigator');
        }, 2000);
      } catch (err: unknown) {
        const errorMessage = String(err);
        if (errorMessage.includes('AbortError') || (err instanceof Error && err.name === 'AbortError')) {
          setError('서버 응답 시간이 초과되었습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해주세요.');
        } else {
          throw err;
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }
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
                description: 'AI 시나리오 추천, 사건 의뢰 관리, 맞춤형 보고서를 받아보세요.',
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
              {role === 'INVESTIGATOR' ? '탐정 이름 (탐정사무소)' : '이름 (실명)'}
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
            {role === 'INVESTIGATOR' && (
              <>
                <label className="lira-field">
                  탐정사무소 번호
                  <input
                    type="tel"
                    value={agencyPhone}
                    onChange={(e) => setAgencyPhone(e.target.value)}
                    className="lira-input"
                    placeholder="예: 02-1234-5678"
                  />
                </label>
                <label className="lira-field md:col-span-2">
                  탐정사무소 주소
                  <input
                    type="text"
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    className="lira-input"
                    placeholder="예: 서울특별시 서초구 서초대로"
                  />
                </label>
              </>
            )}
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
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[#1a2340]">전문 분야 (최소 1개 선택)</p>
                  <p className="mt-1 text-xs text-slate-500">
                    대분류별 전문 역량을 선택하면 적합한 사건과 빠르게 매칭됩니다.
                  </p>
                </div>
                <div className="space-y-6">
                  {INVESTIGATOR_SPECIALTY_GROUPS.map((group) => (
                    <div key={group.category} className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                        {group.category}
                      </p>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {group.options.map((option) => {
                          const checked = specialties.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer flex-col gap-2 rounded-xl border px-4 py-3 text-sm shadow-sm transition ${
                                checked
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => setSpecialties((prev) => toggleSelection(prev, option.value))}
                                  className="mt-1 lira-checkbox"
                                />
                                <div className="space-y-1">
                                  <span className="font-semibold text-[#0f172a]">{option.label}</span>
                                  <p className="text-xs leading-relaxed text-slate-500">{option.description}</p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
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

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#1a2340]">주요 활동 지역 (복수 선택)</p>
                <p className="text-xs text-slate-500">활동 가능한 지역을 모두 선택해 주세요. 지역별 맞춤 매칭에 활용됩니다.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {INVESTIGATOR_REGION_OPTIONS.map((option) => {
                    const checked = serviceAreas.includes(option.value);
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
                          onChange={() => setServiceAreas((prev) => toggleSelection(prev, option.value))}
                          className="lira-checkbox"
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
                {serviceAreas.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-700">
                    선택한 지역: {serviceAreas.join(', ')}
                  </div>
                )}
              </div>

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

              <label className="lira-field">
                사업자등록증 (필수)
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      alert('파일 용량은 5MB를 초과할 수 없습니다.');
                      e.target.value = '';
                      setBusinessLicenseFile(null);
                      return;
                    }
                    setBusinessLicenseFile(file);
                  }}
                  className="lira-input"
                  required
                />
                <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG 형식 (최대 5MB)</span>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-3 text-sm font-bold text-[#1a2340]">탐정 윤리 서약</h3>
                <div className="mb-4 text-xs leading-relaxed text-slate-600">
                  <p>
                    LIONE 플랫폼의 민간조사원으로 활동하기 위해서는 윤리 서약서 작성이 필요합니다.
                    아래 양식을 다운로드하여 서명 후 업로드해 주세요.
                  </p>
                  <div className="mt-3">
                    <a
                      href="/downloads/LIONE_Investigator_Pledge.txt"
                      download
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      LIONE 이용 서약서 양식 다운로드
                    </a>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="lira-field">
                    서명된 서약서 업로드 (필수)
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > 2 * 1024 * 1024) {
                          alert('파일 용량은 5MB를 초과할 수 없습니다.');
                          e.target.value = '';
                          setPledgeFile(null);
                          return;
                        }
                        setPledgeFile(file);
                      }}
                      className="lira-input"
                      required
                    />
                    <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG 형식 (최대 5MB)</span>
                  </label>
                </div>
              </div>
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
          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-4 text-base font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <span>{submitStatus || '처리 중...'}</span>
              </div>
            ) : (
              '심사 신청 보내기'
            )}
          </button>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">{success}</div>}
          <div className="flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:justify-center">
            <Link href="/" className="lira-button lira-button--ghost justify-center md:w-auto">
              메인으로 돌아가기
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
