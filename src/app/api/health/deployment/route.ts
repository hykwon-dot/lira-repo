import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function extractDatabaseTarget(url: string | undefined) {
  if (!url) {
    return { hasUrl: false, host: null, database: null };
  }

  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, "");
    return { hasUrl: true, host: parsed.host, database };
  } catch (error) {
    console.error("Failed to parse DATABASE_URL", error);
    return { hasUrl: false, host: null, database: null };
  }
}

export async function GET() {
  const startedAt = Date.now();
  const target = extractDatabaseTarget(process.env.DATABASE_URL);

  try {
    const [versionRows, requestCount, investigatorCount] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT VERSION() AS version
      `,
      prisma.investigationRequest.count(),
      prisma.investigatorProfile.count(),
    ]);

    const version = versionRows?.[0]?.version ?? versionRows?.[0]?.VERSION ?? "unknown";

    return NextResponse.json(
      {
        status: "ok",
        elapsedMs: Date.now() - startedAt,
        environment: {
          nodeEnv: process.env.NODE_ENV ?? "unknown",
          databaseUrlConfigured: target.hasUrl,
          databaseHost: target.host,
          databaseName: target.database,
        },
        checks: {
          database: {
            reachable: true,
            version: String(version),
            investigationRequests: requestCount,
            investigatorProfiles: investigatorCount,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "error",
        elapsedMs: Date.now() - startedAt,
        environment: {
          nodeEnv: process.env.NODE_ENV ?? "unknown",
          databaseUrlConfigured: target.hasUrl,
          databaseHost: target.host,
          databaseName: target.database,
        },
        checks: {
          database: {
            reachable: false,
            error: message,
          },
        },
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
