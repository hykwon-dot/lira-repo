import React from 'react';
import type { Prisma } from '@prisma/client';

type ScenarioWithDetails = Prisma.ScenarioGetPayload<{
  include: {
    phases: {
      include: {
        tasks: true;
        risks: true;
      };
    };
  };
}>;

interface ScenarioSummaryProps {
  scenario: ScenarioWithDetails | null;
}

const ScenarioSummary: React.FC<ScenarioSummaryProps> = ({ scenario }) => {
  if (!scenario) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg h-full">
        <h2 className="text-lg font-bold mb-4">시나리오 요약</h2>
        <p>시나리오를 불러오는 중...</p>
      </div>
    );
  }

  const isJsonObject = (value: Prisma.JsonValue): value is Prisma.JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  const extractRecommendedBudget = (budget: Prisma.JsonValue): number => {
    if (isJsonObject(budget)) {
      const recommended = budget.recommended;
      if (typeof recommended === 'number') {
        return recommended;
      }
    }
    return 0;
  };

  const totalBudget = scenario.phases.reduce((acc, phase) => acc + extractRecommendedBudget(phase.budget), 0);
  const totalDuration = scenario.phases.reduce((acc, phase) => acc + phase.durationDays, 0);


  return (
    <div className="bg-gray-50 p-4 rounded-lg h-full text-sm">
      <h2 className="text-lg font-bold mb-4 border-b pb-2">시나리오 요약</h2>
      <div className="space-y-3">
        <h3 className="text-md font-semibold text-gray-800">{scenario.title}</h3>
        <p className="text-gray-600">{scenario.description}</p>
        <div>
            <p><span className="font-semibold">난이도:</span> {scenario.difficulty}</p>
      <p><span className="font-semibold">총 예산:</span> {(totalBudget / 10000).toLocaleString()}만원</p>
            <p><span className="font-semibold">총 기간:</span> {totalDuration}일</p>
        </div>
        <div>
            <h4 className="font-semibold text-gray-700 mt-2">단계별 정보:</h4>
            <ul className="list-disc list-inside pl-2 mt-1 space-y-1">
                {scenario.phases.map(phase => (
                    <li key={phase.id}>{phase.name} ({phase.durationDays}일)</li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSummary;
