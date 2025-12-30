import ScenarioAdmin from '../ScenarioAdmin';

export default function AdminScenariosPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-8 font-sans">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1a2340]">시나리오 관리</h1>
          <p className="mt-2 text-sm text-slate-500">
            전체 시나리오 목록을 조회하고 새로운 시나리오를 등록할 수 있습니다.
          </p>
        </div>
        <ScenarioAdmin />
      </div>
    </div>
  );
}
