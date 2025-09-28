# LIRA - 민간조사원 매칭 플랫폼 기능정의서

## 1. 프로젝트 개요

### 1.1 프로젝트명
LIRA (Legal Investigation & Research Assistant)

### 1.2 프로젝트 목적
AI 기반 민간조사원 매칭 및 상담 서비스를 통해 고객과 전문 민간조사원을 연결하는 플랫폼

### 1.3 주요 목표
- AI 상담을 통한 사건 분석 및 적합한 탐정 매칭
- 유사한 사건 사례 제공을 통한 정보 지원
- 24시간 상담 서비스 제공
- 투명하고 신뢰할 수 있는 민간조사 서비스 생태계 구축

## 2. 시스템 아키텍처

### 2.1 기술 스택
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **AI Integration**: OpenAI ChatGPT API
- **Authentication**: 자체 구현 (JWT 기반)
- **State Management**: Zustand
- **UI Components**: React, Framer Motion, Lucide Icons

### 2.2 배포 환경
- **Development**: Local development server
- **Production**: Vercel (권장) 또는 클라우드 서버

## 3. 데이터베이스 설계

### 3.1 주요 테이블 구조

#### 3.1.1 사용자 관리 (User)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'user', -- 'user', 'admin', 'detective'
  monthlyUsage INTEGER DEFAULT 0,
  remainingTokens INTEGER DEFAULT 1000,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.2 대화 관리 (Conversation)
```sql
CREATE TABLE conversations (
  id VARCHAR(50) PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'archived'
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.3 메시지 관리 (Message)
```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversationId VARCHAR(50) REFERENCES conversations(id),
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.4 시나리오/사건 사례 (Scenario)
```sql
CREATE TABLE scenarios (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL, -- '불륜조사', '신용조사', '실종자수색' 등
  description TEXT,
  totalDurationDays INTEGER,
  recommendedBudget INTEGER,
  maxBudget INTEGER,
  difficulty VARCHAR(20), -- '쉬움', '보통', '어려움', '매우 어려움'
  successRate DECIMAL(3,2), -- 0.00 ~ 1.00
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.5 조사 단계 (Phase)
```sql
CREATE TABLE phases (
  id SERIAL PRIMARY KEY,
  scenarioId VARCHAR(50) REFERENCES scenarios(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  durationDays INTEGER,
  minBudget INTEGER,
  recommendedBudget INTEGER,
  maxBudget INTEGER,
  phaseOrder INTEGER,
  deliverables TEXT[], -- JSON array
  details TEXT[], -- JSON array
  risks TEXT[], -- JSON array
  createdAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.6 탐정/조사원 (Detective)
```sql
CREATE TABLE detectives (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  specialties TEXT[], -- 전문분야 배열
  experience INTEGER, -- 경력 년수
  rating DECIMAL(2,1), -- 평점 (1.0 ~ 5.0)
  successRate DECIMAL(3,2), -- 성공률 (0.00 ~ 1.00)
  description TEXT,
  isVerified BOOLEAN DEFAULT FALSE,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.7 조사 요청 (Investigation Request)
```sql
CREATE TABLE investigation_requests (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  detectiveId INTEGER REFERENCES detectives(id),
  conversationId VARCHAR(50) REFERENCES conversations(id),
  caseType VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER,
  urgency VARCHAR(20), -- 'low', 'medium', 'high', 'urgent'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

#### 3.1.8 사용자 요약 (User Summary)
```sql
CREATE TABLE user_summaries (
  id SERIAL PRIMARY KEY,
  userId INTEGER REFERENCES users(id),
  conversationId VARCHAR(50) REFERENCES conversations(id),
  summary TEXT NOT NULL,
  keywords TEXT[], -- 키워드 배열
  caseType VARCHAR(100),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## 4. 주요 기능 명세

### 4.1 사용자 인증 및 관리

#### 4.1.1 회원가입
- **경로**: `/register`
- **기능**: 
  - 이메일, 비밀번호, 이름으로 회원가입
  - 이메일 중복 검증
  - 비밀번호 해싱 저장
  - 기본 토큰 할당 (1000개)
- **API**: `POST /api/register`

#### 4.1.2 로그인
- **경로**: `/login`
- **기능**:
  - 이메일/비밀번호 인증
  - JWT 토큰 발급
  - 사용자 세션 관리
- **API**: `POST /api/login`

#### 4.1.3 사용자 프로필 관리
- **기능**:
  - 개인정보 수정
  - 토큰 사용량 확인
  - 조사 요청 이력 조회

### 4.2 AI 상담 및 분석

#### 4.2.1 AI 상담 인터페이스
- **경로**: `/simulation`
- **기능**:
  - ChatGPT API 연동 실시간 대화
  - 엘AI 캐릭터를 통한 친근한 상담
  - 사건 내용 분석 및 질문 유도
  - 대화 기록 저장
- **API**: `POST /api/chat-gpt`

#### 4.2.2 사건 분석 및 탐정 매칭
- **기능**:
  - 대화 내용 기반 키워드 추출
  - 사건 유형 분류
  - 적합한 탐정 추천
  - 예상 비용 및 기간 산출
  - 조사 단계별 계획 제시
- **API**: `POST /api/scenario-recommendation`

#### 4.2.3 유사 사건 사례 제공
- **기능**:
  - 사용자 상황과 유사한 과거 사례 검색
  - 사례별 해결 과정 및 결과 제시
  - 성공률 및 비용 정보 제공

### 4.3 시나리오 및 사례 관리

#### 4.3.1 사건 사례 라이브러리
- **경로**: `/scenarios`
- **기능**:
  - 다양한 조사 사례 카테고리별 분류
  - 사례별 상세 정보 제공
  - 조사 방법 및 절차 안내
  - 예상 비용 및 기간 정보
- **데이터 소스**: `detective_cases.json`

#### 4.3.2 사례 상세 보기
- **경로**: `/scenarios/[id]`
- **기능**:
  - 선택한 사례의 상세 정보
  - 단계별 조사 과정
  - 필요한 전문가 정보
  - 위험 요소 및 대응 방안

### 4.4 탐정 소개 및 매칭

#### 4.4.1 탐정 프로필 페이지
- **경로**: `/persona`
- **기능**:
  - 등록된 탐정들의 프로필 정보
  - 전문분야별 탐정 분류
  - 경험 점수 및 평점 표시
  - 성공 사례 및 후기

#### 4.4.2 탐정 매칭 시스템
- **기능**:
  - 사건 유형별 최적 탐정 추천
  - 예산 범위 내 탐정 필터링
  - 지역별 탐정 검색
  - 실시간 매칭 알고리즘

### 4.5 보고서 및 분석

#### 4.5.1 조사 결과 대시보드
- **경로**: `/report`
- **기능**:
  - 진행 중인 조사 현황
  - 완료된 조사 결과 요약
  - 비용 및 시간 분석
  - 만족도 평가

#### 4.5.2 데이터 분석 및 인사이트
- **기능**:
  - 사건 유형별 통계
  - 성공률 트렌드 분석
  - 비용 효율성 분석
  - 탐정별 성과 지표

### 4.6 관리자 기능

#### 4.6.1 관리자 대시보드
- **경로**: `/admin`
- **기능**:
  - 전체 사용자 관리
  - 탐정 승인 및 관리
  - 시스템 통계 모니터링
  - 피드백 및 신고 처리

#### 4.6.2 시나리오 관리
- **기능**:
  - 새로운 사례 등록
  - 기존 사례 수정/삭제
  - 사례 카테고리 관리
  - 추천 알고리즘 조정

## 5. API 명세

### 5.1 인증 관련
- `POST /api/register` - 회원가입
- `POST /api/login` - 로그인
- `POST /api/logout` - 로그아웃

### 5.2 대화 관련
- `POST /api/chat-gpt` - AI 대화
- `GET /api/conversation/[id]` - 대화 내역 조회
- `POST /api/conversation` - 새 대화 생성

### 5.3 시나리오 관련
- `GET /api/scenarios` - 시나리오 목록 조회
- `GET /api/scenario/[id]` - 특정 시나리오 상세 조회
- `POST /api/scenario-recommendation` - 시나리오 추천

### 5.4 사용자 관련
- `GET /api/user-summary` - 사용자 요약 정보
- `POST /api/user-summary` - 사용자 요약 저장

## 6. 인프라 요구사항

### 6.1 서버 환경
- **CPU**: 2 cores 이상
- **RAM**: 4GB 이상
- **Storage**: 100GB 이상 SSD
- **Network**: 최소 100Mbps

### 6.2 데이터베이스
- **PostgreSQL**: 13 이상
- **연결 풀**: 최소 10개 연결
- **백업**: 일일 자동 백업
- **모니터링**: 성능 및 용량 모니터링

### 6.3 외부 서비스
- **OpenAI API**: ChatGPT 연동
- **Email Service**: 회원가입 인증 (선택사항)
- **File Storage**: 이미지 및 문서 저장
- **CDN**: 정적 파일 서빙

### 6.4 보안 요구사항
- **HTTPS**: SSL/TLS 인증서 필수
- **CORS**: 적절한 CORS 정책 설정
- **Rate Limiting**: API 호출 제한
- **Input Validation**: 모든 입력 데이터 검증
- **SQL Injection 방지**: Prisma ORM 사용

## 7. 성능 요구사항

### 7.1 응답 시간
- **페이지 로딩**: 3초 이내
- **AI 응답**: 10초 이내
- **DB 쿼리**: 1초 이내

### 7.2 동시 사용자
- **목표**: 100명 동시 접속
- **최대**: 500명 동시 접속

### 7.3 가용성
- **목표 Uptime**: 99.5%
- **모니터링**: 24/7 시스템 모니터링
- **백업**: 데이터 손실 방지

## 8. 확장 계획

### 8.1 Phase 2 기능
- 실시간 채팅 시스템
- 영상 상담 기능
- 모바일 앱 개발
- 결제 시스템 연동

### 8.2 Phase 3 기능
- AI 이미지 분석
- 음성 인식 상담
- 다국어 지원
- API 외부 제공

## 9. 데이터 마이그레이션

### 9.1 초기 데이터
- 탐정 프로필 데이터
- 사건 사례 데이터
- 카테고리 및 태그 데이터

### 9.2 마이그레이션 스크립트
```bash
# Prisma 마이그레이션 실행
npx prisma migrate deploy

# 초기 데이터 시딩
npx prisma db seed
```

## 10. 모니터링 및 로깅

### 10.1 로깅 요구사항
- **액세스 로그**: 모든 API 호출
- **에러 로그**: 시스템 오류 및 예외
- **사용자 활동**: 주요 사용자 행동 추적

### 10.2 메트릭 모니터링
- **서버 리소스**: CPU, 메모리, 디스크
- **데이터베이스**: 연결 수, 쿼리 성능
- **API 성능**: 응답 시간, 성공률
- **사용자 지표**: DAU, MAU, 전환율

이 기능정의서를 바탕으로 인프라 구축 및 DB 설계를 진행하시면 됩니다. 추가적인 세부사항이나 특정 부분에 대한 질문이 있으시면 언제든 말씀해주세요.
