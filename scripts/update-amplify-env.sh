#!/bin/bash

# AWS Amplify 환경 변수 자동 설정 스크립트
# 사용법: ./update-amplify-env.sh

APP_ID="your-amplify-app-id"  # Amplify 앱 ID로 변경 필요
BRANCH_NAME="main"

echo "🚀 Updating Amplify environment variables..."

aws amplify update-app \
  --app-id $APP_ID \
  --environment-variables \
    DATABASE_URL="mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira?ssl={\"rejectUnauthorized\":false}" \
    SHADOW_DATABASE_URL="mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira_shadow?ssl={\"rejectUnauthorized\":false}" \
    JWT_SECRET="lira_production_jwt_secret_2024_secure_key_replace_in_production" \
    OPENAI_API_KEY="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" \
    NODE_ENV="production" \
    LOG_LEVEL="info"

echo "✅ Environment variables updated!"
echo "🔄 Triggering redeploy..."

aws amplify start-job \
  --app-id $APP_ID \
  --branch-name $BRANCH_NAME \
  --job-type RELEASE

echo "✅ Redeploy started!"