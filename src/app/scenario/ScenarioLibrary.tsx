"use client";

import { useState, useMemo } from 'react'; // useMemo 추가
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Search, ListFilter, X } from 'lucide-react'; // 아이콘 추가

// 데이터베이스에서 처리된 시나리오 데이터의 타입을 정의합니다.
export interface ProcessedScenario {
  id: number;
  title: string;
  description: string;
  image: string | null;
  totalDays: number;
  totalBudget: number;
  difficulty: string; 
}

interface ScenarioLibraryProps {
  scenarios: ProcessedScenario[];
}

export default function ScenarioLibrary({ scenarios }: ScenarioLibraryProps) {
  const [search, setSearch] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('모든 예산');
  const [difficulty, setDifficulty] = useState('모든 난이도');
  const [sortBy, setSortBy] = useState('title-asc'); // 정렬 상태 추가

  const filteredScenarios = useMemo(() => {
    return scenarios.filter(scenario => {
      const searchLower = search.toLowerCase();
      const titleMatch = scenario.title.toLowerCase().includes(searchLower);
      const descriptionMatch = scenario.description.toLowerCase().includes(searchLower);

      const difficultyMatch = difficulty === '모든 난이도' || scenario.difficulty === difficulty;

      const budgetMatch = (() => {
          if (budgetFilter === '모든 예산') return true;
          const budget = scenario.totalBudget;
          if (budgetFilter === '1,000만원 이하') return budget <= 10000000;
          if (budgetFilter === '1,000만원 - 5,000만원') return budget > 10000000 && budget <= 50000000;
          if (budgetFilter === '5,000만원 이상') return budget > 50000000;
          return true;
      })();

      return (titleMatch || descriptionMatch) && difficultyMatch && budgetMatch;
    });
  }, [scenarios, search, budgetFilter, difficulty]);

  const sortedAndFilteredScenarios = useMemo(() => {
    return [...filteredScenarios].sort((a, b) => {
      const [key, order] = sortBy.split('-');

      let comparison = 0;
      switch (key) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'totalBudget':
          comparison = a.totalBudget - b.totalBudget;
          break;
        case 'totalDays':
          comparison = a.totalDays - b.totalDays;
          break;
        default:
          comparison = 0;
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }, [filteredScenarios, sortBy]);


  const difficultyColor = (difficulty:string) => {
    switch (difficulty) {
      case '쉬움': return 'text-green-500 bg-green-100';
      case '중간': return 'text-yellow-500 bg-yellow-100';
      case '어려움': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };
  
  const difficultyBadge = (difficulty:string) => {
    switch (difficulty) {
      case '쉬움': return 'text-green-600';
      case '중간': return 'text-yellow-600';
      case '어려움': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  // 예산을 원화 단위로 포맷하는 함수
  const formatBudget = (amount: number) => {
    if (amount >= 100000000) {
        return `${(amount / 100000000).toFixed(1)}억원`;
    }
    if (amount >= 10000) {
        return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount}원`;
  };

  // 추천 시나리오는 전달받은 목록의 첫 3개로 설정
  const featuredScenarios = scenarios.slice(0, 3);
  const allScenarios = sortedAndFilteredScenarios; // 정렬된 결과 사용

  const resetFilters = () => {
    setSearch('');
    setBudgetFilter('모든 예산');
    setDifficulty('모든 난이도');
    setSortBy('title-asc');
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-gray-900">시나리오 라이브러리</h1>
              <p className="text-gray-600 mt-2 max-w-3xl">
                성공적인 프로젝트 시나리오를 탐색하고, 맞춤형 시뮬레이션을 시작하여 전문성을 강화하세요.
              </p>
            </div>
            <button className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
              + 맞춤 시나리오 생성
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="시나리오 검색..."
                  className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select value={budgetFilter} onChange={(e) => setBudgetFilter(e.target.value)} className="p-2 border border-gray-300 rounded-lg bg-white w-full">
                <option>모든 예산</option>
                <option>1,000만원 이하</option>
                <option>1,000만원 - 5,000만원</option>
                <option>5,000만원 이상</option>
              </select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="p-2 border border-gray-300 rounded-lg bg-white w-full">
                <option>모든 난이도</option>
                <option>쉬움</option>
                <option>중간</option>
                <option>어려움</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 border border-gray-300 rounded-lg bg-white w-full">
                <option value="title-asc">이름 (오름차순)</option>
                <option value="title-desc">이름 (내림차순)</option>
                <option value="totalBudget-asc">예산 (낮은순)</option>
                <option value="totalBudget-desc">예산 (높은순)</option>
                <option value="totalDays-asc">기간 (짧은순)</option>
                <option value="totalDays-desc">기간 (긴순)</option>
              </select>
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                    <ListFilter className="inline-block h-4 w-4 mr-1" />
                    {filteredScenarios.length}개의 시나리오를 찾았습니다.
                </div>
                <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-gray-800 flex items-center">
                    <X className="h-4 w-4 mr-1" />
                    필터 초기화
                </button>
            </div>
          </div>

          {/* Featured & Recommended Scenarios */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">추천 시나리오</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredScenarios.map((scenario) => (
                <motion.div 
                  key={scenario.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 flex flex-col"
                  whileHover={{ y: -5, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 h-14">{scenario.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 h-24 overflow-hidden flex-grow">{scenario.description}</p>
                    <div className="flex items-center justify-between text-sm mb-5">
                      <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">{formatBudget(scenario.totalBudget)}</span>
                      <span className={`${difficultyBadge(scenario.difficulty)} font-semibold`}>{scenario.difficulty}</span>
                    </div>
                    <Link href={`/scenarios/${scenario.id}`} passHref>
                      <button className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">
                        시나리오 시작 <ArrowRight className="ml-2 h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))}
              {/* 네 번째 추천 시나리오를 위한 빈 칸 */}
              <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-5">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-semibold">맞춤 시나리오</p>
                  <p className="text-sm mt-1">AI와 함께 나만의 시나리오를 만들어보세요.</p>
                  <button className="mt-4 w-full bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors">
                    생성하기
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* All Available Scenarios */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">모든 시나리오</h2>
            <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시나리오 이름</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">예산</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">난이도</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">소요 기간</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">설명</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allScenarios.length > 0 ? allScenarios.map((scenario) => (
                      <tr key={scenario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{scenario.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatBudget(scenario.totalBudget)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${difficultyColor(scenario.difficulty)}`}>
                            {scenario.difficulty}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{scenario.totalDays}일</td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={scenario.description}>{scenario.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/scenarios/${scenario.id}`} className="text-blue-600 hover:text-blue-900 flex items-center">
                            상세 보기 <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-500">
                          해당 조건에 맞는 시나리오가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
             {/* Pagination */}
            <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-700">
                    총 {filteredScenarios.length}개 중 {allScenarios.length}개 결과 표시
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
