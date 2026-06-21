
import { getSimilarScenarios } from './actions';
import { SimilarScenariosCard } from './SimilarScenariosCard';

export async function SimilarScenarios({ scenarioId }: { scenarioId: string }) {
  const scenarioIdNum = parseInt(scenarioId, 10);
  if (isNaN(scenarioIdNum)) {
    return null;
  }

  const similarScenarios = await getSimilarScenarios(scenarioIdNum);

  return <SimilarScenariosCard scenarios={similarScenarios} />;
}
