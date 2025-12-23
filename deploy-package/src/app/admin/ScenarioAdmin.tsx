"use client";

import { useState, useEffect, useMemo } from "react";
import type { Prisma } from '@prisma/client';

type ScenarioWithRelations = Prisma.ScenarioGetPayload<{
  include: {
    phases: {
      include: {
        tasks: true;
        risks: true;
      };
    };
  };
}>;

const isJsonObject = (value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: Prisma.JsonValue | undefined): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getNumber = (value: Prisma.JsonValue | undefined): number | undefined =>
  typeof value === 'number' ? value : undefined;

const formatCompetency = (value: Prisma.JsonValue): string => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .join(', ');
  }
  if (isJsonObject(value)) {
    return Object.values(value)
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

export default function ScenarioAdmin() {
  const [scenarios, setScenarios] = useState<ScenarioWithRelations[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => title.trim().length > 1 && description.trim().length > 4 && !submitting, [description, submitting, title]);

  // 시나리오 목록 불러오기
  useEffect(() => {
    const load = async () => {
      setError(null);
      try {
        const res = await fetch("/api/scenario");
        if (!res.ok) {
          throw new Error("시나리오 목록을 불러오지 못했습니다.");
        }
        const data = (await res.json()) as ScenarioWithRelations[];
        setScenarios(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // 시나리오 추가
  const addScenario = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "시나리오를 추가하지 못했습니다.");
      }
      setScenarios((prev) => [payload as ScenarioWithRelations, ...prev]);
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "시나리오를 추가하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Scenario Library</p>
            <h3 className="mt-2 text-lg font-bold text-[#1a2340]">신규 시나리오 등록</h3>
            <p className="mt-1 text-xs text-slate-500">핵심 요약 위주로 제목과 설명을 작성하면 목록에서 가독성이 높아집니다.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <label className="lira-field">
            시나리오 제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 기업 내부 고발 조사 대응"
              className="lira-input"
            />
          </label>
          <label className="lira-field">
            설명
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="시나리오 개요와 주요 단계를 간결하게 정리하세요."
              rows={4}
              className="lira-textarea"
            />
          </label>
        </div>
        <button
          onClick={addScenario}
          className="mt-4 w-full lira-button lira-button--primary"
          disabled={!canSubmit}
        >
          {submitting ? "등록 중..." : "시나리오 추가"}
        </button>
        {error && (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>
        )}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1a2340]">시나리오 목록</h3>
          <span className="text-xs text-slate-400">{scenarios.length}건</span>
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
            등록된 시나리오가 없습니다. 새로운 조사를 추가해보세요.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {scenarios.map((scenario) => {
              const overview = isJsonObject(scenario.overview) ? scenario.overview : undefined;
              const spendTracking = isJsonObject(scenario.spendTracking) ? scenario.spendTracking : undefined;
              const spendCategories = Array.isArray(spendTracking?.categories)
                ? (spendTracking.categories as Prisma.JsonValue[])
                : [];
              const overallSpend = spendTracking && isJsonObject(spendTracking.overall)
                ? spendTracking.overall
                : undefined;
              const plannedTotal = overallSpend ? getNumber(overallSpend.plannedTotal) : undefined;
              const raciMatrixRows = Array.isArray(scenario.raciMatrix)
                ? (scenario.raciMatrix as Prisma.JsonValue[])
                : [];
              const scheduleTemplateRows = Array.isArray(scenario.scheduleTemplate)
                ? (scenario.scheduleTemplate as Prisma.JsonValue[])
                : [];

              return (
                <li key={scenario.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-semibold text-[#1a2340]">{scenario.title}</h4>
                      <span className="rounded-full bg-white px-3 py-1 text-[0.65rem] text-slate-400">ID {scenario.id}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{scenario.description}</p>
                  </div>

                  {overview && (
                    <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-[#4b587c]">
                      {[getString(overview.industry), getString(overview.objective)].filter(Boolean).join(" · ")}
                    </div>
                  )}

                  {scenario.phases.length > 0 && (
                    <details className="mt-3 rounded-xl bg-white/70 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[#1a2340]">단계/업무 상세</summary>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
                        {scenario.phases.map((phase) => (
                          <li key={phase.id} className="mb-1">
                            <span className="font-bold text-slate-700">{phase.phaseKey} {phase.name}</span>
                            <span className="text-slate-400"> ({phase.durationDays}일)</span>
                            {phase.tasks.length > 0 && (
                              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-500">
                                {phase.tasks.map((task) => (
                                  <li key={task.id}>
                                    {task.desc}
                                    <span className="text-slate-400">[{formatCompetency(task.competency)}]</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}

                  {spendCategories.length > 0 && (
                    <details className="mt-3 rounded-xl bg-white/70 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[#1a2340]">예산 카테고리</summary>
                      <table className="mt-2 w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-2 py-1 text-left">코드</th>
                            <th className="px-2 py-1 text-left">항목</th>
                            <th className="px-2 py-1 text-right">계획</th>
                            <th className="px-2 py-1 text-right">실적</th>
                          </tr>
                        </thead>
                        <tbody>
                          {spendCategories.map((category, index) => {
                            if (!isJsonObject(category)) {
                              return null;
                            }
                            const planned = getNumber(category.planned);
                            const actual = getNumber(category.actual);
                            return (
                              <tr key={`${category.code ?? index}`} className="border-t border-slate-100">
                                <td className="px-2 py-1">{getString(category.code) ?? "-"}</td>
                                <td className="px-2 py-1">{getString(category.name) ?? "-"}</td>
                                <td className="px-2 py-1 text-right">{planned != null ? planned.toLocaleString() : "-"}</td>
                                <td className="px-2 py-1 text-right">{actual != null ? actual.toLocaleString() : "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="mt-2 text-xs text-slate-500">
                        총계: {plannedTotal != null ? plannedTotal.toLocaleString() : "-"}원
                      </div>
                    </details>
                  )}

                  {raciMatrixRows.length > 0 && (
                    <details className="mt-3 rounded-xl bg-white/70 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[#1a2340]">RACI 매트릭스</summary>
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>
                              {isJsonObject(raciMatrixRows[0])
                                ? Object.keys(raciMatrixRows[0]).map((key) => <th key={key}>{key}</th>)
                                : null}
                            </tr>
                          </thead>
                          <tbody>
                            {raciMatrixRows.map((row, rowIndex) => {
                              if (!isJsonObject(row)) {
                                return null;
                              }
                              const cells = Object.values(row).map((cell, cellIndex) => (
                                <td key={cellIndex}>{typeof cell === "string" ? cell : JSON.stringify(cell)}</td>
                              ));
                              return <tr key={rowIndex} className="border-t border-slate-100">{cells}</tr>;
                            })}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}

                  {scheduleTemplateRows.length > 0 && (
                    <details className="mt-3 rounded-xl bg-white/70 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-[#1a2340]">일정 템플릿</summary>
                      <table className="mt-2 w-full text-xs">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-2 py-1 text-left">단계</th>
                            <th className="px-2 py-1 text-right">시작</th>
                            <th className="px-2 py-1 text-right">기간</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduleTemplateRows.map((row, index) => {
                            if (!isJsonObject(row)) {
                              return null;
                            }
                            const phaseId = getString(row.phaseId) ?? String(getNumber(row.phaseId) ?? index + 1);
                            const offsetDay = getNumber(row.offsetDay);
                            const duration = getNumber(row.duration);
                            return (
                              <tr key={phaseId} className="border-t border-slate-100">
                                <td className="px-2 py-1">{phaseId}</td>
                                <td className="px-2 py-1 text-right">{offsetDay != null ? `${offsetDay}일` : "-"}</td>
                                <td className="px-2 py-1 text-right">{duration != null ? `${duration}일` : "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
