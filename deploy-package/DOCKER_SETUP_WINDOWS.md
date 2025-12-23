# Windows 환경 Docker + MariaDB 트러블슈팅 가이드

이 문서는 Windows 10 (빌드 19045, 22H2) 환경에서 `docker` 명령이 인식되지 않는 문제를 해결하고, LIRA 프로젝트의 MariaDB 컨테이너를 정상 기동하기 위한 단계별 안내입니다.

---
## 1. 현재 상태 진단
| 체크 항목 | 명령 / 방법 | 기대 결과 | 조치 |
|-----------|-------------|-----------|------|
| Docker CLI 존재 | `docker --version` | 버전 출력 | 미출력 → 설치 필요 |
| Compose v2 존재 | `docker compose version` | 버전 출력 | Docker Desktop 설치 후 자동 제공 |
| 포트 사용 여부 | `Test-NetConnection -ComputerName localhost -Port 3306` (PowerShell) | `TcpTestSucceeded : True` (컨테이너 기동 후) | 이미 사용 중이면 포트 변경 필요 |
| 기존 MySQL 충돌 | 서비스 목록에서 MySQL/MariaDB | 없음 | 충돌 시 서비스 중지 |

---
## 2. 필수 선행 조건
1. BIOS/UEFI 에서 가상화(Virtualization) 활성화 (Task Manager > Performance > CPU 에서 확인)
2. Windows 기능 활성화:
   - PowerShell(관리자)에서:
     ```powershell
     dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
     ```
3. WSL2 기본 버전 설정:
   ```powershell
   wsl --set-default-version 2
   ```
4. (필요 시) Linux 커널 업데이트 패키지 설치: https://aka.ms/wsl2kernel

---
## 3. Docker Desktop 설치
1. 공식 다운로드: https://www.docker.com/products/docker-desktop/
2. 설치 옵션에서 WSL 2 Backend 체크 유지.
3. 설치 후 재부팅.
4. Docker Desktop 실행 → Settings > Resources > WSL Integration 에서 원하는 배포판 (예: Ubuntu) 활성화.
5. PowerShell 새 창 열고 확인:
   ```powershell
   docker version
   docker compose version
   ```

### PATH 문제 해결
설치 후에도 인식 안될 경우:
- 환경변수 사용자/시스템 PATH 에 다음 경로 존재 확인:
  - `C:\Program Files\Docker\Docker\resources\bin`
- 없으면 수동 추가 후 PowerShell 재시작.

---
## 4. 최소 기능 테스트
```powershell
docker run --rm hello-world
```
정상 출력되면 엔진 동작 OK.

---
## 5. LIRA 프로젝트 MariaDB 컨테이너 기동
프로젝트 루트(`docker-compose.mariadb.yml` 존재)에서:
```powershell
docker compose -f docker-compose.mariadb.yml up -d
```
상태 확인:
```powershell
docker ps --filter "name=lira-mariadb"
```
로그 확인(초기화 에러 시):
```powershell
docker logs lira-mariadb
```

### 컨테이너 재생성 (초기화 꼬였을 때)
```powershell
docker compose -f docker-compose.mariadb.yml down -v
docker compose -f docker-compose.mariadb.yml up -d
```

---
## 6. Prisma 마이그레이션 & 시드
컨테이너가 HEALTHY 상태이거나 포트 응답 OK일 때:
```powershell
# DB 포트 확인 (선택)
Test-NetConnection -ComputerName localhost -Port 3306

# Prisma 마이그레이션 적용
npx prisma migrate deploy
# 개발 중이라면 (스키마 수정 후)
# npx prisma migrate dev --name init_local

# Client 재생성 (보통 migrate dev가 포함하지만 안전하게)
npx prisma generate

# 시드 실행
npm run db:seed
```

---
## 7. 연결 테스트
헬스 체크 엔드포인트:
```
GET http://localhost:3000/api/health/db
```
기대 응답 예:
```json
{ "status": "ok", "latencyMs": 12 }
```

---
## 8. 자주 발생하는 오류 & 해결
| 증상 | 원인 | 해결 |
|------|------|------|
| `docker` 명령 인식 안됨 | 미설치 또는 PATH 미등록 | Docker Desktop 재설치 / PATH 추가 |
| `Error 2002 (HY000): Can't connect to MySQL` | 컨테이너 초기화 중 | 몇 초 대기 후 재시도, 로그 확인 |
| `PrismaClientInitializationError` + 프로토콜 메시지 | 잘못된 `DATABASE_URL` | `.env` 포맷 확인 (`mysql://user:pw@host:port/db`) |
| Seed에서 외래키 오류 | 이전 잔존 데이터 스키마 불일치 | `down -v` 후 재기동 + migrate + seed |
| 3306 Already in use | 기존 MySQL 서비스 기동 | 서비스 중지 또는 compose 포트 `3307:3306` 변경 + `.env` 수정 |
| 비밀번호 특수문자 문제 | Shell 해석 | Compose 사용 시 그대로 OK, 직접 명령 시 비밀번호 따옴표 감싸기 |

---
## 9. 대안 경로 (Docker 불가 시 임시)
1. MariaDB MSI 설치 (https://mariadb.org/download/) 후:
   - 서비스 포트 3306 그대로 사용 또는 3307 지정.
   - `.env` 의 `DATABASE_URL` 을 설치 사용자 계정/비밀번호로 수정.
2. Portable MySQL 사용 + 수동 실행 → 동일하게 연결.
3. 개발만 급한 경우 SQLite 임시 회귀:
   - `schema.prisma` provider 를 `sqlite` 로 변경 + `file:./dev.db` URL.
   - `npx prisma migrate dev --name sqlite_temp` 후 진행 (향후 반드시 되돌리기).

---
## 10. 보안/운영 팁
- 초기 root 패스워드와 애플리케이션 사용자 패스워드는 .env 로 옮기고 compose 파일에는 참조 형태 권장:
  ```yaml
  environment:
    MARIADB_ROOT_PASSWORD: ${MARIADB_ROOT_PASSWORD}
    MARIADB_DATABASE: ${MARIADB_DATABASE}
    MARIADB_USER: ${MARIADB_USER}
    MARIADB_PASSWORD: ${MARIADB_PASSWORD}
  ```
- 장기적으로는 볼륨 백업 스크립트 추가: `docker exec lira-mariadb mariadb-dump -u root -p... lira > backup.sql`
- 운영 전환 시에는 전용 DB (RDS/Cloud SQL 등) 사용 고려.

---
## 11. 문제 지속 시 체크리스트 (복사해서 활용)
- [ ] Docker Desktop 설치 완료
- [ ] `docker version` 정상
- [ ] WSL2 backend 활성
- [ ] 3306 포트 충돌 없음
- [ ] `docker compose up -d` 성공
- [ ] `docker ps` 에 mariadb 표시
- [ ] Prisma migrate 성공
- [ ] Seed 성공
- [ ] `/api/health/db` OK

---
## 12. 빠른 복구 절차 (이미 한 번 성공했던 환경에서 깨졌을 때)
```powershell
docker compose -f docker-compose.mariadb.yml down -v
docker compose -f docker-compose.mariadb.yml pull
docker compose -f docker-compose.mariadb.yml up -d
npx prisma migrate deploy
npm run db:seed
```

---
문의 또는 추가 자동화 필요 시 `scripts/` 폴더에 PowerShell 스크립트 추가를 고려하세요 (예: `scripts/reset-db.ps1`).
