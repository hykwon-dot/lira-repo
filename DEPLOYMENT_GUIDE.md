# LIRA365.com 배포 가이드 (AWS Amplify)

이 문서는 LIRA365.com 플랫폼을 AWS Amplify에 배포하기 위한 단계별 가이드입니다.

## 1. 사전 준비 사항
- AWS 계정
- GitHub 저장소에 최신 코드가 푸시되어 있어야 함
- AWS Amplify 콘솔 접근 권한

## 2. AWS Amplify 앱 생성 및 연결
1. [AWS Amplify 콘솔](https://ap-northeast-2.console.aws.amazon.com/amplify/home?region=ap-northeast-2)에 접속합니다.
2. **"New app"** -> **"Host web app"**을 선택합니다.
3. **GitHub**을 선택하고 **Continue**를 클릭합니다.
4. GitHub 권한을 승인하고, `lira-repo` 저장소와 배포할 브랜치(`feature/updates-251231` 또는 `main`)를 선택합니다.

## 3. 빌드 설정 (Build settings)
Amplify가 자동으로 `amplify.yml` 파일을 감지해야 합니다. 설정이 다음과 같은지 확인하세요:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npx prisma generate
    build:
      commands:
        - env | grep -E "OPENAI|DATABASE"
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

## 4. 환경 변수 설정 (Environment variables)
**가장 중요한 단계입니다.** `Advanced settings`를 열거나 앱 생성 후 `Environment variables` 메뉴에서 다음 변수들을 설정해야 합니다.

| Key | Value (예시) | 설명 |
|-----|--------------|------|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:PORT/DB?ssl={"rejectUnauthorized":false}` | **필수**. SSL 설정(`?ssl={"rejectUnauthorized":false}`)이 반드시 포함되어야 합니다. |
| `SHADOW_DATABASE_URL` | `mysql://USER:PASSWORD@HOST:PORT/SHADOW_DB?ssl={"rejectUnauthorized":false}` | **필수**. Prisma 마이그레이션용 Shadow DB URL. |
| `JWT_SECRET` | `(임의의 긴 문자열)` | JWT 토큰 서명용 비밀키 |
| `OPENAI_API_KEY` | `sk-...` | OpenAI API 키 |
| `NODE_ENV` | `production` | 프로덕션 환경 설정 |
| `NEXT_PUBLIC_API_URL` | `https://lira365.com` (또는 Amplify 제공 도메인) | 클라이언트 사이드 API 호출용 URL |

> **주의**: `DATABASE_URL`에 특수문자가 포함된 경우 URL 인코딩이 필요할 수 있으나, Prisma의 경우 일반적으로 따옴표 없이 입력합니다. `ssl={"rejectUnauthorized":false}` 부분은 JSON 형식이므로 정확히 입력해야 합니다.

## 5. 소셜 로그인 설정 (선택 사항)
소셜 로그인을 활성화하려면 다음 환경 변수를 추가하고, 각 플랫폼 개발자 센터에서 Redirect URI를 설정해야 합니다.

**Redirect URI**: `https://lira365.com/api/auth/social/callback` (또는 Amplify 도메인)

| Key | 설명 |
|-----|------|
| `KAKAO_CLIENT_ID` | 카카오 디벨로퍼스 REST API 키 |
| `NAVER_CLIENT_ID` | 네이버 개발자 센터 Client ID |
| `GOOGLE_CLIENT_ID` | 구글 클라우드 콘솔 Client ID |

## 6. 배포 시작 및 확인
1. **"Save and deploy"**를 클릭하여 배포를 시작합니다.
2. Amplify 콘솔에서 빌드 진행 상황을 모니터링합니다.
   - **Provision** -> **Build** -> **Deploy** -> **Verify** 단계를 거칩니다.
3. **Build** 단계에서 오류가 발생하면 로그를 확인합니다. 데이터베이스 연결 오류가 가장 흔하며, 환경 변수 설정을 다시 확인하세요.

## 7. 배포 후 점검
배포가 완료되면 제공된 도메인(예: `https://main.d12345.amplifyapp.com` 또는 `https://lira365.com`)으로 접속하여 다음을 확인합니다:

1. **헬스 체크**: `/api/health/deployment` 접속 시 `{"status":"ok", ...}` 응답 확인
2. **DB 연결 확인**: `/api/test-db` 접속 시 데이터베이스 연결 성공 메시지 확인
3. **로그인/회원가입**: 실제 DB에 데이터가 저장되는지 확인

## 8. 문제 해결 (Troubleshooting)

### 데이터베이스 연결 오류 (`P1001`, `P1011` 등)
- **원인**: 보안 그룹(Security Group) 또는 SSL 설정 문제
- **해결**:
  - RDS 보안 그룹에서 "Anywhere" (0.0.0.0/0) 접근이 허용되어 있는지 확인 (Amplify 빌드 서버 IP가 유동적이기 때문)
  - `DATABASE_URL` 뒤에 `?ssl={"rejectUnauthorized":false}`가 제대로 붙어 있는지 확인

### 빌드 실패 (`Prisma Client` 관련)
- **원인**: `npx prisma generate`가 실행되지 않았거나 DB URL이 잘못됨
- **해결**: `amplify.yml`의 `preBuild` 단계에 `npx prisma generate`가 있는지 확인

### 500 Internal Server Error
- **원인**: 런타임 환경 변수 누락
- **해결**: Amplify 콘솔의 환경 변수가 올바르게 설정되었는지 재확인하고, 앱을 **Redeploy** 하세요.
