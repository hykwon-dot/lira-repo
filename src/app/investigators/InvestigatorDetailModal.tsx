"use client";

import { useEffect, useState, useRef } from "react";
import { X, MapPin, Briefcase, FileText, Edit2, Save, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useUserStore } from "@/lib/userStore";

type InvestigatorRecord = {
  id: number;
  user: {
    name: string | null;
    email: string;
  } | null;
  introduction: string | null;
  serviceArea: string | null;
  specialties: unknown;
  avatarUrl: string | null;
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
  const { user } = useUserStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    introduction: "",
    serviceArea: "",
    specialtiesJson: "",
    avatarUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({}); // type -> status msg

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      setIsEditing(false); // Reset edit mode on close
      setUploadStatus({});
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (investigator) {
      setFormData({
        introduction: investigator.introduction || "",
        serviceArea: investigator.serviceArea || "",
        specialtiesJson: JSON.stringify(investigator.specialties, null, 2),
        avatarUrl: investigator.avatarUrl || "",
      });
    }
  }, [investigator]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileRead = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await handleFileRead(e.target.files[0]);
        setFormData((prev) => ({ ...prev, avatarUrl: base64 }));
      } catch (err) {
        console.error("Avatar read error", err);
        alert("이미지 읽기 실패");
      }
    }
  };

  const handleDocumentUpload = async (type: string, file: File) => {
    if (!investigator) return;
    setUploadStatus(prev => ({ ...prev, [type]: "uploading" }));
    
    try {
      const base64 = await handleFileRead(file);
      
      const res = await fetch(`/api/admin/investigators/${investigator.id}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, data: base64 }),
      });

      if (!res.ok) throw new Error('Upload failed');
      
      setUploadStatus(prev => ({ ...prev, [type]: "success" }));
      setTimeout(() => {
         setUploadStatus(prev => {
             const newStatus = {...prev};
             delete newStatus[type];
             return newStatus;
         });
      }, 3000);
    } catch (err) {
      console.error(err);
      setUploadStatus(prev => ({ ...prev, [type]: "error" }));
    }
  };

  const handleSave = async () => {
    if (!investigator) return;
    setIsSaving(true);
    try {
      // Validate JSON
      let specialtiesParsed;
      try {
        specialtiesParsed = JSON.parse(formData.specialtiesJson);
      } catch (e) {
        alert("전문 분야 JSON 형식이 올바르지 않습니다.");
        setIsSaving(false);
        return;
      }

      const res = await fetch(`/api/admin/investigators/${investigator.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          introduction: formData.introduction,
          serviceArea: formData.serviceArea,
          specialties: specialtiesParsed,
          avatarUrl: formData.avatarUrl,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      
      alert("정보가 수정되었습니다. (새로고침 후 반영)");
      setIsEditing(false);
      // In a real app, we should update the `investigator` prop or refetch data
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || !isOpen || !investigator) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {investigator.user?.name ?? "정보 없음"} 
              <span className="text-base font-normal text-slate-500 ml-2">민간조사원 상세정보</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors"
              >
                <Edit2 className="w-4 h-4" /> 관리자 수정
              </button>
            )}
            {isAdmin && isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                  disabled={isSaving}
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4" /> {isSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-8 space-y-8 overflow-y-auto">
          {/* Avatar Edit for Admin */}
          {isEditing && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
               <h3 className="text-sm font-semibold text-slate-700 mb-2">프로필 이미지 변경</h3>
               <div className="flex items-center gap-4">
                  {formData.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.avatarUrl} alt="Preview" className="w-16 h-16 rounded-full object-cover border" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
               </div>
            </div>
          )}

          {/* Introduction Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
              <FileText className="w-5 h-5" />
              <h3>자기소개</h3>
            </div>
            {isEditing ? (
              <textarea
                value={formData.introduction}
                onChange={(e) => handleInputChange("introduction", e.target.value)}
                className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm leading-relaxed outline-none resize-none"
                placeholder="자기소개를 입력하세요..."
              />
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap text-sm border border-slate-100 shadow-sm">
                {investigator.introduction || "등록된 소개가 없습니다."}
              </div>
            )}
          </div>

          {/* Service Area Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
              <MapPin className="w-5 h-5" />
              <h3>활동 지역</h3>
            </div>
            {isEditing ? (
              <input
                type="text"
                value={formData.serviceArea}
                onChange={(e) => handleInputChange("serviceArea", e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm outline-none"
                placeholder="예: 서울, 경기, 부산..."
              />
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl text-slate-700 leading-relaxed text-sm border border-slate-100 shadow-sm">
                {translateRegion(investigator.serviceArea)}
              </div>
            )}
          </div>

          {/* Specialties Section */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-indigo-600 font-semibold">
              <Briefcase className="w-5 h-5" />
              <h3>전문 분야</h3>
            </div>
            {isEditing ? (
              <div>
                <textarea
                  value={formData.specialtiesJson}
                  onChange={(e) => handleInputChange("specialtiesJson", e.target.value)}
                  className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-sm font-mono outline-none resize-none"
                  placeholder='JSON 배열 형태로 입력하세요. 예: ["가정", "기업"]'
                />
                <p className="mt-2 text-xs text-slate-400">
                  * 전문 분야는 JSON 형식을 따릅니다. 배열이나 객체 형태로 입력해주세요.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-sm">
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
            )}
          </div>

          {/* Admin Documents Upload Section */}
          {isAdmin && isEditing && (
             <div className="pt-6 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">관리자 자료 업로드</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'businessLicense', label: '사업자등록증' },
                    { key: 'pledge', label: '서약서' },
                    { key: 'terms', label: '이용약관 동의서' },
                    { key: 'idCard', label: '신분증 사본' }
                  ].map((doc) => (
                    <div key={doc.key} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                       <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-semibold text-slate-700">{doc.label}</label>
                          {uploadStatus[doc.key] === "uploading" && <span className="text-xs text-indigo-600 animate-pulse">업로드 중...</span>}
                          {uploadStatus[doc.key] === "success" && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 완료</span>}
                          {uploadStatus[doc.key] === "error" && <span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> 실패</span>}
                       </div>
                       <input 
                         type="file" 
                         onChange={(e) => e.target.files?.[0] && handleDocumentUpload(doc.key, e.target.files[0])}
                         className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 border border-slate-200 rounded-full"
                       />
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
        
        {!isEditing && (
           <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
