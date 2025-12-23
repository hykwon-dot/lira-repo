"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CustomerMeResponse,
  type CustomerProfileDetail,
  type EnterpriseOrganizationsPayload,
  type InvestigatorMeResponse,
  type InvestigatorProfileDetail,
  type InvestigationRequestSummary,
  type OrganizationMembershipSummary,
  type OrganizationMemberSummary,
  type OrganizationSummary,
} from "@/types/investigation";
import { useUserStore } from "@/lib/userStore";

interface QuickLink {
  href: string;
  label: string;
  description: string;
  tone?: "primary" | "secondary" | "accent" | "ghost";
}

type DashboardView = "customer" | "enterprise" | "investigator" | "admin" | "guest";

const MEMBER_ROLE_LABEL: Record<OrganizationMemberSummary["role"], string> = {
  OWNER: "소유자",
  ADMIN: "관리자",
  MEMBER: "구성원",
};

const MEMBER_ROLE_BADGE: Record<OrganizationMemberSummary["role"], string> = {
  OWNER: "bg-indigo-100 text-indigo-700",
  ADMIN: "bg-sky-100 text-sky-700",
  MEMBER: "bg-slate-100 text-slate-600",
};

type ProfilePayload =
  | { view: "customer"; profile: CustomerProfileDetail | null }
  | { view: "investigator"; profile: InvestigatorProfileDetail | null }
  | { view: "enterprise"; organizations: EnterpriseOrganizationsPayload }
  | { view: "admin" | "guest"; profile: null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseCaseSummaries = async (
  response?: Response,
): Promise<InvestigationRequestSummary[]> => {
  if (!response || !response.ok) return [];
  const payload = (await response.json().catch(() => [])) as unknown;
  return Array.isArray(payload) ? (payload as InvestigationRequestSummary[]) : [];
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
};

const ensureDashboardView = (role: string | undefined | null): DashboardView => {
  if (!role) return "guest";
  if (role === "investigator") return "investigator";
  if (role === "enterprise") return "enterprise";
  if (role === "admin" || role === "super_admin") return "admin";
  return "customer";
};

export default function MyPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfilePayload>({ view: "guest", profile: null });
  const [cases, setCases] = useState<InvestigationRequestSummary[]>([]);

  const dashboardView = ensureDashboardView(user?.role);

  useEffect(() => {
    if (!user) {
      router.replace("/login?redirect=/my-page");
      return;
    }
    if (!token) {
      router.replace("/login?redirect=/my-page");
      return;
    }

    const load = async () => {
      if (dashboardView === "admin") {
        setProfileData({ view: "admin", profile: null });
        setCases([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const requests: Array<Promise<Response>> = [
          fetch("/api/me/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ];

        if (dashboardView === "customer") {
          requests.push(
            fetch("/api/investigation-requests?view=customer", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          );
        }

        if (dashboardView === "investigator") {
          requests.push(
            fetch("/api/investigation-requests?view=assigned", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }),
          );
        }

        const [profileRes, casesRes] = await Promise.all(requests);

        const profileJson = await profileRes
          .json()
          .catch(() => ({ error: "프로필 정보를 불러올 수 없습니다." } as { error?: string }));

        if (profileRes.status === 401) {
          router.replace("/login?redirect=/my-page");
          return;
        }

        if (!profileRes.ok) {
          const message = isRecord(profileJson) && typeof profileJson.error === "string"
            ? profileJson.error
            : "프로필 정보를 불러올 수 없습니다.";
          throw new Error(message);
        }

        if (dashboardView === "customer") {
          const payload = profileJson as CustomerMeResponse;
          setProfileData({ view: "customer", profile: payload.profile ?? null });

          const caseList = await parseCaseSummaries(casesRes);
          setCases(caseList.slice(0, 4));
        } else if (dashboardView === "investigator") {
          const payload = profileJson as InvestigatorMeResponse;
          setProfileData({ view: "investigator", profile: payload.profile ?? null });

          const caseList = await parseCaseSummaries(casesRes);
          setCases(caseList.slice(0, 4));
        } else if (dashboardView === "enterprise") {
          const payload = profileJson as { organizations?: EnterpriseOrganizationsPayload };
          const owned = Array.isArray(payload.organizations?.owned)
            ? payload.organizations!.owned.map((org) => ({
                ...org,
                members: Array.isArray(org.members) ? org.members : [],
              }))
            : [];
          const memberships = Array.isArray(payload.organizations?.memberships)
            ? payload.organizations!.memberships.filter((membership) => Boolean(membership?.organization))
            : [];
          setProfileData({
            view: "enterprise",
            organizations: {
              owned,
              memberships,
            },
          });
          setCases([]);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "내 페이지를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [dashboardView, router, token, user]);

  const quickLinks: QuickLink[] = useMemo(() => {
    if (dashboardView === "customer") {
      return [
        {
          href: "/customer",
          label: "사건 대시보드",
          description: "의뢰 진행 현황과 타임라인 확인",
          tone: "primary",
        },
        {
          href: "/scenarios",
          label: "시나리오 라이브러리",
          description: "상황별 사례와 실행 계획 탐색",
        },
        {
          href: "/simulation",
          label: "AI 시뮬레이션",
          description: "맞춤형 의사결정 지원 시뮬레이션",
        },
      ];
    }

    if (dashboardView === "enterprise") {
      return [
        {
          href: "/customer",
          label: "조직 사건 관리",
          description: "엔터프라이즈 의뢰와 요청 현황 파악",
          tone: "primary",
        },
        {
          href: "/report",
          label: "리포트 센터",
          description: "AI 분석 리포트와 통찰 확인",
        },
        {
          href: "/scenarios",
          label: "시나리오 라이브러리",
          description: "산업별 실행 시나리오 탐색",
        },
      ];
    }

    if (dashboardView === "investigator") {
      return [
        {
          href: "/investigator",
          label: "조사원 허브",
          description: "프로필과 사건을 한 번에 관리",
          tone: "primary",
        },
        {
          href: "/investigation-requests",
          label: "사건 요청함",
          description: "새로운 요청과 상태 업데이트 확인",
        },
        {
          href: "/report",
          label: "리포트 센터",
          description: "작성 중인 보고서를 모아보기",
        },
      ];
    }

    if (dashboardView === "admin") {
      return [
        {
          href: "/admin",
          label: "관리자 대시보드",
          description: "포털 데이터 및 시나리오 운영",
          tone: "primary",
        },
        {
          href: "/admin/scenarios",
          label: "시나리오 관리",
          description: "라이브러리 업데이트 및 승인",
        },
      ];
    }

    return [
      {
        href: "/login",
        label: "로그인",
        description: "개인화된 정보를 확인하려면 로그인",
        tone: "primary",
      },
    ];
  }, [dashboardView]);

  const customerProfile = profileData.view === "customer" ? profileData.profile : null;
  const investigatorProfile = profileData.view === "investigator" ? profileData.profile : null;
  const enterpriseOrganizations = profileData.view === "enterprise" ? profileData.organizations : null;
  const enterpriseOwnedOrganizations = enterpriseOrganizations?.owned ?? ([] as OrganizationSummary[]);

  const enterpriseOverview = useMemo(() => {
    if (dashboardView !== "enterprise" || !enterpriseOrganizations) {
      return {
        owned: 0,
        totalMembers: 0,
        externalMemberships: 0,
        primaryCreatedAt: null,
        lastUpdatedAt: null,
      } as const;
    }
    const owned = enterpriseOrganizations.owned.length;
    const totalMembers = enterpriseOrganizations.owned.reduce(
      (acc, org) => acc + (Array.isArray(org.members) ? org.members.length : 0),
      0,
    );
    const ownerUserId = user?.id ? Number(user.id) : null;
    const externalMemberships = enterpriseOrganizations.memberships.filter((membership) => {
      if (!membership?.organization) return false;
      if (ownerUserId != null && membership.organization.ownerId === ownerUserId) {
        return false;
      }
      return true;
    }).length;
    const sortedByCreated = [...enterpriseOrganizations.owned].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
    const sortedByUpdated = [...enterpriseOrganizations.owned].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : Number.NEGATIVE_INFINITY;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : Number.NEGATIVE_INFINITY;
      return bTime - aTime;
    });
    const primaryCreatedAt = sortedByCreated[0]?.createdAt ?? null;
    const lastUpdatedAt = sortedByUpdated[0]?.updatedAt ?? null;
    return { owned, totalMembers, externalMemberships, primaryCreatedAt, lastUpdatedAt } as const;
  }, [dashboardView, enterpriseOrganizations, user]);

  const ownerUserId = user?.id ? Number(user.id) : null;
  const externalMemberships = enterpriseOrganizations
    ? enterpriseOrganizations.memberships.filter((membership) => {
        if (!membership?.organization) return false;
        if (ownerUserId != null && membership.organization.ownerId === ownerUserId) {
          return false;
        }
        return true;
      })
    : ([] as OrganizationMembershipSummary[]);

  const recentCases = cases.slice(0, 4);
  const detailHref =
    dashboardView === "investigator"
      ? "/investigator"
      : dashboardView === "customer"
      ? "/customer"
      : dashboardView === "enterprise"
      ? "/customer"
      : "/admin";

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-12">
      <div className="lira-container flex flex-col gap-6">
        <header className="lira-section">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">My Workspace</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">
                {user ? `${user.name}님의 개인 허브` : "내 페이지"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                최근 활동, 프로필, 사건 현황을 한눈에 모았습니다. 필요한 작업을 바로 이어가세요.
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              <p className="font-semibold">현재 역할</p>
              <p className="mt-1 text-lg font-bold uppercase">
                {dashboardView === "customer"
                  ? user?.role === "enterprise"
                    ? "ENTERPRISE CLIENT"
                    : "CUSTOMER"
                  : dashboardView === "investigator"
                  ? "INVESTIGATOR"
                  : dashboardView === "admin"
                  ? "ADMIN"
                  : "GUEST"}
              </p>
              <p className="mt-2 text-xs text-emerald-600/70">
                {dashboardView === "customer"
                  ? "맞춤 추천과 사건 관리를 이용해 보세요."
                  : dashboardView === "investigator"
                  ? "배정된 사건을 빠르게 업데이트할 수 있습니다."
                  : dashboardView === "admin"
                  ? "운영 현황과 승인 요청을 확인하세요."
                  : "로그인 후 개인화된 허브를 사용할 수 있습니다."}
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="lira-section border border-rose-200 bg-rose-50/70 text-sm text-rose-600">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
          <article className="lira-section space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="lira-section-title">프로필 스냅샷</h2>
                <p className="lira-subtitle">핵심 정보와 최근 업데이트 상황입니다.</p>
              </div>
              {dashboardView !== "guest" && (
                <Link
                  href={detailHref}
                  className="lira-button lira-button--secondary"
                >
                  자세히 보기
                </Link>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : dashboardView === "enterprise" && enterpriseOrganizations ? (
              <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="lira-stat">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">소유 조직</dt>
                  <dd className="text-sm font-semibold text-slate-800">{enterpriseOverview.owned}</dd>
                </div>
                <div className="lira-stat">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">총 멤버 수</dt>
                  <dd className="text-sm font-semibold text-slate-800">{enterpriseOverview.totalMembers}</dd>
                </div>
                <div className="lira-stat">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">외부 협업 조직</dt>
                  <dd className="text-sm font-semibold text-slate-800">{enterpriseOverview.externalMemberships}</dd>
                </div>
                <div className="lira-stat">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">대표 조직 타임라인</dt>
                  <dd className="text-sm font-semibold text-slate-800">
                    {enterpriseOverview.primaryCreatedAt
                      ? `${formatDateTime(enterpriseOverview.primaryCreatedAt)} 생성`
                      : "등록된 조직이 없습니다."}
                    {enterpriseOverview.lastUpdatedAt
                      ? ` · 최근 업데이트 ${formatDateTime(enterpriseOverview.lastUpdatedAt)}`
                      : ""}
                  </dd>
                </div>
              </dl>
            ) : (
              <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="lira-stat">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">계정 생성일</dt>
                  <dd className="text-sm font-semibold text-slate-800">
                    {dashboardView === "investigator"
                      ? formatDateTime(investigatorProfile?.createdAt ?? null)
                      : dashboardView === "customer"
                      ? formatDateTime(customerProfile?.createdAt ?? null)
                      : "-"}
                  </dd>
                </div>
                <div className="lira-stat">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">최근 수정</dt>
                  <dd className="text-sm font-semibold text-slate-800">
                    {dashboardView === "investigator"
                      ? formatDateTime(investigatorProfile?.updatedAt ?? null)
                      : dashboardView === "customer"
                      ? formatDateTime(customerProfile?.updatedAt ?? null)
                      : "-"}
                  </dd>
                </div>
                {dashboardView === "customer" && customerProfile ? (
                  <div className="lira-stat">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">선호 예산</dt>
                    <dd className="text-sm font-semibold text-slate-800">
                      {`${customerProfile.budgetMin?.toLocaleString("ko-KR") ?? "-"}₩ ~ ${customerProfile.budgetMax?.toLocaleString("ko-KR") ?? "-"}₩`}
                    </dd>
                  </div>
                ) : null}
                {dashboardView === "investigator" && investigatorProfile ? (
                  <div className="lira-stat">
                    <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">주요 활동 지역</dt>
                    <dd className="text-sm font-semibold text-slate-800">
                      {investigatorProfile.serviceArea ?? "등록 필요"}
                    </dd>
                  </div>
                ) : null}
              </dl>
            )}

            {dashboardView === "customer" && profileData.view === "customer" && profileData.profile?.preferredCaseTypes?.length ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">관심 사건 유형</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profileData.profile.preferredCaseTypes.map((tag, index) => (
                    <span key={`${tag}-${index}`} className="lira-pill-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {dashboardView === "investigator" && profileData.view === "investigator" && profileData.profile?.specialties ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">전문 분야</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.isArray(profileData.profile.specialties)
                    ? (profileData.profile.specialties as string[]).map((tag, index) => (
                        <span key={`${tag}-${index}`} className="lira-pill-muted">
                          {tag}
                        </span>
                      ))
                    : null}
                </div>
              </div>
            ) : null}
          </article>

          <aside className="lira-section space-y-4">
            <h2 className="lira-section-title">바로가기</h2>
            <p className="lira-subtitle">가장 자주 이용하는 화면으로 빠르게 이동하세요.</p>
            <div className="flex flex-col gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`lira-button ${
                    link.tone === "primary"
                      ? "lira-button--primary"
                      : link.tone === "accent"
                      ? "lira-button--accent"
                      : link.tone === "ghost"
                      ? "lira-button--ghost"
                      : "lira-button--secondary"
                  } justify-between`}
                >
                  <span className="flex flex-col items-start">
                    <span className="text-sm font-semibold">{link.label}</span>
                    <span className="text-xs font-normal text-slate-500">{link.description}</span>
                  </span>
                  <span className="text-lg">→</span>
                </Link>
              ))}
            </div>
          </aside>
        </section>

        {dashboardView === "enterprise" && enterpriseOrganizations && !loading ? (
          <section className="lira-section space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="lira-section-title">조직 멤버십</h2>
                <p className="lira-subtitle">소유한 조직과 협업 조직의 구성을 한눈에 확인하세요.</p>
              </div>
              <Link
                href="/customer"
                className="lira-button lira-button--ghost"
              >
                조직 관리
              </Link>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">소유 조직</h3>
              {enterpriseOwnedOrganizations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
                  아직 등록된 조직이 없습니다. 기업 정보를 등록하면 조직 단위 협업을 시작할 수 있어요.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {enterpriseOwnedOrganizations.map((org) => (
                    <article key={org.id} className="lira-card lira-card--padded space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{org.name}</h3>
                        <p className="text-xs text-slate-500">
                          {org.businessNumber ? `사업자등록번호 ${org.businessNumber}` : "사업자 정보 미등록"}
                        </p>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                        <div>
                          <dt className="font-semibold text-slate-500">대표 연락처</dt>
                          <dd className="mt-1">{org.contactPhone ?? "미등록"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">담당자</dt>
                          <dd className="mt-1">{org.contactName ?? "미등록"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">규모 코드</dt>
                          <dd className="mt-1">{org.sizeCode ?? "-"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">최근 업데이트</dt>
                          <dd className="mt-1">{formatDateTime(org.updatedAt ?? null)}</dd>
                        </div>
                      </dl>
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">구성원</p>
                        {org.members.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-500">
                            아직 조직 구성원이 없습니다. 초대로 팀을 만들어보세요.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {org.members.map((member) => (
                              <li
                                key={member.id}
                                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {member.user?.name ?? "미등록 회원"}
                                  </p>
                                  <p className="text-xs text-slate-500">{member.user?.email ?? "연락처 없음"}</p>
                                </div>
                                <span className={`lira-badge ${MEMBER_ROLE_BADGE[member.role]}`}>
                                  {MEMBER_ROLE_LABEL[member.role]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">협업 중인 외부 조직</h3>
              {externalMemberships.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
                  참여 중인 외부 조직이 없습니다. 초대를 받으면 이곳에 표시됩니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {externalMemberships.map((membership) => (
                    <article key={membership.id} className="lira-card lira-card--padded space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-semibold text-slate-900">{membership.organization.name}</h4>
                          <p className="text-xs text-slate-500">
                            {membership.organization.businessNumber
                              ? `사업자등록번호 ${membership.organization.businessNumber}`
                              : "사업자 정보 미등록"}
                          </p>
                        </div>
                        <span className={`lira-badge ${MEMBER_ROLE_BADGE[membership.role]}`}>
                          {MEMBER_ROLE_LABEL[membership.role]}
                        </span>
                      </div>
                      <dl className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                        <div>
                          <dt className="font-semibold text-slate-500">연락 담당자</dt>
                          <dd className="mt-1">{membership.organization.contactName ?? "미등록"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">연락처</dt>
                          <dd className="mt-1">{membership.organization.contactPhone ?? "미등록"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">초대한 사람</dt>
                          <dd className="mt-1">{membership.invitedBy ? membership.invitedBy.name : "정보 없음"}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">참여일</dt>
                          <dd className="mt-1">{formatDateTime(membership.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="font-semibold text-slate-500">최근 활동</dt>
                          <dd className="mt-1">{formatDateTime(membership.updatedAt)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        <section className="lira-section space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="lira-section-title">최근 사건 요약</h2>
              <p className="lira-subtitle">마지막으로 업데이트된 사건을 우선 살펴보세요.</p>
            </div>
            {dashboardView !== "guest" && (
              <Link
                href={dashboardView === "investigator" ? "/investigation-requests" : "/customer"}
                className="lira-button lira-button--ghost"
              >
                전체 보기
              </Link>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : recentCases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500">
              {dashboardView === "guest" ? "로그인 후 사건 정보를 확인할 수 있습니다." : "최근 업데이트된 사건이 없습니다."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recentCases.map((item) => (
                <article key={item.id} className="lira-card lira-card--padded space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`lira-badge ${dashboardView === "investigator" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-slate-400">업데이트 {formatDateTime(item.updatedAt)}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-2">{item.details}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {dashboardView === "investigator"
                        ? `의뢰인: ${item.user?.name ?? "정보 없음"}`
                        : `담당 조사원: ${item.investigator?.user?.name ?? "배정 전"}`}
                    </span>
                    <Link
                      href={`/investigation-requests/${item.id}`}
                      className="lira-button lira-button--secondary text-xs"
                    >
                      상세 보기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
