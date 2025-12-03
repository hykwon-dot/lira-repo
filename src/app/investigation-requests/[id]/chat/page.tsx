"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CASE_STATUS_META, CaseStatusKey } from "@/lib/investigationWorkflow";
import { extractTimelinePayloadText, getTimelineMeta } from "@/lib/timelineMeta";
import { useUserStore } from "@/lib/userStore";
import type { CaseTimelineEntry } from "@/types/investigation";
import { FiPaperclip, FiFile, FiEye, FiTrash2 } from "react-icons/fi";

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
  const [participants, setParticipants] = useState<ChatResponse["participants"]>(null);
  const [requestMeta, setRequestMeta] = useState<ChatResponse["request"]>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [timelineType, setTimelineType] = useState<(typeof TIMELINE_POST_OPTIONS)[number]["value"]>("PROGRESS_NOTE");
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineNote, setTimelineNote] = useState("");
  const [timelineSubmitting, setTimelineSubmitting] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const scrollToBottom = useCallback(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
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
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if ((!input.trim() && !selectedFile) || !token || !requestId || sending || locked) return;
    setSending(true);
    try {
      let contentToSend = input.trim();
      if (selectedFile) {
        contentToSend = contentToSend ? `${contentToSend}\n[첨부파일: ${selectedFile.name}]` : `[첨부파일: ${selectedFile.name}]`;
      }

      const res = await fetch(`/api/investigation-requests/${requestId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: contentToSend }),
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
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const data = await res.json();
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        await fetchChat();
      }
    } catch (err) {
      console.error(err);
      setError("메시지를 전송하지 못했습니다.");
    } finally {
      setSending(false);
    }
  }, [fetchChat, input, locked, requestId, router, sending, token, selectedFile]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSend();
    },
    [handleSend],
  );

  const handleTimelineSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
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

        if (!res.ok) {
          const payload = await res.json().catch(() => ({ error: "타임라인을 추가하지 못했습니다." }));
          setTimelineError(typeof payload?.error === "string" ? payload.error : "타임라인을 추가하지 못했습니다.");
          return;
        }

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
        } else {
          await fetchChat();
        }
      } catch (err) {
        console.error(err);
        setTimelineError("타임라인을 추가하지 못했습니다.");
      } finally {
        setTimelineSubmitting(false);
      }
    },
    [canSubmitTimeline, fetchChat, requestId, router, timelineNote, timelineSubmitting, timelineTitle, timelineType, token],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const performOCR = async (fileName: string) => {
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`[OCR 분석 결과 - ${fileName}]\n\n문서 내용이 성공적으로 추출되었습니다.\n\n1. 문서 제목: 사건 관련 증거 자료\n2. 주요 내용: 상기 본인은 2024년 12월 1일 발생한 사건에 대해...\n3. 특이사항: 하단 서명 확인됨.\n\n(이것은 시뮬레이션된 OCR 결과입니다.)`);
      }, 1500);
    });
  };

  const handleOCRClick = async (fileName: string) => {
    const ocrResult = await performOCR(fileName);
    alert(ocrResult); // Simple alert for now, or append to chat locally?
    // Appending to chat locally might be confusing if it's not saved.
    // I'll just show an alert or a modal. Alert is simplest for now given the constraints.
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-12">
      <div className="lira-container flex flex-col gap-6">
        <header className="lira-section">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <Link href={`/investigation-requests/${requestId ?? ""}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                ← 사건 상세로 돌아가기
              </Link>
              <p className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                {statusMeta.label}
              </p>
              <h1 className="text-2xl font-extrabold text-[#1a2340]">
                {requestMeta?.title ?? "사건 채팅"}
              </h1>
              {otherParticipant && (
                <p className="text-sm text-slate-500">
                  대화 상대: <span className="font-medium text-slate-700">{otherParticipant.name}</span> · {otherParticipant.email}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-700">채팅 안내</p>
              <p className="mt-2 leading-relaxed">
                증거 자료나 파일 공유는 추후 업데이트 예정입니다. 현재는 텍스트 기반으로 진행 상황을 공유하고 중요한 메모를 남겨주세요.
              </p>
            </div>
          </div>
        </header>

        <section className="lira-section flex flex-col gap-6 lg:flex-row">
          <div className="flex h-[65vh] flex-1 flex-col gap-4">
            {loading ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                채팅을 불러오는 중입니다...
              </div>
            ) : locked ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                {error ?? "채팅을 이용할 수 없습니다."}
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                  {messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                      아직 메시지가 없습니다. 첫 메시지를 남겨보세요.
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isMine = currentUserId != null && message.sender?.id === currentUserId;
                      return (
                        <div key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                              isMine ? "bg-indigo-600 text-white" : "bg-white text-slate-700"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.content.includes("[첨부파일:") && (
                              <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/20 p-2 text-xs">
                                <FiFile className="h-4 w-4" />
                                <span>{message.content.match(/\[첨부파일: (.*?)\]/)?.[1] ?? "파일"}</span>
                                <button
                                  onClick={() => handleOCRClick(message.content.match(/\[첨부파일: (.*?)\]/)?.[1] ?? "파일")}
                                  className="ml-auto flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[10px] text-white hover:bg-indigo-500"
                                >
                                  <FiEye className="h-3 w-3" />
                                  OCR 분석
                                </button>
                              </div>
                            )}
                          </div>
                          <span className="mt-1 text-xs text-slate-400">
                            {(message.sender?.name ?? "-")} {" "}· {formatTime(message.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messageEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
                  {error && !locked && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      disabled={locked}
                    >
                      <FiPaperclip className="h-4 w-4" />
                      파일 첨부
                    </button>
                    {selectedFile && (
                      <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
                        <span className="max-w-[150px] truncate">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="ml-1 text-indigo-400 hover:text-indigo-600"
                        >
                          <FiTrash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={locked ? "매칭 후 이용 가능합니다." : "메시지를 입력하세요."}
                    disabled={sending || locked}
                    rows={3}
                    className="lira-textarea"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">엔터로 줄바꿈, Ctrl+Enter로 전송합니다.</p>
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

          <aside className="flex h-[65vh] flex-col rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur lg:w-80 xl:w-96">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[#1a2340]">사건 타임라인</h2>
                <p className="mt-1 text-xs text-slate-500">
                  진행 단계, 보고 이력, 취소 등 사건의 핵심 이벤트가 시간순으로 정리됩니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[0.65rem] font-semibold text-slate-500">
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
                          <span
                            aria-hidden="true"
                            className="absolute left-[1.375rem] top-8 block h-[calc(100%-2rem)] w-px bg-slate-200"
                          />
                        )}
                        <span
                          className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border ${meta.tone}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#1a2340]">{meta.label}</p>
                              {meta.description && <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>}
                            </div>
                            <span className="shrink-0 text-xs text-slate-400">{formatTime(entry.createdAt)}</span>
                          </div>
                          {entry.note && (
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{entry.note}</p>
                          )}
                          {payloadText && (
                            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{payloadText}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-wide text-slate-400">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">
                              {entry.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="normal-case text-slate-500">
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
              <form onSubmit={handleTimelineSubmit} className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">이벤트 추가</p>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">이벤트 유형</label>
                  <select
                    value={timelineType}
                    onChange={(event) =>
                      setTimelineType(event.target.value as (typeof TIMELINE_POST_OPTIONS)[number]["value"])
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    disabled={timelineSubmitting}
                  >
                    {TIMELINE_POST_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">제목 (선택)</label>
                  <input
                    value={timelineTitle}
                    onChange={(event) => setTimelineTitle(event.target.value)}
                    placeholder="예: 현장 조사 완료"
                    disabled={timelineSubmitting}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-500">세부 내용</label>
                  <textarea
                    value={timelineNote}
                    onChange={(event) => setTimelineNote(event.target.value)}
                    rows={3}
                    placeholder="진행 상황을 간결하게 공유해주세요."
                    disabled={timelineSubmitting}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                {timelineError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{timelineError}</div>
                )}
                <button
                  type="submit"
                  disabled={timelineSubmitting}
                  className="w-full rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {timelineSubmitting ? "등록 중..." : "타임라인 추가"}
                </button>
              </form>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
