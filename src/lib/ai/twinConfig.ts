export type TwinScenarioCategory = "affair" | "corporate" | "missing" | "insurance";
export type TwinFieldAgentGender = "male" | "female" | "mixed";
export type TwinShiftType = "day" | "night" | "rotating";
export type TwinTargetOccupation = "office" | "freelancer" | "service" | "unknown";
export type TwinCommutePattern = "regular" | "flex" | "remote";
export type TwinWeather = "clear" | "rain" | "snow" | "windy";
export type TwinLocationDensity = "downtown" | "residential" | "rural";
export type TwinEscortSupport = "solo" | "dual" | "team";
export type TwinBudgetLevel = "tight" | "standard" | "premium";

export const SCENARIO_LABELS: Record<TwinScenarioCategory, string> = {
	affair: "불륜/배우자 소송 대비",
	corporate: "기업 보안·산업스파이 의혹",
	missing: "실종/가출인 수색",
	insurance: "보험 사기/연금 부정 수급",
};

export const FIELD_AGENT_LABELS: Record<TwinFieldAgentGender, string> = {
	male: "남성 요원",
	female: "여성 요원",
	mixed: "혼성 팀",
};

export const SHIFT_LABELS: Record<TwinShiftType, string> = {
	day: "주간 작전",
	night: "야간 중심",
	rotating: "교대 근무",
};

export const OCCUPATION_LABELS: Record<TwinTargetOccupation, string> = {
	office: "사무직/직장인",
	freelancer: "프리랜서/외부직",
	service: "서비스/현장 직종",
	unknown: "확인 불가",
};

export const COMMUTE_LABELS: Record<TwinCommutePattern, string> = {
	regular: "규칙적 출퇴근",
	flex: "탄력 출퇴근",
	remote: "재택/이동 적음",
};

export const WEATHER_LABELS: Record<TwinWeather, string> = {
	clear: "맑음",
	rain: "비",
	snow: "눈",
	windy: "강풍/변덕",
};

export const DENSITY_LABELS: Record<TwinLocationDensity, string> = {
	downtown: "도심 밀집",
	residential: "주거지",
	rural: "외곽/시골",
};

export const ESCORT_LABELS: Record<TwinEscortSupport, string> = {
	solo: "단독 투입",
	dual: "2인 1조",
	team: "팀 단위",
};

export const BUDGET_LABELS: Record<TwinBudgetLevel, string> = {
	tight: "최소 비용",
	standard: "표준",
	premium: "프리미엄",
};

export type ScenarioVariableType = "select" | "boolean" | "number";
export type ScenarioVariableValue = string | number | boolean;

export interface ScenarioVariableOption {
	value: string;
	label: string;
	description?: string;
}

export interface ScenarioVariableDefinition {
	id: string;
	label: string;
	description: string;
	type: ScenarioVariableType;
	defaultValue: ScenarioVariableValue;
	options?: ScenarioVariableOption[];
	min?: number;
	max?: number;
	step?: number;
}

export type ScenarioVariableValueMap = Record<string, ScenarioVariableValue>;

export interface ScenarioHeuristicAccumulator {
	score: number;
	keyFactors: string[];
	riskAlerts: string[];
	recommendedActions: string[];
}

const booleanFromUnknown = (value: unknown, fallback: boolean): boolean => {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["true", "1", "yes", "y"].includes(normalized)) return true;
		if (["false", "0", "no", "n"].includes(normalized)) return false;
	}
	if (typeof value === "number") {
		if (value === 0) return false;
		if (Number.isFinite(value)) return value > 0;
	}
	return fallback;
};

const numberFromUnknown = (value: unknown, fallback: number, min?: number, max?: number): number => {
	const parsed = typeof value === "number" && Number.isFinite(value)
		? value
		: typeof value === "string" && value.trim().length
			? Number.parseFloat(value)
			: Number.NaN;

	let result = Number.isFinite(parsed) ? parsed : fallback;
	if (typeof min === "number") {
		result = Math.max(min, result);
	}
	if (typeof max === "number") {
		result = Math.min(max, result);
	}
	return result;
};

const selectFromUnknown = (value: unknown, options: ScenarioVariableOption[], fallback: string): string => {
	if (typeof value === "string") {
		const found = options.find((option) => option.value === value);
		if (found) {
			return found.value;
		}
	}
	return fallback;
};

export const SCENARIO_VARIABLE_DEFINITIONS: Record<TwinScenarioCategory, ScenarioVariableDefinition[]> = {
	affair: [
		{
			id: "routinePredictability",
			label: "대상 일상 패턴 가시성",
			description: "일과, 이동 동선 등 반복 패턴이 얼마나 명확한지",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "low", label: "불규칙", description: "일정 변동이 커서 추적이 까다로운 상태" },
				{ value: "moderate", label: "부분 예측", description: "주요 시간대는 예상 가능하지만 예외 발생" },
				{ value: "high", label: "고정 패턴", description: "시간/장소 패턴이 일정하게 반복" },
			],
		},
		{
			id: "sharedLocations",
			label: "공용 공간 접근성",
			description: "대상과 파트너가 공유하는 공간(주거, 사무실 등)에 접근 가능한지",
			type: "boolean",
			defaultValue: false,
		},
		{
			id: "digitalTrailVisibility",
			label: "디지털 흔적 노출도",
			description: "SNS, 메신저, 위치 공유 등 디지털 발자국 정도",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "minimal", label: "거의 없음" },
				{ value: "moderate", label: "부분 공유" },
				{ value: "extensive", label: "활발한 활동" },
			],
		},
		{
			id: "thirdPartyComplexity",
			label: "연루된 제3자 규모",
			description: "추가 관여자 수와 역학 관계 복잡도",
			type: "select",
			defaultValue: "single",
			options: [
				{ value: "single", label: "단일 대상" },
				{ value: "multiple", label: "복수 대상" },
				{ value: "unknown", label: "불명" },
			],
		},
		{
			id: "legalSensitivity",
			label: "법적 민감도",
			description: "사건이 민사/형사 등 어떤 절차와 연계되는지",
			type: "select",
			defaultValue: "civil",
			options: [
				{ value: "civil", label: "민사 중심" },
				{ value: "litigation", label: "소송 진행 중" },
				{ value: "criminal", label: "형사 이슈 포함" },
			],
		},
		{
			id: "evidenceTypePriority",
			label: "우선 확보 증거 유형",
			description: "현 시점에서 가장 중요한 증거 종류",
			type: "select",
			defaultValue: "photo",
			options: [
				{ value: "photo", label: "사진·영상" },
				{ value: "video", label: "장시간 영상" },
				{ value: "financial", label: "금융 기록" },
				{ value: "digital", label: "디지털 로그" },
			],
		},
		{
			id: "weekendActivityLevel",
			label: "주말 활동 강도",
			description: "주말·야간에 대상이외동이 활발한 정도",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "low", label: "거의 없음" },
				{ value: "moderate", label: "일부 일정" },
				{ value: "high", label: "활발" },
			],
		},
		{
			id: "travelFrequency",
			label: "장거리 이동 빈도",
			description: "타 지역/출장 이동 주기",
			type: "select",
			defaultValue: "monthly",
			options: [
				{ value: "rare", label: "드묾" },
				{ value: "monthly", label: "월 1-2회" },
				{ value: "weekly", label: "주간" },
			],
		},
		{
			id: "familyAwarenessLevel",
			label: "배우자 외 가족 인지 정도",
			description: "주변 가족이 사건 정황을 알고 협조 가능한지",
			type: "select",
			defaultValue: "partial",
			options: [
				{ value: "hidden", label: "모름" },
				{ value: "partial", label: "일부 공유" },
				{ value: "open", label: "완전 공유" },
			],
		},
		{
			id: "sharedVehicleAccess",
			label: "공유 차량 여부",
			description: "대상과 공유하는 차량이 있는지",
			type: "boolean",
			defaultValue: false,
		},
		{
			id: "targetTechSavvy",
			label: "대상 IT 활용 숙련도",
			description: "디지털 보안·기술 활용 역량",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "low", label: "낮음" },
				{ value: "moderate", label: "보통" },
				{ value: "high", label: "높음" },
			],
		},
		{
			id: "financialOpsec",
			label: "금전 보안 수준",
			description: "현금 사용/비밀 계좌 등 금융 흔적 위장 수준",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "basic", label: "기초" },
				{ value: "moderate", label: "보통" },
				{ value: "strict", label: "철저" },
			],
		},
	],
	corporate: [
		{
			id: "insiderAccessLevel",
			label: "내부자 접근 권한",
			description: "조사 대상(내부자)의 시스템·시설 접근 수준",
			type: "select",
			defaultValue: "medium",
			options: [
				{ value: "low", label: "제한적" },
				{ value: "medium", label: "업무 수준" },
				{ value: "high", label: "광범위" },
			],
		},
		{
			id: "securityMaturity",
			label: "보안 체계 성숙도",
			description: "물리·정보 보안 인프라 수준",
			type: "select",
			defaultValue: "intermediate",
			options: [
				{ value: "basic", label: "기초" },
				{ value: "intermediate", label: "중간" },
				{ value: "advanced", label: "고도" },
			],
		},
		{
			id: "remoteWorkRatio",
			label: "원격 근무 비중",
			description: "조사 대상 조직 내 재택·현장 비율",
			type: "select",
			defaultValue: "balanced",
			options: [
				{ value: "low", label: "대부분 현장" },
				{ value: "balanced", label: "혼합" },
				{ value: "high", label: "대부분 원격" },
			],
		},
		{
			id: "legalHoldActive",
			label: "리걸 홀드 발효 여부",
			description: "법무팀이 증거 보존 명령(Legal Hold)을 발령했는지",
			type: "boolean",
			defaultValue: false,
		},
		{
			id: "dataSensitivity",
			label: "데이터 민감도",
			description: "취급 중인 자료의 기밀/규제 수준",
			type: "select",
			defaultValue: "confidential",
			options: [
				{ value: "standard", label: "일반" },
				{ value: "confidential", label: "기밀" },
				{ value: "regulated", label: "규제 데이터" },
			],
		},
		{
			id: "unionPresence",
			label: "노조·직원 대표성",
			description: "노조 또는 직원 대표 조직의 영향력",
			type: "select",
			defaultValue: "partial",
			options: [
				{ value: "none", label: "없음" },
				{ value: "partial", label: "부분" },
				{ value: "strong", label: "강함" },
			],
		},
		{
			id: "cyberMonitoring",
			label: "사이버 모니터링 연동",
			description: "내부 보안팀과 실시간 로그 공유가 가능한지",
			type: "boolean",
			defaultValue: true,
		},
		{
			id: "siteDistribution",
			label: "사업장 분포",
			description: "감시해야 할 물리 사업장 수",
			type: "select",
			defaultValue: "regional",
			options: [
				{ value: "single", label: "단일" },
				{ value: "regional", label: "수개 지역" },
				{ value: "global", label: "다국적" },
			],
		},
		{
			id: "incidentHistory",
			label: "보안 사고 이력",
			description: "최근 1년 간 유사 사고 빈도",
			type: "select",
			defaultValue: "occasional",
			options: [
				{ value: "none", label: "없음" },
				{ value: "occasional", label: "산발적" },
				{ value: "recurring", label: "반복" },
			],
		},
		{
			id: "vendorFootprint",
			label: "외주/협력사 범위",
			description: "산재한 협력사·공급망 규모",
			type: "select",
			defaultValue: "diversified",
			options: [
				{ value: "limited", label: "제한적" },
				{ value: "diversified", label: "다수" },
				{ value: "extensive", label: "광범위" },
			],
		},
		{
			id: "employeeTurnover",
			label: "직원 이직률",
			description: "최근 6개월간 평균 이직 수준",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "stable", label: "안정" },
				{ value: "moderate", label: "보통" },
				{ value: "volatile", label: "높음" },
			],
		},
		{
			id: "dataLossWindow",
			label: "데이터 보존 공백(시간)",
			description: "로그·백업 공백 추정 시간",
			type: "number",
			defaultValue: 24,
			min: 0,
			max: 96,
			step: 1,
		},
		{
			id: "whistleblowerActivity",
			label: "내부 제보 동향",
			description: "내부 고발/제보 흐름",
			type: "select",
			defaultValue: "none",
			options: [
				{ value: "none", label: "없음" },
				{ value: "pending", label: "진행 중" },
				{ value: "active", label: "활발" },
			],
		},
	],
	missing: [
		{
			id: "lastSightingReliability",
			label: "마지막 목격 신뢰도",
			description: "최근 목격 정보의 신빙성",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "weak", label: "불확실" },
				{ value: "moderate", label: "중간" },
				{ value: "strong", label: "높음" },
			],
		},
		{
			id: "lawEnforcementCooperation",
			label: "경찰 공조 수준",
			description: "공식 실종 신고 및 수사 협조 정도",
			type: "select",
			defaultValue: "limited",
			options: [
				{ value: "none", label: "없음" },
				{ value: "limited", label: "부분 협조" },
				{ value: "active", label: "적극 협조" },
			],
		},
		{
			id: "healthConcerns",
			label: "건강·의료 위험",
			description: "지병, 약물 등 건강상 위험 요인",
			type: "select",
			defaultValue: "known",
			options: [
				{ value: "none", label: "없음" },
				{ value: "known", label: "관리 중" },
				{ value: "critical", label: "고위험" },
			],
		},
		{
			id: "travelDocumentStatus",
			label: "여권·신분증 상태",
			description: "출입국 가능성에 영향을 주는 문서 상태",
			type: "select",
			defaultValue: "held",
			options: [
				{ value: "held", label: "보유" },
				{ value: "notIssued", label: "미발급" },
				{ value: "confiscated", label: "회수" },
			],
		},
		{
			id: "supportNetwork",
			label: "지원 네트워크 규모",
			description: "가족, 친구 등 도움을 줄 수 있는 인맥",
			type: "select",
			defaultValue: "family",
			options: [
				{ value: "isolated", label: "거의 없음" },
				{ value: "family", label: "가족 중심" },
				{ value: "friends", label: "친구/지인" },
			],
		},
		{
			id: "riskZones",
			label: "추정 이동 권역",
			description: "현재 집중 탐색이 필요한 지리적 범위",
			type: "select",
			defaultValue: "suburban",
			options: [
				{ value: "urban", label: "도심" },
				{ value: "suburban", label: "근교" },
				{ value: "wilderness", label: "외곽/야외" },
			],
		},
		{
			id: "timeSinceMissingHours",
			label: "실종 경과 시간",
			description: "마지막 확인 시점으로부터 경과한 시간",
			type: "number",
			defaultValue: 48,
			min: 0,
			max: 720,
			step: 1,
		},
		{
			id: "subjectAgeBracket",
			label: "피실종자 연령대",
			description: "대상 인물의 연령대",
			type: "select",
			defaultValue: "adult",
			options: [
				{ value: "minor", label: "미성년" },
				{ value: "adult", label: "성인" },
				{ value: "senior", label: "고령" },
			],
		},
		{
			id: "hasPersonalVehicle",
			label: "개인 차량 보유",
			description: "대상 또는 동행이 차량을 보유했는지",
			type: "boolean",
			defaultValue: false,
		},
		{
			id: "digitalFootprintAccess",
			label: "디지털 계정 접근권",
			description: "SNS·계정 비밀번호 등 접근 권한 확보 여부",
			type: "select",
			defaultValue: "partial",
			options: [
				{ value: "none", label: "없음" },
				{ value: "partial", label: "부분 확보" },
				{ value: "full", label: "완전 확보" },
			],
		},
		{
			id: "terrainComplexity",
			label: "지형 난이도",
			description: "탐색 구역의 지형 복잡도",
			type: "select",
			defaultValue: "mixed",
			options: [
				{ value: "urban", label: "도심" },
				{ value: "mixed", label: "복합" },
				{ value: "wilderness", label: "야외" },
			],
		},
		{
			id: "psychologicalState",
			label: "심리 상태 추정",
			description: "최근 정서·심리 상태에 대한 정보",
			type: "select",
			defaultValue: "unknown",
			options: [
				{ value: "stable", label: "안정" },
				{ value: "distressed", label: "불안/위기" },
				{ value: "unknown", label: "정보 없음" },
			],
		},
	],
	insurance: [
		{
			id: "claimValueBand",
			label: "청구 금액 규모",
			description: "현재 분쟁 중인 금액 레벨",
			type: "select",
			defaultValue: "10to50m",
			options: [
				{ value: "under10m", label: "1천만원 미만" },
				{ value: "10to50m", label: "1천~5천만원" },
				{ value: "50mPlus", label: "5천만원 이상" },
			],
		},
		{
			id: "priorClaimHistory",
			label: "과거 청구 이력",
			description: "피조사자/법인의 보험 청구 기록 빈도",
			type: "select",
			defaultValue: "sporadic",
			options: [
				{ value: "none", label: "없음" },
				{ value: "sporadic", label: "드물게" },
				{ value: "frequent", label: "빈번" },
			],
		},
		{
			id: "medicalValidationDifficulty",
			label: "의료/증빙 확인 난이도",
			description: "진단서, 소견서 등 검증 난이도",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "low", label: "쉬움" },
				{ value: "moderate", label: "보통" },
				{ value: "high", label: "매우 어려움" },
			],
		},
		{
			id: "insurerCooperationLevel",
			label: "보험사 협조 태도",
			description: "보험사가 조사에 협조적인지",
			type: "select",
			defaultValue: "neutral",
			options: [
				{ value: "supportive", label: "협조적" },
				{ value: "neutral", label: "보통" },
				{ value: "adversarial", label: "비협조" },
			],
		},
		{
			id: "digitalTransactionFlag",
			label: "디지털 거래 의심 여부",
			description: "비정상적인 금융/결제 패턴 감지 여부",
			type: "boolean",
			defaultValue: false,
		},
		{
			id: "surveillanceTolerance",
			label: "피조사자 감시 민감도",
			description: "감시/잠복 시 반응 민감도",
			type: "select",
			defaultValue: "moderate",
			options: [
				{ value: "low", label: "낮음" },
				{ value: "moderate", label: "보통" },
				{ value: "high", label: "높음" },
			],
		},
		{
			id: "policyType",
			label: "보험 상품 유형",
			description: "분쟁 중인 보험 상품 카테고리",
			type: "select",
			defaultValue: "health",
			options: [
				{ value: "life", label: "생명" },
				{ value: "accident", label: "상해" },
				{ value: "property", label: "재산" },
				{ value: "health", label: "건강" },
			],
		},
		{
			id: "claimPreparationLevel",
			label: "청구 준비 정도",
			description: "제출 자료 정리·준비 상태",
			type: "select",
			defaultValue: "standard",
			options: [
				{ value: "minimal", label: "미흡" },
				{ value: "standard", label: "표준" },
				{ value: "exhaustive", label: "매우 체계적" },
			],
		},
		{
			id: "coApplicantCount",
			label: "공동 청구 인원",
			description: "함께 청구하는 인원 수",
			type: "number",
			defaultValue: 0,
			min: 0,
			max: 5,
			step: 1,
		},
		{
			id: "hasLegalRepresentation",
			label: "법률 대리인 선임",
			description: "피조사자 측이 법률 대리인을 선임했는지",
			type: "boolean",
			defaultValue: false,
		},
		{
			id: "surveillanceCounterMeasures",
			label: "감시 회피 전술",
			description: "감시를 인지하고 회피 전략을 쓰는지",
			type: "select",
			defaultValue: "basic",
			options: [
				{ value: "none", label: "없음" },
				{ value: "basic", label: "기본" },
				{ value: "aggressive", label: "공격적" },
			],
		},
		{
			id: "financialAuditTrail",
			label: "금융 흐름 투명도",
			description: "거래 내역의 일관성과 투명성",
			type: "select",
			defaultValue: "fragmented",
			options: [
				{ value: "clean", label: "선명" },
				{ value: "fragmented", label: "부분 누락" },
				{ value: "suspicious", label: "의심" },
			],
		},
	],
};

export const createScenarioVariableDefaults = (category: TwinScenarioCategory): ScenarioVariableValueMap => {
	const definitions = SCENARIO_VARIABLE_DEFINITIONS[category];
	return definitions.reduce<ScenarioVariableValueMap>((acc, definition) => {
		acc[definition.id] = definition.defaultValue;
		return acc;
	}, {});
};

export const sanitizeScenarioVariables = (
	category: TwinScenarioCategory,
	raw: ScenarioVariableValueMap | undefined,
): ScenarioVariableValueMap => {
	const definitions = SCENARIO_VARIABLE_DEFINITIONS[category];
	const source = raw ?? {};
	return definitions.reduce<ScenarioVariableValueMap>((acc, definition) => {
		const incoming = source[definition.id];

		switch (definition.type) {
			case "boolean": {
				acc[definition.id] = booleanFromUnknown(incoming, Boolean(definition.defaultValue));
				break;
			}
			case "number": {
				acc[definition.id] = numberFromUnknown(
					incoming,
					typeof definition.defaultValue === "number" ? definition.defaultValue : 0,
					definition.min,
					definition.max,
				);
				break;
			}
			case "select":
			default: {
				const options = definition.options ?? [];
				const fallback = typeof definition.defaultValue === "string" ? definition.defaultValue : String(definition.defaultValue);
				acc[definition.id] = selectFromUnknown(incoming, options, fallback);
				break;
			}
		}

		return acc;
	}, {});
};

export const formatScenarioVariablesForPrompt = (
	category: TwinScenarioCategory,
	variables: ScenarioVariableValueMap,
): string[] => {
	const definitions = SCENARIO_VARIABLE_DEFINITIONS[category];
	return definitions.map((definition) => {
		const rawValue = variables[definition.id];
		let valueLabel: string;

		if (definition.type === "boolean") {
			valueLabel = rawValue ? "Yes" : "No";
		} else if (definition.type === "number") {
			valueLabel = `${rawValue}`;
		} else {
			const option = definition.options?.find((opt) => opt.value === rawValue);
			valueLabel = option?.label ?? String(rawValue ?? "-");
		}

		return `· ${definition.label}: ${valueLabel}`;
	});
};

export const applyScenarioVariableHeuristics = (
	category: TwinScenarioCategory,
	variables: ScenarioVariableValueMap,
	accumulator: ScenarioHeuristicAccumulator,
) => {
	const { score, keyFactors, riskAlerts, recommendedActions } = accumulator;
	let updatedScore = score;

	const pushKey = (text: string) => {
		if (!keyFactors.includes(text)) {
			keyFactors.push(text);
		}
	};
	const pushRisk = (text: string) => {
		if (!riskAlerts.includes(text)) {
			riskAlerts.push(text);
		}
	};
	const pushAction = (text: string) => {
		if (!recommendedActions.includes(text)) {
			recommendedActions.push(text);
		}
	};

	const valueOf = (id: string): ScenarioVariableValue | undefined => variables[id];

	if (category === "affair") {
		const routine = valueOf("routinePredictability");
		if (routine === "high") {
			updatedScore += 6;
			pushKey("대상 일상 패턴이 고정되어 잠복 포인트 최적화가 가능");
		} else if (routine === "moderate") {
			updatedScore += 2;
		} else {
			updatedScore -= 6;
			pushRisk("동선 변동성이 커서 추적 타이밍을 추가 조정해야 함");
		}

		if (booleanFromUnknown(valueOf("sharedLocations"), false)) {
			updatedScore += 3;
			pushKey("공동 공간 접근이 확보되어 증거 수집 각도가 늘어남");
		}

		const digital = valueOf("digitalTrailVisibility");
		if (digital === "extensive") {
			updatedScore += 4;
			pushKey("SNS/메신저 로그가 풍부해 디지털 분석 여지가 큼");
		} else if (digital === "minimal") {
			updatedScore -= 4;
			pushRisk("디지털 흔적이 거의 없어 현장 감시에 더 의존해야 함");
			pushAction("오프라인 감시 인력 배치를 늘리고 수작업 기록 보조원을 배정");
		}

		const thirdParty = valueOf("thirdPartyComplexity");
		if (thirdParty === "multiple") {
			updatedScore -= 4;
			pushRisk("연루 인물이 다수라 관찰 구간이 분산됨");
			pushAction("연루자별 프로파일을 분리하고 팀 단위로 구간을 배분");
		} else if (thirdParty === "unknown") {
			updatedScore -= 2;
			pushRisk("연루자 정보가 불명확해 선행 리서치가 필요");
		}

		const legal = valueOf("legalSensitivity");
		if (legal === "criminal") {
			updatedScore -= 6;
			pushRisk("형사 소송 연계 가능성이 높아 증거 취득 절차를 엄격히 관리해야 함");
			pushAction("법률 대리인과 증거 수집 프로토콜을 사전 합의");
		} else if (legal === "litigation") {
			updatedScore -= 3;
			pushRisk("소송 절차 중이라 증거 위법성 검토가 필수");
		} else {
			updatedScore += 1;
			pushKey("민사 중심 분쟁으로 증거 제출 전략 수립이 명확");
		}

		const evidencePriority = valueOf("evidenceTypePriority");
		if (evidencePriority === "financial") {
			pushAction("계좌 추적, 카드 내역 등 금융 데이터 보존 요청 우선 진행");
		} else if (evidencePriority === "digital") {
			pushAction("클라우드 로그인 기록, 위치 이력 등 디지털 포렌식을 즉시 착수");
		} else if (evidencePriority === "video") {
			pushAction("장시간 촬영 장비와 배터리 백업 플랜을 확정");
		}

		const weekend = valueOf("weekendActivityLevel");
		if (weekend === "high") {
			updatedScore -= 4;
			pushRisk("주말·야간 활동이 많아 감시 교대와 피로 관리가 필요");
			pushAction("야간·주말 전담 감시 팀과 교대 일정 확보");
		} else if (weekend === "low") {
			updatedScore += 2;
			pushKey("주말 이동이 적어 정기 패턴 분석에 집중 가능");
		}

		const travel = valueOf("travelFrequency");
		if (travel === "weekly") {
			updatedScore -= 5;
			pushRisk("장거리 이동이 잦아 다중 지역 커버리지가 필요");
			pushAction("지역별 협력 네트워크와 이동 경로 모니터링을 병행");
		} else if (travel === "rare") {
			updatedScore += 2;
		}

		const family = valueOf("familyAwarenessLevel");
		if (family === "open") {
			updatedScore += 3;
			pushKey("가족 협조가 가능해 제보 채널과 감시 인력이 늘어남");
		} else if (family === "hidden") {
			updatedScore -= 3;
			pushRisk("가족조차 모르는 상황이라 조사 노출 리스크 관리 필요");
		}

		if (booleanFromUnknown(valueOf("sharedVehicleAccess"), false)) {
			updatedScore += 3;
			pushKey("공유 차량을 활용해 위치 추적과 장비 설치가 용이");
		} else {
			updatedScore -= 1;
			pushRisk("차량을 별도 추적해야 해 준비 시간이 추가 소요");
		}

		const techSavvy = valueOf("targetTechSavvy");
		if (techSavvy === "high") {
			updatedScore -= 4;
			pushRisk("디지털 대응 능력이 높아 감시장비 탐지 위험이 존재");
			pushAction("스텔스 장비 활용과 메타데이터 은폐 전략 강화");
		} else if (techSavvy === "low") {
			updatedScore += 2;
			pushKey("기술 보안 수준이 낮아 디지털 흔적 확보가 수월");
		}

		const financialOpsec = valueOf("financialOpsec");
		if (financialOpsec === "strict") {
			updatedScore -= 3;
			pushRisk("금융 흔적을 의도적으로 숨기고 있어 분석 기간이 증가");
			pushAction("포렌식 회계 전문가와 협업하여 다중 계좌 탐지");
		} else if (financialOpsec === "basic") {
			updatedScore += 2;
		}
	} else if (category === "corporate") {
		const access = valueOf("insiderAccessLevel");
		if (access === "high") {
			updatedScore += 6;
			pushKey("내부자 접근 권한이 높아 증거 확보 범위가 넓음");
		} else if (access === "low") {
			updatedScore -= 4;
			pushRisk("내부 접근 권한이 낮아 잠입 시나리오가 필요");
			pushAction("사외 협력사 또는 전직원 네트워크를 활용한 백도어 탐색");
		} else {
			updatedScore += 2;
		}

		const maturity = valueOf("securityMaturity");
		if (maturity === "advanced") {
			updatedScore -= 5;
			pushRisk("고도화된 보안 체계로 CCTV/출입 통제가 강화됨");
			pushAction("보안팀과 투명하게 협조하거나 합법적 침투 테스트 절차 검토");
		} else if (maturity === "basic") {
			updatedScore += 3;
			pushKey("보안 체계가 기초 수준으로 침투 및 감시가 용이");
		}

		const remote = valueOf("remoteWorkRatio");
		if (remote === "high") {
			updatedScore -= 3;
			pushRisk("원격 근무 비중이 높아 오프라인 접촉이 어렵고 디지털 증거 의존도↑");
			pushAction("원격 근무 로그와 VPN 접속 패턴 모니터링 강화");
		} else if (remote === "low") {
			updatedScore += 2;
		}

		if (booleanFromUnknown(valueOf("legalHoldActive"), false)) {
			updatedScore -= 2;
			pushRisk("리걸 홀드가 발령되어 증거 보존/접근 절차가 엄격함");
			pushAction("법무팀과 증거 보존 체계를 조율하고 로그 접근 승인을 확보");
		}

		const sensitivity = valueOf("dataSensitivity");
		if (sensitivity === "regulated") {
			updatedScore -= 4;
			pushRisk("규제 데이터 취급으로 인해 절차 위반 시 제재 위험");
			pushAction("규제 준수 체크리스트 마련 및 컴플라이언스 담당자 동행");
		} else if (sensitivity === "standard") {
			updatedScore += 1;
		}

		const unionPresence = valueOf("unionPresence");
		if (unionPresence === "strong") {
			updatedScore -= 2;
			pushRisk("노조 영향이 커서 내부 인터뷰 시 갈등 가능성");
			pushAction("노조 대표와 협력 채널 구축 또는 면담 절차 합의");
		} else if (unionPresence === "none") {
			updatedScore += 1;
		}

		if (!booleanFromUnknown(valueOf("cyberMonitoring"), true)) {
			updatedScore -= 3;
			pushRisk("사이버 보안 팀과 로그 연동이 안 되어 디지털 증거 확보에 지연");
			pushAction("SIEM 로그 및 DLP 정책 접근 권한을 임시 허용 받도록 요청");
		} else {
			pushKey("실시간 사이버 로그 공유가 가능해 이상 징후 대응 속도가 빠름");
		}

		const siteDistribution = valueOf("siteDistribution");
		if (siteDistribution === "global") {
			updatedScore -= 5;
			pushRisk("다국적 사업장으로 감시 범위가 넓고 이동 비용 증가");
			pushAction("현지 파트너 및 위성 모니터링 채널 확보");
		} else if (siteDistribution === "single") {
			updatedScore += 2;
		}

		const incidentHistory = valueOf("incidentHistory");
		if (incidentHistory === "recurring") {
			updatedScore -= 4;
			pushRisk("반복되는 사고 이력으로 내부 협조 피로도가 높음");
			pushAction("이전 사고 자료를 재분석해 패턴을 선제 파악");
		} else if (incidentHistory === "none") {
			updatedScore += 1;
		}

		const vendorFootprint = valueOf("vendorFootprint");
		if (vendorFootprint === "extensive") {
			updatedScore -= 3;
			pushRisk("협력사가 많아 증거 확보 승인 절차가 복잡");
			pushAction("핵심 벤더 우선순위를 정해 조사 범위를 단계적으로 확대");
		}

		const employeeTurnover = valueOf("employeeTurnover");
		if (employeeTurnover === "volatile") {
			updatedScore -= 2;
			pushRisk("이직률이 높아 내부 정보 유출·불만 확산 가능성");
		} else if (employeeTurnover === "stable") {
			updatedScore += 1;
		}

		const dataLossWindow = numberFromUnknown(valueOf("dataLossWindow"), 24, 0, 96);
		if (dataLossWindow >= 48) {
			updatedScore -= 3;
			pushRisk("로그 보존 공백이 길어 핵심 증거 손실 우려");
			pushAction("로그 백업 주기를 단축하고 보조 수집 장치를 배치");
		} else if (dataLossWindow <= 8) {
			updatedScore += 2;
			pushKey("로그 공백이 짧아 사고 시점 추적이 용이");
		}

		const whistleblower = valueOf("whistleblowerActivity");
		if (whistleblower === "active") {
			updatedScore += 2;
			pushKey("내부 제보가 활발해 증거 확보 속도를 높일 수 있음");
		} else if (whistleblower === "pending") {
			updatedScore -= 1;
			pushRisk("제보가 있지만 아직 확증되지 않아 신뢰 검증 필요");
		}
	} else if (category === "missing") {
		const sighting = valueOf("lastSightingReliability");
		if (sighting === "strong") {
			updatedScore += 6;
			pushKey("확실한 목격 정보가 있어 탐색 시작점이 뚜렷");
		} else if (sighting === "weak") {
			updatedScore -= 6;
			pushRisk("마지막 목격이 불확실해 탐색 범위를 넓게 설정해야 함");
			pushAction("CCTV·통신기록 등 객관 증거로 목격 정보를 재검증");
		} else {
			updatedScore += 2;
		}

		const cooperation = valueOf("lawEnforcementCooperation");
		if (cooperation === "active") {
			updatedScore += 4;
			pushKey("경찰과 적극 공조 중이라 광역 수색/통신 추적 연계 가능");
		} else if (cooperation === "none") {
			updatedScore -= 3;
			pushRisk("공식 수사 지원이 없어 민간 네트워크를 폭넓게 활용해야 함");
		}

		const health = valueOf("healthConcerns");
		if (health === "critical") {
			updatedScore -= 5;
			pushRisk("건강상 위급 요인이 있어 구조 속도가 시급");
			pushAction("의료기관, 약국, 응급실 출입 기록을 즉시 확인");
		} else if (health === "none") {
			updatedScore += 1;
		}

		const travelDoc = valueOf("travelDocumentStatus");
		if (travelDoc === "held") {
			updatedScore -= 3;
			pushRisk("여권이 손에 있어 해외 이동 가능성 염두 필요");
			pushAction("출입국 기록 모니터링 및 공항·터미널 감시 강화");
		} else if (travelDoc === "confiscated") {
			updatedScore += 3;
			pushKey("여권이 회수되어 급작스러운 해외 이동 가능성이 낮음");
		}

		const network = valueOf("supportNetwork");
		if (network === "isolated") {
			updatedScore -= 4;
			pushRisk("지원 네트워크가 없어 실시간 제보 확보가 어려움");
			pushAction("지역 커뮤니티, CCTV 협회 등 서드파티 네트워크 확대");
		} else if (network === "family") {
			updatedScore += 3;
			pushKey("가족이 적극 협조 가능하여 정보 수집·홍보 채널이 풍부");
		}

		const zone = valueOf("riskZones");
		if (zone === "wilderness") {
			updatedScore -= 5;
			pushRisk("야외/산악 지역이라 수색 인력과 드론 투입 필요");
			pushAction("열화상 드론 및 구조견 파트너와 공조 계획 수립");
		} else if (zone === "suburban") {
			updatedScore += 1;
		}

		const hoursMissing = numberFromUnknown(valueOf("timeSinceMissingHours"), 48, 0, 720);
		if (hoursMissing >= 168) {
			updatedScore -= 6;
			pushRisk("실종 후 7일 이상 경과해 증거 퇴색 위험");
			pushAction("광역 수색과 언론 제보 등 긴급 대응 확대");
		} else if (hoursMissing <= 24) {
			updatedScore += 3;
			pushKey("골든타임 내 대응으로 회수 가능성↑");
		}

		const ageBracket = valueOf("subjectAgeBracket");
		if (ageBracket === "minor") {
			updatedScore -= 3;
			pushRisk("미성년 실종으로 법적·사회적 압박이 큼");
			pushAction("학교, 학원, SNS 커뮤니티 등 미성년 동선 집중");
		} else if (ageBracket === "senior") {
			updatedScore -= 2;
			pushRisk("고령층 건강 위험을 고려한 의료기관 탐문 필요");
		}

		if (booleanFromUnknown(valueOf("hasPersonalVehicle"), false)) {
			updatedScore -= 2;
			pushRisk("개인 차량을 이용해 이동 반경이 확대될 수 있음");
			pushAction("차량 번호판 기반 CCTV/톨게이트 조회 병행");
		}

		const digitalAccess = valueOf("digitalFootprintAccess");
		if (digitalAccess === "full") {
			updatedScore += 3;
			pushKey("디지털 계정 접근이 확보되어 위치 추적이 수월");
		} else if (digitalAccess === "none") {
			updatedScore -= 3;
			pushRisk("디지털 흔적 확보가 어려워 오프라인 탐문에 의존");
		}

		const terrain = valueOf("terrainComplexity");
		if (terrain === "wilderness") {
			updatedScore -= 4;
			pushRisk("야생 지형이라 탐색 장비·인력이 추가로 필요");
			pushAction("수색 드론, 수색견 등 특수 장비 투입 일정 확보");
		} else if (terrain === "urban") {
			updatedScore += 1;
		}

		const psyche = valueOf("psychologicalState");
		if (psyche === "distressed") {
			updatedScore -= 4;
			pushRisk("정서적 위기 상태로 자해·도주 가능성↑, 긴급 대응 필요");
			pushAction("상담사/가족과 협력해 심리 안정화 계획 수립");
		}
	} else if (category === "insurance") {
		const claim = valueOf("claimValueBand");
		if (claim === "50mPlus") {
			updatedScore -= 4;
			pushRisk("고액 청구 건으로 피조사자 대응이 치밀할 가능성");
			pushAction("법률·회계 자문과 합동으로 자금 흐름 추적 플랜 마련");
		} else if (claim === "under10m") {
			updatedScore += 2;
		}

		const history = valueOf("priorClaimHistory");
		if (history === "frequent") {
			updatedScore -= 3;
			pushRisk("반복 청구 이력이 있어 조직적인 사기 패턴일 수 있음");
			pushAction("과거 청구 데이터를 매칭하여 공통 패턴 탐색");
		} else if (history === "none") {
			updatedScore += 2;
		}

		const medical = valueOf("medicalValidationDifficulty");
		if (medical === "high") {
			updatedScore -= 4;
			pushRisk("의료 검증이 어려워 전문 의료 감정인을 투입해야 함");
			pushAction("전문 의학 자문단과 공동 검증 프로토콜을 준비");
		} else if (medical === "low") {
			updatedScore += 2;
		}

		const cooperationLevel = valueOf("insurerCooperationLevel");
		if (cooperationLevel === "supportive") {
			updatedScore += 3;
			pushKey("보험사가 적극 협조하여 자료 제출 및 공조가 빠르게 이뤄짐");
		} else if (cooperationLevel === "adversarial") {
			updatedScore -= 4;
			pushRisk("보험사가 비협조적이라 정보 접근에 법적 공방 가능성");
			pushAction("공식 문서 요청과 법적 공문 절차를 미리 준비");
		}

		if (booleanFromUnknown(valueOf("digitalTransactionFlag"), false)) {
			updatedScore += 1;
			pushKey("비정상 거래 패턴이 있어 포렌식 분석 근거 확보");
			pushAction("계좌, 간편결제, 가상자산 등 디지털 포렌식 범위를 확대");
		}

		const tolerance = valueOf("surveillanceTolerance");
		if (tolerance === "low") {
			updatedScore -= 2;
			pushRisk("감시 민감도가 높아 현장 노출 위험이 있음");
			pushAction("원거리 광학 장비와 비접촉형 감시 기법 사용");
		} else if (tolerance === "high") {
			updatedScore += 2;
		}

		const policyType = valueOf("policyType");
		if (policyType === "life") {
			updatedScore -= 3;
			pushRisk("생명보험 사건으로 법적 민감도와 검증 범위 확대 필요");
			pushAction("의료 기록·상속 문서 등 고위험 자료 우선 확보");
		} else if (policyType === "property") {
			updatedScore += 1;
		}

		const prep = valueOf("claimPreparationLevel");
		if (prep === "exhaustive") {
			updatedScore -= 3;
			pushRisk("상대 측이 치밀하게 자료를 준비해 반박 난이도 상승");
		} else if (prep === "minimal") {
			updatedScore += 2;
			pushKey("제출 자료가 부실하여 허점을 빠르게 식별 가능");
		}

		const coApplicants = numberFromUnknown(valueOf("coApplicantCount"), 0, 0, 5);
		if (coApplicants >= 3) {
			updatedScore -= 2;
			pushRisk("공동 청구인이 많아 진술·자료 정합성 검증이 어려움");
		} else if (coApplicants === 0) {
			updatedScore += 1;
		}

		if (booleanFromUnknown(valueOf("hasLegalRepresentation"), false)) {
			updatedScore -= 3;
			pushRisk("법률 대리인이 선임되어 절차 대응에 추가 시간이 필요");
			pushAction("법무팀과 소송 전략을 조율하고 증거 admissibility 검토");
		}

		const counterMeasures = valueOf("surveillanceCounterMeasures");
		if (counterMeasures === "aggressive") {
			updatedScore -= 4;
			pushRisk("감시 회피 전략이 적극적이라 노출 위험 높음");
			pushAction("장비 위장, 원거리 추적, 디지털 추적 강화 병행");
		} else if (counterMeasures === "none") {
			updatedScore += 2;
		}

		const auditTrail = valueOf("financialAuditTrail");
		if (auditTrail === "suspicious") {
			updatedScore -= 5;
			pushRisk("거래 내역이 의심스러워 심층 포렌식이 요구됨");
			pushAction("포렌식 회계 분석과 계좌 정밀 추적을 즉시 개시");
		} else if (auditTrail === "clean") {
			updatedScore += 2;
			pushKey("거래 내역이 투명해 허위 청구 가능성이 낮음");
		}
	}

	accumulator.score = updatedScore;
};

