"use client";

import { useEffect, useState } from "react";
import { X, MapPin, Briefcase, FileText } from "lucide-react";
import { createPortal } from "react-dom";

type InvestigatorRecord = {
  id: number;
  user: {
    name: string | null;
    email: string;
  } | null;
  introduction: string | null;
  serviceArea: string | null;
  specialties: unknown;
  // ... add other fields if needed for modal display
};

interface InvestigatorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  investigator: InvestigatorRecord | null;
  formatSpecialties: (specialties: unknown) => string[];
  translateRegion: (regionString: string | null) => string;
}

export default function InvestigatorDetailModal({
  isOpen,
  onClose,
  investigator,
  formatSpecialties,
  translateRegion,
}: InvestigatorDetailModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen || !investigator) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {investigator.user?.name ?? "정보 없음"} 민간조사원
          </h2>
          <p className="text-sm text-slate-500 mb-8">상세 프로필 정보</p>

          <div className="space-y-8">
            {/* Introduction Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
                <FileText className="w-5 h-5" />
                <h3>자기소개</h3>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap text-sm border border-slate-100">
                {investigator.introduction || "등록된 소개가 없습니다."}
              </div>
            </div>

            {/* Service Area Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
                <MapPin className="w-5 h-5" />
                <h3>활동 지역</h3>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl text-slate-700 leading-relaxed text-sm border border-slate-100">
                {translateRegion(investigator.serviceArea)}
              </div>
            </div>

            {/* Specialties Section */}
            <div>
              <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
                <Briefcase className="w-5 h-5" />
                <h3>전문 분야</h3>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="flex flex-wrap gap-2">
                  {formatSpecialties(investigator.specialties).length > 0 ? (
                    formatSpecialties(investigator.specialties).map((spec, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-full bg-white border border-indigo-100 px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm"
                      >
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-sm">등록된 전문 분야가 없습니다.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
