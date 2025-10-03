"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import cuid from "cuid";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiAlertCircle,
  FiChevronDown,
  FiCpu,
  FiLoader,
  FiMessageCircle,
  FiSend,
  FiStar,
  FiUser,
} from "react-icons/fi";

import { useUserStore } from "@/lib/userStore";
import { CaseSummarySidebar } from "./CaseSummarySidebar";
import type { IntakeSummary } from "./types";
import {
  InvestigatorRecommendation,
  InvestigatorRecommendationsCard,
} from "./InvestigatorRecommendationsCard";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

const DEFAULT_QUICK_PROMPTS = [
  "사건의 배경과 지금까지의 경과를 알려주세요.",
  "현재 가장 급한 문제는 무엇인가요?",
  "이미 확보한 증거나 자료가 있다면 공유해 주세요.",
  "이 사건에서 기대하는 최종 목표는 무엇인가요?",
];

const ensureStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  return [];
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const normalizeIntakeSummary = (summary: unknown): IntakeSummary | null => {
  if (!summary || typeof summary !== "object") {
    return null;
  }

  const record = summary as Record<string, unknown>;

  const pick = (key: string) =>
    typeof record[key] === "string" ? (record[key] as string).trim() : "";

  return {
    caseTitle: pick("caseTitle"),
    caseType: pick("caseType"),
    primaryIntent: pick("primaryIntent"),
    urgency: pick("urgency"),
    objective: pick("objective"),
    keyFacts: ensureStringArray(record.keyFacts),
    missingDetails: ensureStringArray(record.missingDetails),
    recommendedDocuments: ensureStringArray(record.recommendedDocuments),
    nextQuestions: ensureStringArray(record.nextQuestions),
  };
};

const deriveKeywords = (summary: IntakeSummary | null): string[] => {
  if (!summary) return [];

  const bucket: string[] = [];
  const push = (value?: string) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    bucket.push(trimmed);
    trimmed.split(/[\s,]+/).forEach((token) => {
      const normalized = token.trim();
      if (normalized.length > 1) {
        bucket.push(normalized);
      }
    });
  };

  [
    summary.caseTitle,
    summary.caseType,
    summary.primaryIntent,
    summary.objective,
    summary.urgency,
  ].forEach(push);

  summary.keyFacts.forEach(push);
  summary.recommendedDocuments.forEach(push);

  const unique = Array.from(
    new Set(
      bucket
        .map((item) => item.toLowerCase())
        .filter((item) => item.length > 1)
    )
  );

  return unique.slice(0, 12);
};

const assistantGreeting =
  "안녕하세요, LIONE AI Intake 파트너입니다. 사건의 전반적인 상황과 지금 걱정되는 부분부터 차근차근 이야기해 주세요.";

const mapMessagesToApi = (messages: ChatMessage[]) =>
  messages.map(({ role, content }) => ({ role, content }));

export const ChatSimulation = () => {
  const router = useRouter();
  const { user, logout } = useUserStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: cuid(),
      role: "assistant",
      content: assistantGreeting,
      createdAt: Date.now(),
    },
  ]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [intakeSummary, setIntakeSummary] = useState<IntakeSummary | null>(null);
  const [conversationSummary, setConversationSummary] = useState<string | null>(
    null
  );
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<
    InvestigatorRecommendation[]
  >([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] =
    useState(false);
  const [recommendationsError, setRecommendationsError] =
    useState<string | null>(null);

  const matchButtonLabel = useMemo(() => {
    if (!user) return "로그인 후 탐정고르기";
    if (user.role === "investigator") return "고객 계정에서 이용";
    return "탐정고르기";
  }, [user]);

  const isMatchDisabled = user?.role === "investigator";

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const summaryRef = useRef<IntakeSummary | null>(null);

  useEffect(() => {
    summaryRef.current = intakeSummary;
  }, [intakeSummary]);

  useEffect(() => {
    if (!user) {
      router.replace("/login?redirect=/simulation");
    }
  }, [router, user]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  const persistConversation = useCallback(
    async (question: string, answer: string) => {
      if (!user?.id) return;

      const userId = Number(user.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        return;
      }

      try {
        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            question,
            answer,
            conversationId: conversationIdRef.current,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to persist conversation: ${res.status}`);
        }

        const data = await res.json();
        const externalId = data?.conversation?.externalId;
        if (typeof externalId === "string" && externalId.trim()) {
          conversationIdRef.current = externalId.trim();
        }
      } catch (error) {
        console.error("[SIMULATION_CONVERSATION_SAVE_ERROR]", error);
      }
    },
    [user]
  );

  const transcriptForHandoff = useMemo(
    () =>
      messages.map(({ role, content }) => ({
        role,
        content,
      })),
    [messages]
  );

  const handleSendMessage = useCallback(
    async (rawInput: string) => {
      const content = rawInput.trim();
      if (!content || isAssistantThinking) return;

      if (!user) {
        router.push("/login?redirect=/simulation");
        return;
      }

      const userMessage: ChatMessage = {
        id: cuid(),
        role: "user",
        content,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);

      const payloadMessages = mapMessagesToApi([...messages, userMessage]);

      setIsAssistantThinking(true);
      setIsSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await fetch("/api/chat-gpt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "intake",
            messages: payloadMessages,
            currentSummary: summaryRef.current,
          }),
        });

        if (!response.ok) {
          throw new Error(`Intake request failed with status ${response.status}`);
        }

        const payload = await response.json();
        const assistantMessageText =
          typeof payload?.assistantMessage === "string" &&
          payload.assistantMessage.trim()
            ? payload.assistantMessage.trim()
            : "상황을 이해했어요. 더 자세한 정보를 알려주시면 정리해 드릴게요.";

        const normalizedSummary = normalizeIntakeSummary(payload?.summary);
        if (normalizedSummary) {
          setIntakeSummary(normalizedSummary);
        }

        setConversationSummary(
          typeof payload?.conversationSummary === "string"
            ? payload.conversationSummary.trim()
            : null
        );

        const assistantMessage: ChatMessage = {
          id: cuid(),
          role: "assistant",
          content: assistantMessageText,
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        void persistConversation(content, assistantMessageText);
      } catch (error) {
        console.error("[SIMULATION_INTAKE_ERROR]", error);
        setSummaryError("대화 요약을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
        const fallbackAssistant: ChatMessage = {
          id: cuid(),
          role: "assistant",
          content: "죄송합니다. 잠시 후 다시 시도해 주세요.",
          createdAt: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackAssistant]);
      } finally {
        setIsAssistantThinking(false);
        setIsSummaryLoading(false);
      }
    },
    [isAssistantThinking, messages, persistConversation, router, user]
  );

  const handleQuickPromptClick = useCallback(
    (prompt: string) => {
      if (!prompt || isAssistantThinking) return;
      void handleSendMessage(prompt);
    },
    [handleSendMessage, isAssistantThinking]
  );

  const handleMatchNow = useCallback(
    (recommendation: InvestigatorRecommendation) => {
      if (!intakeSummary) return;

      const investigatorId = recommendation.investigatorId;
      const targetUrl = `/investigation-requests/new?investigatorId=${investigatorId}`;

      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
        return;
      }

      const summaryLines: string[] = [];
      if (intakeSummary.caseTitle)
        summaryLines.push(`사건 제목: ${intakeSummary.caseTitle}`);
      if (intakeSummary.primaryIntent)
        summaryLines.push(`의뢰 목적: ${intakeSummary.primaryIntent}`);
      if (intakeSummary.objective)
        summaryLines.push(`원하는 결과: ${intakeSummary.objective}`);
      if (intakeSummary.urgency)
        summaryLines.push(`긴급도: ${intakeSummary.urgency}`);
      if (intakeSummary.caseType)
        summaryLines.push(`사건 유형: ${intakeSummary.caseType}`);

      if (intakeSummary.keyFacts.length > 0) {
        summaryLines.push("", "[확보된 핵심 사실]");
        intakeSummary.keyFacts.forEach((fact, index) => {
          summaryLines.push(`${index + 1}. ${fact}`);
        });
      }

      if (intakeSummary.missingDetails.length > 0) {
        summaryLines.push("", "[추가 확인이 필요한 정보]");
        intakeSummary.missingDetails.forEach((item, index) => {
          summaryLines.push(`${index + 1}. ${item}`);
        });
      }

      const transcriptText = transcriptForHandoff
        .map((entry) => `${entry.role === "assistant" ? "AI" : "의뢰인"}: ${entry.content}`)
        .join("\n\n");

      const combinedDetails = [
        summaryLines.length ? ["[사건 요약]", ...summaryLines].join("\n") : null,
        transcriptText ? `【대화 로그】\n${transcriptText}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const payload = {
        investigatorId,
        createdAt: Date.now(),
        title: intakeSummary.caseTitle || "사건 의뢰 초안",
        details: combinedDetails || transcriptText || summaryLines.join("\n"),
        conversationSummary: conversationSummary ?? "",
        structuredSummary: intakeSummary,
        transcript: transcriptForHandoff,
        transcriptText,
      };

      try {
        sessionStorage.setItem(
          "investigationRequestPrefill",
          JSON.stringify(payload)
        );
      } catch (error) {
        console.warn("[SIMULATION_MATCH_PREFILL_ERROR]", error);
      }

      router.push(targetUrl);
    },
    [conversationSummary, intakeSummary, router, transcriptForHandoff, user]
  );

  useEffect(() => {
    if (!intakeSummary) {
      setRecommendations([]);
      setRecommendationsError(null);
      setIsRecommendationsLoading(false);
      return;
    }

    const keywords = deriveKeywords(intakeSummary);
    if (keywords.length === 0) {
      setRecommendations([]);
      setRecommendationsError(null);
      setIsRecommendationsLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadRecommendations = async () => {
      setIsRecommendationsLoading(true);
      setRecommendationsError(null);

      try {
        const res = await fetch(
          "/api/simulation/investigator-recommendations",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keywords,
              scenarioTitle: intakeSummary.caseTitle || null,
            }),
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`Recommendation request failed: ${res.status}`);
        }

        const data = await res.json();
        const list = Array.isArray(data?.recommendations)
          ? (data.recommendations as InvestigatorRecommendation[])
          : [];
        setRecommendations(list);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[SIMULATION_RECOMMENDATIONS_ERROR]", error);
        setRecommendationsError(
          "탐정 추천 정보를 가져오는 중 문제가 발생했습니다."
        );
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsRecommendationsLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => controller.abort();
  }, [intakeSummary]);

  const quickPrompts = useMemo(() => {
    if (intakeSummary?.nextQuestions?.length) {
      return intakeSummary.nextQuestions.slice(0, 4);
    }
    return DEFAULT_QUICK_PROMPTS;
  }, [intakeSummary?.nextQuestions]);

  const handoffData = useMemo(
    () => ({
      transcript: transcriptForHandoff,
      summary: intakeSummary,
      conversationSummary,
    }),
    [conversationSummary, intakeSummary, transcriptForHandoff]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        "simulation-handoff",
        JSON.stringify(handoffData)
      );
    } catch (error) {
      console.warn("[SIMULATION_HANDOFF_PERSIST_ERROR]", error);
    }
  }, [handoffData]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const value = String(formData.get("message") ?? "");
      void handleSendMessage(value);
      event.currentTarget.reset();
    },
    [handleSendMessage]
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
  <div className="mx-auto flex min-h-screen min-h-[100svh] max-w-[1640px] flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-xl backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                <FiStar className="h-3.5 w-3.5" /> 사건 인테이크 어시스턴트
              </div>
              <div>
                <h1 className="max-w-3xl text-2xl font-bold leading-tight text-balance sm:text-3xl md:text-4xl">
                  실시간 조사 인테이크 & 전략 보드
                </h1>
                <p className="mt-2 hidden max-w-2xl text-sm text-indigo-100 md:mt-3 md:block md:text-base md:leading-relaxed">
                  대화를 그대로 기록하고 요약하여 탐정에게 전달할 준비를 마칩니다. 필요한 질문을 제안받으며 사건을 빠르게 정리하세요.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-indigo-200/80 md:hidden">
                  대화를 기록하고 꼭 필요한 정보만 정리해 탐정에게 전달합니다.
                </p>
              </div>
              <div className="hidden flex-wrap gap-2 text-xs font-semibold text-indigo-200/80 sm:flex">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  # Intake 요약
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  # 실시간 브리핑
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">
                  # 탐정 매칭 준비
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-indigo-100 md:w-auto md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-200/80 md:text-xs">
                    현재 계정
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white md:mt-2 md:text-base">
                    {user?.email ?? "비로그인 상태"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-white/30 bg-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-white/30 md:px-4"
                >
                  로그아웃
                </button>
              </div>
              <p className="text-[11px] text-indigo-100/70 md:text-xs">
                대화는 브리핑 카드로 정리되어 탐정에게 전달됩니다. 세션 종료 전까지 필요한 질문을 이어가세요.
              </p>
            </div>
          </div>
        </header>

  <div className="grid flex-1 min-h-0 grid-cols-1 gap-5 md:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] lg:items-stretch xl:h-[calc(100vh-200px)] xl:min-h-[calc(100vh-200px)] xl:max-h-[calc(100vh-200px)] xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] xl:gap-8">
          <section className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl sm:min-h-[560px] lg:col-span-1 lg:min-h-[620px] xl:h-full xl:min-h-0 xl:max-h-full">
            <div className="border-b border-slate-200/80 bg-slate-50/80 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
                    <FiMessageCircle className="h-5 w-5 text-indigo-500" /> 실시간 상담 대화
                  </h2>
                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    대화가 그대로 기록되고 요약본과 함께 탐정에게 전달됩니다.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-600">
                  {isAssistantThinking ? (
                    <>
                      <FiLoader className="h-3.5 w-3.5 animate-spin" /> 분석 중...
                    </>
                  ) : (
                    <>
                      <FiCpu className="h-3.5 w-3.5" /> 대기 중
                    </>
                  )}
                </span>
              </div>
              <div className="mt-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleQuickPromptClick(prompt)}
                    disabled={isAssistantThinking}
                    className="max-w-[260px] rounded-full border border-indigo-100 bg-white px-3 py-1 text-[11px] font-medium text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="inline-block text-left leading-snug text-balance">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            <div
              ref={chatContainerRef}
              className="custom-scrollbar flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white via-white to-slate-50/60 px-4 py-5 sm:px-6"
            >
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    className={cn(
                      "flex w-full",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex max-w-[88%] items-start gap-3",
                        message.role === "user"
                          ? "flex-row-reverse text-right"
                          : "flex-row"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white shadow-lg">
                          AI
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm">
                          <FiUser className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-full rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm sm:px-4 sm:py-3 sm:text-sm",
                          message.role === "user"
                            ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg"
                            : "bg-white/95 ring-1 ring-slate-200 text-slate-800"
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words text-balance">{message.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isAssistantThinking ? (
                <div className="flex w-full justify-start">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-sm font-semibold text-white shadow-lg">
                      AI
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-[13px] text-slate-600 shadow-sm sm:px-4 sm:py-3 sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span>사건 정보를 정리하고 있어요...</span>
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t border-slate-200 bg-white/95 p-4"
            >
              <div className="group relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
                <textarea
                  name="message"
                  placeholder="사건의 세부 상황이나 궁금한 점을 알려주세요."
                  rows={1}
                  disabled={isAssistantThinking}
                  className="max-h-32 min-h-[40px] flex-1 resize-none border-none bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={isAssistantThinking}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg transition hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
                >
                  <FiSend className="text-base" />
                </button>
              </div>
            </form>

            <div className="border-t border-slate-200 bg-white/90 px-4 py-4 lg:hidden">
              <div className="space-y-3">
                <details className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                    사건 요약
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <CaseSummarySidebar
                      summary={intakeSummary}
                      conversationSummary={conversationSummary}
                      isLoading={isSummaryLoading}
                      isAssistantThinking={isAssistantThinking}
                    />
                  </div>
                </details>
                <details className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                    탐정 추천
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <InvestigatorRecommendationsCard
                      recommendations={recommendations}
                      isLoading={isRecommendationsLoading}
                      scenarioTitle={intakeSummary?.caseTitle}
                      matchButtonLabel={matchButtonLabel}
                      isMatchDisabled={isMatchDisabled}
                      onMatchNow={handleMatchNow}
                    />
                    {recommendationsError ? (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
                        <FiAlertCircle className="mt-0.5 h-4 w-4" />
                        <span>{recommendationsError}</span>
                      </div>
                    ) : null}
                  </div>
                </details>
              </div>
            </div>
          </section>

          <section className="hidden h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl lg:col-span-1 lg:flex lg:min-h-[620px] xl:h-full xl:min-h-0 xl:max-h-full">
              <div className="border-b border-slate-200/80 bg-slate-50/80 p-5">
                <h2 className="text-lg font-semibold text-slate-900">사건 요약</h2>
                <p className="mt-1 text-xs text-slate-500">
                  대화에서 수집된 사건 정보를 정리한 내용입니다.
                </p>
              </div>
              <div className="custom-scrollbar flex-1 min-h-0 space-y-4 overflow-y-auto p-5">
                {summaryError ? (
                  <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-600">
                    <FiAlertCircle className="mt-0.5 h-4 w-4" />
                    <span>{summaryError}</span>
                  </div>
                ) : null}
                <CaseSummarySidebar
                  summary={intakeSummary}
                  conversationSummary={conversationSummary}
                  isLoading={isSummaryLoading}
                  isAssistantThinking={isAssistantThinking}
                />
              </div>
          </section>

          <section className="hidden h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl lg:col-span-1 lg:flex lg:min-h-[620px] xl:h-full xl:min-h-0 xl:max-h-full">
              <div className="border-b border-slate-200/80 bg-slate-50/80 p-5">
                <h2 className="text-lg font-semibold text-slate-900">탐정 추천</h2>
                <p className="mt-1 text-xs text-slate-500">
                  사건 유형과 핵심 정보를 기반으로 적합한 탐정을 매칭합니다.
                </p>
              </div>
              <div className="custom-scrollbar flex-1 min-h-0 space-y-4 overflow-y-auto p-5">
                <InvestigatorRecommendationsCard
                  recommendations={recommendations}
                  isLoading={isRecommendationsLoading}
                  scenarioTitle={intakeSummary?.caseTitle}
                  matchButtonLabel={matchButtonLabel}
                  isMatchDisabled={isMatchDisabled}
                  onMatchNow={handleMatchNow}
                />
                {recommendationsError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
                    <FiAlertCircle className="mt-0.5 h-4 w-4" />
                    <span>{recommendationsError}</span>
                  </div>
                ) : null}
              </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChatSimulation;

