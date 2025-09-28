"use client";

import { useState, useEffect, useRef } from 'react';
import { useUserStore } from '@/lib/userStore';
import { useRouter } from 'next/navigation';
import { FiSend, FiChevronDown, FiChevronUp, FiBriefcase, FiCheckCircle, FiShield, FiFileText, FiCalendar, FiDollarSign, FiTarget, FiMessageSquare } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import cuid from 'cuid';
import { NextActionPanel } from './NextActionPanel';
import { InvestigatorRecommendation, InvestigatorRecommendationsCard } from './InvestigatorRecommendationsCard';

// --- Interfaces ---
interface Task {
  taskKey: string;
  desc: string;
  competency: string;
}

interface Risk {
  riskKey: string;
  name: string;
  severity: string;
  trigger: string;
  mitigation: string;
}

interface Phase {
  name: string;
  description: string;
  durationDays?: number;
  budget?: string;
  deliverables?: string[];
  tasks?: Task[];
  phaseKPI?: string[];
  risks?: Risk[];
}

interface GeneratedScenario {
  title?: string;
  description?: string;
  phases?: Phase[];
}

interface AnalysisResult {
  keywords: string[];
  generatedScenario: GeneratedScenario;
  recommendedQuestions: string[];
  similarScenarios?: Array<{ id: string; title: string; summary: string; }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  analysis?: AnalysisResult | null;
}

// --- Helper Components for New UI ---

const InfoPlaceholder = ({ message }: { message: string }) => (
  <div className="text-center py-3 px-2 flex flex-col items-center justify-center h-full">
    <FiMessageSquare className="mx-auto h-7 w-7 text-slate-400" />
    <p className="mt-2 text-xs text-slate-500">{message}</p>
  </div>
);

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: string | string[] | undefined | null }) => {
  const renderValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return <p className="text-xs text-slate-400 italic mt-1">AI와 대화하여 정보 추가</p>;
    }
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside mt-1 text-slate-600">
          {value.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      );
    }
    return <p className="mt-1 text-slate-600">{value}</p>;
  };

  return (
    <div className="flex items-start text-sm">
      <Icon className="w-4 h-4 mr-3 mt-1 flex-shrink-0 text-slate-400" />
      <div className="flex-grow">
        <p className="font-semibold text-slate-700">{label}</p>
        <div className="prose prose-sm max-w-none">{renderValue()}</div>
      </div>
    </div>
  );
};

const AccordionItem = ({ icon: Icon, title, children, hasContent }: { icon: React.ElementType, title: string, children: React.ReactNode, hasContent: boolean }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-3 px-1 text-left font-semibold text-slate-700 hover:bg-slate-50"
      >
        <div className="flex items-center">
          <Icon className="w-5 h-5 mr-3 text-slate-500" />
          <span>{title}</span>
        </div>
        {isOpen ? <FiChevronUp className="w-5 h-5 text-slate-500" /> : <FiChevronDown className="w-5 h-5 text-slate-500" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-slate-50/80 rounded-b-md">
              {hasContent ? children : <InfoPlaceholder message="AI와 대화하여 관련 정보를 구체화하세요." />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PhaseCard = ({ phase, index }: { phase: Phase; index: number }) => {
  return (
    <div className="mb-6 bg-white border border-slate-200 rounded-xl shadow-sm">
       <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-lg text-blue-600">단계 {index + 1}: {phase.name}</h3>
        <p className="text-sm text-slate-500 mt-1">{phase.description}</p>
      </div>
      <div className="p-4 flex flex-row flex-wrap gap-x-6 gap-y-4 items-center">
        <DetailItem icon={FiCalendar} label="예상 기간" value={phase.durationDays ? `${phase.durationDays}일` : null} />
        <DetailItem icon={FiDollarSign} label="예산" value={phase.budget} />
        <DetailItem icon={FiFileText} label="핵심 산출물" value={phase.deliverables} />
      </div>
       <div className="px-2">
        <AccordionItem icon={FiBriefcase} title="주요 업무" hasContent={!!phase.tasks && phase.tasks.length > 0}>
          <ul className="space-y-3">
            {phase.tasks?.map(task => (
              <li key={task.taskKey} className="p-3 bg-white rounded-md border border-slate-200">
                <p className="font-semibold text-sm">{task.desc}</p>
                <p className="text-xs text-slate-500 mt-1">필요 역량: {task.competency}</p>
              </li>
            ))}
          </ul>
        </AccordionItem>
        <AccordionItem icon={FiCheckCircle} title="핵심 성과지표 (KPI)" hasContent={!!phase.phaseKPI && phase.phaseKPI.length > 0}>
           <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 pl-4">
             {phase.phaseKPI?.map((kpi, i) => <li key={i}>{kpi}</li>)}
           </ul>
        </AccordionItem>
        <AccordionItem icon={FiShield} title="주요 리스크 및 대응 방안" hasContent={!!phase.risks && phase.risks.length > 0}>
          <ul className="space-y-3">
            {phase.risks?.map(risk => (
              <li key={risk.riskKey} className="p-3 bg-white rounded-md border border-slate-200">
                <p className="font-semibold text-sm">{risk.name} (심각도: {risk.severity})</p>
                <p className="text-xs text-slate-500 mt-1">트리거: {risk.trigger}</p>
                <p className="text-xs text-slate-500 mt-1">대응 방안: {risk.mitigation}</p>
              </li>
            ))}
          </ul>
        </AccordionItem>
      </div>
    </div>
  );
};

const GeneratedScenarioCard = ({ scenario, isLoading }: { scenario: GeneratedScenario | null, isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-slate-500">AI가 시나리오를 분석하고 있습니다...</p>
      </div>
    );
  }

  if (!scenario || !scenario.title) {
    return (
      <div className="text-center p-8 bg-slate-100 rounded-lg h-full flex flex-col justify-center items-center">
        <FiTarget className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-medium text-slate-900">분석 대기 중</h3>
        <p className="mt-1 text-sm text-slate-500">AI와 대화를 시작하여 비즈니스 시나리오를 생성해보세요.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-md">
        <h2 className="text-2xl font-bold text-slate-800">{scenario.title}</h2>
        <p className="mt-2 text-slate-600">{scenario.description}</p>
      </div>
      <div className="mt-6">
        {scenario.phases?.map((phase, index) => (
          <PhaseCard key={index} phase={phase} index={index} />
        ))}
      </div>
    </motion.div>
  );
};

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}
    >
      {!isUser && <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />}
      <div className={`max-w-[75%] p-3 rounded-lg ${isUser ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200'}`}>
        <p className="text-sm">{message.content}</p>
      </div>
    </motion.div>
  );
};

const ChatPanel = ({ messages, onSendMessage, isLoading }: { messages: Message[], onSendMessage: (msg: string) => void, isLoading: boolean }) => {
  const [inputValue, setInputValue] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
        <h2 className="font-bold text-lg text-slate-800">엘AI와의 대화</h2>
      </div>
      <div ref={chatContainerRef} className="flex-grow p-4 overflow-y-auto">
        {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        {isLoading && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0" />
            <div className="ml-3 p-3 rounded-lg bg-white border border-slate-200">
              <div className="flex items-center">
                <span className="text-sm mr-2">분석 중...</span>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="w-full pr-12 pl-4 py-2 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-slate-300 transition-colors"
          >
            <FiSend />
          </button>
        </div>
      </form>
    </div>
  );
};


const SimulationPage = () => {
  const { user, logout } = useUserStore();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [recommendations, setRecommendations] = useState<InvestigatorRecommendation[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!analysisResult?.generatedScenario?.title) {
      setRecommendations([]);
      setRecommendationError(null);
      setIsRecommendationsLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchRecommendations = async () => {
      setIsRecommendationsLoading(true);
      setRecommendationError(null);

      try {
        const res = await fetch('/api/simulation/investigator-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keywords: analysisResult?.keywords ?? [],
            scenarioTitle: analysisResult?.generatedScenario?.title ?? null,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errorPayload = await res.json().catch(() => null);
          throw new Error(errorPayload?.message || '추천을 불러오지 못했습니다.');
        }

        const data = await res.json();
        if (isMounted) {
          setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('[RECOMMENDATION_FETCH_ERROR]', error);
        if (isMounted) {
          setRecommendationError('탐정 추천을 가져오는 중 문제가 발생했습니다.');
          setRecommendations([]);
        }
      } finally {
        if (isMounted) {
          setIsRecommendationsLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [analysisResult?.generatedScenario?.title, analysisResult?.keywords]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleMatchNow = (recommendation: InvestigatorRecommendation) => {
    const scenario = analysisResult?.generatedScenario;
    const recommendedQuestions = analysisResult?.recommendedQuestions ?? [];
    const targetUrl = `/investigation-requests/new?investigatorId=${recommendation.investigatorId}`;

    if (typeof window !== 'undefined') {
      const detailLines: string[] = [];

      if (scenario?.description) {
        detailLines.push(`시나리오 개요: ${scenario.description}`);
      }

      if (scenario?.phases?.length) {
        detailLines.push('', '주요 단계 요약:');
        scenario.phases.forEach((phase, index) => {
          const headline = `- 단계 ${index + 1}: ${phase.name}`;
          if (phase.description) {
            detailLines.push(`${headline} — ${phase.description}`);
          } else {
            detailLines.push(headline);
          }
        });
      }

      const desiredOutcomeLines = recommendedQuestions.slice(0, 5).map((question) => `- ${question}`);

      const payload = {
        investigatorId: recommendation.investigatorId,
        createdAt: Date.now(),
        title: scenario?.title ?? '',
        details: detailLines.join('\n'),
        desiredOutcome: desiredOutcomeLines.join('\n'),
      };

      try {
        sessionStorage.setItem('investigationRequestPrefill', JSON.stringify(payload));
      } catch (error) {
        console.warn('[MATCH_PREFILL_ERROR]', error);
      }
    }

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }

    router.push(targetUrl);
  };

  const handleSendMessage = async (content: string) => {
    const newUserMessage: Message = { role: 'user', content, id: cuid() };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'analysis',
          messages: [...messages, newUserMessage].map(m => ({ role: m.role, content: m.content })),
          currentScenario: analysisResult?.generatedScenario ?? null,
        }),
      });

      if (!res.ok) throw new Error('API call failed');

      const data: AnalysisResult = await res.json();
      
      const newAssistantMessage: Message = {
        role: 'assistant',
        content: `분석이 완료되었습니다. "${data.generatedScenario.title}" 시나리오의 각 단계별 상세 내용을 확인하고, 다음 추천 질문을 통해 시나리오를 더 구체화해보세요.`,
        id: cuid(),
        analysis: data,
      };
      
      setMessages(prev => [...prev, newAssistantMessage]);
      setAnalysisResult(data);

    } catch (error) {
      console.error("Error fetching analysis:", error);
      const errorAssistantMessage: Message = {
        role: 'assistant',
        content: '죄송합니다. 분석 중 오류가 발생했습니다. 다시 시도해주세요.',
        id: cuid(),
      };
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800">AI 시뮬레이션</h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600">사용자: {user?.email}</span>
          <button 
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm font-semibold text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-px bg-slate-200 overflow-hidden">
        
        {/* Left Panel: Chat */}
        <div className="flex flex-col bg-white h-full">
          <ChatPanel 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading}
          />
        </div>

        {/* Middle Panel: Real-time Analysis */}
        <div className="flex flex-col bg-slate-100 h-full overflow-y-auto">
           <div className="p-4 sticky top-0 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200 z-10">
            <h2 className="font-bold text-lg text-slate-800">실시간 분석</h2>
          </div>
          <div className="flex-grow p-4">
            <GeneratedScenarioCard scenario={analysisResult?.generatedScenario ?? null} isLoading={isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user'} />
          </div>
        </div>

        {/* Right Panel: Next Step Suggestions */}
        <div className="flex flex-col bg-white h-full overflow-y-auto">
          <div className="p-4 sticky top-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-10">
            <h2 className="font-bold text-lg text-slate-800">다음 단계 제안</h2>
          </div>
          <div className="flex-grow p-4 space-y-6">
            <div className="space-y-2">
              <InvestigatorRecommendationsCard
                recommendations={recommendations}
                isLoading={isRecommendationsLoading}
                scenarioTitle={analysisResult?.generatedScenario?.title}
                onMatchNow={handleMatchNow}
                matchButtonLabel={!user ? '로그인 후 매칭' : user.role === 'investigator' ? '고객 계정에서 이용' : '바로 매칭하기'}
                isMatchDisabled={user?.role === 'investigator'}
              />
              {recommendationError ? (
                <p className="text-xs text-red-500">{recommendationError}</p>
              ) : null}
            </div>
            <NextActionPanel
              recommendedQuestions={analysisResult?.recommendedQuestions ?? []}
              similarScenarios={analysisResult?.similarScenarios ?? []}
              onQuestionClick={handleQuestionClick}
              isLoading={isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;
