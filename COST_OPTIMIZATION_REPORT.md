# LIRA AWS 비용 최적화 보고서 (2026-01-18)

## 1. 긴급 조치 사항 (DB 최적화)
현재 AWS RDS 데이터베이스가 불필요하게 과다 프로비저닝되어 있어 막대한 비용이 발생 중입니다.

### 발견된 문제
- **기존 리소스**: `lira-db` (Multi-AZ DB Cluster)
- **스펙**: `db.m5d.large` 인스턴스 **3대** 구동 중 (Writer 1개, Reader 2개)
- **예상 비용**: 월 $1,000 이상 추정 (엔터프라이즈급 구성)

### 조치 내역 (완료)
비용 절감을 위해 적정 규모의 **단일 인스턴스(Single-AZ)**를 새로 생성했습니다.
- **신규 리소스**: `lira-db-optimized`
- **스펙**: `db.t3.micro` (Free Tier 가능 범위 또는 월 $15 수준)
- **상태**: 생성 진행 중 (약 10-20분 소요)

### 사용자 수행 필요 작업
1. **연결 정보 변경**: `lira-db-optimized` 생성이 완료되면 엔드포인트를 확인하여 Amplify 환경변수(`DATABASE_URL`)를 업데이트해야 합니다.
   - 확인 명령어: `aws rds describe-db-instances --db-instance-identifier lira-db-optimized --query "DBInstances[0].Endpoint.Address"`
2. **데이터 이관**: 기존 `lira-db`의 데이터가 필요하다면 백업/덤프 후 신규 DB로 복원해야 합니다. (개발/테스트 단계라면 스키마만 `npx prisma db push`로 재생성 권장)
3. **기존 리소스 삭제 (중요)**: 데이터 이관/백업 확인 후 **반드시 기존 `lira-db` 클러스터를 삭제**해야 비용 발생이 멈춥니다.

---

## 2. 추가 발견된 고비용 리소스 (확인 필요)
LIRA 프로젝트 외의 리소스로 의심되거나, 과거 레거시 리소스가 발견되었습니다.

### A. Elastic Beanstalk (레거시 의심)
- **`lira-app-prod`**: 현재 Next.js는 Amplify로 배포되므로, 이 EB 환경은 구버전 배포판일 가능성이 높습니다. (삭제 권장)
- **`povx24-prod`**: LIRA와 무관해 보이는 프로젝트입니다. (삭제 검토)

### B. ECS & Load Balancer
- **Cluster**: `porntest-cluster` (Service: `porntest-server`)
- **Load Balancer**: `porntest-alb`
- **상태**: Fargate 태스크 1개 상시 구동 중.
- **분석**: LIRA 프로젝트와 무관해 보이며 비용을 발생시키고 있습니다.

## 3. 결론 및 향후 계획
- **Amplify**: `force-dynamic` 제거를 통해 Lambda 비용 최적화 완료 (배포됨).
- **RDS**: `db.t3.micro` 로 교체 시 **98% 이상 비용 절감** 가능.
- **기타**: 레거시/미사용 리소스 정리 시 추가 절감 가능.
