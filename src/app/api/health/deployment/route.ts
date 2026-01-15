import { NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";
import { validateEnvironment, getEnvironmentInfo } from "@/lib/env-check";
import { ensureRuntimeDatabaseUrl } from "@/lib/runtime-secrets";

export const dynamic = 'force-dynamic';

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
  
  // Ensure DB URL is set (fallback if needed) BEFORE verifying environment
  await ensureRuntimeDatabaseUrl();

  const target = extractDatabaseTarget(process.env.DATABASE_URL);
  const envValid = validateEnvironment();
  const envInfo = getEnvironmentInfo();
  const deploymentTime = new Date().toISOString();

  if (!envValid) {
    return NextResponse.json(
      {
        status: "error",
        deploymentTime,
        elapsedMs: Date.now() - startedAt,
        environment: envInfo,
        checks: {
          environment: {
            valid: false,
            error: "Missing required environment variables"
          }
        },
      },
      { status: 500 }
    );
  }

  try {
    const prisma = await getPrismaClient(); 
    
    // Explicitly check connection configuration from the active Prisma instance if possible,
    // or infer from process.env.DATABASE_URL which should be set by now.
    const activeUrl = process.env.DATABASE_URL || "unknown";
    const maskedUrl = activeUrl.replace(/:[^:@]+@/, ":****@");

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
        deploymentTime,
        elapsedMs: Date.now() - startedAt,
        environment: {
          nodeEnv: process.env.NODE_ENV ?? "unknown",
          databaseUrlConfigured: target.hasUrl,
          databaseHost: target.host,
          databaseName: target.database,
          // Returning masked URL for debugging production issues
          effectiveDatabaseUrl: maskedUrl, 
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
    const stack = error instanceof Error ? error.stack : undefined;
    const activeUrl = process.env.DATABASE_URL || "unknown";
    const maskedUrl = activeUrl.replace(/:[^:@]+@/, ":****@");
    
    console.error("[DEPLOYMENT_HEALTH] Database connection failed:", {
      message,
      stack,
      databaseUrl: target.hasUrl ? `${target.host}/${target.database}` : "not configured"
    });
    
    return NextResponse.json(
      {
        status: "error",
        elapsedMs: Date.now() - startedAt,
        environment: {
          nodeEnv: process.env.NODE_ENV ?? "unknown",
          databaseUrlConfigured: target.hasUrl,
          databaseHost: target.host,
          databaseName: target.database,
          effectiveDatabaseUrl: maskedUrl,
        },
        checks: {
          database: {
            reachable: false,
            error: message,
            detail: "Previously working locally. If timeout in PROD, check Security Groups."
          }
        }
      },
      { status: 500 }
    );
  }
}
