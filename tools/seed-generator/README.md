# Pupoo Seed Generator

운영용 seed와 AI 시계열 seed를 분리 생성하는 CLI 도구입니다.

## 위치
- `tools/seed-generator`

## 실행 모드
- `--mode operational`
  - 운영용 seed만 생성합니다.
  - 출력: `output/pupoo_seed.sql`
- `--mode ai`
  - 단독 실행은 실패 정책입니다.
  - 메시지:
    - `AI seed generation requires operational seed context. Run with --mode all or provide an operational dataset source.`
- `--mode all` (권장)
  - 운영용 seed 생성
  - 운영 validator 통과
  - `output/pupoo_seed.sql` 생성
  - 운영 결과 객체를 그대로 AI generator에 전달
  - AI validator 통과
  - `output/ai_pupoo_seed.sql` 생성

## 권장 실행 방법
```bash
cd tools/seed-generator
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py --mode all
```

## 출력 파일
- 운영용: `output/pupoo_seed.sql`
- AI 전용: `output/ai_pupoo_seed.sql`

## 핵심 정책
- 운영 seed와 AI seed는 파일을 합치지 않습니다.
- 생성 파이프라인은 연결합니다. (`--mode all`)
- AI seed는 운영 seed의 in-memory 결과(`event`, `event_program`, `event_apply`, `event_program_apply`, `qr_logs`, `wait`, `congestions`)를 기준으로 생성합니다.
- 기준 스키마는 `db/pupoo_schema_v6.6.sql` 입니다.

## 주요 설정 키
- `output_path_operational`
- `output_path_ai`
- `mode_default`
- `ai.interval_minutes`
- `ai.scale_mode`
- `ai.training_window_minutes`
- `ai.prediction_enabled`
- `ai.event_timeseries_enabled`
- `ai.program_timeseries_enabled`
