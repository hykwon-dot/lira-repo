"use client";

import { useState } from 'react';

interface LawInsight {
  id: number | null;
  project: string;
  risk?: string;
  advice: string;
  similar?: string;
}

const sampleLaws: LawInsight[] = [
  {
    id: 1,
    project: '신제품 출시',
    risk: '식약처 인증 필요',
    advice: '사전 인증 절차를 반드시 확인하세요.',
    similar: '2023년 건강기능식품 인증 사례 참고'
  },
  {
    id: 2,
    project: 'B2B SaaS 도입',
    risk: '개인정보보호법 준수',
    advice: '고객 데이터 암호화 및 접근권한 관리 필요.',
    similar: '2022년 SaaS 개인정보보호 컨설팅 사례 참고'
  },
];

export default function LawCopilot() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LawInsight | null>(null);

  const handleSearch = () => {
    const found = sampleLaws.find(l => l.project.includes(query));
    setResult(
      found || {
        id: null,
        project: query,
        advice: '해당 프로젝트에 대한 데이터가 없습니다.',
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">법률/규제 진단 Copilot</h2>
      <div className="mb-4 flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="프로젝트명 입력" className="input input-bordered flex-1" />
        <button onClick={handleSearch} className="btn btn-primary">진단</button>
      </div>
      {result && (
        <div className="bg-white rounded shadow p-4">
          <div className="font-semibold">조언: {result.advice}</div>
          {result.risk && <div className="text-gray-500 text-sm">리스크: {result.risk}</div>}
          {result.similar && <div className="text-gray-500 text-sm">유사사례: {result.similar}</div>}
        </div>
      )}
    </div>
  );
}
