import { PrismaClient, InvestigatorStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const id = Number(process.argv[2] ?? 1);
  if (!Number.isInteger(id)) {
    throw new Error("Provide investigator id");
  }
  const updated = await prisma.investigatorProfile.update({
    where: { id },
    data: { status: InvestigatorStatus.APPROVED },
  });
  console.log("Updated investigator:", updated.id, updated.status);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
