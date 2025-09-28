// 임시 환경 변수 설정 (프로덕션용)
export const config = {
  DATABASE_URL: process.env.DATABASE_URL || 
    'mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira?ssl={"rejectUnauthorized":false}',
  
  SHADOW_DATABASE_URL: process.env.SHADOW_DATABASE_URL || 
    'mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira_shadow?ssl={"rejectUnauthorized":false}',
  
  JWT_SECRET: process.env.JWT_SECRET || 
    'lira_production_jwt_secret_2024_secure_key_replace_in_production',
  
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || 
    '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',
  
  NODE_ENV: process.env.NODE_ENV || 'production'
};