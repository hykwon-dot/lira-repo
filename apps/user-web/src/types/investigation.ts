export type RequestStatus =
  | "MATCHING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "REPORTING"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";

export interface ScenarioSummary {
  id: number;
  title: string;
  category?: string | null;
  difficulty?: string | null;
}

export interface CaseUserSummary {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface InvestigatorUserSummary {
  id: number;
  name: string;
  email: string;
}

export interface InvestigatorProfileSummary {
  id: number;
  status: string;
  contactPhone?: string | null;
  serviceArea?: string | null;
  specialties?: unknown;
  avatarUrl?: string | null;
  user?: InvestigatorUserSummary | null;
}

export interface InvestigatorReviewSummary {
  id: number;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseTimelineEntry {
  id: number;
  type: string;
  title?: string | null;
  note?: string | null;
  payload?: unknown;
  createdAt: string;
  author?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface InvestigationRequestSummary {
  id: number;
  title: string;
  details: string;
  desiredOutcome?: string | null;
  status: RequestStatus | string;
  scenarioId?: number | null;
  scenario?: ScenarioSummary | null;
  user?: CaseUserSummary | null;
  investigator?: InvestigatorProfileSummary | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  createdAt: string;
  updatedAt: string;
  timeline: CaseTimelineEntry[];
  review?: InvestigatorReviewSummary | null;
}

export interface InvestigatorProfileDetail {
  id: number;
  licenseNumber?: string | null;
  experienceYears: number;
  specialties: unknown;
  contactPhone?: string | null;
  serviceArea?: string | null;
  introduction?: string | null;
  portfolioUrl?: string | null;
  avatarUrl?: string | null;
  termsAcceptedAt?: string | null;
  privacyAcceptedAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export interface InvestigatorMeResponse {
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: "INVESTIGATOR";
  investigatorStatus: string;
  profile: InvestigatorProfileDetail;
}

export interface CustomerProfileDetail {
  id: number;
  displayName?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  occupation?: string | null;
  region?: string | null;
  preferredCaseTypes?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  urgencyLevel?: string | null;
  marketingOptIn?: boolean;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export type OrganizationMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface OrganizationMemberSummary {
  id: number;
  organizationId: number;
  userId: number;
  role: OrganizationMemberRole;
  invitedById: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface OrganizationSummary {
  id: number;
  name: string;
  businessNumber?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  sizeCode?: string | null;
  note?: string | null;
  ownerId: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  members: OrganizationMemberSummary[];
}

export interface OrganizationMembershipSummary {
  id: number;
  organizationId: number;
  userId: number;
  role: OrganizationMemberRole;
  invitedById: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  organization: Omit<OrganizationSummary, "members">;
  invitedBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface EnterpriseOrganizationsPayload {
  owned: OrganizationSummary[];
  memberships: OrganizationMembershipSummary[];
}

export interface CustomerMeResponse {
  user: {
    id: number;
    name: string;
    email: string;
  };
  role: "USER" | "ENTERPRISE";
  profile?: CustomerProfileDetail | null;
  organizations?: EnterpriseOrganizationsPayload;
}
