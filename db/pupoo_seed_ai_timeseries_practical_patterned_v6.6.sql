-- Patterned AI training seed for LightGBM + LSTM
-- Prerequisite:
--   1) Load base operational seed first:
--      db/pupoo_seed_v6.6_practical_image_urls_rewritten.sql
--   2) Run this file on the same local pupoodb.
--
-- Goal:
-- - Make time-series patterns explicit for training:
--   morning low -> opening rise -> lunch dip -> afternoon rise -> closing low
-- - Weekly pattern:
--   Monday lowest, Tue/Wed up, Thu slight down, Fri up, weekend highest
-- - Provide enough rows for both LightGBM and LSTM training.

SET @seed_now := NOW();
SET @interval_min := 5;
SET @input_steps := 60;  -- 5 min * 60 = 300 min history
SET @target_steps := 12; -- next 60 min target

SET @event_min_minutes := 720;   -- at least 12h
SET @event_max_minutes := 43200; -- at most 30d
SET @program_min_minutes := 360; -- at least 6h
SET @program_max_minutes := 2880; -- at most 2d

SET @max_event_train_rows := 120000;
SET @max_program_train_rows := 450000;

SET SQL_SAFE_UPDATES = 0;
SET SESSION group_concat_max_len = 1048576;
SET SESSION cte_max_recursion_depth = 100000;

DELETE FROM ai_prediction_logs;
DELETE FROM ai_training_dataset;
DELETE FROM ai_program_congestion_timeseries;
DELETE FROM ai_event_congestion_timeseries;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_events;
CREATE TEMPORARY TABLE tmp_ai_selected_events AS
SELECT
  e.event_id,
  e.start_at,
  e.end_at,
  LEAST(
    @event_max_minutes,
    GREATEST(
      @event_min_minutes,
      TIMESTAMPDIFF(MINUTE, e.start_at, e.end_at)
    )
  ) AS operation_minutes
FROM event e
WHERE e.status IN ('PLANNED', 'ONGOING', 'ENDED')
  AND e.start_at IS NOT NULL
  AND e.end_at IS NOT NULL
  AND e.end_at > e.start_at;

SELECT COALESCE(MAX(operation_minutes), 1440)
INTO @max_seq_minute
FROM tmp_ai_selected_events;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_seq_5m;
CREATE TEMPORARY TABLE tmp_ai_seq_5m (
  minute_offset INT NOT NULL PRIMARY KEY
);

INSERT INTO tmp_ai_seq_5m (minute_offset)
WITH RECURSIVE seq AS (
  SELECT 0 AS n
  UNION ALL
  SELECT n + @interval_min
  FROM seq
  WHERE n + @interval_min <= @max_seq_minute
)
SELECT n FROM seq;

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

DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_grid;
CREATE TEMPORARY TABLE tmp_ai_event_grid AS
SELECT
  se.event_id,
  se.start_at,
  se.end_at,
  se.operation_minutes,
  s.minute_offset,
  DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE) AS timestamp_minute,
  (s.minute_offset + 0.0) / GREATEST(se.operation_minutes, 1) AS progress_ratio,
  HOUR(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE)) AS hour_of_day,
  WEEKDAY(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE)) + 1 AS day_of_week,
  (
    HOUR(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE))
    + MINUTE(DATE_ADD(se.start_at, INTERVAL s.minute_offset MINUTE)) / 60.0
  ) AS hour_decimal
FROM tmp_ai_selected_events se
JOIN tmp_ai_seq_5m s
  ON s.minute_offset <= se.operation_minutes;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_features;
CREATE TEMPORARY TABLE tmp_ai_event_features AS
SELECT
  g.event_id,
  g.timestamp_minute,
  g.minute_offset,
  g.progress_ratio,
  g.hour_of_day,
  g.day_of_week,
  COALESCE(ea.active_apply_count, 0) AS active_apply_count,
  GREATEST(1, COALESCE(ep.program_count, 1)) AS running_program_count,
  COALESCE(ew.total_wait_count, 0) AS base_wait_count,
  COALESCE(ew.avg_wait_min, 8.0) AS base_avg_wait_min,
  eq.checkins_1m AS observed_checkins_1m,
  eq.checkouts_1m AS observed_checkouts_1m,
  CASE
    WHEN g.day_of_week = 1 THEN 0.78
    WHEN g.day_of_week = 2 THEN 0.92
    WHEN g.day_of_week = 3 THEN 1.00
    WHEN g.day_of_week = 4 THEN 0.94
    WHEN g.day_of_week = 5 THEN 1.07
    WHEN g.day_of_week = 6 THEN 1.20
    ELSE 1.26
  END AS weekday_factor,
  CASE
    WHEN g.hour_decimal < 9.5 THEN 0.72
    WHEN g.hour_decimal < 10.5 THEN 1.08
    WHEN g.hour_decimal < 12.0 THEN 1.14
    WHEN g.hour_decimal < 13.5 THEN 0.90
    WHEN g.hour_decimal < 16.0 THEN 1.22
    WHEN g.hour_decimal < 17.5 THEN 1.02
    ELSE 0.72
  END AS time_factor,
  (
    1.0
    + EXP(-POW((g.progress_ratio - 0.16) / 0.11, 2)) * 0.34
    + EXP(-POW((g.progress_ratio - 0.70) / 0.14, 2)) * 0.42
    - EXP(-POW((g.progress_ratio - 0.50) / 0.10, 2)) * 0.24
    - EXP(-POW((g.progress_ratio - 0.93) / 0.06, 2)) * 0.28
  ) AS progress_factor
FROM tmp_ai_event_grid g
LEFT JOIN tmp_ai_event_apply ea
  ON ea.event_id = g.event_id
LEFT JOIN tmp_ai_event_program_count ep
  ON ep.event_id = g.event_id
LEFT JOIN tmp_ai_event_wait ew
  ON ew.event_id = g.event_id
LEFT JOIN tmp_ai_event_qr_5m eq
  ON eq.event_id = g.event_id
 AND eq.timestamp_minute = DATE_FORMAT(g.timestamp_minute, '%Y-%m-%d %H:%i:00');

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
  y.event_id,
  y.timestamp_minute,
  y.checkins_1m,
  y.checkouts_1m,
  y.active_apply_count,
  y.total_wait_count,
  y.avg_wait_min,
  y.running_program_count,
  y.minute_offset AS progress_minute,
  y.hour_of_day,
  y.day_of_week,
  ROUND(
    LEAST(
      100.0,
      GREATEST(
        2.0,
        (
          LEAST(1.0, (y.checkins_1m * 1.30 + y.checkouts_1m * 0.60) / 14.0) * 0.30
          + LEAST(1.0, y.total_wait_count / 320.0) * 0.30
          + LEAST(1.0, y.avg_wait_min / 90.0) * 0.20
          + LEAST(1.0, y.active_apply_count / 5000.0) * 0.10
          + LEAST(1.0, GREATEST(0.0, (y.time_factor * y.weekday_factor * y.progress_factor - 0.55) / 1.25)) * 0.10
        ) * 100.0
      )
    ),
    2
  ) AS congestion_score
FROM (
  SELECT
    x.*,
    GREATEST(
      0,
      CAST(
        ROUND(
          x.base_wait_count * (0.52 + x.time_factor * 0.50)
          + x.checkins_1m * 3.8
          + x.active_apply_count * 0.035,
          0
        ) AS SIGNED
      )
    ) AS total_wait_count,
    ROUND(
      GREATEST(
        4.0,
        x.base_avg_wait_min * (0.62 + x.time_factor * 0.58) * (0.85 + x.weekday_factor * 0.18)
        + (x.checkins_1m * 2.2) / GREATEST(x.running_program_count, 1)
      ),
      2
    ) AS avg_wait_min
  FROM (
    SELECT
      f.event_id,
      f.timestamp_minute,
      f.minute_offset,
      f.hour_of_day,
      f.day_of_week,
      f.active_apply_count,
      f.running_program_count,
      f.base_wait_count,
      f.base_avg_wait_min,
      f.weekday_factor,
      f.time_factor,
      f.progress_factor,
      CASE
        WHEN f.observed_checkins_1m IS NULL THEN
          GREATEST(
            0,
            CAST(
              ROUND(
                (
                  (
                    0.8
                    + f.active_apply_count / 300.0
                    + f.running_program_count * 0.05
                  ) * f.weekday_factor * f.time_factor * f.progress_factor
                ) + ((MOD(f.event_id * 31 + f.minute_offset, 7) - 3) * 0.25),
                0
              ) AS SIGNED
            )
          )
        ELSE
          GREATEST(
            0,
            CAST(
              ROUND(
                (f.observed_checkins_1m * 0.45) + (
                  (
                    (
                      0.8
                      + f.active_apply_count / 300.0
                      + f.running_program_count * 0.05
                    ) * f.weekday_factor * f.time_factor * f.progress_factor
                  ) + ((MOD(f.event_id * 31 + f.minute_offset, 7) - 3) * 0.25)
                ) * 0.55,
                0
              ) AS SIGNED
            )
          )
      END AS checkins_1m,
      CASE
        WHEN f.observed_checkouts_1m IS NULL THEN
          GREATEST(
            0,
            CAST(
              ROUND(
                (
                  (
                    0.5
                    + f.active_apply_count / 360.0
                    + f.running_program_count * 0.03
                  ) * f.weekday_factor
                  * (
                    CASE
                      WHEN f.hour_of_day < 10 THEN 0.55
                      WHEN f.hour_of_day < 12 THEN 0.78
                      WHEN f.hour_of_day < 14 THEN 0.92
                      WHEN f.hour_of_day < 16 THEN 1.05
                      WHEN f.hour_of_day < 18 THEN 1.20
                      ELSE 1.28
                    END
                  )
                  * (0.88 + EXP(-POW((f.progress_ratio - 0.78) / 0.16, 2)) * 0.35)
                ) + ((MOD(f.event_id * 17 + f.minute_offset, 5) - 2) * 0.20),
                0
              ) AS SIGNED
            )
          )
        ELSE
          GREATEST(
            0,
            CAST(
              ROUND(
                (f.observed_checkouts_1m * 0.45) + (
                  (
                    (
                      0.5
                      + f.active_apply_count / 360.0
                      + f.running_program_count * 0.03
                    ) * f.weekday_factor
                    * (
                      CASE
                        WHEN f.hour_of_day < 10 THEN 0.55
                        WHEN f.hour_of_day < 12 THEN 0.78
                        WHEN f.hour_of_day < 14 THEN 0.92
                        WHEN f.hour_of_day < 16 THEN 1.05
                        WHEN f.hour_of_day < 18 THEN 1.20
                        ELSE 1.28
                      END
                    )
                    * (0.88 + EXP(-POW((f.progress_ratio - 0.78) / 0.16, 2)) * 0.35)
                  ) + ((MOD(f.event_id * 17 + f.minute_offset, 5) - 2) * 0.20)
                ) * 0.55,
                0
              ) AS SIGNED
            )
          )
      END AS checkouts_1m
    FROM tmp_ai_event_features f
  ) x
) y
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
WHERE p.start_at IS NOT NULL
  AND p.end_at IS NOT NULL
  AND p.end_at > p.start_at;

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

DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_grid;
CREATE TEMPORARY TABLE tmp_ai_program_grid AS
SELECT
  sp.program_id,
  sp.event_id,
  sp.booth_id,
  sp.capacity,
  sp.throughput_per_min,
  sp.operation_minutes,
  s.minute_offset,
  DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE) AS timestamp_minute,
  (s.minute_offset + 0.0) / GREATEST(sp.operation_minutes, 1) AS progress_ratio,
  HOUR(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE)) AS hour_of_day,
  WEEKDAY(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE)) + 1 AS day_of_week,
  (
    HOUR(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE))
    + MINUTE(DATE_ADD(sp.start_at, INTERVAL s.minute_offset MINUTE)) / 60.0
  ) AS hour_decimal
FROM tmp_ai_selected_programs sp
JOIN tmp_ai_seq_5m s
  ON s.minute_offset <= sp.operation_minutes;

DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_features;
CREATE TEMPORARY TABLE tmp_ai_program_features AS
SELECT
  g.program_id,
  g.event_id,
  g.timestamp_minute,
  g.minute_offset,
  g.progress_ratio,
  g.hour_of_day,
  g.day_of_week,
  g.capacity,
  g.throughput_per_min,
  COALESCE(pa.active_apply_count, 0) AS active_apply_count,
  COALESCE(pw.max_wait_count, 0) AS base_wait_count,
  COALESCE(pw.avg_wait_min, 6.0) AS base_wait_min,
  COALESCE(ev.congestion_score, 40.0) AS event_congestion_score,
  pq.checkins_1m AS observed_checkins_1m,
  pq.checkouts_1m AS observed_checkouts_1m,
  CASE
    WHEN g.day_of_week = 1 THEN 0.80
    WHEN g.day_of_week = 2 THEN 0.93
    WHEN g.day_of_week = 3 THEN 1.00
    WHEN g.day_of_week = 4 THEN 0.95
    WHEN g.day_of_week = 5 THEN 1.08
    WHEN g.day_of_week = 6 THEN 1.18
    ELSE 1.24
  END AS weekday_factor,
  CASE
    WHEN g.hour_decimal < 9.5 THEN 0.70
    WHEN g.hour_decimal < 10.5 THEN 1.06
    WHEN g.hour_decimal < 12.0 THEN 1.12
    WHEN g.hour_decimal < 13.5 THEN 0.88
    WHEN g.hour_decimal < 16.0 THEN 1.20
    WHEN g.hour_decimal < 17.5 THEN 1.00
    ELSE 0.70
  END AS time_factor,
  (
    1.0
    + EXP(-POW((g.progress_ratio - 0.14) / 0.10, 2)) * 0.30
    + EXP(-POW((g.progress_ratio - 0.72) / 0.13, 2)) * 0.40
    - EXP(-POW((g.progress_ratio - 0.50) / 0.11, 2)) * 0.20
    - EXP(-POW((g.progress_ratio - 0.92) / 0.06, 2)) * 0.24
  ) AS progress_factor
FROM tmp_ai_program_grid g
LEFT JOIN tmp_ai_program_apply pa
  ON pa.program_id = g.program_id
LEFT JOIN tmp_ai_program_wait pw
  ON pw.program_id = g.program_id
LEFT JOIN tmp_ai_program_qr_5m pq
  ON pq.booth_id = g.booth_id
 AND pq.timestamp_minute = DATE_FORMAT(g.timestamp_minute, '%Y-%m-%d %H:%i:00')
LEFT JOIN ai_event_congestion_timeseries ev
  ON ev.event_id = g.event_id
 AND ev.timestamp_minute = g.timestamp_minute;

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
  y.event_id,
  y.program_id,
  y.timestamp_minute,
  y.checkins_1m,
  y.checkouts_1m,
  y.active_apply_count,
  y.wait_count,
  y.wait_min,
  y.minute_offset AS progress_minute,
  y.hour_of_day,
  y.day_of_week,
  ROUND(
    LEAST(
      100.0,
      GREATEST(
        1.0,
        (
          LEAST(1.0, (y.checkins_1m * 1.35 + y.checkouts_1m * 0.55) / 12.0) * 0.30
          + LEAST(1.0, y.wait_count / 220.0) * 0.30
          + LEAST(1.0, y.wait_min / 75.0) * 0.20
          + LEAST(1.0, y.event_congestion_score / 100.0) * 0.10
          + LEAST(1.0, y.active_apply_count / GREATEST(y.capacity * 2.5, 50.0)) * 0.10
        ) * 100.0
      )
    ),
    2
  ) AS congestion_score
FROM (
  SELECT
    x.*,
    GREATEST(
      0,
      CAST(
        ROUND(
          x.base_wait_count * (0.58 + x.time_factor * 0.45)
          + x.active_apply_count * 0.10
          + x.checkins_1m * 2.6
          + x.event_congestion_score * 0.22,
          0
        ) AS SIGNED
      )
    ) AS wait_count,
    CAST(
      ROUND(
        GREATEST(
          2.0,
          x.base_wait_min * (0.65 + x.time_factor * 0.52)
          + (
            (
              x.base_wait_count * (0.58 + x.time_factor * 0.45)
              + x.active_apply_count * 0.10
              + x.checkins_1m * 2.6
              + x.event_congestion_score * 0.22
            ) / GREATEST(x.throughput_per_min * 7.0, 4.0)
          )
        ),
        0
      ) AS SIGNED
    ) AS wait_min
  FROM (
    SELECT
      f.program_id,
      f.event_id,
      f.timestamp_minute,
      f.minute_offset,
      f.hour_of_day,
      f.day_of_week,
      f.capacity,
      f.throughput_per_min,
      f.active_apply_count,
      f.base_wait_count,
      f.base_wait_min,
      f.event_congestion_score,
      f.weekday_factor,
      f.time_factor,
      f.progress_factor,
      CASE
        WHEN f.observed_checkins_1m IS NULL THEN
          GREATEST(
            0,
            CAST(
              ROUND(
                (
                  (
                    0.6
                    + f.active_apply_count / GREATEST(f.capacity * 2.2, 40.0)
                    + f.throughput_per_min * 0.12
                    + (f.event_congestion_score / 100.0) * 0.65
                  ) * f.weekday_factor * f.time_factor * f.progress_factor
                ) + ((MOD(f.program_id * 29 + f.minute_offset, 7) - 3) * 0.20),
                0
              ) AS SIGNED
            )
          )
        ELSE
          GREATEST(
            0,
            CAST(
              ROUND(
                (f.observed_checkins_1m * 0.45) + (
                  (
                    (
                      0.6
                      + f.active_apply_count / GREATEST(f.capacity * 2.2, 40.0)
                      + f.throughput_per_min * 0.12
                      + (f.event_congestion_score / 100.0) * 0.65
                    ) * f.weekday_factor * f.time_factor * f.progress_factor
                  ) + ((MOD(f.program_id * 29 + f.minute_offset, 7) - 3) * 0.20)
                ) * 0.55,
                0
              ) AS SIGNED
            )
          )
      END AS checkins_1m,
      CASE
        WHEN f.observed_checkouts_1m IS NULL THEN
          GREATEST(
            0,
            CAST(
              ROUND(
                (
                  (
                    0.45
                    + f.active_apply_count / GREATEST(f.capacity * 2.8, 50.0)
                    + f.throughput_per_min * 0.08
                  ) * f.weekday_factor
                  * (
                    CASE
                      WHEN f.hour_of_day < 10 THEN 0.56
                      WHEN f.hour_of_day < 12 THEN 0.80
                      WHEN f.hour_of_day < 14 THEN 0.95
                      WHEN f.hour_of_day < 16 THEN 1.05
                      WHEN f.hour_of_day < 18 THEN 1.18
                      ELSE 1.26
                    END
                  )
                  * (0.90 + EXP(-POW((f.progress_ratio - 0.80) / 0.18, 2)) * 0.32)
                ) + ((MOD(f.program_id * 19 + f.minute_offset, 5) - 2) * 0.18),
                0
              ) AS SIGNED
            )
          )
        ELSE
          GREATEST(
            0,
            CAST(
              ROUND(
                (f.observed_checkouts_1m * 0.45) + (
                  (
                    (
                      0.45
                      + f.active_apply_count / GREATEST(f.capacity * 2.8, 50.0)
                      + f.throughput_per_min * 0.08
                    ) * f.weekday_factor
                    * (
                      CASE
                        WHEN f.hour_of_day < 10 THEN 0.56
                        WHEN f.hour_of_day < 12 THEN 0.80
                        WHEN f.hour_of_day < 14 THEN 0.95
                        WHEN f.hour_of_day < 16 THEN 1.05
                        WHEN f.hour_of_day < 18 THEN 1.18
                        ELSE 1.26
                      END
                    )
                    * (0.90 + EXP(-POW((f.progress_ratio - 0.80) / 0.18, 2)) * 0.32)
                  ) + ((MOD(f.program_id * 19 + f.minute_offset, 5) - 2) * 0.18)
                ) * 0.55,
                0
              ) AS SIGNED
            )
          )
      END AS checkouts_1m
    FROM tmp_ai_program_features f
  ) x
) y
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
  'seed-v6.6-practical-patterned' AS model_version,
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
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_features;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_grid;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_qr_5m;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_wait;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_program_apply;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_programs;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_features;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_grid;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_qr_5m;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_wait;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_program_count;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_event_apply;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_selected_events;
DROP TEMPORARY TABLE IF EXISTS tmp_ai_seq_5m;

SELECT
  (SELECT COUNT(*) FROM ai_event_congestion_timeseries) AS event_timeseries_rows,
  (SELECT COUNT(*) FROM ai_program_congestion_timeseries) AS program_timeseries_rows,
  (SELECT COUNT(*) FROM ai_training_dataset WHERE target_type = 'EVENT') AS event_train_rows,
  (SELECT COUNT(*) FROM ai_training_dataset WHERE target_type = 'PROGRAM') AS program_train_rows;

SELECT
  day_of_week,
  ROUND(AVG(congestion_score), 2) AS avg_event_congestion
FROM ai_event_congestion_timeseries
GROUP BY day_of_week
ORDER BY day_of_week;

SELECT
  hour_of_day,
  ROUND(AVG(congestion_score), 2) AS avg_event_congestion
FROM ai_event_congestion_timeseries
GROUP BY hour_of_day
ORDER BY hour_of_day;
