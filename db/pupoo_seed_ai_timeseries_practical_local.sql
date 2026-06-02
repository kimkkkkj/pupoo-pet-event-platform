-- Practical AI training timeseries seed (local)
-- Prerequisite:
--   1) Load base operational seed first:
--      db/pupoo_seed_v6.6_practical_image_urls_rewritten.sql
--   2) Run this file on the same local pupoodb.
--
-- This script generates:
-- - ai_event_congestion_timeseries
-- - ai_program_congestion_timeseries
-- - ai_training_dataset (60m input -> next 60m target)
-- - ai_prediction_logs

SET @seed_now := NOW();
SET @interval_min := 5;
SET @train_window_min := 60;
SET @input_steps := GREATEST(3, FLOOR(@train_window_min / @interval_min));
SET @target_steps := GREATEST(3, FLOOR(@train_window_min / @interval_min));
SET @program_min_minutes := 300;
SET @program_max_minutes := 720;

SET SQL_SAFE_UPDATES = 0;
SET SESSION group_concat_max_len = 1048576;

DELETE FROM ai_prediction_logs;
DELETE FROM ai_training_dataset;
DELETE FROM ai_program_congestion_timeseries;
DELETE FROM ai_event_congestion_timeseries;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_seq_5m;
CREATE TEMPORARY TABLE tmp_ai_seq_5m (
  minute_offset INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_ai_seq_5m (minute_offset)
WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + 5
  FROM seq
  WHERE n < 2875
)
SELECT n FROM seq;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_events;
CREATE TEMPORARY TABLE tmp_ai_selected_events AS
SELECT
  e.event_id,
  e.start_at,
  e.end_at,
  LEAST(
    1440,
    GREATEST(
      240,
      TIMESTAMPDIFF(MINUTE, e.start_at, e.end_at)
    )
  ) AS operation_minutes
FROM event e
WHERE e.status IN ('ONGOING', 'ENDED')
  AND e.start_at <= @seed_now;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_apply;
CREATE TEMPORARY TABLE tmp_ai_event_apply AS
SELECT
  ea.event_id,
  COUNT(*) AS active_apply_count
FROM event_apply ea
WHERE ea.status IN ('APPLIED', 'APPROVED')
GROUP BY ea.event_id;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_program_count;
CREATE TEMPORARY TABLE tmp_ai_event_program_count AS
SELECT
  p.event_id,
  COUNT(*) AS program_count
FROM event_program p
GROUP BY p.event_id;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_wait;
CREATE TEMPORARY TABLE tmp_ai_event_wait AS
SELECT
  x.event_id,
  COALESCE(SUM(x.wait_count), 0) AS total_wait_count,
  AVG(x.wait_min) AS avg_wait_min
FROM (
  SELECT b.event_id, COALESCE(w.wait_count, 0) AS wait_count, w.wait_min
  FROM booths b
  LEFT JOIN booth_waits w ON w.booth_id = b.booth_id

  UNION ALL

  SELECT p.event_id, COALESCE(ew.wait_count, 0) AS wait_count, ew.wait_min
  FROM event_program p
  LEFT JOIN experience_waits ew ON ew.program_id = p.program_id
) x
GROUP BY x.event_id;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_qr_5m;
CREATE TEMPORARY TABLE tmp_ai_event_qr_5m AS
SELECT
  qc.event_id,
  DATE_FORMAT(
    FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(ql.checked_at) / 300) * 300),
    '%Y-%m-%d %H:%i:00'
  ) AS timestamp_minute,
  SUM(CASE WHEN ql.check_type = 'CHECKIN' THEN 1 ELSE 0 END) AS checkins_1m,
  SUM(CASE WHEN ql.check_type = 'CHECKOUT' THEN 1 ELSE 0 END) AS checkouts_1m
FROM qr_logs ql
JOIN qr_codes qc ON qc.qr_id = ql.qr_id
GROUP BY qc.event_id, timestamp_minute;

INSERT INTO ai_event_congestion_timeseries (
  event_id,
  timestamp_minute,
  checkins_1m,
  checkouts_1m,
  active_apply_count,
  total_wait_count,
  avg_wait_min,
  running_program_count,
  progress_minute,
  hour_of_day,
  day_of_week,
  congestion_score
)
SELECT
  se.event_id,
  DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE) AS timestamp_minute,
  GREATEST(
    0,
    COALESCE(
      eq.checkins_1m,
      ROUND(
        (1.2 + COALESCE(ea.active_apply_count, 0) / 220.0)
        * EXP(-POW((((s.minute_offset + 0.0) / GREATEST(se.operation_minutes, 1)) - 0.55) / 0.22, 2))
        * 6
        + MOD(se.event_id + s.minute_offset, 3)
      )
    )
  ) AS checkins_1m,
  GREATEST(
    0,
    COALESCE(
      eq.checkouts_1m,
      ROUND(
        (0.8 + COALESCE(ea.active_apply_count, 0) / 260.0)
        * EXP(-POW((((s.minute_offset + 0.0) / GREATEST(se.operation_minutes, 1)) - 0.72) / 0.24, 2))
        * 4
        + MOD(s.minute_offset + se.event_id, 2)
      )
    )
  ) AS checkouts_1m,
  COALESCE(ea.active_apply_count, 0) AS active_apply_count,
  GREATEST(
    0,
    COALESCE(ew.total_wait_count, 0)
    + ROUND(
      (1.2 + COALESCE(ea.active_apply_count, 0) / 220.0)
      * EXP(-POW((((s.minute_offset + 0.0) / GREATEST(se.operation_minutes, 1)) - 0.55) / 0.22, 2))
      * 6
    )
  ) AS total_wait_count,
  ROUND(
    GREATEST(
      0.0,
      COALESCE(ew.avg_wait_min, 8.0)
      + EXP(-POW((((s.minute_offset + 0.0) / GREATEST(se.operation_minutes, 1)) - 0.60) / 0.30, 2)) * 6
    ),
    2
  ) AS avg_wait_min,
  GREATEST(1, COALESCE(ep.program_count, 1)) AS running_program_count,
  s.minute_offset AS progress_minute,
  HOUR(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE)) AS hour_of_day,
  WEEKDAY(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE)) + 1 AS day_of_week,
  ROUND(
    LEAST(
      100.0,
      GREATEST(
        0.0,
        (
          (GREATEST(0, COALESCE(eq.checkins_1m, 0)) * 0.90)
          + (GREATEST(0, COALESCE(eq.checkouts_1m, 0)) * 0.55)
          + (GREATEST(0, COALESCE(ew.total_wait_count, 0)) * 0.0060)
          + (COALESCE(ea.active_apply_count, 0) * 0.0035)
          + (GREATEST(1, COALESCE(ep.program_count, 1)) * 0.0800)
        )
      )
    ),
    2
  ) AS congestion_score
FROM tmp_ai_selected_events se
JOIN tmp_ai_seq_5m s
  ON s.minute_offset <= se.operation_minutes
LEFT JOIN tmp_ai_event_apply ea
  ON ea.event_id = se.event_id
LEFT JOIN tmp_ai_event_program_count ep
  ON ep.event_id = se.event_id
LEFT JOIN tmp_ai_event_wait ew
  ON ew.event_id = se.event_id
LEFT JOIN tmp_ai_event_qr_5m eq
  ON eq.event_id = se.event_id
 AND eq.timestamp_minute = DATE_FORMAT(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE), '%Y-%m-%d %H:%i:00')
WHERE DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE) <= @seed_now
  AND DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE) <= se.end_at
ON DUPLICATE KEY UPDATE
  checkins_1m = VALUES(checkins_1m),
  checkouts_1m = VALUES(checkouts_1m),
  active_apply_count = VALUES(active_apply_count),
  total_wait_count = VALUES(total_wait_count),
  avg_wait_min = VALUES(avg_wait_min),
  running_program_count = VALUES(running_program_count),
  progress_minute = VALUES(progress_minute),
  hour_of_day = VALUES(hour_of_day),
  day_of_week = VALUES(day_of_week),
  congestion_score = VALUES(congestion_score),
  updated_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_programs;
CREATE TEMPORARY TABLE tmp_ai_selected_programs AS
SELECT
  p.program_id,
  p.event_id,
  p.booth_id,
  p.start_at,
  p.end_at,
  p.category,
  COALESCE(p.capacity, 80) AS capacity,
  GREATEST(1.0, COALESCE(p.throughput_per_min, 3.0)) AS throughput_per_min,
  LEAST(
    @program_max_minutes,
    GREATEST(
      @program_min_minutes,
      TIMESTAMPDIFF(MINUTE, p.start_at, p.end_at)
    )
  ) AS operation_minutes
FROM event_program p
JOIN tmp_ai_selected_events se ON se.event_id = p.event_id
WHERE p.start_at <= @seed_now;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_apply;
CREATE TEMPORARY TABLE tmp_ai_program_apply AS
SELECT
  pa.program_id,
  COUNT(*) AS active_apply_count
FROM event_program_apply pa
WHERE pa.status IN ('APPLIED', 'WAITING', 'APPROVED', 'CHECKED_IN')
GROUP BY pa.program_id;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_wait;
CREATE TEMPORARY TABLE tmp_ai_program_wait AS
SELECT
  w.program_id,
  AVG(w.wait_min) AS avg_wait_min,
  MAX(w.wait_count) AS max_wait_count
FROM experience_waits w
GROUP BY w.program_id;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_qr_5m;
CREATE TEMPORARY TABLE tmp_ai_program_qr_5m AS
SELECT
  ql.booth_id,
  DATE_FORMAT(
    FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(ql.checked_at) / 300) * 300),
    '%Y-%m-%d %H:%i:00'
  ) AS timestamp_minute,
  SUM(CASE WHEN ql.check_type = 'CHECKIN' THEN 1 ELSE 0 END) AS checkins_1m,
  SUM(CASE WHEN ql.check_type = 'CHECKOUT' THEN 1 ELSE 0 END) AS checkouts_1m
FROM qr_logs ql
WHERE ql.booth_id IS NOT NULL
GROUP BY ql.booth_id, timestamp_minute;

INSERT INTO ai_program_congestion_timeseries (
  event_id,
  program_id,
  timestamp_minute,
  checkins_1m,
  checkouts_1m,
  active_apply_count,
  wait_count,
  wait_min,
  progress_minute,
  hour_of_day,
  day_of_week,
  congestion_score
)
SELECT
  sp.event_id,
  sp.program_id,
  DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE) AS timestamp_minute,
  GREATEST(
    0,
    COALESCE(
      pq.checkins_1m,
      ROUND(
        (0.9 + COALESCE(pa.active_apply_count, 0) / 160.0)
        * EXP(-POW((((s.minute_offset + 0.0) / GREATEST(sp.operation_minutes, 1)) - 0.58) / 0.24, 2))
        * 5
        + MOD(sp.program_id + s.minute_offset, 2)
      )
    )
  ) AS checkins_1m,
  GREATEST(
    0,
    COALESCE(
      pq.checkouts_1m,
      ROUND(
        (0.7 + COALESCE(pa.active_apply_count, 0) / 210.0)
        * EXP(-POW((((s.minute_offset + 0.0) / GREATEST(sp.operation_minutes, 1)) - 0.75) / 0.26, 2))
        * 3
        + MOD(sp.program_id + s.minute_offset, 2)
      )
    )
  ) AS checkouts_1m,
  COALESCE(pa.active_apply_count, 0) AS active_apply_count,
  GREATEST(
    0,
    ROUND(
      COALESCE(pa.active_apply_count, 0) * 0.08
      + COALESCE(pw.max_wait_count, 0) * 0.30
      + (
        (0.9 + COALESCE(pa.active_apply_count, 0) / 160.0)
        * EXP(-POW((((s.minute_offset + 0.0) / GREATEST(sp.operation_minutes, 1)) - 0.58) / 0.24, 2))
        * 5
      )
    )
  ) AS wait_count,
  CAST(
    ROUND(
      GREATEST(
        0.0,
        COALESCE(pw.avg_wait_min, 6.0)
        + (
          (
            COALESCE(pa.active_apply_count, 0) * 0.08
            + COALESCE(pw.max_wait_count, 0) * 0.30
          ) / GREATEST(sp.throughput_per_min, 1)
        )
      ),
      0
    ) AS SIGNED
  ) AS wait_min,
  s.minute_offset AS progress_minute,
  HOUR(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE)) AS hour_of_day,
  WEEKDAY(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE)) + 1 AS day_of_week,
  ROUND(
    LEAST(
      100.0,
      GREATEST(
        0.0,
        (
          (GREATEST(0, COALESCE(pq.checkins_1m, 0)) * 1.10)
          + (GREATEST(0, COALESCE(pq.checkouts_1m, 0)) * 0.80)
          + (GREATEST(0, COALESCE(pa.active_apply_count, 0)) * 0.10)
          + (GREATEST(0, COALESCE(pw.max_wait_count, 0)) * 0.50)
        )
      )
    ),
    2
  ) AS congestion_score
FROM tmp_ai_selected_programs sp
JOIN tmp_ai_seq_5m s
  ON s.minute_offset <= sp.operation_minutes
LEFT JOIN tmp_ai_program_apply pa
  ON pa.program_id = sp.program_id
LEFT JOIN tmp_ai_program_wait pw
  ON pw.program_id = sp.program_id
LEFT JOIN tmp_ai_program_qr_5m pq
  ON pq.booth_id = sp.booth_id
 AND pq.timestamp_minute = DATE_FORMAT(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE), '%Y-%m-%d %H:%i:00')
WHERE DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE) <= @seed_now
  AND DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE) <= sp.end_at
ON DUPLICATE KEY UPDATE
  checkins_1m = VALUES(checkins_1m),
  checkouts_1m = VALUES(checkouts_1m),
  active_apply_count = VALUES(active_apply_count),
  wait_count = VALUES(wait_count),
  wait_min = VALUES(wait_min),
  progress_minute = VALUES(progress_minute),
  hour_of_day = VALUES(hour_of_day),
  day_of_week = VALUES(day_of_week),
  congestion_score = VALUES(congestion_score),
  updated_at = CURRENT_TIMESTAMP;

SET @max_event_train_rows := 50000;
SET @max_program_train_rows := 200000;

DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked;
CREATE TEMPORARY TABLE tmp_event_ts_ranked AS
SELECT
  t.event_id,
  t.timestamp_minute,
  t.checkins_1m,
  t.checkouts_1m,
  t.congestion_score,
  ROW_NUMBER() OVER (PARTITION BY t.event_id ORDER BY t.timestamp_minute) AS rn
FROM ai_event_congestion_timeseries t;

DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_max;
CREATE TEMPORARY TABLE tmp_event_ts_max AS
SELECT event_id, MAX(rn) AS max_rn
FROM tmp_event_ts_ranked
GROUP BY event_id;

DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked_inp;
CREATE TEMPORARY TABLE tmp_event_ts_ranked_inp AS
SELECT * FROM tmp_event_ts_ranked;

DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked_fut_avg;
CREATE TEMPORARY TABLE tmp_event_ts_ranked_fut_avg AS
SELECT * FROM tmp_event_ts_ranked;

DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked_fut_max;
CREATE TEMPORARY TABLE tmp_event_ts_ranked_fut_max AS
SELECT * FROM tmp_event_ts_ranked;

SELECT COALESCE(SUM(GREATEST(0, max_rn - (@input_steps + @target_steps) + 1)), 0)
INTO @event_window_total
FROM tmp_event_ts_max;

SET @event_stride := GREATEST(1, FLOOR(@event_window_total / GREATEST(1, @max_event_train_rows)));

INSERT INTO ai_training_dataset (
  target_type,
  event_id,
  program_id,
  base_timestamp,
  input_sequence_json,
  target_avg_score_60m,
  target_peak_score_60m,
  created_at
)
SELECT
  'EVENT' AS target_type,
  base.event_id,
  NULL AS program_id,
  base.timestamp_minute AS base_timestamp,
  (
    SELECT CAST(
      CONCAT(
        '[',
        GROUP_CONCAT(
          JSON_OBJECT(
            'timestamp', DATE_FORMAT(inp.timestamp_minute, '%Y-%m-%d %H:%i:%s'),
            'score', ROUND(inp.congestion_score, 2),
            'checkins_1m', inp.checkins_1m,
            'checkouts_1m', inp.checkouts_1m
          )
          ORDER BY inp.rn
          SEPARATOR ','
        ),
        ']'
      ) AS JSON
    )
    FROM tmp_event_ts_ranked_inp inp
    WHERE inp.event_id = base.event_id
      AND inp.rn BETWEEN base.rn - (@input_steps - 1) AND base.rn
  ) AS input_sequence_json,
  (
    SELECT ROUND(AVG(fut.congestion_score), 2)
    FROM tmp_event_ts_ranked_fut_avg fut
    WHERE fut.event_id = base.event_id
      AND fut.rn BETWEEN base.rn + 1 AND base.rn + @target_steps
  ) AS target_avg_score_60m,
  (
    SELECT ROUND(MAX(fut.congestion_score), 2)
    FROM tmp_event_ts_ranked_fut_max fut
    WHERE fut.event_id = base.event_id
      AND fut.rn BETWEEN base.rn + 1 AND base.rn + @target_steps
  ) AS target_peak_score_60m,
  CURRENT_TIMESTAMP
FROM tmp_event_ts_ranked base
JOIN tmp_event_ts_max mx
  ON mx.event_id = base.event_id
WHERE base.rn >= @input_steps
  AND base.rn + @target_steps <= mx.max_rn
  AND MOD(base.rn, @event_stride) = 0
ON DUPLICATE KEY UPDATE
  input_sequence_json = VALUES(input_sequence_json),
  target_avg_score_60m = VALUES(target_avg_score_60m),
  target_peak_score_60m = VALUES(target_peak_score_60m),
  created_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked;
CREATE TEMPORARY TABLE tmp_program_ts_ranked AS
SELECT
  t.event_id,
  t.program_id,
  t.timestamp_minute,
  t.checkins_1m,
  t.checkouts_1m,
  t.congestion_score,
  ROW_NUMBER() OVER (PARTITION BY t.program_id ORDER BY t.timestamp_minute) AS rn
FROM ai_program_congestion_timeseries t;

DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_max;
CREATE TEMPORARY TABLE tmp_program_ts_max AS
SELECT program_id, MAX(rn) AS max_rn
FROM tmp_program_ts_ranked
GROUP BY program_id;

DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked_inp;
CREATE TEMPORARY TABLE tmp_program_ts_ranked_inp AS
SELECT * FROM tmp_program_ts_ranked;

DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked_fut_avg;
CREATE TEMPORARY TABLE tmp_program_ts_ranked_fut_avg AS
SELECT * FROM tmp_program_ts_ranked;

DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked_fut_max;
CREATE TEMPORARY TABLE tmp_program_ts_ranked_fut_max AS
SELECT * FROM tmp_program_ts_ranked;

SELECT COALESCE(SUM(GREATEST(0, max_rn - (@input_steps + @target_steps) + 1)), 0)
INTO @program_window_total
FROM tmp_program_ts_max;

SET @program_stride := GREATEST(1, FLOOR(@program_window_total / GREATEST(1, @max_program_train_rows)));

INSERT INTO ai_training_dataset (
  target_type,
  event_id,
  program_id,
  base_timestamp,
  input_sequence_json,
  target_avg_score_60m,
  target_peak_score_60m,
  created_at
)
SELECT
  'PROGRAM' AS target_type,
  base.event_id,
  base.program_id,
  base.timestamp_minute AS base_timestamp,
  (
    SELECT CAST(
      CONCAT(
        '[',
        GROUP_CONCAT(
          JSON_OBJECT(
            'timestamp', DATE_FORMAT(inp.timestamp_minute, '%Y-%m-%d %H:%i:%s'),
            'score', ROUND(inp.congestion_score, 2),
            'checkins_1m', inp.checkins_1m,
            'checkouts_1m', inp.checkouts_1m
          )
          ORDER BY inp.rn
          SEPARATOR ','
        ),
        ']'
      ) AS JSON
    )
    FROM tmp_program_ts_ranked_inp inp
    WHERE inp.program_id = base.program_id
      AND inp.rn BETWEEN base.rn - (@input_steps - 1) AND base.rn
  ) AS input_sequence_json,
  (
    SELECT ROUND(AVG(fut.congestion_score), 2)
    FROM tmp_program_ts_ranked_fut_avg fut
    WHERE fut.program_id = base.program_id
      AND fut.rn BETWEEN base.rn + 1 AND base.rn + @target_steps
  ) AS target_avg_score_60m,
  (
    SELECT ROUND(MAX(fut.congestion_score), 2)
    FROM tmp_program_ts_ranked_fut_max fut
    WHERE fut.program_id = base.program_id
      AND fut.rn BETWEEN base.rn + 1 AND base.rn + @target_steps
  ) AS target_peak_score_60m,
  CURRENT_TIMESTAMP
FROM tmp_program_ts_ranked base
JOIN tmp_program_ts_max mx
  ON mx.program_id = base.program_id
WHERE base.rn >= @input_steps
  AND base.rn + @target_steps <= mx.max_rn
  AND MOD(base.rn, @program_stride) = 0
ON DUPLICATE KEY UPDATE
  input_sequence_json = VALUES(input_sequence_json),
  target_avg_score_60m = VALUES(target_avg_score_60m),
  target_peak_score_60m = VALUES(target_peak_score_60m),
  created_at = CURRENT_TIMESTAMP;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_training_ranked;
CREATE TEMPORARY TABLE tmp_ai_training_ranked AS
SELECT
  t.*,
  ROW_NUMBER() OVER (
    PARTITION BY t.target_type, t.event_id, t.program_id
    ORDER BY t.base_timestamp DESC
  ) AS rn_recent
FROM ai_training_dataset t;

INSERT INTO ai_prediction_logs (
  target_type,
  event_id,
  program_id,
  prediction_base_time,
  predicted_avg_score_60m,
  predicted_peak_score_60m,
  predicted_level,
  model_version,
  source_type,
  created_at
)
SELECT
  t.target_type,
  t.event_id,
  t.program_id,
  t.base_timestamp AS prediction_base_time,
  ROUND(t.target_avg_score_60m * 1.02, 2) AS predicted_avg_score_60m,
  ROUND(
    GREATEST(
      t.target_peak_score_60m * 1.03,
      t.target_avg_score_60m * 1.02
    ),
    2
  ) AS predicted_peak_score_60m,
  CASE
    WHEN t.target_peak_score_60m < 10 THEN 1
    WHEN t.target_peak_score_60m < 20 THEN 2
    WHEN t.target_peak_score_60m < 35 THEN 3
    WHEN t.target_peak_score_60m < 55 THEN 4
    ELSE 5
  END AS predicted_level,
  'seed-v6.6-practical' AS model_version,
  'BATCH' AS source_type,
  CURRENT_TIMESTAMP
FROM tmp_ai_training_ranked t
WHERE t.rn_recent <= 2;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_training_ranked;
DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked_fut_max;
DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked_fut_avg;
DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked_inp;
DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_max;
DROP TEMPORARY TABLE IF EXISTS tmp_program_ts_ranked;
DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked_fut_max;
DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked_fut_avg;
DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked_inp;
DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_max;
DROP TEMPORARY TABLE IF EXISTS tmp_event_ts_ranked;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_qr_5m;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_wait;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_apply;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_programs;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_qr_5m;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_wait;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_program_count;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_apply;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_events;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_seq_5m;
