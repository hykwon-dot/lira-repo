# 데이터베이스 연결 문제 해결 방법

## 문제 진단
- 로컬 환경: SSL 설정 문제로 인한 데이터베이스 연결 실패 ✅ **해결됨**
- 프로덕션 환경: AWS Amplify 환경 변수 설정 필요

## 해결된 사항
1. **SSL 연결 설정 수정**: DATABASE_URL에 `?ssl={"rejectUnauthorized":false}` 추가
2. **환경 변수 로딩 개선**: 수동 .env 파일 로딩 로직 추가
3. **상세한 로깅 추가**: API 엔드포인트에 디버깅 로그 추가

## AWS Amplify 환경 변수 설정 방법

### 1. Amplify 콘솔 접속
1. AWS Amplify 콘솔에 로그인
2. LIRA 앱 선택
3. 좌측 메뉴에서 "Environment variables" 클릭

### 2. 환경 변수 추가/수정
다음 환경 변수들을 설정하세요:

```
DATABASE_URL=mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira?ssl={"rejectUnauthorized":false}

SHADOW_DATABASE_URL=mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira_shadow?ssl={"rejectUnauthorized":false}

JWT_SECRET=lira_production_jwt_secret_2024_secure_key_replace_in_production

OPENAI_API_KEY=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

NODE_ENV=production

LOG_LEVEL=info
```

### 3. 재배포
환경 변수 설정 후 앱을 재배포하세요:
1. "Hosting" 탭으로 이동
2. 최신 커밋에서 "Redeploy this version" 클릭

### 4. 배포 후 확인
배포 완료 후 다음 URL로 헬스체크:
- `https://lira365.com/api/health/deployment`
- `https://lira365.com/api/test-db`

## 추가 개선사항

### 1. RDS 보안 그룹 확인
RDS 클러스터의 보안 그룹에서 다음을 확인:
- 포트 3306이 열려있는지
- Amplify의 IP 범위에서 접근 가능한지

### 2. 연결 풀링 설정
고성능을 위해 DATABASE_URL에 연결 풀링 옵션 추가:
```
?ssl={"rejectUnauthorized":false}&connection_limit=5&pool_timeout=20
```

### 3. 모니터링 설정
CloudWatch에서 다음 메트릭 모니터링:
- RDS 연결 수
- API 응답 시간
- 오류율

## 문제 해결 체크리스트

- [x] 로컬 데이터베이스 연결 테스트
- [x] SSL 설정 수정
- [x] 환경 변수 로딩 로직 개선
- [x] API 로깅 추가
- [ ] Amplify 환경 변수 설정
- [ ] 프로덕션 재배포
- [ ] 헬스체크 API 테스트
- [ ] 회원가입/조사원 목록 기능 테스트

## 예상 결과
이 수정사항들을 적용하면:
1. 회원가입 페이지에서 "서버 오류" 해결
2. `/investigators` 페이지에서 "데이터를 불러올 수 없습니다" 해결
3. 모든 데이터베이스 관련 API 정상 작동