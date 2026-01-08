import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">이용약관</h1>
      <div className="prose prose-slate max-w-none text-gray-600">
        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">제1조 (목적)</h3>
        <p className="mb-4">
          본 약관은 주식회사 엘아이알에이(이하 &#39;회사&#39;)가 제공하는 LIRA 서비스(이하 &#39;서비스&#39;)의 이용전반에 관한 제반사항을 규정함을 목적으로 합니다.
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">제2조 (용어의 정의)</h3>
        <p className="mb-4">
          본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2">
          <li>&quot;회원&quot;이라 함은 회사와 서비스 이용계약을 체결하고 이용자 아이디를 부여받은 자를 말합니다.</li>
          <li>&quot;서비스&quot;라 함은 회사가 제공하는 AI 시뮬레이션 및 민간조사원 연결 플랫폼 등을 말합니다.</li>
        </ul>

        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">제3조 (약관의 게시와 개정)</h3>
        <p className="mb-4">
          회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다. 회사는 &quot;약관의 규제에 관한 법률&quot; 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">제4조 (서비스의 제공 및 변경)</h3>
        <p className="mb-4">
          회사는 회원에게 다음과 같은 서비스를 제공합니다.
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2">
          <li>AI 기반 사건 시뮬레이션</li>
          <li>민간조사원 매칭 서비스</li>
          <li>기타 회사가 개발하거나 다른 회사와의 제휴 등을 통해 제공하는 일체의 서비스</li>
        </ul>

        <p className="mt-8 text-sm text-gray-500">
          본 약관은 2026년 1월 1일부터 적용됩니다.
        </p>
      </div>
    </div>
  );
}
