# AI 시뮬레이션 SaaS 플랫폼 (LIRA)

이 프로젝트는 AI 및 데이터 기반의 가상 조사/사례 시뮬레이션 및 탐정(민간조사원) 매칭 기능을 제공하는 SaaS 플랫폼입니다. (기존 업무 시나리오 → 탐정/조사 도메인 전환 중)

## 변경 이력 (Changelog)

### v26.1.6.04 (2026-01-06)
- **AI 시뮬레이션 고도화**: `/api/chat-gpt` 모델 업그레이드 (`gpt-4o`) 및 파라미터 튜닝
  - 답변 반복 패턴 제거를 위한 `presencePenalty`, `frequencyPenalty` 적용
  - 시스템 프롬프트 개선으로 자연스러운 단문 위주의 대화 유도

### v26.1.6.03 (2026-01-06)
- **전문가 찾기 기능 고도화**: 전문가 상세 페이지(`investigators/[id]`) 신규 구현
- **공정성 강화**: 전문가 목록 보기 시 10초마다 순서 랜덤 변경(셔플) 적용
- **UI 개선**: 전문가 카드 및 상세 정보 디자인 개편 (배지, 경력, 소개, 후기, 상담 버튼 등)

### v26.1.6.02 (2026-01-06)
- **모바일 UI/UX 개선**: 시나리오 라이브러리 및 상세 페이지의 모바일 가독성 향상
  - 시나리오 카테고리 탭 가로 스크롤 적용
  - 폰트 크기 및 여백 최적화
  - 텍스트 말줄임 처리 적용
- **모바일 메뉴 수정**: 햄버거 메뉴의 z-index 오버레이 문제 해결 및 터치 인식 개선

## 주요 기능
- 회원가입/로그인/로그아웃
- 챗GPT 연동 대화형 시뮬레이션
- 관리자 대시보드
- 시나리오 라이브러리
- 데이터 저장 및 분석
- 모던하고 직관적인 UI (https://datarize.ai/ko 참고)

## 개발 및 실행 방법

### 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 빌드
```bash
npm run build
```

### 주요 파일
- `src/app/page.tsx`: 메인 페이지
- `src/app/api/`: API 라우트

## 기술 스택
- Next.js (TypeScript)
- Tailwind CSS
- OpenAI API (ChatGPT)
- 기타: ESLint, App Router, src 디렉토리 구조

## MariaDB 전환 안내

프로젝트는 SQLite 초기 구조에서 MariaDB(MySQL 프로토콜) 기반 스키마로 확장되었습니다.

### 1. 환경 준비
```bash
docker compose -f docker-compose.mariadb.yml up -d
cp .env.example .env  # 값 수정
npm install
```

### 2. Prisma 마이그레이션
```bash
npx prisma generate
npx prisma migrate dev --name init_mariadb
```

### 3. Seed 실행
```bash
npx ts-node prisma/seed_mariadb.ts
```

### 4. 연결 상태 확인
```bash
npm run db:check
```

성공 시 MariaDB 버전과 주요 테이블 카운트를 출력합니다. 오류가 발생하면 `DATABASE_URL`, `SHADOW_DATABASE_URL` 환경변수와 MariaDB 컨테이너 상태를 확인하세요.

### 배포 헬스체크 & 원격 모니터링
- **API 엔드포인트**: `/api/health/deployment`
	- **GET** 요청 시 현재 서버에서 Prisma로 MariaDB에 접속을 시도하고, 버전/레코드 카운트/환경 정보(`NODE_ENV`, DB 호스트 등)를 JSON으로 반환합니다.
	- 인증이 필요하지 않도록 구성했으므로 Amplify 배포 후 브라우저나 `curl`로 즉시 호출하여 원격 환경의 자격 증명 문제가 있는지 확인할 수 있습니다.
- **CI/CD 파이프라인**: Amplify `preBuild` 단계에 `npm run db:check`를 추가하면, 코드 빌드 전에 DB 연결 체크가 실패할 경우 즉시 빌드가 중단되어 원인 파악이 빨라집니다.
- **경보 설정**: Amplify 로그는 CloudWatch로 전송됩니다. `/api/health/deployment` 호출 결과나 `npm run db:check` 실패를 CloudWatch Metric Filter/Alarm으로 연동하면 비밀번호 변경 미반영 등 자격 증명 오류 발생 시 즉시 알림을 받을 수 있습니다.
- **비밀번호 갱신 루틴**: RDS → SSM(Parameter Store) → Amplify 환경 변수 → 배포 → 로컬 `.env` 순으로 새 자격 증명(예: `asdasd11`)을 적용하고 `/api/health/deployment` 또는 `npm run db:check`로 즉시 검증하세요.

### 4. 신규 주요 모델
| 모델 | 설명 |
|------|------|
| InvestigatorProfile | 탐정 프로필/승인 상태/전문분야 Json |
| InvestigationRequest | 조사 의뢰 및 상태 OPEN→CLOSED |
| InvestigatorMatch | 요청-탐정 매칭 점수 기록 |
| Conversation / Message | AI 상담 대화 저장 |
| CustomerProfile | 일반 회원(고객) 확장 정보 및 동의/선호 데이터 |

### 5. Scenario 확장 필드
| 필드 | 설명 |
|------|------|
| category | 사례 카테고리 (개인사례/기업조사 등) |
| caseType | 유형 코드 (INFIDELITY, IP_LEAK ...) |
| successRate | 성공률(%) |
| typicalDurationDays | 평균 기간 |
| budgetRange | 예산 범위 Json {min,max} |

### 6. 인덱스/검색 메모
- Scenario: FULLTEXT(title) 이용한 추후 검색 개선
- Message: (conversationId, createdAt) 인덱스 → 채팅 로딩 최적화
- InvestigatorMatch: score 인덱스 → 추천 정렬

### 7. 체크리스트
| 항목 | 상태 |
|------|------|
| docker mariadb 기동 |  |
| .env 설정 (DATABASE_URL) |  |
| .env 설정 (SHADOW_DATABASE_URL) |  |
| prisma migrate dev 실행 |  |
| seed_mariadb.ts 성공 |  |
| /api/scenarios 호출 200 |  |

### 8. 후속 TODO 제안
- 탐정 등록 API(Route Handler) + 승인(admin)
- InvestigationRequest CRUD + 상태머신
- 추천 알고리즘 서비스 레이어 모듈화
- RBAC 미들웨어 (role + 소유권)
- OpenAI 응답 ConversationAnalysis 저장
- Enterprise 조직/권한 관리 (Organization, OrganizationMember)

## 역할(Role) 및 권한(Capabilities)

플랫폼은 다중 역할 기반 RBAC를 사용합니다.

### 지원 역할
| 역할 | 설명 | 생성 방법 |
|------|------|-----------|
| USER | 일반 개인 사용자 | 공개 회원가입 |
| INVESTIGATOR | 민간조사원(검수 필요) | 공개 회원가입 (specialties 필요) |
| ENTERPRISE | 기업 담당자 계정 | 공개 회원가입 (companyName 필요) |
| ADMIN | 운영 관리자 | 내부 발급 / 승격 |
| SUPER_ADMIN | 총괄 시스템 관리자 | Seed 또는 수동 DB 삽입 |

### 가입 시 필드 요구사항
| 역할 | 필수 필드 | 선택 필드 | 추가 생성 레코드 |
|------|-----------|-----------|------------------|
| USER | email, password, name | - | - |
| INVESTIGATOR | email, password, name, specialties[] (1+) | licenseNumber | InvestigatorProfile(status=PENDING) |
| ENTERPRISE | email, password, name, companyName | businessNumber, contactPhone | Organization + OrganizationMember(OWNER) |
| ADMIN | email, password, name, role=ADMIN | - | (직접 생성) |
| SUPER_ADMIN | email, password, name, role=SUPER_ADMIN | - | (Seed) |

### Capability 매핑 (요약)
| Capability | 설명 | USER | INVESTIGATOR | ENTERPRISE | ADMIN | SUPER_ADMIN |
|------------|------|------|-------------|------------|-------|-------------|
| scenario.read | 시나리오 조회 | ✅ | ✅ | ✅ | ✅ | ✅ |
| scenario.write | 시나리오 CRUD | ❌ | ❌ | ❌ | ✅ | ✅ |
| investigator.approve | 조사원 승인 | ❌ | ❌ | ❌ | ✅ | ✅ |
| investigator.profile.write | 자신의 프로필 수정 | ❌ | ✅ | ❌ | ✅(보정) | ✅ |
| investigation.request.create | 조사 의뢰 생성 | ✅ | ❌ | ✅ | ✅ | ✅ |
| investigation.request.read | 의뢰 읽기 | ✅(본인) | ✅(배정 사건) | 기업 본인 | ✅(전체) | ✅(전체) |
| investigation.match.read | 매칭 결과 열람 | ❌ | ✅(자신 관련) | ✅(자신 관련) | ✅ | ✅ |
| conversation.write | 대화 생성/질문 | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin.dashboard | 관리자 대시보드 접근 | ❌ | ❌ | ❌ | ✅ | ✅ |
| system.manage | 시스템 전역설정 | ❌ | ❌ | ❌ | ❌ | ✅ |

실제 세밀한 "본인 소유 리소스" 검증은 소유권 체크(예: userId === session.user.id) 로직으로 보완해야 합니다.

### 관련 코드
| 파일 | 설명 |
|------|------|
| `src/lib/rbac.ts` | 역할→capability 매핑 및 검사 함수 |
| `src/lib/authz.ts` | JWT Bearer 기반 인증/인가 유틸 |
| `src/app/api/register/route.ts` | 역할별 회원가입 구현 |
| `src/lib/audit.ts` | 감사 로그 헬퍼 (현재 콘솔 기록, 향후 DB 연동 예정) |

### 고객 가입 필드 요약
| 구분 | 필드 | 비고 |
|------|------|------|
| 기본 | name, email, password | 필수 |
| 기본 | displayName | 선택, 서비스 내 표시명 |
| 연락/프로필 | phone, birthDate, gender, occupation, region | 모두 선택 |
| 선호 | preferredCaseTypes[], budgetMin/max, urgencyLevel | 조사 매칭에 활용 |
| 보안 | securityQuestion, securityAnswer | 선택, 둘 다 입력 시 답변은 해시 저장 |
| 동의 | acceptsTerms, acceptsPrivacy | 필수, 서버에서 timestamp 저장 |
| 알림 | marketingOptIn | 선택 |

### Investigator 승인/거절 API
- `POST /api/investigators/:id/approve`
	- 권한: `investigator.approve` (ADMIN 이상)
	- Body: `{ "note": "선택 메모" }`
	- 효과: 상태를 `APPROVED`로 설정, `reviewedBy`, `reviewedAt`, `reviewNote` 갱신 및 감사 로그 기록
- `POST /api/investigators/:id/reject`
	- 권한: `investigator.approve` (ADMIN 이상)
	- Body: `{ "note": "거절 사유 (필수)" }`
	- 효과: 상태를 `REJECTED`로 설정, 거절 사유 기록 및 감사 로그 기록

### 추가 개선 아이디어
1. 세션/JWT 기반 정식 인증 도입 후 `authz.ts` 개선
2. ~~Investigator 승인 워크플로우 (/api/investigators/:id/approve)~~ ✅
3. Enterprise 조직 다중 사용자 구조 (Organization + OrganizationMember) ✅
4. 감사 로그(AuditLog) 테이블 및 관리자 열람 UI
5. 의뢰–탐정 매칭 점수 계산 알고리즘 서비스 레이어 분리
6. Elastic/OpenSearch 연동으로 시나리오, 의뢰, 대화 전문 검색
7. ConversationAnalysis 기반 태그 추천/후속 질문 자동 생성
8. Investigator KPI 대시보드 (완료율/평균 응답시간/성공률)
9. Enterprise SLA / 의뢰 처리 속도 보고서
10. 알림(Notification) 테이블 + 실시간(WebSocket or SSE)
11. 문서/증거 파일 업로드 (Object Storage) + 접근 제어
12. 위험 패턴 감지(의심 다중 의뢰)용 Rule Engine
13. Anonymized 데이터셋 기반 시나리오 추천 ML 모델
14. 다국어(i18n) 지원 & Locale 별 시나리오 가중치
15. 조사원 일정/가용성 관리(Calendar) → 매칭 점수 반영

---

## Seed 계정 요약 (prisma/seed_mariadb.ts)
| 이메일 | 역할 | 비고 |
|--------|------|------|
| admin@lira.local | ADMIN | 운영 관리자 |
| root@lira.local | SUPER_ADMIN | 총괄 관리자 |
| investigator1@lira.local | INVESTIGATOR | PENDING 상태, specialties 포함 |
| corp1@lira.local | ENTERPRISE | 조직 소유자 (Organization + OWNER 멤버십) |
| corp-ops@lira.local | ENTERPRISE | 조직 관리자(ADMIN 권한 멤버), 소유자 초대 |
| customer1@lira.local | USER | CustomerProfile 포함, ChangeMe123! |


---

기능 및 구조에 대한 자세한 내용은 프로젝트 내 문서와 코드를 참고하세요.
