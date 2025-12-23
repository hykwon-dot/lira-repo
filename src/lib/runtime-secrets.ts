import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

type SecretsGlobal = typeof globalThis & {
  __liraDbUrlPromise?: Promise<void>;
  __liraDbUrlReady?: boolean;
};

const runtime = globalThis as SecretsGlobal;

const resolveParameterName = () => {
  if (process.env.DATABASE_URL) {
    return null;
  }
  if (process.env.DATABASE_URL_SSM_PARAM) {
    return process.env.DATABASE_URL_SSM_PARAM;
  }
  const appId = process.env.AMPLIFY_APP_ID;
  const branch = process.env.AMPLIFY_BRANCH ?? process.env.AMPLIFY_ENV;
  if (!appId || !branch) {
    return null;
  }
  return `/amplify/${appId}/${branch}/DATABASE_URL`;
};

export async function ensureRuntimeDatabaseUrl(): Promise<void> {
  if (process.env.DATABASE_URL || runtime.__liraDbUrlReady) {
    return;
  }
  const promise =
    runtime.__liraDbUrlPromise ??
    (runtime.__liraDbUrlPromise = (async () => {
      const parameterName = resolveParameterName();
      if (!parameterName) {
        console.error("[runtime-secrets] DATABASE_URL parameter name unavailable.");
        return;
      }
      const client = new SSMClient({
        region: process.env.AWS_REGION ?? "ap-northeast-2",
        maxAttempts: 2,
      });
      try {
        const { Parameter } = await client.send(
          new GetParameterCommand({
            Name: parameterName,
            WithDecryption: true,
          }),
        );
        if (!Parameter?.Value) {
          throw new Error("Empty DATABASE_URL parameter value");
        }
        process.env.DATABASE_URL = Parameter.Value;
        runtime.__liraDbUrlReady = true;
      } catch (error) {
        runtime.__liraDbUrlReady = false;
        console.error(
          "[runtime-secrets] Failed to hydrate DATABASE_URL from SSM",
          error,
        );
        throw error;
      }
    })());
  try {
    await promise;
  } catch (error) {
    runtime.__liraDbUrlPromise = undefined;
    throw error;
  }
}
