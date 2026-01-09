"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CASE_STATUS_META, CaseStatusKey } from "@/lib/investigationWorkflow";
import { useUserStore } from "@/lib/userStore";
import type {
  InvestigatorMeResponse,
  InvestigatorProfileDetail,
  InvestigationRequestSummary,
  RequestStatus,
} from "@/types/investigation";

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

interface TimelineFormState {
  type: "PROGRESS_NOTE" | "INTERIM_REPORT" | "FINAL_REPORT";
  title: string;
  note: string;
}

const TIMELINE_DEFAULT_STATE: TimelineFormState = {
  type: "PROGRESS_NOTE",
  title: "",
  note: "",
};

const TIMELINE_OPTIONS: Array<{ value: TimelineFormState["type"]; label: string }> = [
  { value: "PROGRESS_NOTE", label: "진행 메모" },
  { value: "INTERIM_REPORT", label: "중간 보고" },
  { value: "FINAL_REPORT", label: "최종 보고" },
];

const AVATAR_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB (Synced with backend limit)
const SUPPORTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

const statusKeyFromString = (value: string): CaseStatusKey => {
  return (Object.hasOwn(CASE_STATUS_META, value) ? value : "MATCHING") as CaseStatusKey;
};

const toSpecialtyTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          if ("label" in entry) {
            return String((entry as Record<string, unknown>).label ?? "");
          }
          if ("value" in entry) {
            return String((entry as Record<string, unknown>).value ?? "");
          }
        }
        return JSON.stringify(entry);
      })
      .filter((item) => item.trim().length > 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map((entry) =>
      typeof entry === "string" ? entry : JSON.stringify(entry),
    );
  }
  return [];
};

const formatDate = (iso: string | undefined | null): string => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
};

const compressImageToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Use 1024px to balance quality and Base64 size
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        // Quality 0.75 -> Reasonable size for Base64 (approx 300-500KB)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve(dataUrl);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/* 
const compressImageToBlob = async (file: File): Promise<Blob> => {
...
}; 
*/

/*
const compressImageToBlob = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200; // Increased to 1200px for better quality
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compression failed"));
          }
        }, "image/jpeg", 0.8); // 0.8 quality
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
*/

const InvestigatorDashboard = () => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);

  const [profile, setProfile] = useState<InvestigatorProfileDetail | null>(null);
  const [investigatorStatus, setInvestigatorStatus] = useState<string>("");
  const [cases, setCases] = useState<InvestigationRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [timelineForms, setTimelineForms] = useState<Record<number, TimelineFormState>>({});
  const [profileForm, setProfileForm] = useState({
    contactPhone: "",
    serviceArea: "",
    experienceYears: "",
    introduction: "",
    portfolioUrl: "",
    specialtiesText: "",
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  const pushToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4200);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const ensureInvestigator = useCallback(() => {
    if (!user) return false;
    if (user.role !== "investigator") {
      pushToast("error", "민간조사원 계정으로만 접근할 수 있습니다.");
      router.push("/");
      return false;
    }
    return true;
  }, [router, user, pushToast]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [meRes, casesRes] = await Promise.all([
        fetch("/api/me/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/investigation-requests?view=assigned", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (meRes.status === 401 || casesRes.status === 401) {
        router.push("/login?redirect=/investigator");
        return;
      }

      if (!meRes.ok) {
        const err = await meRes.json().catch(() => ({ error: "프로필 정보를 불러올 수 없습니다." }));
        pushToast("error", err?.error ?? "프로필 정보를 불러올 수 없습니다.");
        setLoading(false);
        return;
      }

      const meData = (await meRes.json()) as InvestigatorMeResponse;
      if (meData.role !== "INVESTIGATOR") {
        pushToast("error", "민간조사원 전용 페이지입니다.");
        router.push("/");
        return;
      }

      const caseData = (await casesRes.json().catch(() => [])) as InvestigationRequestSummary[];

      setProfile(meData.profile);
      setInvestigatorStatus(meData.investigatorStatus ?? "");
      setCases(Array.isArray(caseData) ? caseData : []);
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarPreview(meData.profile.avatarUrl ?? null);
      setAvatarFile(null);
      setRemoveAvatar(false);

      setProfileForm({
        contactPhone: meData.profile.contactPhone ?? "",
        serviceArea: meData.profile.serviceArea ?? "",
        experienceYears: String(meData.profile.experienceYears ?? ""),
        introduction: meData.profile.introduction ?? "",
        portfolioUrl: meData.profile.portfolioUrl ?? "",
        specialtiesText: toSpecialtyTags(meData.profile.specialties).join(", "),
      });

      setTimelineForms((prev) => {
        const next: Record<number, TimelineFormState> = {};
        for (const request of caseData) {
          next[request.id] = prev[request.id] ?? { ...TIMELINE_DEFAULT_STATE };
        }
        return next;
      });
    } catch (error) {
      console.error(error);
      pushToast("error", "대시보드 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [token, router, pushToast]);

  useEffect(() => {
    if (!token) {
      router.push("/login?redirect=/investigator");
      return;
    }
    if (!ensureInvestigator()) {
      return;
    }
    void loadDashboard();
  }, [token, ensureInvestigator, loadDashboard, router]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
  }, []);

  const categorizedCases = useMemo(() => {
    const pending: InvestigationRequestSummary[] = [];
    const active: InvestigationRequestSummary[] = [];
    const closed: InvestigationRequestSummary[] = [];

    for (const request of cases) {
      const key = statusKeyFromString(request.status);
      switch (key) {
        case "MATCHING":
          pending.push(request);
          break;
        case "ACCEPTED":
        case "IN_PROGRESS":
        case "REPORTING":
          active.push(request);
          break;
        default:
          closed.push(request);
      }
    }

    return { pending, active, closed };
  }, [cases]);

  const handleProfileChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!SUPPORTED_AVATAR_TYPES.includes(file.type)) {
      pushToast("error", "JPG, PNG, WEBP, GIF, AVIF 형식의 이미지만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > AVATAR_SIZE_LIMIT) {
      pushToast("error", "이미지 파일 용량은 5MB 이하로 업로드해주세요.");
      event.target.value = "";
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setAvatarPreview(objectUrl);
    setAvatarFile(file);
    setRemoveAvatar(false);
  };

  const handleAvatarRemove = () => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    setRemoveAvatar(true);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleProfileSave = async () => {
    if (!token) return;
    setProfileSaving(true);
    try {
      const specialties = profileForm.specialtiesText
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const trimmedExperience = profileForm.experienceYears.trim();
      if (trimmedExperience) {
        const years = Number(trimmedExperience);
        if (Number.isNaN(years) || years < 0) {
          pushToast("error", "경력 연수는 0 이상의 숫자로 입력하세요.");
          setProfileSaving(false);
          return;
        }
      }

      // Step 1: Text Data Update (PATCH)
      const textPayload: Record<string, unknown> = {
        contactPhone: profileForm.contactPhone || null,
        serviceArea: profileForm.serviceArea || null,
        introduction: profileForm.introduction || null,
        portfolioUrl: profileForm.portfolioUrl || null,
        specialties,
      };

      if (trimmedExperience) {
        textPayload.experienceYears = Number(trimmedExperience);
      } else if (profile?.experienceYears != null) {
        textPayload.experienceYears = null;
      }

      if (removeAvatar) {
        textPayload.removeAvatar = true;
      }

      // Send text update first (Lightweight)
      const textRes = await fetch(`/api/me/profile?_t=${Date.now()}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(textPayload),
      });

      if (!textRes.ok) {
        const data = await textRes.json().catch(() => null);
        const err = data?.error ?? "프로필 저장 실패";
        pushToast("error", err);
        setProfileSaving(false);
        return;
      }

      // Step 2: Avatar Update (POST) - Only if file exists
      if (avatarFile) {
        try {
          // Reverting to JSON Base64 transport to bypass WAF Multipart Block (403).
          // DB column is now LongText, so it can handle the Base64 string.
          const base64 = await compressImageToBase64(avatarFile);
          const avatarPayload = { avatarBase64: base64 };
          
          // Debug payload size
          console.log(`Uploading avatar via JSON. Size: ${Math.round(base64.length/1024)}KB`);

          const avatarRes = await fetch(`/api/me/profile?_t=${Date.now()}_img`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(avatarPayload),
          });

          if (!avatarRes.ok) {
             console.warn("Avatar upload failed", avatarRes.status);
             if (avatarRes.status === 413) {
                 pushToast("info", "이미지 용량이 서버 허용 한도(413)를 초과했습니다.");
             } else if (avatarRes.status === 403) {
                 const errMsg = await avatarRes.text().catch(() => "Access Denied");
                 pushToast("info", `403 Forbidden: ${errMsg.substring(0, 100)}`);
             } else {
                 const errMsg = await avatarRes.text().catch(() => "Unknown error");
                 pushToast("info", `이미지 저장 중 오류 발생 (${avatarRes.status}): ${errMsg.substring(0, 50)}`);
             }
          } else {
             const resJson = await avatarRes.json();
             if (resJson.warning === 'IMAGE_UPLOAD_SYSTEM_LIMIT') {
                 pushToast("info", "프로필은 저장되었으나, 이미지가 시스템 용량 제한(5MB)을 초과하여 저장되지 않았습니다.");
             } else {
                 pushToast("success", "프로필과 이미지가 모두 저장되었습니다.");
             }
          }
        } catch (e) {
          console.error("File read error", e);
          pushToast("info", "텍스트는 저장되었으나 이미지 처리에 실패했습니다.");
        }
      } else {
        pushToast("success", "프로필이 저장되었습니다.");
      }

      await loadDashboard();
    } catch (error) {
      console.error(error);
      pushToast("error", "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setProfileSaving(false);
    }
  };

  const setCaseActionLoading = (id: number, value: boolean) => {
    setActionLoading((prev) => ({ ...prev, [id]: value }));
  };

  const refreshAfterAction = async () => {
    await loadDashboard();
  };

  const handleStatusUpdate = async (
    requestId: number,
    nextStatus: RequestStatus,
    extra: Record<string, unknown> = {},
  ) => {
    if (!token) return;
    setCaseActionLoading(requestId, true);
    try {
      const res = await fetch(`/api/investigation-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus, ...extra }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data?.error ?? "사건 상태를 업데이트하지 못했습니다.";
        pushToast("error", message);
        return;
      }
      pushToast("success", "사건 상태가 업데이트되었습니다.");
      await refreshAfterAction();
    } catch (error) {
      console.error(error);
      pushToast("error", "상태 변경 중 오류가 발생했습니다.");
    } finally {
      setCaseActionLoading(requestId, false);
    }
  };

  const handleTimelineSubmit = async (requestId: number) => {
    if (!token) return;
    const form = timelineForms[requestId] ?? TIMELINE_DEFAULT_STATE;
    if (!form.note.trim() && !form.title.trim()) {
      pushToast("error", "내용 또는 제목을 입력해주세요.");
      return;
    }
    setCaseActionLoading(requestId, true);
    try {
      const res = await fetch(`/api/investigation-requests/${requestId}/timeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim() || null,
          note: form.note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.error ?? "타임라인을 추가하지 못했습니다.";
        pushToast("error", message);
        return;
      }
      pushToast("success", "타임라인에 메모가 추가되었습니다.");
      setTimelineForms((prev) => ({
        ...prev,
        [requestId]: { ...TIMELINE_DEFAULT_STATE },
      }));
      await refreshAfterAction();
    } catch (error) {
      console.error(error);
      pushToast("error", "타임라인 추가 중 오류가 발생했습니다.");
    } finally {
      setCaseActionLoading(requestId, false);
    }
  };

  const renderCaseCard = (request: InvestigationRequestSummary) => {
    const statusKey = statusKeyFromString(request.status);
    const statusMeta = CASE_STATUS_META[statusKey];
    const actionBusy = Boolean(actionLoading[request.id]);
    const timelineForm = timelineForms[request.id] ?? TIMELINE_DEFAULT_STATE;

    const customerName = request.user?.name ?? "의뢰인 정보 없음";
    const customerEmail = request.user?.email ?? "-";

    const isActionable = ["MATCHING", "ACCEPTED", "IN_PROGRESS", "REPORTING"].includes(statusKey);
    const showTimelineForm = ["ACCEPTED", "IN_PROGRESS", "REPORTING"].includes(statusKey);

    return (
      <article
        key={request.id}
        className="lira-card lira-card--padded transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}
              >
                {statusMeta.label}
              </span>
              <span className="text-[11px] text-slate-400">
                최근 업데이트 {formatDate(request.updatedAt)}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{request.title}</h3>
            <p className="mt-2 text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">
              {request.details}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              의뢰인: <span className="font-medium text-slate-800">{customerName}</span>
              <span className="ml-2 text-slate-400">{customerEmail}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-wrap justify-end gap-2">
              {statusKey === "MATCHING" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleStatusUpdate(request.id, "ACCEPTED")}
                    disabled={actionBusy}
                    className="lira-button lira-button--primary text-xs"
                  >
                    {actionBusy ? "처리 중..." : "사건 수락"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("거절 사유를 입력하세요.");
                      if (!reason) return;
                      void handleStatusUpdate(request.id, "DECLINED", { declineReason: reason });
                    }}
                    disabled={actionBusy}
                    className="lira-button lira-button--danger text-xs"
                  >
                    사건 거절
                  </button>
                </>
              )}
              {statusKey === "ACCEPTED" && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(request.id, "IN_PROGRESS", { statusNote: "조사를 시작했습니다." })}
                  disabled={actionBusy}
                  className="lira-button lira-button--indigo text-xs"
                >
                  조사 시작
                </button>
              )}
              {statusKey === "IN_PROGRESS" && (
                <button
                  type="button"
                  onClick={() => handleStatusUpdate(request.id, "REPORTING")}
                  disabled={actionBusy}
                  className="lira-button lira-button--info text-xs"
                >
                  보고 준비
                </button>
              )}
              {statusKey === "REPORTING" && (
                <button
                  type="button"
                  onClick={() => {
                    const note = window.prompt("완료 메모를 입력해주세요 (선택)") ?? "";
                    void handleStatusUpdate(request.id, "COMPLETED", { completionNote: note });
                  }}
                  disabled={actionBusy}
                  className="lira-button lira-button--blue text-xs"
                >
                  사건 완료
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/investigation-requests/${request.id}`}
                className="lira-button lira-button--secondary text-xs"
              >
                상세 보기 ↗
              </Link>
              <Link
                href={`/investigation-requests/${request.id}/chat`}
                className="lira-button lira-button--accent text-xs"
              >
                채팅방 이동
              </Link>
            </div>
          </div>
        </div>

        {isActionable && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
              <p className="text-xs font-semibold text-slate-500">예산 범위</p>
              <p className="mt-2 text-base font-semibold text-slate-800">
                {request.budgetMin != null ? request.budgetMin.toLocaleString("ko-KR") : "-"} ₩ ~
                {" "}
                {request.budgetMax != null ? request.budgetMax.toLocaleString("ko-KR") : "-"} ₩
              </p>
              {request.scenario && (
                <p className="mt-2 text-xs text-slate-400">
                  연관 시나리오: {request.scenario.title} · {request.scenario.category ?? "카테고리 없음"}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
              <p className="text-xs font-semibold text-slate-500">최근 활동</p>
              {request.timeline.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">타임라인 기록이 없습니다.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-xs">
                  {[...request.timeline]
                    .slice(-3)
                    .reverse()
                    .map((entry) => (
                      <li key={entry.id}>
                        <span className="font-semibold">{entry.type}</span> · {formatDate(entry.createdAt)}
                        {entry.note && <span className="block text-slate-500">{entry.note}</span>}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {showTimelineForm && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-700">타임라인 기록 추가</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_2fr]">
              <select
                value={timelineForm.type}
                onChange={(event) =>
                  setTimelineForms((prev) => ({
                    ...prev,
                    [request.id]: { ...timelineForm, type: event.target.value as TimelineFormState["type"] },
                  }))
                }
                className="lira-select"
              >
                {TIMELINE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={timelineForm.title}
                onChange={(event) =>
                  setTimelineForms((prev) => ({
                    ...prev,
                    [request.id]: { ...timelineForm, title: event.target.value },
                  }))
                }
                className="lira-input"
                placeholder="메모 제목 (선택)"
              />
            </div>
            <textarea
              value={timelineForm.note}
              onChange={(event) =>
                setTimelineForms((prev) => ({
                  ...prev,
                  [request.id]: { ...timelineForm, note: event.target.value },
                }))
              }
              className="mt-3 lira-textarea"
              rows={3}
              placeholder="진행 상황 또는 보고 내용을 입력하세요."
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => handleTimelineSubmit(request.id)}
                disabled={actionBusy}
                className="lira-button lira-button--primary text-xs"
              >
                타임라인 추가
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };

  const profileSpecialties = toSpecialtyTags(profile?.specialties ?? null);
  const investigatorDisplayName = user?.name ?? "민간조사원";
  const investigatorInitials = useMemo(() => {
    const raw = user?.name ?? "";
    if (!raw.trim()) return "L";
    const parts = raw.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [user?.name]);

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-12">
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ring-1 ring-black/5 ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : toast.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-base">
                  {toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}
                </span>
                <div className="flex-1 leading-relaxed">{toast.message}</div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="pointer-events-auto text-xs text-slate-400 transition hover:text-slate-600"
                >
                  닫기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lira-container flex flex-col gap-8">
        <header className="lira-section">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Investigator HQ</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">내 정보 & 사건 허브</h1>
              <p className="mt-2 text-sm text-slate-500">
                프로필을 최신으로 유지하고, 의뢰받은 사건을 실시간으로 관리하세요.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
              <p className="font-semibold">현재 등급</p>
              <p className="mt-1 text-sm font-bold">
                {investigatorStatus ? investigatorStatus.replace(/_/g, " ") : "-"}
              </p>
              <p className="mt-2 text-xs text-emerald-600/70">
                상태 변경은 관리자 심사 후 자동 갱신됩니다.
              </p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1.2fr]">
          <article className="lira-section">
            <h2 className="lira-section-title">프로필 관리</h2>
            {loading && !profile ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleProfileSave();
                }}
              >
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-5">
                  <p className="text-sm font-semibold text-slate-600">프로필 이미지</p>
                  <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative h-28 w-28 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                      {avatarPreview ? (
                        <Image
                          src={avatarPreview}
                          alt={`${investigatorDisplayName} 프로필 미리보기`}
                          fill
                          sizes="112px"
                          className="object-cover"
                          priority
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-200 via-blue-200 to-sky-300 text-2xl font-semibold uppercase tracking-wide text-white">
                          {investigatorInitials}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-3 text-xs text-slate-500">
                      <p className="leading-relaxed">
                        얼굴이 잘 드러나는 정사각형 이미지를 업로드해주세요. 지원 형식: JPG, PNG, WEBP, GIF, AVIF · 최대 용량 5MB.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="lira-button lira-button--secondary text-xs"
                        >
                          이미지 변경
                        </button>
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={handleAvatarRemove}
                            className="lira-button lira-button--ghost text-xs"
                          >
                            이미지 제거
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="lira-field">
                    연락처
                    <input
                      value={profileForm.contactPhone}
                      onChange={(event) => handleProfileChange("contactPhone", event.target.value)}
                      className="lira-input"
                      placeholder="010-1234-5678"
                    />
                  </label>
                  <label className="lira-field">
                    활동 지역
                    <input
                      value={profileForm.serviceArea}
                      onChange={(event) => handleProfileChange("serviceArea", event.target.value)}
                      className="lira-input"
                      placeholder="서울 · 경기"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="lira-field">
                    경력 (연)
                    <input
                      value={profileForm.experienceYears}
                      onChange={(event) => handleProfileChange("experienceYears", event.target.value)}
                      className="lira-input"
                      placeholder="5"
                    />
                  </label>
                  <label className="lira-field">
                    포트폴리오 URL
                    <input
                      value={profileForm.portfolioUrl}
                      onChange={(event) => handleProfileChange("portfolioUrl", event.target.value)}
                      className="lira-input"
                      placeholder=""
                    />
                  </label>
                </div>
                <label className="lira-field">
                  전문 분야 (쉼표로 구분)
                  <input
                    value={profileForm.specialtiesText}
                    onChange={(event) => handleProfileChange("specialtiesText", event.target.value)}
                    className="lira-input"
                    placeholder="기업 조사, 디지털 포렌식"
                  />
                </label>
                <label className="lira-field">
                  소개
                  <textarea
                    value={profileForm.introduction}
                    onChange={(event) => handleProfileChange("introduction", event.target.value)}
                    rows={3}
                    className="lira-textarea"
                    placeholder="전문 분야와 경험을 소개해주세요."
                  />
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="lira-button lira-button--primary"
                  >
                    {profileSaving ? "저장 중..." : "프로필 저장"}
                  </button>
                </div>
              </form>
            )}
          </article>

          <aside className="lira-section">
            <h2 className="lira-section-title">프로필 요약</h2>
            <div className="mt-4 flex items-center gap-4 rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt={`${investigatorDisplayName} 프로필 이미지`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-200 via-blue-200 to-sky-300 text-xl font-semibold uppercase tracking-wide text-white">
                    {investigatorInitials}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-700">{investigatorDisplayName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {profile?.serviceArea ? `활동 지역 · ${profile.serviceArea}` : "활동 지역 정보를 추가해주세요."}
                </p>
                {profile?.contactPhone && (
                  <p className="mt-1 text-xs text-slate-400">☎ {profile.contactPhone}</p>
                )}
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="lira-stat">
                <dt className="font-semibold text-slate-500">라이선스</dt>
                <dd>{profile?.licenseNumber || "등록되지 않음"}</dd>
              </div>
              <div className="lira-stat">
                <dt className="font-semibold text-slate-500">경력</dt>
                <dd>{profile?.experienceYears ?? 0} 년</dd>
              </div>
              <div className="rounded-xl bg-slate-50/80 px-3 py-3">
                <dt className="text-sm font-semibold text-slate-500">전문 분야</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {profileSpecialties.length === 0 ? (
                    <span className="text-xs text-slate-400">등록된 전문 분야가 없습니다.</span>
                  ) : (
                    profileSpecialties.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                      >
                        {item}
                      </span>
                    ))
                  )}
                </dd>
              </div>
              <div className="lira-stat text-xs">
                <dt>가입일</dt>
                <dd>{formatDate(profile?.createdAt ?? null)}</dd>
              </div>
              <div className="lira-stat text-xs">
                <dt>최근 업데이트</dt>
                <dd>{formatDate(profile?.updatedAt ?? null)}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="space-y-6">
          <header className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-[#1a2340]">사건 현황</h2>
            <p className="text-sm text-slate-500">
              {cases.length === 0
                ? "아직 받은 사건이 없습니다."
                : `총 ${cases.length}건의 사건을 관리 중입니다.`}
            </p>
          </header>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {categorizedCases.pending.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">대기 중 사건</h3>
                  <div className="space-y-4">
                    {categorizedCases.pending.map((request) => renderCaseCard(request))}
                  </div>
                </div>
              )}

              {categorizedCases.active.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">진행 중 사건</h3>
                  <div className="space-y-4">
                    {categorizedCases.active.map((request) => renderCaseCard(request))}
                  </div>
                </div>
              )}

              {categorizedCases.closed.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">종료/취소 사건</h3>
                  <div className="space-y-4">
                    {categorizedCases.closed.map((request) => renderCaseCard(request))}
                  </div>
                </div>
              )}

              {cases.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500">
                  의뢰받은 사건이 없습니다. 디렉터리에서 고객과 연결을 기다려보세요.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default InvestigatorDashboard;
