# Pupoo AI

## Local Run

```powershell
cd pupoo_ai
py -3.10 -m venv .venv
.venv\Scripts\activate
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python -m uvicorn pupoo_ai.app.main:app --reload --port 8000
```

로컬 개발과 테스트는 시스템 전역 Python 대신 반드시 `pupoo_ai/.venv`를 사용하세요.
`awscli`와 `botocore`가 전역 환경에서 섞이면 테스트와 운영 도구 버전이 충돌할 수 있습니다.

## Local Test

```powershell
cd pupoo_ai
.venv\Scripts\activate
.venv\Scripts\python -m pytest tests
```

## Internal Smoke Test

```powershell
cd pupoo_ai
.venv\Scripts\activate
.venv\Scripts\python scripts\internal_api_smoke_test.py --print-only
```

`curl` 예시만 확인하려면 아래 명령을 사용합니다.

```powershell
cd pupoo_ai
.venv\Scripts\activate
.venv\Scripts\python scripts\internal_api_smoke_test.py --print-curl
```

실제 호출이 필요하면 아래처럼 내부 토큰과 base URL을 별도로 넣어 실행합니다.

```powershell
$env:PUPOO_AI_SMOKE_BASE_URL="http://127.0.0.1:8000"
$env:PUPOO_AI_SMOKE_INTERNAL_TOKEN="YOUR_INTERNAL_TOKEN_HERE"
.venv\Scripts\python scripts\internal_api_smoke_test.py --run
```

직접 호출이 필요한 경우 `curl` 예시는 아래 4개 경로를 기준으로 사용합니다.

```bash
curl -X POST "http://127.0.0.1:8000/internal/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: YOUR_INTERNAL_TOKEN_HERE" \
  -d '{"message":"행사 안내 도와줘","history":[],"context":{"route":"/","role":"user"}}'

curl -X POST "http://127.0.0.1:8000/internal/admin/chatbot/chat" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: YOUR_INTERNAL_TOKEN_HERE" \
  -d '{"message":"공지 초안 작성 도와줘","history":[],"context":{"route":"/admin/dashboard","role":"admin"}}'

curl -X POST "http://127.0.0.1:8000/internal/moderate" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: YOUR_INTERNAL_TOKEN_HERE" \
  -d '{"content":"오늘은 반려견과 산책했어요.","board_type":"FREE","metadata":{"source":"curl-smoke"}}'

curl -X POST "http://127.0.0.1:8000/internal/moderation/check" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Token: YOUR_INTERNAL_TOKEN_HERE" \
  -d '{"content":"오늘은 반려견과 산책했어요.","board_type":"FREE","metadata":{"source":"curl-smoke"}}'
```

기대 결과:

- `/internal/chatbot/chat`: `200`, `success=true`, `data.message` 존재
- `/internal/admin/chatbot/chat`: `200`, `success=true`, `data.message` 존재
- `/internal/moderate`: `200`, `decision/result/action` 존재
- `/internal/moderation/check`: `200`, `decision/result/action` 존재
- 내부 토큰 누락 또는 불일치: `403`

## Train Congestion Models

```powershell
cd pupoo_ai
.venv\Scripts\activate
python -m app.features.congestion.train.train_congestion_models
```

Optional arguments:

- `--limit 5000` for quick training
- `--db-url "jdbc:mysql://localhost:3306/pupoodb"`
- `--validation-ratio 0.2`

## Environment

- `PUPOO_AI_SERVICE_NAME` (default: `pupoo-ai`)
- `PUPOO_AI_INTERNAL_TOKEN` (로컬 개발 시 프로젝트 전용 값으로 별도 설정 권장)
- `PUPOO_AI_LOG_LEVEL` (default: `INFO`)
- `PUPOO_AI_DB_URL` (optional, `mysql://user:password@host:3306/database`)
- `PUPOO_AI_DB_HOST` (optional)
- `PUPOO_AI_DB_PORT` (default: `3306`)
- `PUPOO_AI_DB_USER` (optional)
- `PUPOO_AI_DB_PASSWORD` (optional)
- `PUPOO_AI_DB_NAME` (optional)
- `PUPOO_AI_DB_SSL_CA` (optional, RDS CA bundle path)
- `PUPOO_AI_TRAIN_DB_URL` (optional, fallback to `SPRING_DATASOURCE_URL`)
- `PUPOO_AI_TRAIN_DB_USER` (optional)
- `PUPOO_AI_TRAIN_DB_PASSWORD` (optional)
- `PUPOO_AI_TRAIN_DB_HOST` (optional)
- `PUPOO_AI_TRAIN_DB_PORT` (optional)
- `PUPOO_AI_TRAIN_DB_NAME` (optional)

## Internal Endpoints

- `POST /internal/congestion/events/predict`
- `POST /internal/congestion/programs/predict`
- `POST /internal/congestion/programs/recommendations`

All internal endpoints require `X-Internal-Token`.

## Readiness Check

- `GET /ready`

If RDS environment variables are configured, the readiness endpoint also verifies the MySQL connection and returns `503` when the database is unreachable.
