'use client';

import { useMemo, useState } from "react";
import { FiHelpCircle, FiMessageSquare, FiPhoneCall, FiX } from "react-icons/fi";

interface HelpDeskWidgetProps {
  className?: string;
}

const SUPPORT_EMAIL = "support@lira.ai";
const SUPPORT_PHONE = "02-000-0000";

const FAQ_ITEMS = [
  {
    question: "가입 심사는 얼마나 걸리나요?",
    answer:
      "의뢰인 계정은 즉시 이용 가능하며, 민간조사원 계정은 평균 24시간 내 검토 후 결과를 안내드립니다.",
  },
  {
    question: "AI Intake 결과는 어디에서 확인하나요?",
    answer:
      "회원가입 직후 시뮬레이션 보드로 이동하면 사건 요약, 추천 탐정, 필요한 서류 목록을 한 화면에서 확인할 수 있습니다.",
  },
  {
    question: "기업 계정은 어떻게 전환하나요?",
    answer:
      "온보딩 완료 후 관리자에게 조직 초대를 요청하거나, settings > 조직 관리에서 즉시 추가할 수 있습니다.",
  },
];

export const HelpDeskWidget = ({ className }: HelpDeskWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(0);

  const activeFaq = useMemo(
    () => (typeof activeFaqIndex === "number" ? FAQ_ITEMS[activeFaqIndex] : null),
    [activeFaqIndex]
  );

  return (
    <div className={className}>
      <div className="pointer-events-none fixed bottom-6 right-4 z-30 flex flex-col items-end gap-3 sm:right-6 md:right-10">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-300/40 bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(14,116,144,0.45)] transition hover:translate-y-[-2px] hover:bg-sky-500"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls="helpdesk-widget-pane"
        >
          <FiHelpCircle className="h-4 w-4" />
          가입 도우미
        </button>
        <p className="pointer-events-auto hidden rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 shadow-sm sm:block">
          궁금한 점이 있으신가요?
        </p>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center">
          <div
            id="helpdesk-widget-pane"
            role="dialog"
            aria-modal="true"
            className="relative mx-4 mb-10 flex w-full max-w-[560px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 text-white shadow-[0_32px_105px_rgba(7,16,39,0.6)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">
                  Help Center
                </p>
                <h3 className="mt-2 text-2xl font-semibold">가입 도우미</h3>
                <p className="mt-1 text-sm text-slate-200/80">
                  가장 자주 받는 질문과 답변을 모았습니다. 더 필요하시면 아래 연락 채널로 메시지를 남겨주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="도움말 닫기"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row">
              <div className="space-y-3 sm:w-44">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">FAQ</p>
                <ul className="space-y-2 text-left text-sm text-slate-200/80">
                  {FAQ_ITEMS.map((faq, index) => {
                    const isActive = index === activeFaqIndex;
                    return (
                      <li key={faq.question}>
                        <button
                          type="button"
                          onClick={() => setActiveFaqIndex(index)}
                          className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                            isActive
                              ? "border-sky-400/80 bg-sky-500/15 text-white"
                              : "border-white/10 bg-white/5 hover:border-sky-400/40 hover:text-white"
                          }`}
                        >
                          {faq.question}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex-1 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-inner">
                {activeFaq ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-200">
                      답변
                    </h4>
                    <p className="text-base leading-relaxed text-white/90">
                      {activeFaq.answer}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-200/80">
                    궁금한 질문을 선택해주세요.
                  </p>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-sky-400/60 hover:bg-sky-500/10"
                  >
                    <FiMessageSquare className="h-4 w-4" />
                    이메일 지원
                  </a>
                    <a
                      href={`tel:${SUPPORT_PHONE.replace(/[^0-9+]/g, "")}`}
                    className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-sky-400/60 hover:bg-sky-500/10"
                  >
                    <FiPhoneCall className="h-4 w-4" />
                    전화 연결
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 bg-black/20 px-6 py-5 text-xs text-slate-200/70 sm:flex-row sm:items-center sm:justify-between">
              <span>
                보다 자세한 도큐먼트는 가입 완료 후 <strong>온보딩 센터</strong>에서 확인할 수 있습니다.
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-sky-400 hover:bg-sky-500/20"
              >
                계속 가입하기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HelpDeskWidget;
