# Pupoo — 반려동물 행사 플랫폼

반려동물 행사(페스티벌·박람회)의 **행사 탐색 · 참가 신청 · 결제 · 실시간 혼잡도 · 커뮤니티**를 한곳에서 제공하는 웹 플랫폼입니다.
사용자용 사이트와 운영자용 관리자 콘솔, 그리고 AI 기능(챗봇·포스터 생성·혼잡도 예측·콘텐츠 모더레이션)을 갖춘 풀스택 서비스입니다.

> **역할 안내**
> 본 프로젝트는 **팀 프로젝트**로 진행되었으며, 저는 **프론트엔드 · UI/UX를 단독으로 담당**했습니다.
> (사용자 사이트 + 관리자 콘솔 전 화면의 설계·구현, 디자인 시스템, 상태/데이터 연동, 반응형 대응)
> 백엔드(Spring Boot)·AI(FastAPI)·인프라는 팀원들이 담당했습니다.

---

## 🧱 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React, Vite, React Router, JavaScript (ES2022) |
| **Backend** | Spring Boot, Spring Security(JWT), JPA/Hibernate, Gradle |
| **AI Service** | FastAPI(Python), LightGBM·LSTM(혼잡도 예측), watsonx.ai + Milvus(RAG 모더레이션), OpenAI/Bedrock(이미지 생성) |
| **Database** | MySQL 8 |
| **Infra / Ops** | Docker Compose, Kubernetes(EKS), AWS(S3·SES·SNS·RDS), GitHub Actions |

아키텍처: **Frontend → Backend(REST API) → AI Service(내부 호출)**, 미디어는 S3/CDN, 캐시·세션은 Redis.

---

## ✨ 주요 기능

**사용자 사이트 (프론트엔드 담당 영역)**
- 행사 탐색 / 상세 / 참가 신청 / KakaoPay 결제 · 환불
- 프로그램(세션·체험·콘테스트) 신청, QR 입장, 마이페이지
- 커뮤니티: 자유·정보·후기·공지·Q&A, 갤러리, 신고
- **AI 챗봇 푸리(사용자)** — 행사 안내·문의 응답
- 실시간 혼잡도 / 대기 현황 / 투표 · 체크인 대시보드

**관리자 콘솔 (프론트엔드 담당 영역)**
- 행사·프로그램·부스·연사·참가자·결제·환불 관리
- 커뮤니티/금칙어/신고 모더레이션, 통계 대시보드
- **AI 챗봇 누리(관리자)** — 운영 보조
- **AI 포스터 생성기** — 행사 정보로 홍보 포스터 자동 생성
- **혼잡도 예측** — 시계열 기반 행사/프로그램 혼잡도 예측 시각화

---

## 🖼️ 스크린샷

> _(추후 추가 예정 — `docs/screenshots/` 에 이미지 배치 후 아래 링크 연결)_

| 메인 | 행사 상세 | 관리자 대시보드 |
|------|-----------|------------------|
| _TBD_ | _TBD_ | _TBD_ |

| AI 포스터 생성 | 혼잡도 예측 | 챗봇(푸리/누리) |
|----------------|-------------|------------------|
| _TBD_ | _TBD_ | _TBD_ |

---

## 🚀 로컬 실행

### 0. 사전 요구
- Node.js 18+, Java 17+, Python 3.12+, MySQL 8 (선택: Docker / Redis)

### 1. 환경 변수 설정 — `.env.example` 복사 후 값 채우기
각 모듈에 `.env.example`이 있습니다. 복사해서 실제 값을 채워주세요. (실제 `.env`는 git에 올라가지 않습니다.)

```bash
cp pupoo_backend/.env.example  pupoo_backend/.env
cp pupoo_ai/.env.example       pupoo_ai/.env
cp pupoo_frontend/.env.example pupoo_frontend/.env
```

채워야 하는 주요 키:
- **Backend**: `SPRING_DATASOURCE_PASSWORD`, `AUTH_JWT_SECRET`, `VERIFICATION_HASH_SALT`, OAuth(`KAKAO/GOOGLE/NAVER_OAUTH_*`), `KAKAOPAY_SECRET_KEY`, `AI_SERVICE_INTERNAL_TOKEN`
- **AI**: `PUPOO_AI_INTERNAL_TOKEN`, `PUPOO_AI_DB_*`, `OPENAI_API_KEY`, `PUPOO_AI_WATSONX_*`
- **Frontend**: `VITE_API_BASE_URL`, `VITE_KAKAO_MAP_KEY`, OAuth client id 들

> backend 로컬 기본값은 `application.properties`에 `${ENV:default}` 형태로 들어 있어 비밀값만 채우면 동작합니다. 하드코딩된 비밀값은 없습니다.

### 2. 데이터베이스 적재 (순서 중요)
```bash
# 1) 스키마
mysql -u<user> -p <db> < db/pupoo_schema_v6.7.sql
# 2) 데모 시드 (배포용으로 정리된 시드 — 오늘 기준 진행중/예정/종료 행사 포함)
mysql -u<user> -p <db> < db/pupoo_seed_demo.sql
# 3) AI 시계열 (혼잡도 학습/예측용, NOW() 기준 재생성)
mysql -u<user> -p <db> < db/pupoo_seed_ai_timeseries_practical_patterned_v6.6.sql
```

### 3. 서비스 실행
```bash
# Backend
cd pupoo_backend && ./gradlew bootRun

# AI Service
cd pupoo_ai && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Frontend
cd pupoo_frontend && npm install && npm run dev   # http://localhost:5173
```

또는 한 번에:
```bash
docker compose up --build
```

---

## 📁 리포지토리 구조
```
pupoo_frontend/   # React + Vite (사용자 사이트 + 관리자 콘솔) — 프론트엔드 담당
pupoo_backend/    # Spring Boot REST API
pupoo_ai/         # FastAPI AI 서비스 (챗봇·포스터·혼잡도·모더레이션)
db/               # 스키마 + 데모 시드 + AI 시계열 시드
k8s/              # Kubernetes 매니페스트 (예시 시크릿 포함)
```
