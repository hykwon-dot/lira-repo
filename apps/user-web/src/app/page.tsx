"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// --- Data Constants ---

const caseTypes = [
  "배우자 부정행위",
  "활동 정보 확인",
  "위치 관련 정보 확인",
  "기업 내부조사",
  "기술·자료 유출",
  "가족·양육권",
  "기타",
];

const evidenceTypes = [
  "대화내역",
  "송금내역",
  "계약서·차용증",
  "사진·영상",
  "녹음파일",
  "아직 없음",
];

const reviewSteps = [
  "입력 내용 확인",
  "비슷한 사건 데이터 대조",
  "보유 자료 기준 검토",
  "조사 가능 범위 분류",
  "조사원 연결 가능 여부 확인",
];

const investigatorList = [
  { name: "K 조사원", field: "배우자 부정행위", career: "경력 12년", area: "수도권" },
  { name: "P 조사원", field: "기업 보안/횡령", career: "경력 15년", area: "서울·경기" },
  { name: "L 조사원", field: "활동 / 사실 확인", career: "경력 10년", area: "전국 협력" },
  { name: "J 조사원", field: "사기 피해 / 증거 정리", career: "경력 9년", area: "수도권" },
];

const faqItems = [
  {
    q: "처음부터 실명이나 자세한 개인정보를 입력해야 하나요?",
    a: "아닙니다. 초기 사전진단 단계에서는 실명이나 연락처 없이 사건 유형과 확인하고 싶은 내용을 입력할 수 있습니다. 담당자 상담, 결과 저장, 조사원 연결이 필요한 경우에만 연락 가능한 정보를 단계적으로 안내합니다.",
  },
  {
    q: "입력한 사건 내용이 조사원에게 바로 전달되나요?",
    a: "아닙니다. 입력 내용은 먼저 사전진단과 내부 검토에 사용됩니다. 조사원 연결은 사전진단 결과를 확인한 뒤, 의뢰인이 상담 또는 조사원 연결을 요청할 경우에만 검토됩니다.",
  },
  {
    q: "입력한 사건 정보와 보유 자료는 어떻게 관리되나요?",
    a: "입력한 내용은 사전진단과 상담 검토 목적 범위에서 관리됩니다. 정식 진행 전에는 필요한 범위 이상의 개인정보를 요구하지 않으며, 자료 보관과 삭제 기준은 개인정보처리방침에 따릅니다.",
  },
  // {
  //   q: "위치추적이나 메신저 복구 같은 요청도 가능한가요?",
  //   a: "불법 위치추적, 해킹, 도청, 개인정보 불법조회 등 위법 소지가 있는 요청은 진행하지 않습니다. Li-One은 합법적으로 확인 가능한 범위와 필요한 자료를 먼저 안내합니다.",
  // },
];

// --- Sub-components ---

function SelectablePill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl border border-slate-950 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition"
          : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
      }
    >
      {children}
    </button>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 text-center shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/80">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-slate-950 via-blue-700 to-blue-400" />
      <div className="mx-auto flex min-h-[84px] flex-col items-center justify-center">
        <div className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{value}</div>
        <div className="mt-2 text-xs font-semibold leading-5 text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function InvestigatorCard({ item }: { item: typeof investigatorList[0] }) {
  return (
    <div className="min-w-[260px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
          {item.name.slice(0, 1)}
        </div>
        <div>
          <div className="font-bold text-slate-950">{item.name}</div>
          <div className="text-xs font-medium text-blue-700">신원확인 완료 조사원</div>
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <div>{item.field}</div>
        <div>{item.career} · {item.area}</div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function Home() {
  const router = useRouter();
  const [selectedCase, setSelectedCase] = useState("외도·상간");
  const [selectedEvidence, setSelectedEvidence] = useState<string[]>(["대화내역", "사진·영상"]);
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState<"input" | "loading" | "result">("input");
  const [openFaq, setOpenFaq] = useState(0);

  const evidenceLabel = useMemo(() => {
    if (!selectedEvidence.length) return "선택 없음";
    return selectedEvidence.join(", ");
  }, [selectedEvidence]);

  const toggleEvidence = (item: string) => {
    if (item === "아직 없음") {
      setSelectedEvidence(["아직 없음"]);
      return;
    }
    setSelectedEvidence((prev) => {
      const filtered = prev.filter((v) => v !== "아직 없음");
      return filtered.includes(item) ? filtered.filter((v) => v !== item) : [...filtered, item];
    });
  };

  const startReview = () => {
    // Save to session storage for the simulation page to pick up
    const handoffData = {
      caseType: selectedCase,
      evidence: selectedEvidence,
      memo: memo,
      timestamp: Date.now(),
    };

    try {
      window.sessionStorage.setItem("main-diagnosis-handoff", JSON.stringify(handoffData));

      // Guest Analytics Tracking
      let guestId = window.localStorage.getItem("guest_id");
      if (!guestId) {
        guestId = crypto.randomUUID();
        window.localStorage.setItem("guest_id", guestId);
      }

      // 대화 세션 단위 ID 생성 (ChatSimulation에서도 사용)
      const sessionId = crypto.randomUUID();
      window.sessionStorage.setItem("guest_session_id", sessionId);

      fetch("/api/analytics/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          sessionId,
          action: "START_DIAGNOSIS",
          caseType: selectedCase,
          payload: handoffData
        })
      }).catch(console.error);

    } catch (e) {
      console.error("Failed to save diagnosis handoff", e);
    }

    router.push("/simulation");
  };

  const resetReview = () => setStatus("input");

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      {/* 
        Note: Header and Footer are provided by layout.tsx.
        Removing redundant header/footer from the design concept.
      */}

      <section id="diagnosis" className="relative overflow-hidden px-5 py-10 md:px-8 md:py-14">
        <div className="absolute left-1/2 top-0 h-[520px] w-[940px] -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 shadow-sm">
              말하기 어려운 문제도, 비공개로 먼저 확인할 수 있습니다
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-950 md:text-6xl">
              누구에게도 말하기 어려운 문제,
              <br className="hidden md:block" /> 비공개로 먼저 확인해보세요
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              외도, 채무, 사기, 가족 문제처럼 쉽게 꺼내기 어려운 일도 처음부터 실명이나 연락처 없이 시작할 수 있습니다. Li-One의 누적 사건 데이터와 유사 사례를 바탕으로 조사 가능 범위, 필요한 자료, 조사원 연결 가능 여부를 먼저 정리합니다.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            <MiniStat value="누적 데이터" label="유사 사건 기준 대조" />
            <MiniStat value="30+" label="신원확인 완료 조사원" />
            <MiniStat value="비공개 검토" label="조사원 자동전달 없음" />
            <MiniStat value="계약 전" label="범위·비용 먼저 안내" />
          </div>

          <div className="mx-auto mt-8 grid max-w-7xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/80 md:p-7"
            >
              {status === "input" && (
                <div>
                  <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-extrabold">내 사건 비공개 사전진단</h2>
                      <p className="mt-1 text-sm text-slate-500">입력한 내용은 조사원에게 바로 전달되지 않습니다.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">비공개 입력</span>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="mb-3 text-sm font-bold text-slate-900">1. 어떤 사건인가요?</div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {caseTypes.map((item) => (
                          <SelectablePill key={item} active={selectedCase === item} onClick={() => setSelectedCase(item)}>
                            {item}
                          </SelectablePill>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900">2. 현재 가지고 있는 자료가 있나요?</div>
                        <div className="text-xs font-medium text-slate-500">중복 선택 가능</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {evidenceTypes.map((item) => (
                          <SelectablePill key={item} active={selectedEvidence.includes(item)} onClick={() => toggleEvidence(item)}>
                            {item}
                          </SelectablePill>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-bold text-slate-900">3. 확인하고 싶은 내용을 간단히 적어주세요</div>
                      <textarea
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        className="min-h-[118px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        placeholder="예시를 참고해 현재 상황을 간단히 적어주세요."
                      />
                      <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600 md:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setMemo("배우자의 외도가 의심됩니다. 최근 외박이 잦고 일정 설명이 맞지 않으며, 카카오톡 대화 일부와 사진 몇 장을 가지고 있습니다. 직접 추궁하기 전에 어떤 자료가 더 필요한지 확인하고 싶습니다.")}
                          className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <span className="block font-bold text-slate-950">예시 1. 외도·상간 관련</span>
                          배우자의 외도가 의심됩니다. 최근 외박이 잦고 일정 설명이 맞지 않으며, 카카오톡 대화 일부와 사진 몇 장을 가지고 있습니다.
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemo("거래처 또는 동업자와의 계약 내용이 실제와 다른 것 같습니다. 계약서, 송금내역, 카카오톡 대화가 일부 있고, 고소나 소송 전에 어떤 사실관계를 먼저 확인해야 하는지 알고 싶습니다.")}
                          className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                        >
                          <span className="block font-bold text-slate-950">예시 2. 사실조사·자료정리 관련</span>
                          계약 내용과 실제 진행 상황이 다른 것 같습니다. 계약서, 송금내역, 대화내역을 가지고 있고, 어떤 사실관계를 먼저 확인해야 하는지 알고 싶습니다.
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={startReview}
                      disabled={!memo.trim()}
                      className={`w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 ${memo.trim()
                          ? "bg-blue-700 shadow-lg shadow-blue-700/20 hover:bg-blue-800"
                          : "cursor-not-allowed bg-slate-300"
                        }`}
                    >
                      비공개로 먼저 확인하기
                    </button>
                  </div>
                </div>
              )}

              {status === "loading" && (
                <div className="flex min-h-[560px] flex-col justify-center rounded-3xl bg-slate-950 p-8 text-white">
                  <div className="mx-auto mb-8 h-14 w-14 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
                  <h2 className="text-center text-2xl font-bold">비슷한 사건 데이터를 바탕으로 확인하고 있습니다</h2>
                  <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-slate-300">
                    입력하신 내용을 비슷한 사건 유형과 조사 기준에 맞춰 검토하고 있습니다.
                  </p>
                  <div className="mx-auto mt-8 w-full max-w-md space-y-3">
                    {reviewSteps.map((step, idx) => (
                      <div key={step} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                        {idx + 1}. {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status === "result" && (
                <div>
                  <div className="mb-5 rounded-3xl bg-blue-50 p-5">
                    <div className="text-sm font-bold text-blue-700">사전진단 1차 검토가 완료되었습니다</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      입력하신 내용을 Li-One의 누적 사건 데이터와 조사 기준에 맞춰 검토하고, 추가로 확인할 부분을 정리했습니다.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">접수 유형</div>
                      <div className="mt-1 font-bold text-slate-900">{selectedCase}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">보유 자료</div>
                      <div className="mt-1 font-bold text-slate-900">{evidenceLabel}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">누적 사건 데이터 기준 검토</div>
                      <div className="mt-1 font-bold text-slate-900">추가 자료와 조사 가능 범위 확인이 필요한 사안입니다</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold text-slate-500">다음 확인 사항</div>
                      <div className="mt-1 font-bold text-slate-900">담당자 상담을 통해 조사 가능 범위와 조사원 연결 가능 여부를 확인할 수 있습니다</div>
                    </div>
                  </div>

                  <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    사전진단 결과는 정식 조사 결과가 아닙니다. 입력하신 내용만으로 조사 가능 여부를 단정할 수는 없으며, 필요한 경우 담당자가 조사 가능 범위, 추가 자료, 조사원 연결 여부를 안내합니다.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button onClick={resetReview} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 font-bold text-slate-700 transition hover:bg-slate-50">
                      다시 확인하기
                    </button>
                    <button className="rounded-2xl bg-blue-700 px-5 py-4 font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">
                      담당자 상담 요청하기
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-bold text-blue-700">사전진단 결과 미리보기</div>
                <div className="mt-5 space-y-3">
                  {[
                    ["사건 유형", selectedCase],
                    ["보유 자료", evidenceLabel],
                    ["조사 가능성", "누적 사건 기준으로 1차 분류"],
                    ["필요 자료", "추가 확인 자료 안내"],
                    ["조사원 연결", "의뢰인 요청 시 검토"],
                    ["주의할 점", "위법조사 요청 제한"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="text-xs font-bold text-slate-500">{label}</div>
                      <div className="max-w-[180px] text-right text-sm font-semibold text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-slate-950">신원확인 완료 조사원</div>
                    <div className="mt-1 text-xs text-slate-500">일부 예시만 표시됩니다.</div>
                  </div>
                  <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">30+ 등록</div>
                </div>
                <div className="mt-4 grid gap-3">
                  {investigatorList.slice(0, 2).map((item) => (
                    <div key={item.name} className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-bold text-slate-950">{item.name}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{item.field} · {item.career}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  사전진단 결과를 확인한 뒤, 의뢰인이 상담 또는 조사원 연결을 요청하면 사건 유형, 지역, 조사 난이도, 필요 자료를 검토해 조사원 연결 가능 여부를 안내합니다.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="partners" className="bg-white px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-bold text-blue-700">조사원 네트워크</div>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 md:text-4xl">조사원 연결은 사전진단 이후, 의뢰인 요청 시 검토합니다</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Li-One은 조사원 목록을 무작정 노출하지 않습니다. 먼저 사전진단을 통해 사건 내용을 정리하고, 이후 의뢰인이 상담 또는 조사원 연결을 요청할 경우 사업자등록증·신분증·비밀유지 및 위법조사 금지 서약 확인을 완료한 조사원 중에서 사건 유형, 지역, 조사 난이도, 필요 자료를 검토해 조사원 연결 가능 여부를 안내합니다.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">신원확인 완료 조사원 30+</div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {investigatorList.map((item) => (
              <InvestigatorCard key={item.name} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <div className="text-sm font-bold text-blue-700">신뢰·보안 기준</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 md:text-4xl">민감한 문제일수록, 먼저 안전하게 확인해야 합니다</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Li-One은 사건 내용을 필요한 범위에서만 관리하고, 위법 소지가 있는 요청은 진행하지 않습니다. 실제 조사가 필요한 경우에는 조사 범위, 비용, 기간을 먼저 안내하고 계약 후 정식 진행을 안내합니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["비공개 검토", "입력한 사건 내용은 조사 가능성 확인과 상담 검토 목적 범위에서 관리됩니다."],
              ["실명 입력 없이 시작", "초기 단계에서는 실명이나 연락처 없이 사건 유형과 상황만 입력할 수 있습니다."],
              ["조사원 자동전달 없음", "입력 내용은 조사원에게 자동 전달되지 않습니다."],
              ["위법조사 요청 제한", "불법 위치추적, 해킹, 도청, 개인정보 불법조회 등 위법 소지가 있는 요청은 진행하지 않습니다."],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-5 py-12 md:px-8 md:py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 md:text-4xl">입력 전 가장 많이 걱정하는 질문</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">누구에게도 말하기 어려운 내용을 입력하기 전, 가장 많이 묻는 질문을 정리했습니다.</p>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div key={item.q} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-bold text-slate-950">{item.q}</span>
                  <span className="text-lg font-bold text-blue-700">{openFaq === index ? "−" : "+"}</span>
                </button>
                {openFaq === index && <div className="border-t border-slate-100 px-6 py-5 text-sm leading-7 text-slate-600">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="py-12 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-center px-5 md:px-8">
          <div>
            <div className="text-xl font-bold text-slate-950">Li-One</div>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Li-One은 누적 사건 데이터와 신원확인 완료 조사원 네트워크를 바탕으로, 민간조사 의뢰 전 사건의 조사 가능 범위와 필요한 자료를 먼저 확인하고, 의뢰인이 요청한 경우 조사원 연결 가능 여부를 안내하는 민간조사 사전진단 플랫폼입니다.
            </p>
          </div>
          <a href="/simulation" className="rounded-2xl bg-blue-700 px-6 py-4 text-center font-bold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800">
            조사 가능성 사전진단 시작하기
          </a>
        </div>
      </div>
    </div>
  );
}
