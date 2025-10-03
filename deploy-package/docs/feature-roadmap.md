# Simulation Platform Feature Roadmap

## Phase 1 – Intelligent Intake Workspace (현재 작업)
- **사건 진행 타임라인 & 체크리스트**
  - 요약 데이터(IntakeSummary)에서 사건 단계 후보를 추론해 타임라인 카드에 표시합니다.
  - 항목별 완료/보류 상태를 저장하는 클라이언트 상태(Zustand) 추가.
  - `/simulation` 우측 패널에 "타임라인" 카드 배치, 체크/메모 기능 포함.
- **실시간 리스크 알림**
  - Intake 대화 메시지 스트림에서 규칙 기반으로 위험 키워드를 감지.
  - 감지 시 UI 배너와 알림 스택에 등록, 관리자용 `/api/alerts` 엔드포인트로 전달.

## Phase 2 – Evidence Collaboration
- **증거 자료 업로드 & 자동 분류**
  - `/api/evidence/upload` 라우트 생성 및 S3 업로드(사전 서명 URL) 연동.
  - 업로드 후 AI 분석(`/api/evidence/classify`)으로 유형·키워드 태깅 -> 사건 요약과 연동.
  - `/simulation`에 "증거 보관함" 카드 추가, 필터/검색·다운로드 지원.
- **공동 작업 보드 (Collaboration Board)**
  - 조직 멤버/탐정이 메모와 태스크를 남길 수 있는 Kanban 스타일 UI (`/app/simulation/collab`).
  - Prisma에 `CollaborationBoard`, `CollaborationTask` 테이블 추가, 실시간 업데이트(Pusher/Socket) 계획.

## Phase 3 – Performance Intelligence
- **탐정 성과 인사이트 대시보드**
  - `/admin/investigators/insights` 페이지 추가.
  - 성공률, 분야별 매칭 통계, 고객 피드백 요약 시각화(Recharts).
- **맞춤형 온보딩 & 추천**
  - 신규 의뢰인의 업종/목표를 입력 받아 시나리오·탐정·자료를 추천하는 Onboarding Wizard 개편.
  - 추천 결과를 시뮬레이션 초기 상태 및 리포트 탭과 동기화.

## 운영 고려 사항
- AI 호출 증가 대비 Rate-limit & Queue 설계.
- Prisma 마이그레이션: evidence, board, alert, analytics용 테이블 추가.
- 사용자 데이터 보호를 위한 파일 암호화/접근 제어 정책 수립.

> **현재 스프린트 목표:** Phase 1의 타임라인 카드와 리스크 알림 MVP 구현, `/simulation` UI와 자연스럽게 통합.
