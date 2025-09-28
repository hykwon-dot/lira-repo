import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPrismaClient } from "@/lib/prisma";
import { InvestigatorStatus } from "@prisma/client";
import RequestComposer from "./RequestComposer";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export const metadata: Metadata = {
  title: "사건 의뢰 작성 | LIRA",
  description: "선호하는 민간조사원에게 사건을 의뢰하세요.",
};

export default async function NewInvestigationRequestPage({ searchParams }: PageProps) {
  const investigatorIdParam = Array.isArray(searchParams?.investigatorId)
    ? searchParams?.investigatorId[0]
    : searchParams?.investigatorId;

  if (!investigatorIdParam) {
    notFound();
  }

  const investigatorId = Number(investigatorIdParam);
  if (!Number.isInteger(investigatorId) || investigatorId <= 0) {
    notFound();
  }

  const prisma = await getPrismaClient();
  const investigator = await prisma.investigatorProfile.findUnique({
    where: { id: investigatorId },
    include: {
      user: true,
    },
  });

  if (!investigator || investigator.status !== InvestigatorStatus.APPROVED || !investigator.user) {
    notFound();
  }

  const scenarios = await prisma.scenario.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
    },
  });

  const formattedInvestigator = {
    id: investigator.id,
    name: investigator.user.name,
    email: investigator.user.email,
    contactPhone: investigator.contactPhone ?? null,
    serviceArea: investigator.serviceArea ?? null,
    introduction: investigator.introduction ?? null,
    experienceYears: investigator.experienceYears ?? null,
    specialties: Array.isArray(investigator.specialties)
      ? investigator.specialties.filter((item): item is string => typeof item === "string")
      : [],
  };

  return (
    <RequestComposer investigator={formattedInvestigator} scenarios={scenarios} />
  );
}
