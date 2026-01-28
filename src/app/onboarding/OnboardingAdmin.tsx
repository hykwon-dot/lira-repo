"use client";

import { useState } from 'react';

const sampleDocs = [
  { id: 1, name: '사내 정책 문서', type: 'Notion', content: '근무 정책, 보안 정책 등' },
  { id: 2, name: '프로젝트 가이드', type: 'Google Drive', content: '프로젝트 관리 방법론, 산출물 템플릿 등' },
];

export default function OnboardingAdmin() {
  const [docs, setDocs] = useState(sampleDocs);
  const [name, setName] = useState('');
  const [type, setType] = useState('Notion');
  const [content, setContent] = useState('');

  const addDoc = () => {
    if (!name || !content) return;
    setDocs([...docs, { id: Date.now(), name, type, content }]);
    setName(''); setType('Notion'); setContent('');
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-4">온보딩 데이터 관리</h2>
      <div className="mb-6">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="문서명" className="input input-bordered w-full mb-2" />
        <select value={type} onChange={e => setType(e.target.value)} className="input input-bordered w-full mb-2">
          <option value="Notion">Notion</option>
          <option value="Google Drive">Google Drive</option>
        </select>
        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="내용" className="textarea textarea-bordered w-full mb-2" />
        <button onClick={addDoc} className="btn btn-primary w-full">문서 추가</button>
      </div>
      <ul className="space-y-2">
        {docs.map(d => (
          <li key={d.id} className="p-4 bg-white rounded shadow flex flex-col">
            <span className="font-semibold">{d.name} ({d.type})</span>
            <span className="text-gray-500 text-sm">{d.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
