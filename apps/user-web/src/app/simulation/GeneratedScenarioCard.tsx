"use client";

import { motion } from "framer-motion";
import {
	FiAlertTriangle,
	FiArrowRight,
	FiCheckCircle,
	FiClipboard,
	FiClock,
	FiFileText,
	FiLoader,
	FiTarget,
	FiTrendingUp,
} from "react-icons/fi";

const ensureArray = (value: unknown): string[] => {
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

export interface ScenarioTask {
	taskKey?: string;
	desc?: string;
	competency?: string;
}

export interface ScenarioRisk {
	riskKey?: string;
	name?: string;
	severity?: string;
	trigger?: string;
	mitigation?: string;
}

export interface ScenarioPhase {
	name?: string;
	description?: string;
	durationDays?: number;
	budget?: string;
	deliverables?: string[];
	tasks?: ScenarioTask[];
	phaseKPI?: string[];
	risks?: ScenarioRisk[];
}

export interface GeneratedScenario {
	title?: string;
	description?: string;
	phases?: ScenarioPhase[];
}

interface GeneratedScenarioCardProps {
	scenario: GeneratedScenario | null;
	keywords: string[];
	recommendedQuestions: string[];
	isLoading: boolean;
	error?: string | null;
	onQuestionClick?: (question: string) => void;
}

const EmptyState = () => (
	<div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500">
		아직 생성된 시나리오가 없습니다. 대화를 이어가며 사건의 단계와 실행 계획을 만들어 보세요.
	</div>
);

const ScenarioHeader = ({
	title,
	description,
	keywords,
}: {
	title: string;
	description: string;
	keywords: string[];
}) => (
	<div className="space-y-4">
		<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
			<FiTarget className="h-4 w-4" />
			전략 시나리오
		</div>
		<div>
			<h3 className="text-xl font-bold text-slate-900">{title}</h3>
			{description ? (
				<p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
			) : null}
		</div>
		{keywords.length > 0 ? (
			<div className="flex flex-wrap gap-2">
				{keywords.map((keyword) => (
					<span
						key={keyword}
						className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
					>
						#{keyword}
					</span>
				))}
			</div>
		) : null}
	</div>
);

const PhaseSection = ({ phase, index }: { phase: ScenarioPhase; index: number }) => {
	const deliverables = ensureArray(phase.deliverables);
	const kpis = ensureArray(phase.phaseKPI);
	const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];
	const risks = Array.isArray(phase.risks) ? phase.risks : [];

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25, delay: index * 0.04 }}
			className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
		>
			<div className="flex items-center justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">
						Phase {index + 1}
					</p>
					<h4 className="mt-1 text-lg font-semibold text-slate-900">{phase.name ?? "단계 이름 미정"}</h4>
				</div>
				<div className="flex items-center gap-3 text-xs text-slate-500">
					{phase.durationDays ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
							<FiClock className="h-3.5 w-3.5" /> {phase.durationDays}일
						</span>
					) : null}
					{phase.budget ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
							<FiTrendingUp className="h-3.5 w-3.5" /> {phase.budget}
						</span>
					) : null}
				</div>
			</div>

			{phase.description ? (
				<p className="mt-2 text-sm text-slate-600">{phase.description}</p>
			) : null}

			{tasks.length > 0 ? (
				<div className="mt-4 space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
						<FiClipboard className="h-4 w-4" /> 주요 업무
					</div>
					<ul className="space-y-2">
						{tasks.map((task) => (
							<li
								key={task.taskKey ?? task.desc ?? Math.random()}
								className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
							>
								<span className="font-medium text-slate-800">{task.desc ?? "업무 내용 미정"}</span>
								{task.competency ? (
									<span className="ml-2 text-xs text-slate-500">(필요 역량: {task.competency})</span>
								) : null}
							</li>
						))}
					</ul>
				</div>
			) : null}

			{deliverables.length > 0 ? (
				<div className="mt-4 space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
						<FiFileText className="h-4 w-4" /> 주요 산출물
					</div>
					<ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
						{deliverables.map((item, idx) => (
							<li key={`${item}-${idx}`}>{item}</li>
						))}
					</ul>
				</div>
			) : null}

			{kpis.length > 0 ? (
				<div className="mt-4 space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
						<FiCheckCircle className="h-4 w-4" /> KPI
					</div>
					<ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
						{kpis.map((item, idx) => (
							<li key={`${item}-${idx}`}>{item}</li>
						))}
					</ul>
				</div>
			) : null}

			{risks.length > 0 ? (
				<div className="mt-4 space-y-2">
					<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
						<FiAlertTriangle className="h-4 w-4" /> 리스크 & 대응
					</div>
					<ul className="space-y-2">
						{risks.map((risk) => (
							<li
								key={risk.riskKey ?? risk.name ?? Math.random()}
								className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700"
							>
								<div className="font-semibold text-rose-800">
									{risk.name ?? "리스크 미정"}
									{risk.severity ? <span className="ml-2 text-xs">(심각도: {risk.severity})</span> : null}
								</div>
								{risk.trigger ? (
									<p className="text-xs text-rose-600">트리거: {risk.trigger}</p>
								) : null}
								{risk.mitigation ? (
									<p className="text-xs text-rose-600">대응: {risk.mitigation}</p>
								) : null}
							</li>
						))}
					</ul>
				</div>
			) : null}
		</motion.div>
	);
};

const RecommendedQuestionList = ({
	questions,
	onQuestionClick,
}: {
	questions: string[];
	onQuestionClick?: (question: string) => void;
}) => {
	if (questions.length === 0) {
		return (
			<div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
				후속 질문이 준비되면 여기에 표시됩니다.
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{questions.map((question, index) => (
				<button
					key={`${question}-${index}`}
					type="button"
					onClick={() => onQuestionClick?.(question)}
					className="flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-white px-4 py-3 text-left text-sm text-indigo-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
				>
					<span>{question}</span>
					<FiArrowRight className="h-4 w-4 text-indigo-400" />
				</button>
			))}
		</div>
	);
};

export const GeneratedScenarioCard = ({
	scenario,
	keywords,
	recommendedQuestions,
	isLoading,
	error,
	onQuestionClick,
}: GeneratedScenarioCardProps) => {
	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/95 p-8 text-sm text-slate-500 shadow-sm">
				<FiLoader className="mb-3 h-6 w-6 animate-spin text-indigo-500" />
				AI가 시나리오를 정리하고 있습니다...
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-600">
				{error}
			</div>
		);
	}

	if (!scenario || !scenario.title) {
		return <EmptyState />;
	}

	const phases = Array.isArray(scenario.phases) ? scenario.phases : [];
	const sanitizedKeywords = ensureArray(keywords);
	const sanitizedQuestions = ensureArray(recommendedQuestions);

	return (
		<div className="space-y-5">
			<div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
				<ScenarioHeader
					title={scenario.title}
					description={scenario.description ?? ""}
					keywords={sanitizedKeywords}
				/>

				<div className="mt-6 space-y-4">
					{phases.length > 0 ? (
						phases.map((phase, index) => (
							<PhaseSection key={`${phase.name ?? "phase"}-${index}`} phase={phase} index={index} />
						))
					) : (
						<div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
							아직 구체적인 단계가 없습니다. 추가 정보를 입력하면 실행 단계가 정리됩니다.
						</div>
					)}
				</div>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm">
				<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
					<FiClipboard className="h-4 w-4" /> 다음 질문 제안
				</div>
				<p className="mt-2 text-xs text-slate-500">
					시나리오를 더 명확하게 하기 위해 AI가 추천하는 후속 질문입니다.
				</p>
				<div className="mt-4">
					<RecommendedQuestionList questions={sanitizedQuestions} onQuestionClick={onQuestionClick} />
				</div>
			</div>
		</div>
	);
};

export default GeneratedScenarioCard;

