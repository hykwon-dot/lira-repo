
<!-- Copilot Custom Instructions for LIRA (lira365.com) SaaS Platform -->

# LIRA365.com AI 시뮬레이션 SaaS 개발 가이드

## 아키텍처 및 주요 컴포넌트
- **Next.js (TypeScript, App Router)** 기반의 모노레포 구조. 주요 경로:
	- `src/app/` : 페이지, API 라우트, 역할별 대시보드
	- `src/lib/` : 인증(`authz.ts`), RBAC(`rbac.ts`), 감사로그(`audit.ts`), 유틸
	- `prisma/` : DB 스키마, 마이그레이션, Seed 스크립트
- **MariaDB**(MySQL 호환) 기반, Prisma ORM 사용
- **RBAC**: `src/lib/rbac.ts`에서 역할별 capability 매핑, `authz.ts`에서 인증/인가
- **회원가입/프로필**: `/api/register` (역할별 필수 필드 상이), `/api/me/profile` (프로필 CRUD)
- **조사/의뢰**: `/api/investigation-requests` (CRUD, 상태머신), `/api/investigators/:id/approve|reject` (관리자 승인/거절)
- **시나리오**: `/api/scenarios` (케이스 템플릿)
- **파일 업로드**: `/public/uploads/` 경로 활용, 프로필/사업자등록증 등

## 개발/운영 워크플로우
- **로컬 개발**: `npm run dev` (Next.js)
- **빌드**: `npm run build`
- **DB 준비**: `docker compose -f docker-compose.mariadb.yml up -d` → `.env` 설정 → `npx prisma generate` → `npx prisma migrate dev --name init_mariadb` → `npx ts-node prisma/seed_mariadb.ts`
- **DB 연결/상태 확인**: `npm run db:check` 또는 `/api/health/deployment` 호출
- **테스트**: 주요 시나리오/엔드포인트는 `*_test.js`/`comprehensive-test.js` 등에서 확인

## 프로젝트별/역할별 주요 규칙
- **INVESTIGATOR(민간조사원) 가입**: 필수 필드(`email`, `password`, `name`, `specialties[]`, `contactPhone`), 가입 시 `status=PENDING` → 관리자 승인 필요
- **ENTERPRISE(기업)**: `companyName` 필수, 가입 시 조직/멤버십 자동 생성
- **RBAC**: capability별 접근 제어, 소유권 검증(본인 리소스만 수정/조회)
- **상태머신**: 의뢰는 `MATCHING`→`ACCEPTED`→`IN_PROGRESS`→`REPORTING`→`COMPLETED` 등 단계별 전이, 각 단계별 타임라인/이벤트 기록
- **API 응답**: 항상 JSON, 에러 시 `{ error: string }` 형태, 401/403/404/409/500 등 명확한 status code 사용
- **감사로그**: 주요 행위(승인/거절/상태변경 등)는 `audit.ts`로 기록(DB 연동 예정)

## 통합/외부 연동
- **OpenAI API**: 챗GPT 연동 대화 시뮬레이션
- **Amplify/CloudWatch**: 배포/모니터링, DB 체크/알람 연동
- **도메인**: `lira365.com` (baseURL, 이미지, API 등)

## 참고/예시 파일
- `src/app/investigator/page.tsx` : 조사원 대시보드/프로필/사건 관리 UI
- `src/app/api/register/route.ts` : 역할별 회원가입 로직
- `src/app/api/investigators/[id]/approve|reject/route.ts` : 관리자 승인/거절
- `src/app/api/me/profile/route.ts` : 프로필 CRUD, 아바타 업로드
- `src/app/api/investigation-requests/[id]/route.ts` : 의뢰 상태머신/타임라인
- `src/lib/rbac.ts`, `src/lib/authz.ts` : 권한/인증
- `README.md` : 전체 구조, 역할/권한/필드 요약

---
이 문서는 실제 코드/구현 기준으로 유지하세요. 관습적/추상적 규칙은 배제하고, 실제 동작/패턴/워크플로우만 명시합니다.
