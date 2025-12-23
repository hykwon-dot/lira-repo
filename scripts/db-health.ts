import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
});

async function main() {
  console.log("🔍 Checking MariaDB connection using Prisma...");

  try {
    const versionRows = (await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT VERSION() AS version")) ?? [];
    const version = versionRows[0]?.version ?? versionRows[0]?.VERSION ?? "unknown";

    const requestCount = await prisma.investigationRequest.count();
    const investigatorCount = await prisma.investigatorProfile.count();

    console.log("✅ Connected successfully.");
    console.log(`   • Database version: ${String(version)}`);
    console.log(`   • Investigation requests: ${requestCount}`);
    console.log(`   • Investigator profiles: ${investigatorCount}`);
  } catch (error) {
    console.error("❌ Database connectivity failed.");
    if (error instanceof Error) {
      console.error(`   • ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
