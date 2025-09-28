import { notFound } from 'next/navigation';
import ScenarioPlaybook from './ScenarioPlaybook';
import { getPrismaClient } from '@/lib/prisma';
import type { ScenarioWithDetails } from './types';

interface ScenarioDetailPageProps {
  params: { id: string };
}

async function getScenarioDetails(id: string): Promise<ScenarioWithDetails | null> {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) {
    return null;
  }

  const prisma = await getPrismaClient();
  const scenario = await prisma.scenario.findUnique({
    where: { id: numericId },
    include: {
      phases: {
        orderBy: {
          order: 'asc',
        },
        include: {
          tasks: true,
          risks: true,
        },
      },
    },
  });
  return scenario as ScenarioWithDetails | null;
}

export default async function ScenarioDetailPage({ params }: ScenarioDetailPageProps) {
  const scenario = await getScenarioDetails(params.id);

  if (!scenario) {
    notFound();
  }

  return <ScenarioPlaybook scenario={scenario} />;
}
