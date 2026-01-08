import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">개인정보처리방침</h1>
      <div className="prose prose-slate max-w-none text-gray-600">
        <p className="mb-4">
          주식회사 엘아이알에이(이하 &#39;회사&#39;)는 이용자의 개인정보를 중요시하며, &quot;정보통신망 이용촉진 및 정보보호&quot;에 관한 법률을 준수하고 있습니다.
        </p>
        
        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">1. 개인정보의 수집 및 이용목적</h3>
        <p className="mb-4">
          회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2">
          <li>서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산</li>
          <li>회원 관리 (가입 의사 확인, 연령 확인 등)</li>
          <li>마케팅 및 광고에 활용</li>
        </ul>

        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">2. 수집하는 개인정보 항목</h3>
        <p className="mb-4">
          회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
        </p>
        <ul className="list-disc pl-5 mb-4 space-y-2">
          <li>수집항목 : 이름, 로그인ID, 비밀번호, 휴대전화번호, 이메일</li>
          <li>개인정보 수집방법 : 홈페이지(회원가입)</li>
        </ul>

        <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-800">3. 개인정보의 보유 및 이용기간</h3>
        <p className="mb-4">
          원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
        </p>

        <p className="mt-8 text-sm text-gray-500">
          본 방침은 2026년 1월 1일부터 시행됩니다.
        </p>
      </div>
    </div>
  );
}
