import { PrismaClient, InvestigatorStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const investigators = await prisma.investigatorProfile.findMany({
    where: { status: InvestigatorStatus.APPROVED },
    include: { user: true },
  });
  console.log("Count:", investigators.length);
  for (const inv of investigators) {
    console.log(inv.id, inv.status, inv.user?.email);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
