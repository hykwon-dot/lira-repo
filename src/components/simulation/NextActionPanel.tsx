import React from 'react';
import { Lightbulb, Wrench } from 'lucide-react';

interface NextActionPanelProps {
  recommendedQuestions: string[];
  onQuestionClick: (question: string) => void;
  isLoading: boolean;
}

const initialQuestions = [
  "아이스크림을 해외에 판매하고 싶은데, 초기 시장 조사 전략을 알려줘.",
  "신규 투자 유치를 위한 사업 계획서의 핵심 요소를 알려줘.",
  "우리 팀의 생산성을 높이기 위한 구체적인 방법론이 필요해.",
];

const NextActionPanel: React.FC<NextActionPanelProps> = ({ recommendedQuestions, onQuestionClick, isLoading }) => {

  const questionsToShow = recommendedQuestions.length > 0 ? recommendedQuestions : initialQuestions;

  const scenarioBuilderItems = [
      { title: "새로운 Task 추가하기", description: "현재 단계에 새로운 업무를 추가합니다." },
      { title: "리스크 관리 계획 수정", description: "예상되는 리스크에 대한 대응 방안을 수정합니다." },
  ];

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-full text-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3 pb-2 flex items-center text-gray-800">
          <Lightbulb className="mr-2 text-yellow-500" />
          추천 질문
        </h2>
        {isLoading && recommendedQuestions.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="w-full bg-gray-200 h-12 rounded-md"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
              {questionsToShow.map((action, index) => (
                  <button 
                    key={index} 
                    onClick={() => onQuestionClick(action)}
                    className="w-full text-left bg-gray-50 p-3 rounded-md hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm hover:shadow-md"
                  >
                      {action}
                  </button>
              ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold mb-3 border-t pt-4 pb-2 flex items-center text-gray-800">
            <Wrench className="mr-2 text-blue-500" />
            시나리오 빌더
        </h2>
         <div className="space-y-2">
            {scenarioBuilderItems.map((item, index) => (
                <button key={index} className="w-full text-left bg-gray-50 p-3 rounded-md hover:bg-gray-100 border border-gray-200 transition-colors shadow-sm hover:shadow-md">
                    <p className="font-semibold text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default NextActionPanel;
