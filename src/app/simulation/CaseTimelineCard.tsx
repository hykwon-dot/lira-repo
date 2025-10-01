"use client";

import { useEffect, useMemo, useState } from "react";
import { IntakeSummary } from "./types";
import { useTimelineStore, TimelineEntry, TimelineStatus } from "@/lib/timelineStore";
import { motion } from "framer-motion";
import { FiAlertTriangle, FiCheckCircle, FiClock, FiPlus, FiTarget } from "react-icons/fi";

interface CaseTimelineCardProps {
  summary: IntakeSummary | null;
  conversationId: string | null;
  isAssistantThinking: boolean;
}

const statusMeta: Record<TimelineStatus, { label: string; pill: string; icon: React.ReactNode }> = {
  pending: {
    label: "대기",
    pill: "bg-slate-100 text-slate-600 border border-slate-200",
    icon: <FiClock className="h-3.5 w-3.5" />,
  },
  "in-progress": {
    label: "진행 중",
    pill: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    icon: <FiTarget className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "완료",
    pill: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    icon: <FiCheckCircle className="h-3.5 w-3.5" />,
  },
};

const toStableId = (source: TimelineEntry["source"], value: string, index: number) =>
  `${source}-${index}-${value.replace(/[^a-zA-Z0-9가-힣]/g, "-").slice(0, 40).toLowerCase()}`;

const buildEntriesFromSummary = (summary: IntakeSummary | null): TimelineEntry[] => {
  if (!summary) return [];

  const now = new Date().toISOString();
  const entries: TimelineEntry[] = [];

  summary.keyFacts.forEach((fact, index) => {
    if (!fact) return;
    entries.push({
      id: toStableId("fact", fact, index),
      label: fact,
      description: "확인된 핵심 사실",
      source: "fact",
      status: "completed",
      createdAt: now,
    });
  });

  summary.missingDetails.forEach((item, index) => {
    if (!item) return;
    entries.push({
      id: toStableId("missing", item, index),
      label: item,
      description: "추가 확인 필요",
      source: "missing",
      status: "pending",
      createdAt: now,
    });
  });

  summary.recommendedDocuments.forEach((doc, index) => {
    if (!doc) return;
    entries.push({
      id: toStableId("document", doc, index),
      label: doc,
      description: "준비하면 좋은 자료",
      source: "document",
      status: "pending",
      createdAt: now,
    });
  });

  return entries;
};

export const CaseTimelineCard = ({ summary, conversationId, isAssistantThinking }: CaseTimelineCardProps) => {
  const [newEntry, setNewEntry] = useState("");
  const timelineKey = useMemo(() => {
    if (conversationId) return conversationId;
    if (summary?.caseTitle) return summary.caseTitle.trim().toLowerCase();
    return "default";
  }, [conversationId, summary?.caseTitle]);

  const timelineEntries = useTimelineStore((state) => state.timelines[timelineKey] ?? []);
  const initializeTimeline = useTimelineStore((state) => state.initializeTimeline);
  const updateStatus = useTimelineStore((state) => state.updateStatus);
  const addEntry = useTimelineStore((state) => state.addEntry);

  useEffect(() => {
    if (!summary) return;
    const generated = buildEntriesFromSummary(summary);
    if (generated.length > 0) {
      initializeTimeline(timelineKey, generated);
    }
  }, [summary, timelineKey, initializeTimeline]);

  const handleAddEntry = () => {
    const value = newEntry.trim();
    if (!value) return;
    const entry: TimelineEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: value,
      description: "직접 추가",
      source: "manual",
      status: "in-progress",
      createdAt: new Date().toISOString(),
    };
    addEntry(timelineKey, entry);
    setNewEntry("");
  };

  const hasEntries = timelineEntries.length > 0;

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/95 p-5 shadow-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">사건 진행 타임라인</h2>
          {isAssistantThinking ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-600">
              <FiClock className="h-3.5 w-3.5" /> 업데이트 중
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          핵심 사실과 미해결 항목을 기준으로 자동 생성된 체크리스트입니다. 진행 상태를 직접 조정해 보세요.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newEntry}
            onChange={(event) => setNewEntry(event.target.value)}
            placeholder="추가하고 싶은 진행 항목을 입력하세요"
            className="lira-input pr-10"
          />
          <button
            type="button"
            onClick={handleAddEntry}
            disabled={!newEntry.trim()}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 text-white shadow hover:bg-indigo-500 disabled:bg-slate-300"
          >
            <FiPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 min-h-0 space-y-3 overflow-y-auto">
        {hasEntries ? (
          timelineEntries.map((entry) => {
            const meta = statusMeta[entry.status];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
                        {entry.source === "missing" ? (
                          <FiAlertTriangle className="h-4 w-4 text-amber-500" />
                        ) : entry.source === "fact" ? (
                          <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <FiTarget className="h-4 w-4 text-indigo-500" />
                        )}
                        <span className="break-words leading-tight">{entry.label}</span>
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.pill}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>
                    {entry.description ? (
                      <p className="text-xs text-slate-500">{entry.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <select
                      value={entry.status}
                      onChange={(event) =>
                        updateStatus(timelineKey, entry.id, event.target.value as TimelineStatus)
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 focus:border-indigo-300 focus:outline-none"
                    >
                      <option value="pending">대기</option>
                      <option value="in-progress">진행 중</option>
                      <option value="completed">완료</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500">
            아직 정리된 타임라인 항목이 없습니다. 핵심 사실이 파악되면 자동으로 채워집니다.
          </div>
        )}
      </div>
    </div>
  );
};
