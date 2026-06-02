# 실시간 혼잡/대기 검증 시나리오 (NOW 기반, 2026-03-23)

## 총 시나리오 요약
이 시나리오 세트는 과거 고정 시각 데이터를 넣는 방식이 아니라, **실행 시점의 현재 시간(`NOW()`) 기준**으로 혼잡도와 대기시간을 검증하도록 재구성했다.

핵심 목표는 아래 3가지다.
- 데이터 적재 직후 행사/프로그램/부스 혼잡도가 바로 올라가는지 확인
- 같은 시점에 대기시간(`wait_count`, `wait_min`)이 증가하는지 확인
- 현재 시점부터 행사 종료 시점까지의 예측 혼잡도, 그리고 다음날 예측 변화까지 확인

## 사전 정합성 점검 (스키마/시드/AI 시드)
시나리오 실행 전에 아래 항목을 먼저 확인한다.

1. 스키마 컬럼/ENUM 정합성
```sql
SELECT table_name, column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN (
    'event', 'event_program', 'event_program_apply',
    'booth_waits', 'experience_waits', 'qr_logs',
    'congestions', 'ai_prediction_logs'
  )
ORDER BY table_name, ordinal_position;
```

2. 기준 시드 존재 여부
- 운영 시드: 이벤트/부스/프로그램 기본 데이터가 존재해야 함
- AI 시드: `ai_prediction_logs` 연동 구조가 정상이어야 함

3. 타깃 이벤트 확인
```sql
SELECT event_id, event_name, start_at, end_at, status
FROM event
WHERE event_id = 3;
```

## 실행 순서
```sql
SOURCE db/simulations/s1_peak_spike_event3.sql;
SOURCE db/simulations/s2_cooldown_event3.sql;
SOURCE db/simulations/s3_bottleneck_transfer_event4.sql;
```

주의:
- 파일명은 기존 이름을 유지했지만 내용은 NOW 기반으로 재작성했다.
- `s2_cooldown_event3.sql`은 현재 시점~행사 종료 예측 시나리오를 수행한다.
- `s3_bottleneck_transfer_event4.sql`은 다음날 예측 변화 시나리오를 수행한다.

## Step 1. 즉시 혼잡/대기 상승 (`s1_peak_spike_event3.sql`)
목적:
- 데이터 적재 시점에 혼잡과 대기가 즉시 올라가는지 검증
- `WAITING/APPROVED/APPLIED` 신청 상태가 대기열 추정에 반영되는지 검증

상세 동작:
- 이벤트 3의 부스를 기준으로 실시간용 프로그램 4개를 `NOW()` 기준 실행 중 상태로 업서트
- 프로그램 신청(`event_program_apply`)을 상태별로 대량 주입
  - `WAITING`, `APPROVED`, `APPLIED`를 각각 분리 입력
- 최근 15분 구간에 `qr_logs` 유입(`CHECKIN`)을 유출(`CHECKOUT`)보다 크게 주입
- `experience_waits`, `booth_waits`, `congestions`를 즉시 조회 가능한 형태로 업서트
- `ai_prediction_logs`에 현재 시점 고혼잡 마커를 저장

검증 포인트:
- 프로그램 대기열이 증가했는지
- 부스 대기가 증가했는지
- 실시간 화면/API에서 즉시 변화가 보이는지

## Step 2. 현재~행사 종료 예측 반영 (`s2_cooldown_event3.sql`)
목적:
- 현재 시점부터 행사 종료 시점까지 예측 혼잡도 곡선이 저장되는지 검증

상세 동작:
- 모델 버전 `scenario-s2-remaining-horizon` 기존 로그를 먼저 삭제해 재실행 시 중복을 방지
- `NOW()`부터 `event.end_at`까지 30분 버킷으로 `ai_prediction_logs`를 생성
  - `EVENT` 타깃 예측 생성
  - `PROGRAM` 타깃 예측 생성
- 시간대(오전/오후/저녁)와 요일(주말 가중)에 따라 피크값을 다르게 생성

검증 포인트:
- 예측 시각이 현재~행사 종료 범위를 커버하는지
- 같은 시각에서 이벤트/프로그램 예측값이 모두 생성되는지

## Step 3. 다음날 예측 변화 (`s3_bottleneck_transfer_event4.sql`)
목적:
- 다음날에는 오늘과 다른 혼잡 패턴이 생성되는지 검증

상세 동작:
- 모델 버전 `scenario-s3-nextday-shift` 로그를 삭제 후 재생성
- 다음날 09:00~21:00 구간을 1시간 버킷으로 생성
  - `EVENT` 타깃 예측 생성
  - `PROGRAM` 타깃 예측 생성
- 점심/오후 피크가 높고 저녁 완화되는 패턴으로 곡선을 분리

검증 포인트:
- 다음날 버킷에 예측 로그가 실제로 저장되는지
- Step 2(오늘~종료) 대비 분포가 달라지는지

## 공통 검증 쿼리
1. 신청 상태 기반 대기열(가중치 적용 전 입력량) 확인
```sql
SELECT
  pa.program_id,
  SUM(CASE WHEN pa.status IN ('WAITING','APPROVED') THEN 1 ELSE 0 END) AS queue_count,
  SUM(CASE WHEN pa.status = 'APPLIED' THEN 1 ELSE 0 END) AS applied_count
FROM event_program_apply pa
WHERE pa.program_id IN (9703101, 9703102, 9703103, 9703104)
GROUP BY pa.program_id
ORDER BY pa.program_id;
```

2. 프로그램/부스 대기값 확인
```sql
SELECT program_id, wait_count, wait_min, updated_at
FROM experience_waits
WHERE program_id IN (9703101, 9703102, 9703103, 9703104)
ORDER BY program_id;

SELECT booth_id, wait_count, wait_min, updated_at
FROM booth_waits
WHERE booth_id IN (
  SELECT booth_id FROM event_program WHERE program_id IN (9703101, 9703102, 9703103, 9703104)
)
ORDER BY booth_id;
```

3. 현재~행사 종료 예측 로그 확인
```sql
SELECT
  target_type,
  MIN(prediction_base_time) AS min_base_time,
  MAX(prediction_base_time) AS max_base_time,
  COUNT(*) AS rows_cnt
FROM ai_prediction_logs
WHERE model_version = 'scenario-s2-remaining-horizon'
  AND event_id = 3
GROUP BY target_type;
```

4. 다음날 예측 변화 확인
```sql
SELECT
  target_type,
  HOUR(prediction_base_time) AS hh,
  ROUND(AVG(predicted_peak_score_60m), 2) AS avg_peak,
  ROUND(MAX(predicted_peak_score_60m), 2) AS max_peak
FROM ai_prediction_logs
WHERE model_version = 'scenario-s3-nextday-shift'
  AND event_id = 3
GROUP BY target_type, hh
ORDER BY hh, target_type;
```

## 운영 메모
- 실시간 대기 동기화 스케줄러는 주기적으로 `experience_waits`, `booth_waits`를 다시 계산해 덮어쓴다.
- 따라서 Step 1 직후 수동 업서트 값은 “즉시 가시화용”, 이후 값은 “계산 기반 추정치”로 수렴한다.
- `APPLIED` 가중치는 백엔드 설정 `ai.wait.sync.applied-weight` (기본 0.35)를 따른다.
