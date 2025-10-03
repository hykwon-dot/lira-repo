"use client";

import samplePersonas from './samplePersonas';

export default function PersonaFeed() {
  return (
    <div className="max-w-3xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-6">전문 민간조사원</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {samplePersonas.map((p) => (
          <div key={p.id} className="bg-white rounded shadow p-6 flex flex-col gap-2">
            <div className="font-semibold text-lg">{p.name}</div>
            <div className="text-gray-500 text-sm">전문분야: {p.segment}</div>
            <div className="text-blue-600 font-bold">경험 점수: {p.score}점</div>
            <div className="text-gray-700 text-sm">{p.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
