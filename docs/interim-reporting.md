# 자동 중간 보고 프로세스 제안

## 목표
- 사건 진행 상황을 실시간에 가깝게 파악하고, 고객/관리자 모두가 동일한 정보 상태를 유지하게 한다.
- 진행률, 리스크, 다음 액션 등을 표준 포맷으로 정리해 불필요한 커뮤니케이션을 줄인다.
- 기존 타임라인(`InvestigationTimelineEntry`)과 챗봇 로그, 첨부자료를 재활용해 자동으로 요약을 생성한다.

## 데이터 파이프라인
1. **소스 이벤트**
   - 타임라인 엔트리(상태 전환, PROGRESS_NOTE, INTERIM_REPORT 등)
   - 채팅 메시지(`InvestigationChatMessage`) 중 중간보고 태그가 붙은 항목
   - 첨부파일/증빙(추후 데이터 레이크 확장 시)
2. **이벤트 큐/스트림**
   - Prisma 트랜잭션 완료 후 `investigationTimelineEntry` 생성 시 Webhook(또는 메시지 큐) 발행
   - 서버리스 Cron(예: Vercel Cron, Supabase Scheduler)로 하루 2~3회 누락 건 스캔
3. **요약 엔진**
   - LLM Prompt: 사건 메타 + 최근 n개의 이벤트 + KPI 스냅샷
   - 응답 포맷: ⭐ 진행 요약, ⚠ 리스크, ✅ 다음 단계, 📎 참고자료
4. **저장소**
   - `InterimReport` 테이블 신설(요약 텍스트, 생성 시각, 참조 이벤트 ID 목록, 작성자 타입[자동/수동])
   - 기존 `InvestigationTimelineEntry`와 1:N 링크(보고 생성 시 자동으로 TIMELINE 타입 `INTERIM_REPORT` 추가)

## 동작 시나리오
1. 조사원이 진행 메모를 남기거나 상태를 `IN_PROGRESS → REPORTING` 으로 전환한다.
2. 해당 트랜잭션 종료 후 백그라운드 워커가 이벤트를 감지하여 LLM 요약 요청을 보낸다.
3. 응답 받은 요약을 `InterimReport`와 타임라인에 저장하고, 고객에게 알림(이메일/푸시/대시보드 배지) 발송.
4. 고객이 상세 페이지에서 중간보고 카드(최근 3건 + 전체 보기)를 확인한다.
5. 관리자는 대시보드에서 자동보고 품질을 모니터링하고 필요 시 수동 수정(버전 히스토리 유지).

## 필요한 컴포넌트
| 모듈 | 역할 | 비고 |
| --- | --- | --- |
| `src/lib/interimReportWorker.ts` | 이벤트 큐 소비, LLM 호출, Prisma 저장 | Node Job / Edge Function 선택 |
| `prisma/schema.prisma` | `InterimReport` 모델, `InvestigationRequest`와 relation | 생성자 정보(자동/수동) 포함 |
| `src/app/api/interim-reports/[requestId]/route.ts` | 요청별 보고 리스트/생성 API | 권한 체크: 의뢰자·배정 탐정·관리자 |
| `src/app/investigation-requests/[id]/page.tsx` | 프론트 UI 카드, "자동 보고" 배지, 승인/재생성 버튼 | 이미 존재하는 상세 페이지 확장 |
| `Notification` 파이프라인 | 보고 생성 알림 | 이메일 + 앱 내 알림 |

## 구현 체크리스트
- [ ] Prisma 모델 추가: `InterimReport { id, requestId, summary, risks, nextActions, createdAt, generatedBy, sourceEventIds }`
- [ ] `InvestigationTimelineEntry` 생성 시 Hook 또는 메시지 발행 로직 작성
- [ ] 백그라운드 워커/Crontab 구성 (Vercel Cron, Supabase Functions, 또는 자체 Node Worker)
- [ ] LLM Prompt 템플릿 설계 (사건 메타 + 최근 이벤트 JSON)
- [ ] 보고 저장 후 타임라인에 `INTERIM_REPORT` 엔트리 자동 추가
- [ ] 고객/관리자 UI에 중간보고 카드 + 알림 배지 노출
- [ ] 품질 관리: 자동 보고 실패/지연 시 관리자 알림, 재생성 버튼 제공

## 향후 확장 아이디어
- **지표 기반 알림**: 예산 초과, 일정 지연 등 조건 기반으로 자동 중간보고 트리거 강화
- **버전 관리**: 자동 보고 후 조사원 검토/수정 기능 제공, 수정 이력 비교
- **다국어 지원**: 한국어/영어 요약 동시 생성, 고객 언어 설정에 따라 노출
- **리포트 분석**: 보고서 텍스트에서 위험 패턴을 추출해 관리자 대시보드에 시각화
