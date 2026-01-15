// 환경변수 검증 유틸리티

export function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    // 'JWT_SECRET', // Managed with fallback in jwt.ts
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }

  // Check JWT_SECRET loosely
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET is missing. Using fallback from jwt.ts. This is not recommended for production.');
  }

  // DATABASE_URL 형식 검증
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('mysql://')) {
    console.error('❌ DATABASE_URL must start with mysql://');
    return false;
  }

  console.log('✅ All required environment variables are present');
  return true;
}

export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || 'unknown',
    hasDatabase: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    databaseHost: process.env.DATABASE_URL ? 
      new URL(process.env.DATABASE_URL).host : 'not configured'
  };
}