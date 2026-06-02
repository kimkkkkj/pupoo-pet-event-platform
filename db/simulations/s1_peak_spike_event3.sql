-- Scenario 1 (NOW-based): immediate congestion spike + immediate wait increase
-- Goal:
--   1) At load time, make event/program/booth congestion rise immediately.
--   2) Make wait_count/wait_min increase immediately (and stay compatible with wait-sync).

START TRANSACTION;

SET @s1_event_id := 3;
SET @s1_now := NOW();
SET @s1_window_from := DATE_SUB(@s1_now, INTERVAL 15 MINUTE);
SET @s1_qr_id := COALESCE(
  (SELECT MIN(qr_id) FROM qr_codes WHERE event_id = @s1_event_id),
  (SELECT MIN(qr_id) FROM qr_codes)
);

-- Keep event in ongoing mode for realtime checks.
UPDATE event
SET status = 'ONGOING'
WHERE event_id = @s1_event_id
  AND status <> 'CANCELLED';

DROP TEMPORARY TABLE IF EXISTS tmp_s1_booths;
CREATE TEMPORARY TABLE tmp_s1_booths AS
SELECT
  b.booth_id,
  b.zone,
  b.place_name,
  ROW_NUMBER() OVER (ORDER BY b.booth_id) AS ord
FROM booths b
WHERE b.event_id = @s1_event_id
ORDER BY b.booth_id
LIMIT 4;

SET @s1_booth_1 := (SELECT booth_id FROM tmp_s1_booths ORDER BY ord LIMIT 1);
SET @s1_booth_2 := (SELECT booth_id FROM tmp_s1_booths ORDER BY ord LIMIT 1 OFFSET 1);
SET @s1_booth_3 := (SELECT booth_id FROM tmp_s1_booths ORDER BY ord LIMIT 1 OFFSET 2);
SET @s1_booth_4 := (SELECT booth_id FROM tmp_s1_booths ORDER BY ord LIMIT 1 OFFSET 3);

SET @s1_booth_2 := COALESCE(@s1_booth_2, @s1_booth_1);
SET @s1_booth_3 := COALESCE(@s1_booth_3, @s1_booth_1);
SET @s1_booth_4 := COALESCE(@s1_booth_4, @s1_booth_1);

SET @s1_zone_1 := COALESCE((SELECT zone FROM booths WHERE booth_id = @s1_booth_1), 'OTHER');
SET @s1_zone_2 := COALESCE((SELECT zone FROM booths WHERE booth_id = @s1_booth_2), 'OTHER');
SET @s1_zone_3 := COALESCE((SELECT zone FROM booths WHERE booth_id = @s1_booth_3), 'OTHER');
SET @s1_zone_4 := COALESCE((SELECT zone FROM booths WHERE booth_id = @s1_booth_4), 'OTHER');

SET @s1_place_1 := COALESCE((SELECT place_name FROM booths WHERE booth_id = @s1_booth_1), 'SIM-S1-BOOTH-1');
SET @s1_place_2 := COALESCE((SELECT place_name FROM booths WHERE booth_id = @s1_booth_2), 'SIM-S1-BOOTH-2');
SET @s1_place_3 := COALESCE((SELECT place_name FROM booths WHERE booth_id = @s1_booth_3), 'SIM-S1-BOOTH-3');
SET @s1_place_4 := COALESCE((SELECT place_name FROM booths WHERE booth_id = @s1_booth_4), 'SIM-S1-BOOTH-4');

DROP TEMPORARY TABLE IF EXISTS tmp_s1_program_targets;
CREATE TEMPORARY TABLE tmp_s1_program_targets (
  ord INT NOT NULL PRIMARY KEY,
  program_id BIGINT NOT NULL,
  booth_id BIGINT NOT NULL,
  zone ENUM('ZONE_A', 'ZONE_B', 'ZONE_C', 'OTHER') NOT NULL,
  place_name VARCHAR(100) NOT NULL,
  program_title VARCHAR(255) NOT NULL,
  waiting_cnt INT NOT NULL,
  approved_cnt INT NOT NULL,
  applied_cnt INT NOT NULL,
  wait_min_seed INT NOT NULL
);

INSERT INTO tmp_s1_program_targets (
  ord, program_id, booth_id, zone, place_name, program_title,
  waiting_cnt, approved_cnt, applied_cnt, wait_min_seed
)
VALUES
  (1, 9703101, @s1_booth_1, @s1_zone_1, @s1_place_1, 'SIM-S1-HOT-ALPHA', 90, 40, 140, 38),
  (2, 9703102, @s1_booth_2, @s1_zone_2, @s1_place_2, 'SIM-S1-HOT-BRAVO', 60, 30, 100, 30),
  (3, 9703103, @s1_booth_3, @s1_zone_3, @s1_place_3, 'SIM-S1-MID-CHARLIE', 35, 20, 70, 22),
  (4, 9703104, @s1_booth_4, @s1_zone_4, @s1_place_4, 'SIM-S1-LITE-DELTA', 20, 10, 50, 15);

-- Realtime-running synthetic programs (running now).
INSERT INTO event_program (
  program_id, event_id, category, program_title, description,
  start_at, end_at, booth_id, image_url, capacity, throughput_per_min, created_at
)
SELECT
  t.program_id,
  @s1_event_id,
  'EXPERIENCE',
  t.program_title,
  'NOW-based realtime spike scenario',
  DATE_SUB(@s1_now, INTERVAL 20 MINUTE),
  DATE_ADD(@s1_now, INTERVAL 3 HOUR),
  t.booth_id,
  NULL,
  CASE
    WHEN t.ord = 1 THEN 70
    WHEN t.ord = 2 THEN 80
    WHEN t.ord = 3 THEN 90
    ELSE 100
  END AS capacity,
  CASE
    WHEN t.ord = 1 THEN 1.80
    WHEN t.ord = 2 THEN 2.00
    WHEN t.ord = 3 THEN 2.20
    ELSE 2.50
  END AS throughput_per_min,
  @s1_now
FROM tmp_s1_program_targets t
ON DUPLICATE KEY UPDATE
  event_id = VALUES(event_id),
  category = VALUES(category),
  program_title = VALUES(program_title),
  description = VALUES(description),
  start_at = VALUES(start_at),
  end_at = VALUES(end_at),
  booth_id = VALUES(booth_id),
  capacity = VALUES(capacity),
  throughput_per_min = VALUES(throughput_per_min),
  created_at = VALUES(created_at);

-- Program applies (WAITING / APPROVED / APPLIED) for queue pressure.
INSERT INTO event_program_apply (
  program_apply_id, program_id, user_id, pet_id, image_url, admin_pet_name, status,
  ticket_no, eta_min, notified_at, checked_in_at, created_at, cancelled_at
)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 200
)
SELECT
  971000000 + (t.ord * 10000) + s.n AS program_apply_id,
  t.program_id,
  NULL AS user_id,
  NULL AS pet_id,
  NULL AS image_url,
  NULL AS admin_pet_name,
  'WAITING' AS status,
  CONCAT('S1W', LPAD(t.ord, 2, '0'), LPAD(s.n, 4, '0')) AS ticket_no,
  t.wait_min_seed AS eta_min,
  NULL AS notified_at,
  NULL AS checked_in_at,
  DATE_SUB(@s1_now, INTERVAL 20 MINUTE) AS created_at,
  NULL AS cancelled_at
FROM tmp_s1_program_targets t
JOIN seq s ON s.n <= t.waiting_cnt
ON DUPLICATE KEY UPDATE
  program_id = VALUES(program_id),
  status = VALUES(status),
  eta_min = VALUES(eta_min),
  notified_at = VALUES(notified_at),
  checked_in_at = VALUES(checked_in_at),
  created_at = VALUES(created_at),
  cancelled_at = VALUES(cancelled_at);

INSERT INTO event_program_apply (
  program_apply_id, program_id, user_id, pet_id, image_url, admin_pet_name, status,
  ticket_no, eta_min, notified_at, checked_in_at, created_at, cancelled_at
)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 160
)
SELECT
  972000000 + (t.ord * 10000) + s.n AS program_apply_id,
  t.program_id,
  NULL AS user_id,
  NULL AS pet_id,
  NULL AS image_url,
  NULL AS admin_pet_name,
  'APPROVED' AS status,
  CONCAT('S1A', LPAD(t.ord, 2, '0'), LPAD(s.n, 4, '0')) AS ticket_no,
  GREATEST(5, t.wait_min_seed - 8) AS eta_min,
  DATE_SUB(@s1_now, INTERVAL 3 MINUTE) AS notified_at,
  NULL AS checked_in_at,
  DATE_SUB(@s1_now, INTERVAL 18 MINUTE) AS created_at,
  NULL AS cancelled_at
FROM tmp_s1_program_targets t
JOIN seq s ON s.n <= t.approved_cnt
ON DUPLICATE KEY UPDATE
  program_id = VALUES(program_id),
  status = VALUES(status),
  eta_min = VALUES(eta_min),
  notified_at = VALUES(notified_at),
  checked_in_at = VALUES(checked_in_at),
  created_at = VALUES(created_at),
  cancelled_at = VALUES(cancelled_at);

INSERT INTO event_program_apply (
  program_apply_id, program_id, user_id, pet_id, image_url, admin_pet_name, status,
  ticket_no, eta_min, notified_at, checked_in_at, created_at, cancelled_at
)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 220
)
SELECT
  973000000 + (t.ord * 10000) + s.n AS program_apply_id,
  t.program_id,
  NULL AS user_id,
  NULL AS pet_id,
  NULL AS image_url,
  NULL AS admin_pet_name,
  'APPLIED' AS status,
  CONCAT('S1P', LPAD(t.ord, 2, '0'), LPAD(s.n, 4, '0')) AS ticket_no,
  t.wait_min_seed + 5 AS eta_min,
  NULL AS notified_at,
  NULL AS checked_in_at,
  DATE_SUB(@s1_now, INTERVAL 15 MINUTE) AS created_at,
  NULL AS cancelled_at
FROM tmp_s1_program_targets t
JOIN seq s ON s.n <= t.applied_cnt
ON DUPLICATE KEY UPDATE
  program_id = VALUES(program_id),
  status = VALUES(status),
  eta_min = VALUES(eta_min),
  notified_at = VALUES(notified_at),
  checked_in_at = VALUES(checked_in_at),
  created_at = VALUES(created_at),
  cancelled_at = VALUES(cancelled_at);

-- Strong inflow in the last 15 minutes for booth-level backlog.
INSERT INTO qr_logs (log_id, qr_id, booth_id, check_type, checked_at)
WITH RECURSIVE minute_seq AS (
  SELECT @s1_window_from AS ts
  UNION ALL
  SELECT DATE_ADD(ts, INTERVAL 1 MINUTE)
  FROM minute_seq
  WHERE ts < @s1_now
),
burst AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM burst WHERE n < 6
),
payload AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY m.ts, b.booth_id, s.n) AS rn,
    b.booth_id,
    DATE_ADD(m.ts, INTERVAL s.n SECOND) AS checked_at
  FROM minute_seq m
  JOIN tmp_s1_booths b
  JOIN burst s
)
SELECT
  974000000 + rn AS log_id,
  @s1_qr_id AS qr_id,
  booth_id,
  'CHECKIN',
  checked_at
FROM payload
ON DUPLICATE KEY UPDATE
  qr_id = VALUES(qr_id),
  booth_id = VALUES(booth_id),
  check_type = VALUES(check_type),
  checked_at = VALUES(checked_at);

INSERT INTO qr_logs (log_id, qr_id, booth_id, check_type, checked_at)
WITH RECURSIVE minute_seq AS (
  SELECT @s1_window_from AS ts
  UNION ALL
  SELECT DATE_ADD(ts, INTERVAL 1 MINUTE)
  FROM minute_seq
  WHERE ts < @s1_now
),
burst AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM burst WHERE n < 2
),
payload AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY m.ts, b.booth_id, s.n) AS rn,
    b.booth_id,
    DATE_ADD(m.ts, INTERVAL (35 + s.n) SECOND) AS checked_at
  FROM minute_seq m
  JOIN tmp_s1_booths b
  JOIN burst s
)
SELECT
  974100000 + rn AS log_id,
  @s1_qr_id AS qr_id,
  booth_id,
  'CHECKOUT',
  checked_at
FROM payload
ON DUPLICATE KEY UPDATE
  qr_id = VALUES(qr_id),
  booth_id = VALUES(booth_id),
  check_type = VALUES(check_type),
  checked_at = VALUES(checked_at);

-- Snapshot waits for immediate visibility before next scheduler tick.
INSERT INTO experience_waits (wait_id, program_id, wait_count, wait_min, updated_at)
SELECT
  975100000 + t.ord AS wait_id,
  t.program_id,
  (t.waiting_cnt + t.approved_cnt + CEIL(t.applied_cnt * 0.35)) AS wait_count,
  t.wait_min_seed AS wait_min,
  @s1_now AS updated_at
FROM tmp_s1_program_targets t
ON DUPLICATE KEY UPDATE
  wait_count = VALUES(wait_count),
  wait_min = VALUES(wait_min),
  updated_at = VALUES(updated_at);

INSERT INTO booth_waits (wait_id, booth_id, wait_count, wait_min, updated_at)
SELECT
  975000000 + ROW_NUMBER() OVER (ORDER BY t.booth_id) AS wait_id,
  t.booth_id,
  SUM(t.waiting_cnt + t.approved_cnt + CEIL(t.applied_cnt * 0.35)) AS wait_count,
  MAX(t.wait_min_seed) AS wait_min,
  @s1_now AS updated_at
FROM tmp_s1_program_targets t
GROUP BY t.booth_id
ON DUPLICATE KEY UPDATE
  wait_count = VALUES(wait_count),
  wait_min = VALUES(wait_min),
  updated_at = VALUES(updated_at);

-- Program congestion records (site/program realtime card source).
INSERT INTO congestions (congestion_id, program_id, zone, place_name, congestion_level, measured_at)
SELECT
  976000000 + t.ord AS congestion_id,
  t.program_id,
  t.zone,
  t.place_name,
  CASE
    WHEN t.ord = 1 THEN 5
    WHEN t.ord = 2 THEN 5
    WHEN t.ord = 3 THEN 4
    ELSE 3
  END AS congestion_level,
  @s1_now AS measured_at
FROM tmp_s1_program_targets t
ON DUPLICATE KEY UPDATE
  program_id = VALUES(program_id),
  zone = VALUES(zone),
  place_name = VALUES(place_name),
  congestion_level = VALUES(congestion_level),
  measured_at = VALUES(measured_at);

-- Event/program prediction logs at load point.
INSERT INTO ai_prediction_logs (
  prediction_log_id, target_type, event_id, program_id, prediction_base_time,
  predicted_avg_score_60m, predicted_peak_score_60m, predicted_level,
  model_version, source_type, created_at
)
VALUES (
  977000001, 'EVENT', @s1_event_id, NULL, @s1_now,
  74.00, 86.00, 5,
  'scenario-s1-now-spike', 'REALTIME', @s1_now
)
ON DUPLICATE KEY UPDATE
  prediction_base_time = VALUES(prediction_base_time),
  predicted_avg_score_60m = VALUES(predicted_avg_score_60m),
  predicted_peak_score_60m = VALUES(predicted_peak_score_60m),
  predicted_level = VALUES(predicted_level),
  model_version = VALUES(model_version),
  source_type = VALUES(source_type),
  created_at = VALUES(created_at);

INSERT INTO ai_prediction_logs (
  prediction_log_id, target_type, event_id, program_id, prediction_base_time,
  predicted_avg_score_60m, predicted_peak_score_60m, predicted_level,
  model_version, source_type, created_at
)
SELECT
  977100000 + t.ord AS prediction_log_id,
  'PROGRAM' AS target_type,
  @s1_event_id AS event_id,
  t.program_id AS program_id,
  @s1_now AS prediction_base_time,
  CASE
    WHEN t.ord = 1 THEN 70.00
    WHEN t.ord = 2 THEN 65.00
    WHEN t.ord = 3 THEN 57.00
    ELSE 48.00
  END AS predicted_avg_score_60m,
  CASE
    WHEN t.ord = 1 THEN 82.00
    WHEN t.ord = 2 THEN 76.00
    WHEN t.ord = 3 THEN 66.00
    ELSE 58.00
  END AS predicted_peak_score_60m,
  CASE
    WHEN t.ord IN (1, 2) THEN 4
    WHEN t.ord = 3 THEN 4
    ELSE 3
  END AS predicted_level,
  'scenario-s1-now-spike' AS model_version,
  'REALTIME' AS source_type,
  @s1_now AS created_at
FROM tmp_s1_program_targets t
ON DUPLICATE KEY UPDATE
  prediction_base_time = VALUES(prediction_base_time),
  predicted_avg_score_60m = VALUES(predicted_avg_score_60m),
  predicted_peak_score_60m = VALUES(predicted_peak_score_60m),
  predicted_level = VALUES(predicted_level),
  model_version = VALUES(model_version),
  source_type = VALUES(source_type),
  created_at = VALUES(created_at);

DROP TEMPORARY TABLE IF EXISTS tmp_s1_program_targets;
DROP TEMPORARY TABLE IF EXISTS tmp_s1_booths;

COMMIT;
