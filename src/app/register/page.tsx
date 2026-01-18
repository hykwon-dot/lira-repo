import Link from "next/link";
import { Suspense } from "react";
import {
  FiArrowUpRight,
  FiCheckCircle,
  FiHeadphones,
  FiShield,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import RegisterForm from "./RegisterForm";
import HelpDeskWidget from "./HelpDeskWidget";

const stats = [
  {
    value: "7분",
    label: "평균 적응 시간",
    description: "AI 추천 단계로 빠른 전환",
  },
  {
    value: "98%",
    label: "시뮬레이션 완료율",
    description: "첫 주차 이후 유지율",
  },
  {
    value: "120+",
    label: "검증된 파트너",
    description: "전국 전문 민간조사 네트워크",
  },
];

const onboardingSteps = [
  {
    title: "계정 생성 및 목적 선택",
    detail: "의뢰인/기업 혹은 민간조사원 유형을 선택하고 필수 정보를 입력합니다.",
  },
  {
    title: "AI 초기 상담 & 맞춤 시나리오",
    detail: "대화형 설문으로 사건 구조를 파악하고, 필요한 서류와 다음 액션을 추천받습니다.",
  },
  {
    title: "실시간 협업 & 승인",
    detail: "민간조사원은 내부 심사를 거쳐 등록되고, 고객은 즉시 탐정 매칭을 진행할 수 있습니다.",
  },
];

const guarantees = [
  {
    icon: FiShield,
    title: "3중 데이터 보안",
    description: "개인 정보는 암호화/분리 저장되어 안전하게 보호됩니다.",
  },
  {
    icon: FiHeadphones,
    title: "전담 적응 팀",
    description: "계정 설정부터 첫 의뢰까지 라이브 채널로 지원합니다.",
  },
];

const NOISE_TEXTURE_DATA_URL =
  "data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FFFFFF' fill-opacity='0.04'%3E%3Cpath d='M0 39h1v1H0zM39 0h1v1h-1zM0 19h1v1H0zM19 0h1v1h-1zM39 19h1v1h-1zM19 39h1v1h-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#172554,_#020817_60%)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-18%] top-[-20%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(91,130,255,0.35),_transparent_70%)] blur-3xl" />
        <div className="absolute right-[-16%] top-[28%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(34,197,138,0.35),_transparent_70%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-18%] h-[460px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.35)_0%,rgba(30,64,175,0.15)_35%,rgba(14,116,144,0.12)_70%,rgba(2,6,23,0.65)_100%)]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: `url("${NOISE_TEXTURE_DATA_URL}")` }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1180px] flex-col gap-10 px-4 pb-24 pt-12 sm:px-6 md:gap-12 md:px-8 lg:flex-row lg:pb-20 lg:pt-16">
        <aside className="flex w-full flex-col justify-between gap-10 rounded-[30px] border border-white/10 bg-white/[0.08] p-6 text-white shadow-[0_28px_90px_rgba(6,18,46,0.45)] backdrop-blur-2xl sm:p-8 lg:max-w-[420px] lg:gap-12 lg:rounded-[36px] lg:p-9">
          <div className="space-y-7 sm:space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-200 sm:px-4 sm:text-[11px]">
              LIONE 시작하기
            </span>
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold leading-snug text-white sm:text-[30px] lg:text-[34px]">
                AI 시뮬레이션으로 초기 상담을 자동화하고,
                <span className="text-sky-200"> 검증된 조사 전략</span>으로 서비스를 바로 이어가세요.
              </h1>
              <p className="text-[13px] leading-relaxed text-slate-200/80 sm:text-sm">
                고객은 맞춤 시나리오와 협업 툴을, 민간조사원은 신뢰도 높은 의뢰와 데이터 기반 보고서를 한 번에 관리합니다.
                지금 가입하면 적응 팀이 초기 세팅을 도와드립니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/15 bg-white/[0.08] p-3 shadow-[0_18px_42px_rgba(6,18,46,0.35)] sm:p-4"
                >
                  <p className="text-xl font-semibold text-white sm:text-2xl">{item.value}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/80 sm:text-xs">
                    {item.label}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-200/70 sm:mt-2 sm:text-[11px]">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200 sm:text-xs">초기 이용 및 진행 절차</p>
              <ol className="space-y-3 sm:space-y-4">
                {onboardingSteps.map((step, index) => (
                  <li key={step.title} className="flex gap-3 sm:gap-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white sm:h-8 sm:w-8 sm:text-xs">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white/95 sm:text-[15px]">{step.title}</p>
                      <p className="text-[11px] leading-relaxed text-slate-200/70 sm:text-xs">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-inner">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200 sm:text-xs">Why teams choose LIONE</p>
              <div className="space-y-3">
                {[{
                  icon: FiUsers,
                  text: "법무팀, 감사팀, 대기업 리스크 조직 등 40+ 엔터프라이즈가 사용 중",
                },
                {
                  icon: FiZap,
                  text: "AI 초기 상담 → 사건 요약 → 탐정 추천으로 이어지는 일괄 자동화",
                }].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-start gap-3 text-[13px] leading-relaxed text-slate-100/85 sm:text-sm">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sky-200">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {guarantees.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/[0.12] p-4 text-left text-[13px] text-slate-100/85 sm:text-sm"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sky-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-[11px] leading-relaxed text-slate-200/70 sm:text-[12px]">{description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white sm:text-base">이미 계정을 보유하고 계신가요?</p>
                  <p className="text-xs text-slate-200/75 sm:text-[13px]">24시간 내 재접속 시 진행 중인 초기 상담을 그대로 이어갈 수 있습니다.</p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:border-sky-400 hover:bg-sky-500/20 sm:text-xs"
                >
                  로그인 이동
                  <FiArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative w-full pb-16 pt-6 sm:pt-8 lg:pb-0 lg:pt-0">
          <div className="absolute inset-0 hidden rounded-[44px] border border-white/10 bg-white/5 blur-3xl lg:block" />
          <div className="relative z-10 flex h-full flex-col rounded-[30px] border border-white/15 bg-white/95 p-5 shadow-[0_28px_80px_rgba(4,11,30,0.28)] sm:rounded-[36px] sm:p-7 lg:rounded-[40px] lg:p-9">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 sm:text-xs">Create Account</p>
                <h2 className="text-2xl font-semibold text-[#121b3b] sm:text-3xl">회원가입으로 시작하기</h2>
              </div>
              <p className="text-[13px] text-slate-500 md:max-w-[260px] md:text-sm">
                역할에 따라 필요한 정보를 안내해 드려요. 필수 항목만 입력하면 AI가 바로 초기 상담을 준비합니다.
              </p>
            </div>

            <div className="mt-7 flex-1 sm:mt-8">
              <Suspense fallback={<div>Loading...</div>}>
                <RegisterForm />
              </Suspense>
            </div>

            <div className="mt-9 space-y-4 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white p-5 text-[13px] text-slate-600 sm:mt-10 sm:text-sm">
              <div className="flex items-start gap-3">
                <FiCheckCircle className="mt-1 h-4 w-4 text-sky-500" />
                <p className="leading-relaxed">
                  가입이 완료되면 <strong>AI 초기 상담 보드</strong>로 이동하며, 수집된 사건 정보는 탐정 매칭과 보고서 작성에 자동으로 연결됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <HelpDeskWidget />
    </div>
  );
}
