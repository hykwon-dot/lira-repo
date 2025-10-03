"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import cuid from "cuid";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiAlertCircle,
  FiClock,
  FiChevronDown,
  FiCpu,
  FiBookOpen,
  FiRefreshCcw,
  FiLoader,
  FiMessageCircle,
  FiSend,
  FiStar,
  FiTrash2,
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

const buildHistoryStorageKey = (userId?: string | number | null) =>
  `simulation.chatHistory:${userId ?? "guest"}`;

const buildConversationStorageKey = (userId?: string | number | null) =>
  `simulation.chatConversation:${userId ?? "guest"}`;

const parseTimestamp = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Date.now();
};

const mapServerRoleToChatRole = (role: unknown): ChatRole | null => {
  if (typeof role !== "string") return null;
  if (role.toUpperCase() === "AI" || role.toLowerCase() === "assistant") {
    return "assistant";
  }
  if (role.toUpperCase() === "USER" || role.toLowerCase() === "user") {
    return "user";
  }
  return null;
};

const mapServerMessageToChat = (message: unknown): ChatMessage | null => {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;
  const role = mapServerRoleToChatRole(record.role);
  if (!role) return null;
  const content = typeof record.content === "string" ? record.content.trim() : "";
  if (!content) return null;
  const createdAt = parseTimestamp(record.createdAt);
  const idSource = record.id ?? `${role}-${createdAt}-${Math.random()}`;
  return {
    id: String(idSource),
    role,
    content,
    createdAt,
  };
};

const mapServerMessagesToChat = (messages: unknown): ChatMessage[] => {
  if (!Array.isArray(messages)) return [];
  return messages
    .map(mapServerMessageToChat)
    .filter((item): item is ChatMessage => Boolean(item));
};

interface PersistedSession {
  id: string;
  externalId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

const mapConversationPayload = (value: unknown): PersistedSession | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as { conversation?: unknown; messages?: unknown };
  const conversationRaw = record.conversation;
  if (!conversationRaw || typeof conversationRaw !== "object") return null;
  const conversation = conversationRaw as Record<string, unknown>;
  const rawId = conversation.id;
  if (typeof rawId !== "number" && typeof rawId !== "string") return null;
  const externalId =
    typeof conversation.externalId === "string" && conversation.externalId.trim()
      ? conversation.externalId.trim()
      : null;
  const title =
    typeof conversation.title === "string" && conversation.title.trim()
      ? conversation.title.trim()
      : null;
  const createdAt =
    typeof conversation.createdAt === "string" && conversation.createdAt
      ? conversation.createdAt
      : new Date().toISOString();
  const updatedAt =
    typeof conversation.updatedAt === "string" && conversation.updatedAt
      ? conversation.updatedAt
      : createdAt;
  const messages = mapServerMessagesToChat(record.messages);
  return {
    id: String(rawId),
    externalId,
    title,
    createdAt,
    updatedAt,
    messages,
  };
};

const sortSessionsByRecency = (sessions: PersistedSession[]) =>
  [...sessions].sort((a, b) => {
    const aTime = parseTimestamp(a.updatedAt ?? a.createdAt);
    const bTime = parseTimestamp(b.updatedAt ?? b.createdAt);
    return bTime - aTime;
  });

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [persistedSessions, setPersistedSessions] = useState<PersistedSession[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const matchButtonLabel = useMemo(() => {
    if (!user) return "로그인 후 탐정고르기";
    if (user.role === "investigator") return "고객 계정에서 이용";
    return "탐정고르기";
  }, [user]);

  const isMatchDisabled = user?.role === "investigator";

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const summaryRef = useRef<IntakeSummary | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const historyHydratedRef = useRef(false);
  const bootstrapHadStoredMessagesRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const currentUserId = user?.id ? String(user.id) : null;
    if (previousUserIdRef.current === currentUserId) {
      return;
    }

    previousUserIdRef.current = currentUserId;
    historyHydratedRef.current = false;
    storageKeyRef.current = null;
    bootstrapHadStoredMessagesRef.current = false;

    conversationIdRef.current = null;
    setConversationId(null);

    if (!currentUserId) {
      setMessages([
        {
          id: cuid(),
          role: "assistant",
          content: assistantGreeting,
          createdAt: Date.now(),
        },
      ]);
      setPersistedSessions([]);
      return;
    }

    setMessages([
      {
        id: cuid(),
        role: "assistant",
        content: assistantGreeting,
        createdAt: Date.now(),
      },
    ]);
    setPersistedSessions([]);
  }, [user?.id]);

  const loadPersistedSessions = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      if (!user?.id) {
        setPersistedSessions([]);
        setHistoryError(null);
        bootstrapHadStoredMessagesRef.current = false;
        if (!options?.silent) {
          setIsHistoryLoading(false);
        }
        return;
      }

      const normalizedUserId = Number(user.id);
      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        setPersistedSessions([]);
        setHistoryError(null);
        bootstrapHadStoredMessagesRef.current = false;
        if (!options?.silent) {
          setIsHistoryLoading(false);
        }
        return;
      }

      if (!options?.silent) {
        setIsHistoryLoading(true);
        setHistoryError(null);
      }

      try {
        const response = await fetch(
          `/api/conversation?userId=${encodeURIComponent(String(normalizedUserId))}`,
          {
            method: "GET",
            signal: options?.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.status}`);
        }

        const payload = await response.json();
        const mappedSessions = Array.isArray(payload)
          ? payload
              .map(mapConversationPayload)
              .filter((item): item is PersistedSession => Boolean(item))
          : [];

        const sortedSessions = sortSessionsByRecency(mappedSessions);
        setPersistedSessions(sortedSessions);

        if (!bootstrapHadStoredMessagesRef.current && sortedSessions.length > 0) {
          const latestSession = sortedSessions[0];
          if (latestSession.messages.length > 0) {
            setMessages(latestSession.messages);
            conversationIdRef.current = latestSession.externalId ?? null;
            setConversationId(latestSession.externalId ?? null);
            bootstrapHadStoredMessagesRef.current = true;
          }
        }
      } catch (error) {
        if (options?.signal?.aborted) return;
        console.error("[SIMULATION_HISTORY_FETCH_ERROR]", error);
        setHistoryError("이전 상담 내역을 가져오지 못했습니다.");
      } finally {
        if (!options?.silent) {
          setIsHistoryLoading(false);
        }
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (!user?.id) {
      setPersistedSessions([]);
      setHistoryError(null);
      setIsHistoryLoading(false);
      bootstrapHadStoredMessagesRef.current = false;
      return;
    }

    const controller = new AbortController();
    void loadPersistedSessions({ signal: controller.signal, silent: false });

    return () => controller.abort();
  }, [loadPersistedSessions, user?.id]);

  const handleRefreshHistory = useCallback(() => {
    void loadPersistedSessions();
  }, [loadPersistedSessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.id) {
      storageKeyRef.current = null;
      historyHydratedRef.current = true;
      bootstrapHadStoredMessagesRef.current = false;
      return;
    }

    const keySuffix = String(user.id);
    const historyKey = buildHistoryStorageKey(keySuffix);
    const conversationKey = buildConversationStorageKey(keySuffix);

    storageKeyRef.current = historyKey;

    let restoredMessages: ChatMessage[] | null = null;
    let restoredConversationId: string | null = null;

    try {
      const rawHistory = window.localStorage.getItem(historyKey);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory) as {
          messages?: ChatMessage[];
        };
        if (Array.isArray(parsed?.messages) && parsed.messages.length > 0) {
          restoredMessages = parsed.messages;
        }
      }

      const rawConversationId = window.localStorage.getItem(conversationKey);
      if (rawConversationId) {
        restoredConversationId = rawConversationId;
      }
    } catch (error) {
      console.warn("[SIMULATION_HISTORY_RESTORE_ERROR]", error);
    }

    if (restoredMessages) {
      setMessages(restoredMessages);
      bootstrapHadStoredMessagesRef.current = true;
    } else {
      bootstrapHadStoredMessagesRef.current = false;
    }

    if (restoredConversationId) {
      conversationIdRef.current = restoredConversationId;
      setConversationId(restoredConversationId);
    } else {
      conversationIdRef.current = null;
      setConversationId(null);
    }

    historyHydratedRef.current = true;

    return () => {
      storageKeyRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!historyHydratedRef.current) return;
    if (!user?.id) return;

    const keySuffix = String(user.id);
    const historyKey = storageKeyRef.current ?? buildHistoryStorageKey(keySuffix);
    const conversationKey = buildConversationStorageKey(keySuffix);

    try {
      window.localStorage.setItem(
        historyKey,
        JSON.stringify({ messages }),
      );

      if (conversationId) {
        window.localStorage.setItem(
          conversationKey,
          conversationId,
        );
      } else {
        window.localStorage.removeItem(conversationKey);
      }
    } catch (error) {
      console.warn("[SIMULATION_HISTORY_STORE_ERROR]", error);
    }
  }, [messages, conversationId, user?.id]);

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
          const normalized = externalId.trim();
          conversationIdRef.current = normalized;
          setConversationId(normalized);
        }

        const persistedSession = mapConversationPayload({
          conversation: data?.conversation,
          messages: data?.messages,
        });
        if (persistedSession) {
          setPersistedSessions((prev) =>
            sortSessionsByRecency([
              ...prev.filter((session) => session.id !== persistedSession.id),
              persistedSession,
            ]),
          );
          setHistoryError(null);
        }

        void loadPersistedSessions({ silent: true });
      } catch (error) {
        console.error("[SIMULATION_CONVERSATION_SAVE_ERROR]", error);
      }
    },
    [loadPersistedSessions, user?.id],
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

      bootstrapHadStoredMessagesRef.current = true;

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
            conversationId: conversationIdRef.current,
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

  const handleClearHistory = useCallback(() => {
    const resetMessage: ChatMessage = {
      id: cuid(),
      role: "assistant",
      content: assistantGreeting,
      createdAt: Date.now(),
    };

    const previousConversationId = conversationIdRef.current;

    setMessages([resetMessage]);
    conversationIdRef.current = null;
    setConversationId(null);

    const keySuffix = user?.id ? String(user.id) : null;
    if (keySuffix && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(buildHistoryStorageKey(keySuffix));
        window.localStorage.removeItem(buildConversationStorageKey(keySuffix));
      } catch (error) {
        console.warn("[SIMULATION_HISTORY_CLEAR_ERROR]", error);
      }
    }

    if (previousConversationId) {
      setPersistedSessions((prev) =>
        prev.filter(
          (session) =>
            session.externalId !== previousConversationId &&
            session.id !== previousConversationId,
        ),
      );
    }

    setIsHistoryOpen(false);
    bootstrapHadStoredMessagesRef.current = true;
  }, [user?.id]);

  const handleLoadSession = useCallback((session: PersistedSession) => {
    if (!session?.messages?.length) return;

    setMessages(session.messages);
    const normalizedExternalId = session.externalId ?? null;
    conversationIdRef.current = normalizedExternalId;
    setConversationId(normalizedExternalId);
    bootstrapHadStoredMessagesRef.current = true;
  }, []);

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

  const filteredPersistedSessions = useMemo(() => {
    if (!persistedSessions.length) return [] as PersistedSession[];
    return persistedSessions.filter((session) => {
      if (!session.messages.length) return false;
      if (conversationId && session.externalId) {
        return session.externalId !== conversationId;
      }
      return true;
    });
  }, [conversationId, persistedSessions]);

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

  <div className="grid flex-1 min-h-0 grid-cols-1 gap-5 overflow-hidden md:gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1.1fr)] lg:items-stretch lg:auto-rows-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] xl:gap-8 xl:auto-rows-[minmax(0,1fr)]">
          <section className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl sm:min-h-[560px] lg:col-span-1 lg:min-h-0 lg:max-h-[calc(100svh-260px)] xl:max-h-[calc(100svh-240px)]">
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
              <div className="mt-4 space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-[11px] font-semibold text-indigo-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
                  >
                    <FiClock className="h-3.5 w-3.5" />
                    {isHistoryOpen ? "이전 대화내역 닫기" : "이전 대화내역 열어보기"}
                  </button>
                  {messages.length > 1 ? (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 sm:self-auto"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" /> 대화 초기화
                    </button>
                  ) : null}
                </div>
                {isHistoryOpen ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-600">
                          <FiBookOpen className="h-3.5 w-3.5" /> 현재 상담 기록
                        </span>
                        {conversationId ? (
                          <span className="text-[10px] font-medium text-indigo-400">
                            ID: {conversationId}
                          </span>
                        ) : null}
                      </div>
                      <div className="custom-scrollbar mt-3 max-h-52 space-y-2 overflow-y-auto pr-1 text-[12px] text-slate-700">
                        {messages.length > 0 ? (
                          messages.map((message) => {
                            const timestampLabel = Number.isFinite(message.createdAt)
                              ? new Date(message.createdAt).toLocaleString("ko-KR", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : null;

                            return (
                              <div
                                key={`history-current-${message.id}`}
                                className={cn(
                                  "flex flex-col gap-1 rounded-xl bg-white/90 px-3 py-2 shadow-sm",
                                  message.role === "assistant"
                                    ? "border border-indigo-100"
                                    : "border border-slate-200",
                                )}
                              >
                                <div className="flex items-center justify-between text-[11px] font-semibold">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1",
                                      message.role === "assistant"
                                        ? "text-indigo-600"
                                        : "text-slate-600",
                                    )}
                                  >
                                    {message.role === "assistant" ? "AI 응답" : "내 메시지"}
                                  </span>
                                  {timestampLabel ? (
                                    <span className="text-[10px] font-medium text-slate-400">
                                      {timestampLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-700">
                                  {message.content}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-5 text-center text-[12px] text-indigo-500">
                            아직 대화를 시작하지 않았습니다.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-600">
                          <FiClock className="h-3.5 w-3.5" /> 이전 상담 내역
                        </span>
                        <div className="flex items-center gap-2">
                          {filteredPersistedSessions.length ? (
                            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-500">
                              {filteredPersistedSessions.length}건
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleRefreshHistory}
                            disabled={!user || isHistoryLoading}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FiRefreshCcw className="h-3 w-3" /> 새로고침
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-[12px] text-slate-700">
                        {!user ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[12px] text-slate-500">
                            로그인하면 이전 상담 내역을 확인할 수 있습니다.
                          </div>
                        ) : historyError ? (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-xs text-amber-700">
                            <FiAlertCircle className="mt-0.5 h-4 w-4" />
                            <span>{historyError}</span>
                          </div>
                        ) : isHistoryLoading ? (
                          <div className="flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-4 text-[12px] text-indigo-500">
                            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                            불러오는 중...
                          </div>
                        ) : filteredPersistedSessions.length > 0 ? (
                          <div className="custom-scrollbar max-h-60 space-y-2 overflow-y-auto pr-1">
                            {filteredPersistedSessions.map((session) => {
                                const updatedTime = new Date(
                                  session.updatedAt ?? session.createdAt,
                                ).toLocaleString("ko-KR", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                });
                                const messageCount = session.messages.length;
                                const sessionTitle = session.title ?? `상담 #${session.id}`;

                                return (
                                  <details
                                    key={`session-${session.id}`}
                                    className="group rounded-2xl border border-indigo-50 bg-white/95 p-3 shadow-sm"
                                  >
                                    <summary className="flex cursor-pointer items-start justify-between gap-3 text-left">
                                      <div className="min-w-0 space-y-1">
                                        <p className="text-sm font-semibold text-slate-800">
                                          {sessionTitle}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          {updatedTime}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                          {messageCount}개 메시지
                                        </span>
                                        <FiChevronDown className="mt-1 h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                                      </div>
                                    </summary>
                                    <div className="custom-scrollbar mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                                      {session.messages.map((message) => {
                                        const timestampLabel = Number.isFinite(message.createdAt)
                                          ? new Date(message.createdAt).toLocaleString("ko-KR", {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                            })
                                          : null;

                                        return (
                                          <div
                                            key={`${session.id}-${message.id}`}
                                            className={cn(
                                              "flex flex-col gap-1 rounded-xl bg-white px-3 py-2 shadow-sm",
                                              message.role === "assistant"
                                                ? "border border-indigo-100"
                                                : "border border-slate-200",
                                            )}
                                          >
                                            <div className="flex items-center justify-between text-[11px] font-semibold">
                                              <span
                                                className={cn(
                                                  "inline-flex items-center gap-1",
                                                  message.role === "assistant"
                                                    ? "text-indigo-600"
                                                    : "text-slate-600",
                                                )}
                                              >
                                                {message.role === "assistant" ? "AI 응답" : "의뢰인"}
                                              </span>
                                              {timestampLabel ? (
                                                <span className="text-[10px] font-medium text-slate-400">
                                                  {timestampLabel}
                                                </span>
                                              ) : null}
                                            </div>
                                            <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-700">
                                              {message.content}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    <div className="mt-3 flex items-center justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleLoadSession(session)}
                                        className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
                                      >
                                        이 대화 불러오기
                                      </button>
                                    </div>
                                  </details>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 px-3 py-5 text-center text-[12px] text-indigo-500">
                            아직 저장된 상담 내역이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap">
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

          <section className="hidden h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl lg:col-span-1 lg:flex lg:min-h-0 lg:max-h-[calc(100svh-260px)] xl:max-h-[calc(100svh-240px)]">
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

          <section className="hidden h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl lg:col-span-1 lg:flex lg:min-h-0 lg:max-h-[calc(100svh-260px)] xl:max-h-[calc(100svh-240px)]">
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

