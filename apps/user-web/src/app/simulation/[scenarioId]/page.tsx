import { getPrismaClient } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

type JsonValue = Prisma.JsonValue;
type JsonObject = Prisma.JsonObject;

const isJsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const renderObjectDetails = (value: JsonValue | null | undefined): ReactNode => {
  if (!value || !isJsonObject(value)) {
    return null;
  }

  const entries = Object.entries(value) as Array<[string, JsonValue]>;

  return (
    <ul className="list-disc list-inside text-sm text-gray-600 pl-4">
      {entries.map(([key, entryValue]) => {
        if (isJsonObject(entryValue)) {
          return (
            <li key={key}>
              <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
              {renderObjectDetails(entryValue)}
            </li>
          );
        }

        if (Array.isArray(entryValue)) {
          const listItems = entryValue
            .map((item) => {
              if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
                return String(item);
              }
              if (isJsonObject(item)) {
                return Object.entries(item)
                  .map(([childKey, childValue]) => `${childKey}: ${String(childValue)}`)
                  .join(', ');
              }
              return JSON.stringify(item);
            })
            .join(', ');

          return (
            <li key={key}>
              <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {listItems}
            </li>
          );
        }

        return (
          <li key={key}>
            <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(entryValue)}
          </li>
        );
      })}
    </ul>
  );
};

const normalizeCompetency = (value: JsonValue): string => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .join(', ');
  }
  if (isJsonObject(value)) {
    return Object.values(value)
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join(', ');
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  return '정보 없음';
};

const formatBudget = (budget: JsonValue): string => {
  if (isJsonObject(budget)) {
    const recommended = budget.recommended;
    if (typeof recommended === 'number') {
      return `${(recommended / 10000).toLocaleString()}만원`;
    }
  }
  return 'N/A';
};

const extractDeliverables = (deliverables: JsonValue): string[] => {
  if (!Array.isArray(deliverables)) {
    return [];
  }
  return deliverables
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item);
};

const ScenarioDetailPage = async ({ params }: { params: { scenarioId: string } }) => {
  const scenarioId = parseInt(params.scenarioId, 10);

  if (isNaN(scenarioId)) {
    notFound();
  }

  const prisma = await getPrismaClient();
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      phases: {
        orderBy: {
          scheduleOffset: 'asc',
        },
        include: {
          tasks: true,
          risks: true,
        },
      },
    },
  });

  if (!scenario) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4 sm:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-800">{scenario.title}</h1>
        <p className="text-md sm:text-lg text-gray-600">{scenario.description}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenario.phases.map((phase, index) => (
          <div key={phase.id} className="bg-white p-5 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <div className="flex-grow">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-blue-700 border-b pb-2">Phase {index + 1}: {phase.name}</h2>
              <div className="space-y-4">
                <div>
                  <p><span className="font-bold">기간:</span> {phase.durationDays}일</p>
                  <p><span className="font-bold">예산:</span> {formatBudget(phase.budget)}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">주요 업무:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 pl-4">
                    {phase.tasks.map(task => (
                      <li key={task.id}>
                        <span className="font-semibold">{task.desc}:</span> {normalizeCompetency(task.competency)}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">핵심 성과 지표 (KPI):</h3>
                  {renderObjectDetails(phase.phaseKPI)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">산출물:</h3>
                   <ul className="list-disc list-inside text-sm text-gray-600 pl-4">
                    {extractDeliverables(phase.deliverables).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-700">주요 리스크:</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 pl-4">
                    {phase.risks.map(risk => (
                      <li key={risk.id}><span className="font-semibold">{risk.name} (심각도: {risk.severity}):</span> {risk.mitigation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScenarioDetailPage;
