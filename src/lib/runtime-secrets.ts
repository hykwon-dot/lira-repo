import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

type SecretsGlobal = typeof globalThis & {
  __liraDbUrlPromise?: Promise<void>;
  __liraDbUrlReady?: boolean;
};

const runtime = globalThis as SecretsGlobal;

const FALLBACK_DB_URL = "mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira?ssl={\"rejectUnauthorized\":false}&connect_timeout=10&pool_timeout=10";

const resolveParameterName = () => {
  if (process.env.DATABASE_URL) {
    return null;
  }
  // If we are in Amplify but no param is set, use fallback
  // Note: This is a temporary fix for diagnosing VPC isolation issues
  return null; 
};

export async function ensureRuntimeDatabaseUrl(): Promise<void> {
  // 1. Check if ENV is already set
  if (process.env.DATABASE_URL) {
    if (!runtime.__liraDbUrlReady) {
       console.log('[runtime-secrets] Using existing DATABASE_URL from environment.');
       runtime.__liraDbUrlReady = true;
    }
    return;
  }

  // 2. Use Fallback immediately if SSM logic is prone to hanging in VPC
  // (We use the URL found in .env, hoping it works in Production environment)
  console.log('[runtime-secrets] No DATABASE_URL found. Using Hardcoded Fallback URL to bypass SSM.');
  process.env.DATABASE_URL = FALLBACK_DB_URL;
  runtime.__liraDbUrlReady = true;
  return;
  
  /* SSM LOGIC DISABLED FOR DIAGNOSIS
  if (process.env.DATABASE_URL || runtime.__liraDbUrlReady) {
    return;
  }
  ...
  */
}
