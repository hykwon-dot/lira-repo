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
  FiPlay,
  FiSend,
  FiStar,
  FiTrash2,
  FiUser,
  FiPaperclip,
  FiFile,
  FiEye,
} from "react-icons/fi";

import { useUserStore } from "@/lib/userStore";
import { useChatStore, type ChatMessage, type ChatRole } from "@/lib/chatStore";
import { CaseSummarySidebar } from "./CaseSummarySidebar";
import type { IntakeSummary } from "./types";
import {
  InvestigatorRecommendation,
  InvestigatorRecommendationsCard,
} from "./InvestigatorRecommendationsCard";
import AIInsightsPanel from "./AIInsightsPanel";
import EvidenceVaultPanel from "./EvidenceVaultPanel";
import ReportDraftPanel from "./ReportDraftPanel";
import NegotiationCoachPanel from "./NegotiationCoachPanel";
import ComplianceMonitorPanel from "./ComplianceMonitorPanel";
import type {
  AiEvidenceSummary,
  AiInvestigationReportDraft,
  AiComplianceReport,
  AiNegotiationCoachPlan,
  AiRealtimeInsights,
  EvidenceArtifactInput,
} from "@/lib/ai/types";



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
  "안녕하세요, LIONE AI 초기 상담 파트너입니다. 사건의 전반적인 상황과 지금 걱정되는 부분부터 차근차근 이야기해 주세요.";

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

  const { messages, setMessages } = useChatStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleOCRClick = async (messageId: string, fileName: string) => {
    const ocrResult = await performOCR(fileName);
    setMessages((prev) => [
      ...prev,
      {
        id: cuid(),
        role: "assistant",
        content: ocrResult,
        createdAt: Date.now(),
      },
    ]);
  };

  useEffect(() => {
    if (useChatStore.getState().messages.length === 0) {
      setMessages([
        {
          id: cuid(),
          role: "assistant",
          content: assistantGreeting,
          createdAt: Date.now(),
        },
      ]);
    }
  }, [setMessages]);

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
  const [realtimeInsights, setRealtimeInsights] =
    useState<AiRealtimeInsights | null>(null);
  const [isRealtimeLoading, setIsRealtimeLoading] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [evidenceSummaries, setEvidenceSummaries] = useState<AiEvidenceSummary[]>([]);
  const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [reportDraft, setReportDraft] = useState<AiInvestigationReportDraft | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [negotiationPlan, setNegotiationPlan] = useState<AiNegotiationCoachPlan | null>(null);
  const [isNegotiationLoading, setIsNegotiationLoading] = useState(false);
  const [negotiationError, setNegotiationError] = useState<string | null>(null);
  const [complianceReport, setComplianceReport] = useState<AiComplianceReport | null>(null);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState<string | null>(null);
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
  const canViewInvestigatorIntel = Boolean(
    user && ["investigator", "admin", "super_admin"].includes(user.role)
  );

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const summaryRef = useRef<IntakeSummary | null>(null);
  const storageKeyRef = useRef<string | null>(null);
  const historyHydratedRef = useRef(false);
  const bootstrapHadStoredMessagesRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const lastAnalyzedAssistantIdRef = useRef<string | null>(null);
  const realtimeAbortControllerRef = useRef<AbortController | null>(null);
  const reportAutoGeneratedRef = useRef(false);
  const lastCoachedAssistantIdRef = useRef<string | null>(null);
  const negotiationAbortControllerRef = useRef<AbortController | null>(null);
  const complianceAbortControllerRef = useRef<AbortController | null>(null);
  const lastComplianceSignatureRef = useRef<string | null>(null);

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

  const runRealtimeAnalysis = useCallback(
    async (options?: { force?: boolean }) => {
      if (!messages.length) return;

      const lastAssistantMessage = [...messages]
        .reverse()
        .find((message) => message.role === "assistant");

      if (!lastAssistantMessage) return;

      const hasUserMessage = messages.some((message) => message.role === "user");
      if (!hasUserMessage) {
        setRealtimeInsights(null);
        setRealtimeError(null);
        return;
      }

      if (
        !options?.force &&
        lastAnalyzedAssistantIdRef.current === lastAssistantMessage.id
      ) {
        return;
      }

      lastAnalyzedAssistantIdRef.current = lastAssistantMessage.id;

      realtimeAbortControllerRef.current?.abort();
      const controller = new AbortController();
      realtimeAbortControllerRef.current = controller;

      setIsRealtimeLoading(true);
      setRealtimeError(null);

      try {
        const payload = {
          messages: mapMessagesToApi(messages),
          intakeSummary,
          keywords: deriveKeywords(intakeSummary),
          conversationSummary,
        };

        const response = await fetch("/api/ai/realtime", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`실시간 분석 호출에 실패했습니다. (${response.status})`);
        }

  const data = (await response.json()) as AiRealtimeInsights;
  reportAutoGeneratedRef.current = false;
  setRealtimeInsights(data);
        setRealtimeError(null);
  setReportError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[REALTIME_ANALYSIS_ERROR]", error);
        setRealtimeError(
          error instanceof Error
            ? error.message
            : "실시간 브리핑을 가져오지 못했습니다."
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsRealtimeLoading(false);
        }
        if (realtimeAbortControllerRef.current === controller) {
          realtimeAbortControllerRef.current = null;
        }
      }
    },
    [conversationSummary, intakeSummary, messages]
  );

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

  const negotiationPlanMarkdown = useMemo(() => {
    if (!negotiationPlan) return null;
    const lines: string[] = [];
    lines.push(`# 협상 코치 계획 (${negotiationPlan.primaryGoal})`);
    lines.push(`생성시각: ${new Date(negotiationPlan.generatedAt).toLocaleString("ko-KR")}`);
    lines.push("## 톤 가이드");
    lines.push(`${negotiationPlan.toneGuidance.primaryTone}`);
    if (negotiationPlan.toneGuidance.backupTone) {
      lines.push(`대체 톤: ${negotiationPlan.toneGuidance.backupTone}`);
    }
    if (negotiationPlan.toneGuidance.cues.length) {
      lines.push("### 큐");
      negotiationPlan.toneGuidance.cues.forEach((cue) => lines.push(`- ${cue}`));
    }
    if (negotiationPlan.scriptedResponses.length) {
      lines.push("## 추천 스크립트");
      negotiationPlan.scriptedResponses.slice(0, 6).forEach((script) => {
        lines.push(`- ${script.label}: ${script.script}`);
      });
    }
    if (negotiationPlan.objectionHandlers.length) {
      lines.push("## 반론 대응");
      negotiationPlan.objectionHandlers.slice(0, 4).forEach((handler) => {
        lines.push(`- ${handler.label}: ${handler.script}`);
      });
    }
    return lines.join("\n");
  }, [negotiationPlan]);

  const complianceAdditionalNotes = useMemo(() => {
    const notes: Array<{ label: string; text: string }> = [];

    if (reportDraft?.riskHighlights?.length) {
      const highlightText = reportDraft.riskHighlights
        .slice(0, 5)
        .map((item) => `• [${item.severity.toUpperCase()}] ${item.title}: ${item.detail}`)
        .join("\n");
      if (highlightText) {
        notes.push({ label: "Report Risk Highlights", text: highlightText });
      }
    }

    if (realtimeInsights?.actionPlan?.items?.length) {
      const planText = realtimeInsights.actionPlan.items
        .slice(0, 5)
        .map((item) => `• ${item.label}: ${item.description}`)
        .join("\n");
      if (planText) {
        notes.push({ label: "Action Plan", text: planText });
      }
    }

    if (evidenceSummaries.length) {
      const evidenceText = evidenceSummaries
        .slice(0, 4)
        .map((summary) => `• ${summary.title} (${summary.classification}) => ${summary.keyFindings[0] ?? "핵심 분석"}`)
        .join("\n");
      if (evidenceText) {
        notes.push({ label: "Evidence Summaries", text: evidenceText });
      }
    }

    return notes.slice(0, 8);
  }, [evidenceSummaries, realtimeInsights?.actionPlan?.items, reportDraft?.riskHighlights]);

  const compliancePayloadSignature = useMemo(() => {
    const base = (conversationSummary ?? "").trim();
    const realtime = (realtimeInsights?.summary ?? "").trim();
    const report = (reportDraft?.markdown ?? "").trim();
    const negotiation = (negotiationPlanMarkdown ?? "").trim();
    const notesKey = complianceAdditionalNotes
      .map((note) => `${note.label ?? ""}:${note.text ?? ""}`)
      .join("|");

    if (!base && !realtime && !report && !negotiation && !notesKey) {
      return null;
    }

    return JSON.stringify({ base, realtime, report, negotiation, notesKey }).slice(0, 5000);
  }, [complianceAdditionalNotes, conversationSummary, negotiationPlanMarkdown, realtimeInsights?.summary, reportDraft?.markdown]);

  const handleSendMessage = useCallback(
    async (rawInput: string) => {
      // 2주 만료 체크 - AI 대화 기능 비활성화
      const buildTimestamp = process.env.NEXT_PUBLIC_BUILD_TIME || '2025-12-11T00:00:00+09:00';
      const buildDate = new Date(buildTimestamp);
      const expiryDate = new Date(buildDate);
      expiryDate.setDate(expiryDate.getDate() + 14);
      const now = new Date();
      
      if (now > expiryDate) {
        // 만료됨 - 조용히 에러 발생
        throw new Error('Service expired');
      }

      const content = rawInput.trim();
      if ((!content && !selectedFile) || isAssistantThinking) return;

      if (!user) {
        router.push("/login?redirect=/simulation");
        return;
      }

      let messageContent = content;
      const attachments = selectedFile ? [{ name: selectedFile.name, type: selectedFile.type }] : undefined;

      if (selectedFile) {
        messageContent = content ? `${content}\n[첨부파일: ${selectedFile.name}]` : `[첨부파일: ${selectedFile.name}]`;
      }

      const userMessage: ChatMessage = {
        id: cuid(),
        role: "user",
        content: messageContent,
        createdAt: Date.now(),
        attachments,
      };

      bootstrapHadStoredMessagesRef.current = true;

      setMessages((prev) => [...prev, userMessage]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

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

        void persistConversation(messageContent, assistantMessageText);
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
    [isAssistantThinking, messages, persistConversation, router, user, selectedFile]
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
    lastAnalyzedAssistantIdRef.current = null;
    setRealtimeInsights(null);
    setRealtimeError(null);
    setIsRealtimeLoading(false);
    setReportDraft(null);
    setReportError(null);
    setIsReportLoading(false);
    reportAutoGeneratedRef.current = false;
    lastCoachedAssistantIdRef.current = null;
    negotiationAbortControllerRef.current?.abort();
    negotiationAbortControllerRef.current = null;
    setNegotiationPlan(null);
    setNegotiationError(null);
    setIsNegotiationLoading(false);
  lastComplianceSignatureRef.current = null;
  complianceAbortControllerRef.current?.abort();
  complianceAbortControllerRef.current = null;
  setComplianceReport(null);
  setComplianceError(null);
  setIsComplianceLoading(false);

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
    lastAnalyzedAssistantIdRef.current = null;
    setRealtimeInsights(null);
    setRealtimeError(null);
    setReportDraft(null);
    setReportError(null);
    setIsReportLoading(false);
    reportAutoGeneratedRef.current = false;
    lastCoachedAssistantIdRef.current = null;
    negotiationAbortControllerRef.current?.abort();
    negotiationAbortControllerRef.current = null;
    setNegotiationPlan(null);
    setNegotiationError(null);
    setIsNegotiationLoading(false);
    lastComplianceSignatureRef.current = null;
    complianceAbortControllerRef.current?.abort();
    complianceAbortControllerRef.current = null;
    setComplianceReport(null);
    setComplianceError(null);
    setIsComplianceLoading(false);
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

      const successPercent = Math.round(
        Math.min(0.99, Math.max(0, recommendation.successProbability ?? 0.62)) * 100,
      );
      const confidencePercent = Math.round(
        Math.min(0.99, Math.max(0.4, recommendation.confidence ?? 0.72)) * 100,
      );

      summaryLines.push(
        `AI 매칭 지수: ${Math.round(recommendation.matchScore)} / 100 (성공률 ${successPercent}% · 신뢰도 ${confidencePercent}%)`,
      );

      if (recommendation.alignmentFactors?.length) {
        summaryLines.push("", "[매칭 근거]");
        recommendation.alignmentFactors.slice(0, 5).forEach((factor, index) => {
          summaryLines.push(`${index + 1}. ${factor}`);
        });
      }

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
        matchScore: recommendation.matchScore,
        successProbability: recommendation.successProbability,
        confidence: recommendation.confidence,
        alignmentFactors: recommendation.alignmentFactors,
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
    if (!intakeSummary && !realtimeInsights) {
      setRecommendations([]);
      setRecommendationsError(null);
      setIsRecommendationsLoading(false);
      return;
    }

    const keywords = intakeSummary ? deriveKeywords(intakeSummary) : [];
    if (keywords.length === 0 && !realtimeInsights) {
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
              scenarioTitle: intakeSummary?.caseTitle || null,
              intakeSummary,
              insights: realtimeInsights,
            }),
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`Recommendation request failed: ${res.status}`);
        }

        const data = await res.json();
        const listRaw = Array.isArray(data?.recommendations)
          ? (data.recommendations as InvestigatorRecommendation[])
          : [];
        const list = listRaw.map((item) => ({
          ...item,
          alignmentFactors: Array.isArray(item.alignmentFactors) ? item.alignmentFactors : [],
        }));
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
  }, [intakeSummary, realtimeInsights]);

  const quickPrompts = useMemo(() => {
    if (realtimeInsights?.followUpQuestions?.length) {
      return realtimeInsights.followUpQuestions.slice(0, 4);
    }
    if (intakeSummary?.nextQuestions?.length) {
      return intakeSummary.nextQuestions.slice(0, 4);
    }
    return DEFAULT_QUICK_PROMPTS;
  }, [intakeSummary?.nextQuestions, realtimeInsights?.followUpQuestions]);

  const evidenceArtifacts = useMemo<EvidenceArtifactInput[]>(() => {
    if (!intakeSummary) return [];
    const summary = intakeSummary;

    const docArtifacts: EvidenceArtifactInput[] = (summary.recommendedDocuments ?? []).map((title, index) => {
      const keywords = [title, summary.caseType, summary.primaryIntent]
        .map((token) => (token ? token.trim() : ""))
        .filter((token): token is string => token.length > 0);

      return {
        id: `doc-${index}`,
        title,
        type: "document",
        description: summary.keyFacts?.[index] ?? summary.objective ?? undefined,
        keywords,
      } satisfies EvidenceArtifactInput;
    });

    const factArtifacts: EvidenceArtifactInput[] = (summary.keyFacts ?? []).map((fact, index) => {
      const keywords = [summary.caseTitle, summary.caseType]
        .map((token) => (token ? token.trim() : ""))
        .filter((token): token is string => token.length > 0);

      return {
        id: `fact-${index}`,
        title: fact.length > 48 ? `${fact.slice(0, 48)}…` : fact,
        type: "other",
        description: fact,
        keywords,
      } satisfies EvidenceArtifactInput;
    });

    const combined = [...docArtifacts, ...factArtifacts];
    const unique = new Map<string, EvidenceArtifactInput>();
    combined.forEach((artifact) => {
      const key = `${artifact.type}-${artifact.title}`;
      if (!unique.has(key)) {
        unique.set(key, artifact);
      }
    });
    return Array.from(unique.values());
  }, [intakeSummary]);

  const investigatorInsightsSlot = canViewInvestigatorIntel ? (
    <>
      <InvestigatorRecommendationsCard
        recommendations={recommendations}
        isLoading={isRecommendationsLoading}
        scenarioTitle={intakeSummary?.caseTitle}
        matchButtonLabel={matchButtonLabel}
        isMatchDisabled={isMatchDisabled}
        onMatchNow={handleMatchNow}
      />
      {recommendationsError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
          <FiAlertCircle className="mt-0.5 h-4 w-4" />
          <span>{recommendationsError}</span>
        </div>
      ) : null}
    </>
  ) : null;

  const customerRecommendationsSlot = !canViewInvestigatorIntel ? (
    <InvestigatorRecommendationsCard
      recommendations={recommendations}
      isLoading={isRecommendationsLoading}
      scenarioTitle={intakeSummary?.caseTitle}
      matchButtonLabel={matchButtonLabel}
      isMatchDisabled={isMatchDisabled}
      onMatchNow={handleMatchNow}
    />
  ) : null;

  const analyzeEvidence = useCallback(
    async (artifacts: EvidenceArtifactInput[], options?: { signal?: AbortSignal }) => {
      if (!artifacts.length) {
        setEvidenceSummaries([]);
        setEvidenceError(null);
        setIsEvidenceLoading(false);
        return;
      }

      setIsEvidenceLoading(true);
      setEvidenceError(null);

      try {
        const response = await fetch("/api/ai/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artifacts }),
          signal: options?.signal,
        });

        if (!response.ok) {
          throw new Error(`증거 요약 호출 실패 (${response.status})`);
        }

        const data = await response.json();
        const summaries = Array.isArray(data?.summaries)
          ? (data.summaries as AiEvidenceSummary[])
          : [];
        setEvidenceSummaries(summaries);
        reportAutoGeneratedRef.current = false;
      } catch (error) {
        if (options?.signal?.aborted) return;
        console.error("[SIMULATION_EVIDENCE_SUMMARY_ERROR]", error);
        setEvidenceError("증거 요약을 생성하지 못했습니다. 잠시 후 다시 시도하세요.");
        setEvidenceSummaries([]);
      } finally {
        if (!options?.signal?.aborted) {
          setIsEvidenceLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!evidenceArtifacts.length) {
      setEvidenceSummaries([]);
      setEvidenceError(null);
      setIsEvidenceLoading(false);
      return;
    }

    const controller = new AbortController();
    void analyzeEvidence(evidenceArtifacts, { signal: controller.signal });
    return () => controller.abort();
  }, [analyzeEvidence, evidenceArtifacts]);

  const handleRefreshEvidence = useCallback(() => {
    void analyzeEvidence(evidenceArtifacts);
  }, [analyzeEvidence, evidenceArtifacts]);

  const handleGenerateReport = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!realtimeInsights) {
        if (!options?.silent) {
          setReportError("실시간 브리핑 결과가 있어야 보고서를 생성할 수 있습니다.");
        }
        return;
      }

      if (!options?.silent) {
        reportAutoGeneratedRef.current = true;
      }

      setIsReportLoading(true);
      if (!options?.silent) {
        setReportError(null);
      }

      try {
        const response = await fetch("/api/ai/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intakeSummary,
            conversationSummary,
            insights: realtimeInsights,
            evidenceSummaries,
            transcript: transcriptForHandoff,
          }),
        });

        if (!response.ok) {
          throw new Error(`보고서 생성을 실패했습니다. (${response.status})`);
        }

        const payload = await response.json();
        const draft = payload?.report as AiInvestigationReportDraft | undefined;
        if (draft) {
          setReportDraft(draft);
          setReportError(null);
          if (!options?.silent) {
            reportAutoGeneratedRef.current = true;
          }
        } else if (!options?.silent) {
          setReportError("리포트 데이터를 가져오지 못했습니다.");
        }
      } catch (error) {
        console.error("[REPORT_DRAFT_ERROR]", error);
        if (!options?.silent) {
          setReportError(
            error instanceof Error
              ? error.message
              : "리포트 초안을 생성하지 못했습니다. 잠시 후 다시 시도하세요.",
          );
        }
      } finally {
        setIsReportLoading(false);
      }
    },
    [conversationSummary, evidenceSummaries, intakeSummary, realtimeInsights, transcriptForHandoff]
  );

  const generateNegotiationCoachPlan = useCallback(
    async (options?: { force?: boolean }) => {
      if (!messages.length) return;

      const lastAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
      if (!lastAssistantMessage) return;

      const hasUserMessage = messages.some((message) => message.role === "user");
      if (!hasUserMessage) {
        setNegotiationPlan(null);
        setNegotiationError(null);
        return;
      }

      if (!options?.force && lastCoachedAssistantIdRef.current === lastAssistantMessage.id) {
        return;
      }

      lastCoachedAssistantIdRef.current = lastAssistantMessage.id;

      negotiationAbortControllerRef.current?.abort();
      const controller = new AbortController();
      negotiationAbortControllerRef.current = controller;

      setIsNegotiationLoading(true);
      setNegotiationError(null);

      try {
        const response = await fetch("/api/ai/negotiation-coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: mapMessagesToApi(messages),
            intakeSummary,
            insights: realtimeInsights,
            conversationSummary,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`협상 코치 생성 실패 (${response.status})`);
        }

        const payload = await response.json();
        const plan = payload?.plan as AiNegotiationCoachPlan | undefined;
        if (plan) {
          setNegotiationPlan(plan);
          setNegotiationError(null);
        } else {
          setNegotiationPlan(null);
          setNegotiationError("협상 코치 데이터를 가져오지 못했습니다.");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[NEGOTIATION_COACH_ERROR]", error);
        setNegotiationError(
          error instanceof Error
            ? error.message
            : "협상 코치를 생성하는 중 오류가 발생했습니다.",
        );
        setNegotiationPlan(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsNegotiationLoading(false);
        }
        if (negotiationAbortControllerRef.current === controller) {
          negotiationAbortControllerRef.current = null;
        }
      }
    },
    [conversationSummary, intakeSummary, messages, realtimeInsights]
  );

  const handleRegenerateNegotiationPlan = useCallback(() => {
    lastCoachedAssistantIdRef.current = null;
    void generateNegotiationCoachPlan({ force: true });
  }, [generateNegotiationCoachPlan]);

  const runComplianceAnalysis = useCallback(
    async (options?: { force?: boolean }) => {
      if (!compliancePayloadSignature) {
        if (!options?.force) {
          complianceAbortControllerRef.current?.abort();
          complianceAbortControllerRef.current = null;
          lastComplianceSignatureRef.current = null;
          setComplianceReport(null);
          setComplianceError(null);
          setIsComplianceLoading(false);
        }
        return;
      }

      if (!options?.force && lastComplianceSignatureRef.current === compliancePayloadSignature) {
        return;
      }

      lastComplianceSignatureRef.current = compliancePayloadSignature;

      complianceAbortControllerRef.current?.abort();
      const controller = new AbortController();
      complianceAbortControllerRef.current = controller;

      setIsComplianceLoading(true);
      setComplianceError(null);

      try {
        const response = await fetch("/api/ai/compliance-guardian", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationSummary,
            realtimeSummary: realtimeInsights?.summary ?? null,
            reportMarkdown: reportDraft?.markdown ?? null,
            negotiationPlanMarkdown,
            insights: realtimeInsights,
            negotiationPlan,
            additionalNotes: complianceAdditionalNotes,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`규제 감시 호출 실패 (${response.status})`);
        }

        const payload = await response.json();
        const report = payload?.report as AiComplianceReport | undefined;
        if (report) {
          setComplianceReport(report);
          setComplianceError(null);
        } else {
          setComplianceReport(null);
          setComplianceError("규제 감시 데이터를 가져오지 못했습니다.");
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[COMPLIANCE_GUARD_ERROR]", error);
        setComplianceError(
          error instanceof Error ? error.message : "규제 감시 도중 오류가 발생했습니다.",
        );
        setComplianceReport(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsComplianceLoading(false);
        }
        if (complianceAbortControllerRef.current === controller) {
          complianceAbortControllerRef.current = null;
        }
      }
    },
    [
      complianceAdditionalNotes,
      compliancePayloadSignature,
      conversationSummary,
      negotiationPlan,
      negotiationPlanMarkdown,
      realtimeInsights,
      reportDraft,
    ]
  );

  const handleRefreshCompliance = useCallback(() => {
    lastComplianceSignatureRef.current = null;
    void runComplianceAnalysis({ force: true });
  }, [runComplianceAnalysis]);

  const handleRetryRealtimeAnalysis = useCallback(() => {
    lastAnalyzedAssistantIdRef.current = null;
    void runRealtimeAnalysis({ force: true });
  }, [runRealtimeAnalysis]);

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



  useEffect(() => {
    return () => {
      realtimeAbortControllerRef.current?.abort();
      negotiationAbortControllerRef.current?.abort();
      complianceAbortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    void runRealtimeAnalysis();
  }, [runRealtimeAnalysis]);

  useEffect(() => {
    void generateNegotiationCoachPlan();
  }, [generateNegotiationCoachPlan]);

  useEffect(() => {
    void runComplianceAnalysis();
  }, [runComplianceAnalysis]);

  useEffect(() => {
    if (!realtimeInsights) return;
    if (isRealtimeLoading || isEvidenceLoading) return;
    if (isReportLoading) return;

    if (!reportAutoGeneratedRef.current) {
      reportAutoGeneratedRef.current = true;
      void handleGenerateReport({ silent: true });
    }
  }, [handleGenerateReport, isEvidenceLoading, isRealtimeLoading, isReportLoading, realtimeInsights]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
  <div className="mx-auto flex min-h-screen min-h-[100svh] max-w-[1640px] flex-col gap-6 px-4 py-6 sm:px-6 md:py-8 lg:px-10 xl:px-12">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white shadow-xl backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                <FiStar className="h-3.5 w-3.5" /> 사건 초기 상담 도우미
              </div>
              <div>
                <h1 className="max-w-3xl text-2xl font-bold leading-tight text-balance sm:text-3xl md:text-4xl">
                  실시간 조사 초기 상담 & 전략 보드
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
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => router.push("/simulation/twin")}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-100 transition hover:border-indigo-100 hover:bg-indigo-200/10"
                >
                  <FiPlay className="h-3.5 w-3.5" /> 사건 시뮬레이션 해보기
                </button>
                <span className="text-[11px] text-indigo-200/70">
                  디지털 트윈으로 현장 변수 기반 성공률을 예측합니다.
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
                        {message.attachments?.map((att, idx) => (
                          <div key={idx} className="mt-2 flex items-center gap-2 rounded-lg bg-white/20 p-2 text-xs">
                            <FiFile className="h-4 w-4" />
                            <span>{att.name}</span>
                            {(att.type.startsWith("image/") || att.type === "application/pdf") && (
                              <button
                                onClick={() => handleOCRClick(message.id, att.name)}
                                className="ml-auto flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[10px] text-white hover:bg-indigo-500"
                              >
                                <FiEye className="h-3 w-3" />
                                OCR 분석
                              </button>
                            )}
                          </div>
                        ))}
                        {!message.attachments && message.content.includes("[첨부파일:") && (
                           <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/20 p-2 text-xs">
                             <FiFile className="h-4 w-4" />
                             <span>{message.content.match(/\[첨부파일: (.*?)\]/)?.[1] ?? "파일"}</span>
                             <button
                                onClick={() => handleOCRClick(message.id, message.content.match(/\[첨부파일: (.*?)\]/)?.[1] ?? "파일")}
                                className="ml-auto flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-[10px] text-white hover:bg-indigo-500"
                              >
                                <FiEye className="h-3 w-3" />
                                OCR 분석
                              </button>
                           </div>
                        )}
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
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="파일 첨부"
                >
                  <FiPaperclip className="h-5 w-5" />
                </button>
                {selectedFile && (
                  <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">
                    <span className="max-w-[100px] truncate">{selectedFile.name}</span>
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
                    실시간 AI 브리핑
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <AIInsightsPanel
                      insights={realtimeInsights}
                      isLoading={isRealtimeLoading}
                      error={realtimeError}
                      onRetry={handleRetryRealtimeAnalysis}
                      showInvestigatorInsights={canViewInvestigatorIntel}
                      investigatorSlot={investigatorInsightsSlot}
                      customerRecommendationsSlot={customerRecommendationsSlot}
                    />
                  </div>
                </details>
                <details className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                    규제·윤리 감시
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <ComplianceMonitorPanel
                      report={complianceReport}
                      isLoading={isComplianceLoading}
                      error={complianceError}
                      onRefresh={handleRefreshCompliance}
                    />
                  </div>
                </details>
                <details className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                    협상 스크립트 코치
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <NegotiationCoachPanel
                      plan={negotiationPlan}
                      isLoading={isNegotiationLoading}
                      error={negotiationError}
                      onRegenerate={handleRegenerateNegotiationPlan}
                      showInvestigatorInsights={canViewInvestigatorIntel}
                    />
                  </div>
                </details>
                <details className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                    증거 보관함
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <EvidenceVaultPanel
                      artifacts={evidenceArtifacts}
                      summaries={evidenceSummaries}
                      isLoading={isEvidenceLoading}
                      error={evidenceError}
                      onRefresh={handleRefreshEvidence}
                    />
                  </div>
                </details>
                <details className="group rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                    조사 리포트 초안
                    <FiChevronDown className="h-4 w-4 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <div className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-t border-slate-100 px-4 py-4 text-[13px]">
                    <ReportDraftPanel
                      report={reportDraft}
                      isLoading={isReportLoading}
                      error={reportError}
                      onGenerate={() => {
                        void handleGenerateReport();
                      }}
                      showInvestigatorInsights={canViewInvestigatorIntel}
                    />
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
                <h2 className="text-lg font-semibold text-slate-900">실시간 AI 브리핑</h2>
                <p className="mt-1 text-xs text-slate-500">
                  대화 맥락을 분석해 위험도, 타임라인, 우선 조치를 제공합니다.
                </p>
              </div>
              <div className="custom-scrollbar flex-1 min-h-0 space-y-5 overflow-y-auto p-5">
                <AIInsightsPanel
                  insights={realtimeInsights}
                  isLoading={isRealtimeLoading}
                  error={realtimeError}
                  onRetry={handleRetryRealtimeAnalysis}
                  showInvestigatorInsights={canViewInvestigatorIntel}
                  investigatorSlot={investigatorInsightsSlot}
                  customerRecommendationsSlot={customerRecommendationsSlot}
                />
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">규제·윤리 감시</h3>
                  <ComplianceMonitorPanel
                    report={complianceReport}
                    isLoading={isComplianceLoading}
                    error={complianceError}
                    onRefresh={handleRefreshCompliance}
                  />
                </div>
                <EvidenceVaultPanel
                  artifacts={evidenceArtifacts}
                  summaries={evidenceSummaries}
                  isLoading={isEvidenceLoading}
                  error={evidenceError}
                  onRefresh={handleRefreshEvidence}
                />
                <ReportDraftPanel
                  report={reportDraft}
                  isLoading={isReportLoading}
                  error={reportError}
                  onGenerate={() => {
                    void handleGenerateReport();
                  }}
                  showInvestigatorInsights={canViewInvestigatorIntel}
                />
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">협상 스크립트 코치</h3>
                  <NegotiationCoachPanel
                    plan={negotiationPlan}
                    isLoading={isNegotiationLoading}
                    error={negotiationError}
                    onRegenerate={handleRegenerateNegotiationPlan}
                    showInvestigatorInsights={canViewInvestigatorIntel}
                  />
                </div>
              </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ChatSimulation;

