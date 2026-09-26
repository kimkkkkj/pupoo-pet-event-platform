-- =====================================================================
-- 발표용: 실행 시각(NOW) 기준 "오늘" 실시간 데이터 채우기
-- =====================================================================
-- 실시간 현황(통합·대기·체크인)이 오늘 날짜 기록으로 자연스럽게 보이도록
--   1) 데모 방문객 60명(@demo.pupoo.local)과 오늘 진행 중인 행사의 입장 QR을 만들고
--   2) 개장(09:00)부터 지금까지의 입장·퇴장 기록을 만들고
--   3) 부스·프로그램 대기와 혼잡 측정값을 지금 시간대에 맞게 갱신한다.
--
-- 사용법
--   - 운영 시간(09:00~18:00) 중, 발표 30분~1시간 전에 실행하세요.
--     화면은 90분 이내 측정값만 "지금 값"으로 쓰므로, 길게 발표하면 중간에 한 번 더 실행하세요.
--   - 여러 번 실행해도 됩니다. 오늘 데모 입장 기록은 지우고 다시 만듭니다.
--   - 특정 시각으로 테스트하려면 실행 전에:  SET @demo_now = '2026-09-26 14:10:00';
--   - 되돌리기: demo_today_realtime_cleanup.sql
--
-- 하루 흐름 곡선은 백엔드 대체 예측(AiCongestionService)·화면(realtimeKit.js)과 같은 공식이다.
-- =====================================================================

SET NAMES utf8mb4;
START TRANSACTION;

SET @now := COALESCE(@demo_now, NOW());
SET @day := DATE(@now);
SET @open_at := TIMESTAMP(@day, '09:00:00');
SET @h := HOUR(@now) + MINUTE(@now) / 60;
SET @elapsed := LEAST(1, GREATEST(0, (@h - 9) / 9));          -- 운영 시간 중 지난 비율
SET @p := (@h - 9) / 9;
SET @curve := IF(@h < 9 OR @h >= 18, 0.04, 0.35 + 0.95 * EXP(-POW(@p - 0.55, 2) / (2 * 0.2 * 0.2)));
SET @week := CASE DAYOFWEEK(@now) WHEN 1 THEN 1.15 WHEN 7 THEN 1.15 WHEN 6 THEN 1.0 ELSE 0.85 END;
SET @share := LEAST(1, @curve * @week / (1.3 * 1.15));         -- 주말 피크 대비 지금 붐빔 (0~1)

-- 오늘 진행 중인 행사
DROP TEMPORARY TABLE IF EXISTS tmp_demo_events;
CREATE TEMPORARY TABLE tmp_demo_events AS
SELECT e.event_id, e.end_at,
       (SELECT MIN(b.booth_id) FROM booths b WHERE b.event_id = e.event_id) AS gate_booth_id
FROM event e
WHERE e.status <> 'CANCELLED'
  AND @day BETWEEN DATE(e.start_at) AND DATE(e.end_at);

-- ── 1) 데모 방문객 60명 (로그인 불가 계정) ──
INSERT IGNORE INTO users (
  email, password, nickname, phone, status, role_name,
  show_age, show_gender, show_pet, email_verified, phone_verified, created_at, last_modified_at
)
WITH RECURSIVE seq AS (SELECT 1 AS n UNION ALL SELECT n + 1 FROM seq WHERE n < 60)
SELECT
  CONCAT('visitor', LPAD(n, 2, '0'), '@demo.pupoo.local'),
  'DEMO-ACCOUNT-NO-LOGIN',
  CONCAT('데모방문객', LPAD(n, 2, '0')),
  CONCAT('+8210999', LPAD(n, 5, '0')),
  'ACTIVE', 'USER', 0, 0, 0, 0, 0, @now, @now
FROM seq;

-- ── 2) 입장 QR (방문객 × 오늘 행사) ──
INSERT IGNORE INTO qr_codes (user_id, event_id, original_url, mime_type, issued_at, expired_at)
SELECT u.user_id, e.event_id, 'demo://visitor', 'png', @open_at, e.end_at
FROM users u
JOIN tmp_demo_events e
WHERE u.email LIKE '%@demo.pupoo.local';

-- 오늘 데모 입장 기록은 새로 만든다
DELETE l FROM qr_logs l
JOIN qr_codes q ON q.qr_id = l.qr_id
WHERE q.original_url = 'demo://visitor' AND DATE(l.checked_at) = @day;

-- ── 3) 입장·퇴장 기록 ──
-- 행사마다 방문 규모를 조금씩 다르게 (60명 × 80~100%)
-- 입장은 오전에 몰리고(누적 곡선), 입장 2시간 30분 뒤부터 퇴장
DROP TEMPORARY TABLE IF EXISTS tmp_demo_visits;
CREATE TEMPORARY TABLE tmp_demo_visits AS
SELECT q.qr_id, q.event_id, e.gate_booth_id,
       ROW_NUMBER() OVER (PARTITION BY q.event_id ORDER BY q.qr_id) AS rn,
       ROUND(60 * (0.8 + (q.event_id % 3) * 0.1) * (1 - POW(1 - @elapsed, 1.6))) AS arrived
FROM qr_codes q
JOIN tmp_demo_events e ON e.event_id = q.event_id
WHERE q.original_url = 'demo://visitor' AND e.gate_booth_id IS NOT NULL;

INSERT INTO qr_logs (qr_id, booth_id, check_type, checked_at)
SELECT v.qr_id, v.gate_booth_id, 'CHECKIN',
       LEAST(DATE_SUB(@now, INTERVAL 1 MINUTE),
             DATE_ADD(@open_at, INTERVAL ROUND((v.rn - 1) / GREATEST(v.arrived, 1) * @elapsed * 540) MINUTE))
FROM tmp_demo_visits v
WHERE v.rn <= v.arrived;

INSERT INTO qr_logs (qr_id, booth_id, check_type, checked_at)
SELECT l.qr_id, l.booth_id, 'CHECKOUT', DATE_ADD(l.checked_at, INTERVAL 150 MINUTE)
FROM qr_logs l
JOIN qr_codes q ON q.qr_id = l.qr_id
WHERE q.original_url = 'demo://visitor'
  AND DATE(l.checked_at) = @day
  AND l.check_type = 'CHECKIN'
  AND DATE_ADD(l.checked_at, INTERVAL 150 MINUTE) < @now;

-- ── 4) 부스 대기 (부스마다 정해진 피크값 × 지금 붐빔) ──
UPDATE booth_waits w
JOIN booths b ON b.booth_id = w.booth_id
JOIN tmp_demo_events e ON e.event_id = b.event_id
SET w.wait_min = ROUND((20 + (b.booth_id % 7) * 6) * @share),
    w.wait_count = ROUND((10 + (b.booth_id % 5) * 8) * @share),
    w.updated_at = @now;

-- ── 5) 프로그램 대기 ──
UPDATE experience_waits w
JOIN event_program p ON p.program_id = w.program_id
JOIN tmp_demo_events e ON e.event_id = p.event_id
SET w.wait_min = ROUND((15 + (p.program_id % 6) * 7) * @share),
    w.wait_count = ROUND((8 + (p.program_id % 4) * 6) * @share),
    w.updated_at = @now;

-- ── 6) 혼잡 측정 (1~5단계, 지금 붐빔에 맞춰 새 측정 한 건씩) ──
INSERT INTO congestions (program_id, zone, place_name, congestion_level, measured_at)
SELECT c.program_id, c.zone, c.place_name,
       GREATEST(1, LEAST(5, ROUND(1 + 4 * @share * (0.85 + (c.program_id % 4) * 0.1)))),
       @now
FROM (
  SELECT DISTINCT c.program_id, c.zone, c.place_name
  FROM congestions c
  JOIN event_program p ON p.program_id = c.program_id
  JOIN tmp_demo_events e ON e.event_id = p.event_id
) c;

COMMIT;

-- 결과 확인
SELECT e.event_id,
       SUM(l.check_type = 'CHECKIN') AS today_checkins,
       SUM(l.check_type = 'CHECKOUT') AS today_checkouts,
       SUM(l.check_type = 'CHECKIN') - SUM(l.check_type = 'CHECKOUT') AS inside_now,
       ROUND(@share * 100) AS busy_percent_of_peak
FROM tmp_demo_events e
LEFT JOIN qr_codes q ON q.event_id = e.event_id AND q.original_url = 'demo://visitor'
LEFT JOIN qr_logs l ON l.qr_id = q.qr_id AND DATE(l.checked_at) = @day
GROUP BY e.event_id;
