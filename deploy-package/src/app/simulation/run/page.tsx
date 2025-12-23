import Sidebar from './Sidebar';
import Header from './Header';
import SimulationContent from './SimulationContent';
import ProgressChart from './ProgressChart';
import RiskPanel from './RiskPanel';
import { redirect } from 'next/navigation';
import { SimulationProvider } from './SimulationContext';

export default function SimulationRunPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const scenarioId = searchParams?.scenarioId as string;
  const startPhaseId = searchParams?.startPhaseId as string;

  if (!scenarioId || !startPhaseId) {
    redirect('/scenario');
  }

  return (
    <SimulationProvider scenarioId={scenarioId} initialPhaseId={startPhaseId}>
      <div className="flex h-screen bg-gray-900 text-gray-300 antialiased font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 p-4 md:p-6 grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 overflow-y-auto bg-gray-900">
            <div className="xl:col-span-2 h-full">
               <SimulationContent />
            </div>
            <div className="xl:col-span-1 flex flex-col gap-4 md:gap-6">
              <ProgressChart />
              <RiskPanel />
            </div>
          </main>
        </div>
      </div>
    </SimulationProvider>
  );
}
