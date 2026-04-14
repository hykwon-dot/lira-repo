"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CASE_STATUS_META, CaseStatusKey } from "@/lib/investigationWorkflow";
import { extractTimelinePayloadText, getTimelineMeta } from "@/lib/timelineMeta";
import { useUserStore } from "@/lib/userStore";
import type { CaseTimelineEntry } from "@/types/investigation";

interface ChatParticipant {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ChatRoomMeta {
  id: number;
  requestId: number;
  customerId: number;
  investigatorUserId: number;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: number;
  content: string;
  attachments: unknown;
  createdAt: string;
  sender: ChatParticipant | null;
}

interface ChatResponse {
  room: ChatRoomMeta | null;
  messages: ChatMessage[];
  participants: {
    customer: ChatParticipant | null;
    investigator: ChatParticipant | null;
  } | null;
  request: {
    id: number;
    title: string;
    status: string;
    timeline: CaseTimelineEntry[];
  } | null;
}

const statusKeyFromString = (value: string | undefined | null): CaseStatusKey => {
  if (!value) return "MATCHING";
  return (Object.hasOwn(CASE_STATUS_META, value) ? value : "MATCHING") as CaseStatusKey;
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
};

const TIMELINE_POST_OPTIONS = [
  { value: "PROGRESS_NOTE", label: "진행 메모" },
  { value: "INTERIM_REPORT", label: "중간 보고" },
  { value: "FINAL_REPORT", label: "최종 보고" },
] as const;

export default function InvestigationChatRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useUserStore((state) => state.token);
  const user = useUserStore((state) => state.user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastMessageIdRef = useRef<number | null>(-1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [participants, setParticipants] = useState<ChatResponse["participants"]>(null);
  const [requestMeta, setRequestMeta] = useState<ChatResponse["request"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  
  // Timeline Modal State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [timelineType, setTimelineType] = useState<(typeof TIMELINE_POST_OPTIONS)[number]["value"]>("PROGRESS_NOTE");
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineNote, setTimelineNote] = useState("");
  const [timelineSubmitting, setTimelineSubmitting] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const requestId = useMemo(() => {
    const value = Number(params?.id);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [params?.id]);

  const currentUserId = useMemo(() => {
    if (!user) return null;
    const numeric = Number(user.id);
    return Number.isNaN(numeric) ? null : numeric;
  }, [user]);

  const otherParticipant = useMemo(() => {
    if (!participants || !currentUserId) return null;
    if (participants.customer && participants.customer.id !== currentUserId) {
      return participants.customer;
    }
    if (participants.investigator && participants.investigator.id !== currentUserId) {
      return participants.investigator;
    }
    return participants.customer ?? participants.investigator;
  }, [participants, currentUserId]);

  const statusMeta = useMemo(() => {
    const key = statusKeyFromString(requestMeta?.status);
    return CASE_STATUS_META[key];
  }, [requestMeta?.status]);

  const timelineEntries = useMemo(() => requestMeta?.timeline ?? [], [requestMeta]);

  const canSubmitTimeline = useMemo(() => {
    if (!participants || !currentUserId || !user?.role) return false;
    if (user.role === "admin" || user.role === "super_admin") return true;
    if (participants.customer?.id === currentUserId) return true;
    if (participants.investigator?.id === currentUserId) return true;
    return false;
  }, [participants, currentUserId, user?.role]);

  const scrollToBottom = useCallback((isInstant = false) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: isInstant ? "auto" : "smooth",
      });
    }
  }, []);

  const fetchChat = useCallback(async () => {
    if (!token || !requestId) return;
    try {
      const res = await fetch(`/api/investigation-requests/${requestId}/chat`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/investigation-requests/${requestId}/chat`)}`);
        return;
      }

      if (res.status === 409) {
        setLocked(true);
        setError("민간조사원 매칭이 완료된 후 채팅을 이용할 수 있습니다.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "채팅 정보를 불러오지 못했습니다." }));
        setError(typeof data?.error === "string" ? data.error : "채팅 정보를 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as ChatResponse;
      setMessages(data.messages ?? []);
      setParticipants(data.participants ?? null);
      setRequestMeta(data.request ?? null);
      setLocked(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("채팅 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [requestId, router, token]);

  useEffect(() => {
    if (!requestId) {
      setError("잘못된 사건 번호입니다.");
      setLoading(false);
      return;
    }
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent(`/investigation-requests/${requestId}/chat`)}`);
      return;
    }
    setLoading(true);
    void fetchChat();
  }, [fetchChat, requestId, router, token]);

  useEffect(() => {
    if (!token || !requestId) return;
    const interval = setInterval(() => {
      void fetchChat();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchChat, requestId, token]);

  useEffect(() => {
    if (!scrollContainerRef.current || messages.length === 0) return;
    const container = scrollContainerRef.current;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    const isFirstLoad = lastMessageIdRef.current === -1;
    if (isFirstLoad || isAtBottom) {
      setTimeout(() => scrollToBottom(true), 50);
    }
    lastMessageIdRef.current = messages[messages.length - 1].id;
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !token || !requestId || sending || locked) return;
    setSending(true);
    setError(null); // Reset error
    try {
      const res = await fetch(`/api/investigation-requests/${requestId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: input.trim() }),
      });

      if (res.status === 401) {
        router.replace(`/login?redirect=${encodeURIComponent(`/investigation-requests/${requestId}/chat`)}`);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "메시지를 전송하지 못했습니다." }));
        setError(typeof data?.error === "string" ? data.error : "메시지를 전송하지 못했습니다.");
        return;
      }

      setInput("");
      const data = await res.json();
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        await fetchChat();
      }
    } catch (err) {
      console.error(err);
      setError("메시지를 전송하는 중 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }, [fetchChat, input, locked, requestId, router, sending, token]);

  const handleTimelineSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!token || !requestId || timelineSubmitting || !canSubmitTimeline) return;
      const trimmedNote = timelineNote.trim();
      const trimmedTitle = timelineTitle.trim();
      if (!trimmedNote && !trimmedTitle) {
        setTimelineError("제목이나 내용을 입력해주세요.");
        return;
      }
      setTimelineError(null);
      setTimelineSubmitting(true);
      try {
        const res = await fetch(`/api/investigation-requests/${requestId}/timeline`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: timelineType,
            title: trimmedTitle || null,
            note: trimmedNote || null,
          }),
        });

        if (res.status === 401) {
          router.replace(`/login?redirect=${encodeURIComponent(`/investigation-requests/${requestId}/chat`)}`);
          return;
        }

        if (res.ok) {
          const data = await res.json();
          const entry = data?.entry as CaseTimelineEntry | undefined;
          if (entry) {
            setRequestMeta((prev) => {
              if (!prev) return prev;
              const nextTimeline = [...(prev.timeline ?? []), entry].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
              );
              return { ...prev, timeline: nextTimeline };
            });
            setTimelineTitle("");
            setTimelineNote("");
            setIsTimelineModalOpen(false);
          } else {
            await fetchChat();
            setIsTimelineModalOpen(false);
          }
        } else {
          const payload = await res.json().catch(() => ({ error: "등록에 실패했습니다." }));
          setTimelineError(payload?.error || "등록에 실패했습니다.");
        }
      } catch (err) {
        console.error(err);
        setTimelineError("타임라인을 추가하지 못했습니다.");
      } finally {
        setTimelineSubmitting(false);
      }
    },
    [canSubmitTimeline, requestId, router, timelineNote, timelineSubmitting, timelineTitle, timelineType, token, fetchChat],
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-12">
      <div className="lira-container flex flex-col gap-6">
        <header className="lira-section">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Link href={`/investigation-requests/${requestId ?? ""}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                ← 사건 상세로 돌아가기
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <p className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                  {statusMeta.label}
                </p>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1a2340]">
                {requestMeta?.title ?? "사건 채팅"}
              </h1>
              {otherParticipant && (
                <p className="text-sm text-slate-500">
                  대화 상대: <span className="font-medium text-slate-700">{otherParticipant.name}</span> · {otherParticipant.email}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 max-w-sm">
              <p className="font-semibold text-slate-700">채팅 안내</p>
              <p className="mt-2 leading-relaxed text-[11px]">
                증거 자료나 파일 공유는 추후 업데이트 예정입니다. 현재는 텍스트 기반으로 진행 상황을 공유하고 중요한 메모를 남겨주세요.
              </p>
            </div>
          </div>
        </header>

        <section className="lira-section flex flex-col gap-6 lg:flex-row">
          {/* 채팅 영역 */}
          <div className="flex h-[65vh] flex-1 flex-col gap-4">
            {loading ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                채팅을 불러오는 중입니다...
              </div>
            ) : locked ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 p-8 text-center">
                {error ?? "채팅을 이용할 수 없습니다."}
              </div>
            ) : (
              <>
                <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                      아직 메시지가 없습니다. 첫 메시지를 남겨보세요.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isMine = currentUserId != null && message.sender?.id === currentUserId;
                      return (
                        <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                          <div className={`rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                            isMine ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-100"
                          }`}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <span className="mt-1 text-[11px] text-slate-400">
                            {message.sender?.name ?? "-"} · {formatTime(message.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageEndRef} />
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={locked ? "매칭 후 이용 가능합니다." : "메시지를 입력하세요."}
                    disabled={sending || locked}
                    rows={3}
                    className="lira-textarea"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-400">엔터로 줄바꿈, Ctrl+Enter로 전송합니다.</p>
                    <button
                      type="submit"
                      disabled={sending || locked || !input.trim()}
                      className="lira-button lira-button--primary"
                    >
                      {sending ? "전송 중..." : "메시지 전송"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* 타임라인 영역 */}
          <aside className="flex h-[65vh] flex-col rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur lg:w-80 xl:w-96">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#1a2340]">사건 타임라인</h2>
                <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                  진행 단계, 보고 이력, 취소 등 사건의 핵심 이벤트가 시간순으로 정리됩니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 whitespace-nowrap">
                {timelineEntries.length}건
              </span>
            </div>

            <div className="mt-5 flex-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
                  ))}
                </div>
              ) : timelineEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center text-xs text-slate-500">
                  아직 타임라인 이벤트가 없습니다. 상태가 변경되면 이곳에서 확인할 수 있습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineEntries.map((entry, index) => {
                    const meta = getTimelineMeta(entry.type);
                    const Icon = meta.icon;
                    const payloadText = extractTimelinePayloadText(entry.payload);
                    return (
                      <div key={entry.id} className="relative pl-10">
                        {index < timelineEntries.length - 1 && (
                          <span className="absolute left-[1.125rem] top-8 block h-[calc(100%-1rem)] w-px bg-slate-200" aria-hidden="true" />
                        )}
                        <span className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm ${meta.tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold text-[#1a2340]">{meta.label}</p>
                              {meta.description && <p className="mt-0.5 text-[11px] text-slate-500">{meta.description}</p>}
                            </div>
                            <span className="shrink-0 text-[10px] text-slate-400">{formatTime(entry.createdAt)}</span>
                          </div>
                          {entry.note && (
                            <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">{entry.note}</p>
                          )}
                          {payloadText && (
                            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-500 border border-slate-100/50">{payloadText}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-slate-400">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">
                              {entry.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="normal-case font-medium text-slate-500">
                              {entry.author ? entry.author.name ?? entry.author.email ?? "이름 미기재" : "시스템"}
                            </span>
                            {entry.author?.email && entry.author.name && (
                              <span className="normal-case text-slate-400">{entry.author.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {canSubmitTimeline && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setIsTimelineModalOpen(true)}
                  className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  📝 조사진행 보고서 작성
                </button>
              </div>
            )}
          </aside>
        </section>
      </div>

      {/* 조사진행 보고서 작성 모달 */}
      {isTimelineModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsTimelineModalOpen(false)} 
          />
          <div className="relative w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">보고서 작성</h2>
                <p className="mt-1 text-sm text-slate-500">타임라인에 새로운 이벤트를 추가합니다.</p>
              </div>
              <button
                onClick={() => setIsTimelineModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTimelineSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">이벤트 유형</label>
                <select
                  value={timelineType}
                  onChange={(e) => setTimelineType(e.target.value as any)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                >
                  {TIMELINE_POST_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">제목 (선택)</label>
                <input
                  value={timelineTitle}
                  onChange={(e) => setTimelineTitle(e.target.value)}
                  placeholder="예: 현장 조사 착수"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">상세 내용</label>
                <textarea
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                  rows={5}
                  placeholder="진행 상황을 상세히 입력하세요."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                />
              </div>
              {timelineError && (
                <div className="rounded-xl bg-rose-50 px-4 py-2 text-xs text-rose-600 font-medium border border-rose-100">{timelineError}</div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTimelineModalOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={timelineSubmitting}
                  className="rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none"
                >
                  {timelineSubmitting ? "처리 중..." : "보고서 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
