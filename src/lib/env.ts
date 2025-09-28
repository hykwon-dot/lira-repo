// 환경 변수 로딩 및 검증 유틸리티

let envLoaded = false;

function loadEnvFile() {
  if (typeof window !== 'undefined' || envLoaded) {
    return;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join(process.cwd(), '.env');
    console.log('[ENV] Attempting to load .env from:', envPath);
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      let loadedCount = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalIndex = trimmed.indexOf('=');
          if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim();
            const value = trimmed.substring(equalIndex + 1).trim();
            
            // 따옴표 제거
            const cleanValue = value.replace(/^["']|["']$/g, '');
            
            if (!process.env[key]) {
              process.env[key] = cleanValue;
              loadedCount++;
              console.log(`[ENV] Loaded ${key}`);
            }
          }
        }
      }
      
      console.log(`[ENV] Successfully loaded ${loadedCount} environment variables`);
      envLoaded = true;
    } else {
      console.warn('[ENV] .env file not found at:', envPath);
    }
  } catch (error) {
    console.error('[ENV] Failed to load .env file:', error);
  }
}

export function ensureEnvLoaded() {
  // 환경 변수가 없으면 수동 로딩 시도
  if (!process.env.DATABASE_URL) {
    console.log('[ENV] DATABASE_URL not found, attempting manual load...');
    loadEnvFile();
  }
}

export function validateRequiredEnv() {
  ensureEnvLoaded();
  
  const required = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  console.log('[ENV] Environment validation:');
  required.forEach(key => {
    console.log(`  ${key}: ${process.env[key] ? 'SET' : 'MISSING'}`);
  });
  
  if (missing.length > 0) {
    const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('[ENV] Validation failed:', error.message);
    throw error;
  }
  
  console.log('[ENV] All required environment variables are present');
  return true;
}