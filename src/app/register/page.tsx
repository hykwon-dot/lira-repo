import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050d26]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-18%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(76,99,255,0.35),_transparent_70%)] blur-3xl" />
        <div className="absolute right-[-8%] top-[28%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(29,224,146,0.32),_transparent_72%)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-12%] h-[380px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_65%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-start lg:gap-16 lg:px-8">
        <aside className="w-full rounded-[32px] border border-white/10 bg-white/5 p-10 text-white shadow-[0_25px_90px_rgba(10,25,65,0.35)] backdrop-blur-xl lg:max-w-[380px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">
            Join LIRA
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.2] text-white">
            사건 의뢰부터 AI 시뮬레이션까지,
            <br />한 번에 시작하세요.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-200/90">
            고객은 사건을 빠르게 접수하고, 검증된 민간조사원은 전문성과 포트폴리오를 한 곳에서 관리합니다.
            LIRA에서 더 정교한 조사 경험을 설계해 보세요.
          </p>

          <div className="mt-8 space-y-5">
            {[
              {
                title: "AI 기반 사건 진단",
                description: "시뮬레이션을 통해 사건 구조와 위험 요소를 미리 파악하고 대응 전략을 수립합니다.",
              },
              {
                title: "검증된 민간조사원 풀",
                description: "심사를 통과한 전문가들과 협업하며, 실적과 전문 분야를 투명하게 확인하세요.",
              },
              {
                title: "데이터 중심 리포트",
                description: "결과 리포트와 커뮤니케이션 히스토리를 한눈에 관리하고 재활용할 수 있습니다.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white/95">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-200">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-xs text-slate-300/80">
            <p className="font-semibold text-white/90">이미 계정을 보유하고 계신가요?</p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 font-medium text-white/85 transition hover:border-sky-400 hover:text-sky-200"
            >
              로그인으로 이동 ↗
            </Link>
          </div>
        </aside>

        <section className="w-full">
          <div className="rounded-[36px] border border-white/10 bg-white/90 p-10 shadow-[0_25px_80px_rgba(4,11,30,0.28)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Create Account</p>
                <h2 className="mt-2 text-3xl font-semibold text-[#121b3b]">회원가입으로 시작하기</h2>
              </div>
              <p className="text-sm text-slate-500">
                역할에 따라 필요한 정보가 달라집니다. 필수 항목을 채워 빠르게 온보딩을 완료하세요.
              </p>
            </div>
            <div className="mt-8">
              <RegisterForm />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
