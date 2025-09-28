"use client";

import { useState } from "react";

const sampleFeedbacks = [
  {
    id: 1,
    user: '홍길동',
    scenario: '마케팅 전략 수립',
    admin: '관리자A',
    comment: '시장 분석이 탁월합니다. 다음엔 실행 계획을 더 구체화해보세요.'
  },
  {
    id: 2,
    user: '김영희',
    scenario: '프로젝트 리스크 관리',
    admin: '관리자B',
    comment: '리스크 진단이 체계적입니다. 대응 방안에 실제 사례를 추가해보세요.'
  },
];

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState(sampleFeedbacks);
  const [comment, setComment] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const handleAdd = () => {
    if (!comment || selected === null) return;
    setFeedbacks(feedbacks.map(f => f.id === selected ? { ...f, comment } : f));
    setComment('');
    setSelected(null);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
      <header className="flex flex-col gap-1 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Feedback Console</p>
        <h2 className="text-xl font-bold text-[#1a2340]">관리자 피드백 기록</h2>
        <p className="text-xs text-slate-500">시나리오 진행 중 발견된 통찰과 수정 권고사항을 언제든 갱신할 수 있습니다.</p>
      </header>

      <ul className="space-y-3">
        {feedbacks.map((feedback) => {
          const isActive = selected === feedback.id;
          return (
            <li
              key={feedback.id}
              className={`rounded-2xl border px-5 py-4 shadow-sm transition ${
                isActive
                  ? "border-indigo-200 bg-indigo-50/80"
                  : "border-slate-200 bg-slate-50/60 hover:border-indigo-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#1a2340]">{feedback.scenario}</p>
                  <p className="text-xs text-slate-500">고객 {feedback.user} · 담당 {feedback.admin}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(feedback.id);
                    setComment(feedback.comment);
                  }}
                  className={`lira-button lira-button--ghost text-xs ${isActive ? "border-indigo-300 text-indigo-600" : ""}`}
                >
                  {isActive ? "편집 중" : "수정"}
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{feedback.comment}</p>
            </li>
          );
        })}
      </ul>

      {selected !== null && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Update memo</p>
          <p className="mt-1 text-sm text-slate-600">피드백 내용을 수정해 저장하면 즉시 목록에 반영됩니다.</p>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-3 lira-textarea"
            rows={4}
            placeholder="구체적인 개선 포인트와 다음 액션을 남겨주세요."
          />
          <button type="button" className="mt-3 w-full lira-button lira-button--primary" onClick={handleAdd}>
            저장
          </button>
        </div>
      )}
    </section>
  );
}
