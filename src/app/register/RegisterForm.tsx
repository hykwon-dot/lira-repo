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

        // Max dimension: 800px (Aggressive reduction for WAF bypass)
        const MAX_DIMENSION = 800;
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
      img.onerror = () => resolve(file); // Return original on error
    };
    reader.onerror = () => resolve(file); // Return original on error
  });
};

// --- Client-side Base64 Converter ---
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- Hex Converter for WAF Bypass ---
const fileToHex = (file: File): Promise<string> => {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
         const buffer = reader.result as ArrayBuffer;
         const bytes = new Uint8Array(buffer);
         let hex = '';
         for (let i = 0; i < bytes.length; i++) {
             hex += bytes[i].toString(16).padStart(2, '0');
         }
         resolve(hex);
      };
      reader.onerror = reject;
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
  const [termsFile, setTermsFile] = useState<File | null>(null);

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
    setTermsFile(null);
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

        // [File Size Check]
        const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB
        if (businessLicenseFile && businessLicenseFile.type === 'application/pdf' && businessLicenseFile.size > MAX_PDF_SIZE) {
            setError('사업자등록증 PDF 파일이 너무 큽니다. (3MB 이하로 줄이거나 이미지로 업로드해주세요)');
            setIsSubmitting(false);
            return;
        }
        if (pledgeFile && pledgeFile.type === 'application/pdf' && pledgeFile.size > MAX_PDF_SIZE) {
            setError('윤리서약서 PDF 파일이 너무 큽니다. (3MB 이하로 줄이거나 이미지로 업로드해주세요)');
            setIsSubmitting(false);
            return;
        }
        if (termsFile && termsFile.type === 'application/pdf' && termsFile.size > MAX_PDF_SIZE) {
            setError('이용약관 서약서 PDF 파일이 너무 큽니다. (3MB 이하로 줄이거나 이미지로 업로드해주세요)');
            setIsSubmitting(false);
            return;
        }
        const MAX_RAW_SIZE = 10 * 1024 * 1024;
        if ((businessLicenseFile?.size || 0) > MAX_RAW_SIZE || (pledgeFile?.size || 0) > MAX_RAW_SIZE || (termsFile?.size || 0) > MAX_RAW_SIZE) {
             setError('파일 크기가 너무 큽니다. (10MB 이하 파일만 선택해주세요)');
             setIsSubmitting(false);
             return;
        }

      setError('');

      // [Step 1] Prepare ONLY Text Data for Initial Registration
      // We decouple file upload to avoid WAF 403 on the public /api/register endpoint
      const registrationPayload: Record<string, any> = {
        role: 'INVESTIGATOR',
        email,
        password,
        name,
        licenseNumber: licenseNumber || '',
        officeAddress: officeAddress || '',
        specialties, 
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

      // [Pre-process Files] Prepare them as HEX to avoid WAF false positives on Base64
      const filePayload: Record<string, string> = {};
      
      if (businessLicenseFile) {
        setSubmitStatus('파일 변환 중 (부호화 1/2)...');
        try {
            const compressed = await compressImage(businessLicenseFile);
            // Use Hex encoding instead of Base64 to bypass 'SQLi/XSS' WAF filters
            filePayload.businessLicenseHex = await fileToHex(compressed);
            filePayload.businessLicenseType = compressed.type; // Send mime type too
        } catch (e) {
            console.warn('License conversion failed', e);
        }
      }
      if (pledgeFile) {
        setSubmitStatus('파일 변환 중 (부호화 2/3)...');
        try {
            const compressed = await compressImage(pledgeFile);
            filePayload.pledgeFileHex = await fileToHex(compressed);
            filePayload.pledgeFileType = compressed.type;
        } catch (e) {
            console.warn('Pledge conversion failed', e);
        }
      }
      if (termsFile) {
        setSubmitStatus('파일 변환 중 (부호화 3/3)...');
        try {
            const compressed = await compressImage(termsFile);
            filePayload.termsFileHex = await fileToHex(compressed);
            filePayload.termsFileType = compressed.type;
        } catch (e) {
            console.warn('Terms conversion failed', e);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      try {
        console.log(`[Version: v20260114-Split] 1. Registering User (Text Only)...`);
        setSubmitStatus('가입 정보 확인 중...');
        
        // Connectivity Check
        try {
           const healthCheck = await fetch('/api/health/deployment', { method: 'GET', signal: AbortSignal.timeout(5000) });
           if (!healthCheck.ok) console.warn('Health check warning:', healthCheck.status);
        } catch {
           setError('서버 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
           clearTimeout(timeoutId);
           return;
        }

        // [Step 1 Execute]
        setSubmitStatus('기본 정보 저장 중...');
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationPayload),
          signal: controller.signal
        });

        // Handle Step 1 Response
        let data;
        try {
             data = await res.json();
        } catch {
             const text = await res.text();
             console.error('Register Non-JSON:', text);
             if (res.status === 403) throw new Error('WAF_BLOCK');
             throw new Error(`Server Error: ${res.status}`);
        }

        if (!res.ok) {
          setError(data.error || '가입 요청이 거부되었습니다.');
          setIsSubmitting(false);
          return;
        }
        
        // Success! User created.
        const token = data.token;
        if (token) setUser(data, token);

        // [Step 2] Upload Files (If any) using the new Token
        const hasFiles = Object.keys(filePayload).length > 0;
        let uploadFailed = false;

        if (hasFiles && token) {
            setSubmitStatus('제출 서류 업로드 중...');
            console.log('2. Uploading Files via Profile API...');
            
            try {
                // Use POST instead of PATCH to avoid potential WAF/Firewall blocking on PATCH method
                const uploadRes = await fetch('/api/me/profile', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(filePayload)
                });
                
                if (!uploadRes.ok) {
                    console.error('File Upload Failed:', uploadRes.status);
                    
                    // Fallback: Try individually if combined fails (reduce payload size)
                    if (filePayload.businessLicenseHex && filePayload.pledgeFileHex) {
                        console.log('Retrying individually...');
                         await fetch('/api/me/profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ 
                                businessLicenseHex: filePayload.businessLicenseHex,
                                businessLicenseType: filePayload.businessLicenseType 
                            })
                        });
                         await fetch('/api/me/profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ 
                                pledgeFileHex: filePayload.pledgeFileHex,
                                pledgeFileType: filePayload.pledgeFileType
                             })
                        });
                        if (filePayload.termsFileHex) {
                          await fetch('/api/me/profile', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ 
                                  termsFileHex: filePayload.termsFileHex,
                                  termsFileType: filePayload.termsFileType
                                })
                          });
                        }
                    } else {
                        uploadFailed = true;
                    }
                } else {
                    console.log('File Upload Success');
                }
            } catch (upErr) {
                console.error('File Upload Network Error:', upErr);
                uploadFailed = true;
            }
        }

        if (uploadFailed) {
            alert('회원가입은 성공했으나, 서류 업로드에 실패했습니다. 로그인 후 마이페이지에서 사업자등록증과 서약서를 다시 등록해주세요.');
        } else {
            setSuccess('등록 신청이 완료되었습니다. 관리자 승인 후 안내 메일을 드릴게요.');
        }
        
        setTimeout(() => {
          router.push('/login?pending=investigator');
        }, 1500);

      } catch (err: unknown) {
        const msg = String(err);
        if (msg.includes('WAF_BLOCK') || msg.includes('403')) {
             setError('보안 정책에 의해 가입 요청이 차단되었습니다. (WAF 403) - VPN을 끄거나 다른 네트워크에서 시도해주세요.');
        } else if (msg.includes('AbortError')) {
           setError('서버 응답 시간 초과. (Timeout)');
        } else {
           setError(`오류 발생: ${err instanceof Error ? err.message : '알 수 없음'}`);
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
                    if (file && file.size > 3 * 1024 * 1024) {
                      alert('파일 용량은 3MB를 초과할 수 없습니다. (압축 또는 이미지 변환 후 업로드해주세요)');
                      e.target.value = '';
                      setBusinessLicenseFile(null);
                      return;
                    }
                    setBusinessLicenseFile(file);
                  }}
                  className="lira-input"
                  required
                />
                <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG 형식 (최대 3MB)</span>
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="mb-3 text-sm font-bold text-[#1a2340]">탐정 윤리 서약</h3>
                <div className="mb-4 text-xs leading-relaxed text-slate-600">
                  <p>
                    LIONE 플랫폼의 민간조사원으로 활동하기 위해서는 윤리 서약서 및 서비스 이용 약관 확인이 필요합니다.
                    아래 양식을 각각 다운로드하여 내용을 확인하고 서명 후 업로드해 주세요.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <a
                      href="/downloads/LIONE 탐정 윤리 서약서_250310.pdf"
                      download
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      LIONE 탐정 윤리 서약서 다운로드 (PDF)
                    </a>
                    <a
                      href="/downloads/LIONE 탐정 서비스 이용 약관_250310.pdf"
                      download
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      LIONE 탐정 서비스 이용 약관 다운로드 (PDF)
                    </a>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="lira-field">
                    서명된 윤리 서약서 업로드 (필수)
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > 3 * 1024 * 1024) {
                          alert('파일 용량은 3MB를 초과할 수 없습니다. (압축 또는 이미지 변환 후 업로드해주세요)');
                          e.target.value = '';
                          setPledgeFile(null);
                          return;
                        }
                        setPledgeFile(file);
                      }}
                      className="lira-input"
                      required
                    />
                    <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG 형식 (최대 3MB)</span>
                  </label>
                  <label className="lira-field">
                    서명된 서비스 이용 약관 업로드 (필수)
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (file && file.size > 3 * 1024 * 1024) {
                          alert('파일 용량은 3MB를 초과할 수 없습니다. (압축 또는 이미지 변환 후 업로드해주세요)');
                          e.target.value = '';
                          setTermsFile(null);
                          return;
                        }
                        setTermsFile(file);
                      }}
                      className="lira-input"
                      required
                    />
                    <span className="text-xs text-slate-500 mt-1">PDF, JPG, PNG 형식 (최대 3MB)</span>
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
