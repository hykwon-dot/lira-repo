import { promises as fs } from "fs";
import path from "path";
import type { AiProactiveAlert, AiRiskSignal, RiskSeverity } from "./types";

const STORE_PATH = path.join(process.cwd(), "tmp", "risk-trends.json");
const STORE_DIR = path.dirname(STORE_PATH);

export interface RiskTrendSnapshot {
  id: string;
  title: string;
  severity: RiskSeverity;
  totalCount: number;
  recentDetections: number[]; // timestamps (ms)
  lastDetectedAt: string | null;
}

async function ensureStore(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function loadStore(): Promise<RiskTrendSnapshot[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as RiskTrendSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function saveStore(trends: RiskTrendSnapshot[]): Promise<void> {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(trends, null, 2), "utf8");
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

function pruneDetections(timestamps: number[]): number[] {
  const now = Date.now();
  return timestamps.filter((value) => now - value <= SEVEN_DAYS_MS);
}

export async function recordRiskSignals(signals: AiRiskSignal[]): Promise<RiskTrendSnapshot[]> {
  if (!signals.length) {
    return loadStore();
  }

  const existing = await loadStore();
  const trendMap = new Map<string, RiskTrendSnapshot>();
  existing.forEach((entry) => {
    trendMap.set(entry.id, {
      ...entry,
      recentDetections: pruneDetections(entry.recentDetections ?? []),
    });
  });

  const now = Date.now();

  signals.forEach((signal) => {
    const current = trendMap.get(signal.id);
    const updatedHistory = pruneDetections([...(current?.recentDetections ?? []), now]);

    trendMap.set(signal.id, {
      id: signal.id,
      title: signal.title,
      severity: signal.severity as RiskSeverity,
      totalCount: (current?.totalCount ?? 0) + 1,
      recentDetections: updatedHistory,
      lastDetectedAt: new Date(now).toISOString(),
    });
  });

  const updated = Array.from(trendMap.values()).sort((a, b) => b.totalCount - a.totalCount);
  await saveStore(updated);
  return updated;
}

export interface TrendContext {
  snapshots: RiskTrendSnapshot[];
  signals: AiRiskSignal[];
  caseUrgency?: string;
  caseType?: string;
}

export function deriveTrendAlerts(context: TrendContext): AiProactiveAlert[] {
  const { snapshots, signals, caseUrgency, caseType } = context;
  const alerts: AiProactiveAlert[] = [];
  const now = Date.now();

  snapshots.forEach((snapshot) => {
    const recent24h = snapshot.recentDetections.filter((ts) => now - ts <= ONE_DAY_MS).length;
    if (recent24h >= 3 && snapshot.severity !== "low") {
      alerts.push({
        id: `${snapshot.id}-spike`,
        title: `${snapshot.title} 경보 빈도 증가`,
        severity: snapshot.severity,
        message: `최근 24시간 내 동일 경보가 ${recent24h}회 감지되었습니다.`,
        suggestion: "사건 우선순위를 재조정하고 대응 인력을 재배치하세요.",
      });
      return;
    }

    const recent7d = snapshot.recentDetections.length;
    if (recent7d >= 6) {
      alerts.push({
        id: `${snapshot.id}-trend`,
        title: `${snapshot.title} 누적 증가`,
        severity: snapshot.severity === "low" ? "medium" : snapshot.severity,
        message: `최근 7일간 ${snapshot.title} 유형이 ${recent7d}회 반복되었습니다.`,
        suggestion: "유사 사건 대응 전략을 검토하고 가이드라인을 업데이트하세요.",
      });
    }
  });

  if (caseUrgency && caseUrgency.match(/긴급|immediate|urgent/i)) {
    alerts.push({
      id: "urgency-priority",
      title: "고객이 긴급 대응을 요청", 
      severity: "high",
      message: "의뢰인이 긴급 또는 즉시 대응을 요청했습니다.",
      suggestion: "탐정 배정을 선행하고 진행 상황을 실시간으로 공유하세요.",
    });
  }

  if (caseType && caseType.match(/기업|산업|내부/i)) {
    alerts.push({
      id: "corporate-pattern",
      title: "기업형 사건 패턴 감지",
      severity: "medium",
      message: "유사한 기업형 케이스가 누적되고 있습니다.",
      suggestion: "조직 내부 조사팀과 협업해 조사 범위를 넓히는 것을 검토하세요.",
    });
  }

  const highSeveritySignals = signals.filter((signal) => signal.severity === "high");
  if (highSeveritySignals.length > 1) {
    alerts.push({
      id: "multiple-high",
      title: "다중 고위험 요소",
      severity: "high",
      message: `고위험 경보가 ${highSeveritySignals.length}건 감지되어 복합 위협이 존재합니다.`,
      suggestion: "현장 대응 플랜을 즉시 점검하고 법률 자문을 병행하세요.",
    });
  }

  // Remove duplicates by id
  const deduped = new Map(alerts.map((alert) => [alert.id, alert]));
  return Array.from(deduped.values());
}
