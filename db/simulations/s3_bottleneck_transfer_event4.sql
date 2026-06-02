-- Scenario 3 (NOW-based): next-day forecast shift
-- Goal:
--   1) From tomorrow, apply a different congestion curve than today's horizon.
--   2) Verify next-day prediction change on EVENT and PROGRAM levels.

START TRANSACTION;

SET @s3_event_id := 3;
SET @s3_now := NOW();
SET @s3_event_end := COALESCE(
  (SELECT end_at FROM event WHERE event_id = @s3_event_id),
  DATE_ADD(@s3_now, INTERVAL 2 DAY)
);

SET @s3_tomorrow_start := STR_TO_DATE(
  CONCAT(DATE_FORMAT(DATE_ADD(@s3_now, INTERVAL 1 DAY), '%Y-%m-%d'), ' 09:00:00'),
  '%Y-%m-%d %H:%i:%s'
);
SET @s3_tomorrow_end := STR_TO_DATE(
  CONCAT(DATE_FORMAT(DATE_ADD(@s3_now, INTERVAL 1 DAY), '%Y-%m-%d'), ' 21:00:00'),
  '%Y-%m-%d %H:%i:%s'
);

SET @s3_horizon_end := LEAST(@s3_tomorrow_end, @s3_event_end);

DELETE FROM ai_prediction_logs
WHERE model_version = 'scenario-s3-nextday-shift'
  AND event_id = @s3_event_id;

DROP TEMPORARY TABLE IF EXISTS tmp_s3_programs;
CREATE TEMPORARY TABLE tmp_s3_programs AS
SELECT
  x.program_id,
  ROW_NUMBER() OVER (ORDER BY x.priority, x.program_id) AS ord
FROM (
  SELECT p.program_id, 0 AS priority
  FROM event_program p
  WHERE p.event_id = @s3_event_id
    AND p.program_id IN (9703101, 9703102, 9703103, 9703104)
  UNION ALL
  SELECT p.program_id, 1 AS priority
  FROM event_program p
  WHERE p.event_id = @s3_event_id
    AND p.program_id NOT IN (9703101, 9703102, 9703103, 9703104)
) x
ORDER BY x.priority, x.program_id
LIMIT 2;

-- EVENT next-day forecast (hourly buckets).
INSERT INTO ai_prediction_logs (
  prediction_log_id, target_type, event_id, program_id, prediction_base_time,
  predicted_avg_score_60m, predicted_peak_score_60m, predicted_level,
  model_version, source_type, created_at
)
WITH RECURSIVE slots AS (
  SELECT 0 AS rn, @s3_tomorrow_start AS ts
  UNION ALL
  SELECT rn + 1, DATE_ADD(ts, INTERVAL 1 HOUR)
  FROM slots
  WHERE ts < @s3_horizon_end
    AND rn < 48
)
SELECT
  979000000 + d.rn AS prediction_log_id,
  'EVENT' AS target_type,
  @s3_event_id AS event_id,
  NULL AS program_id,
  d.ts AS prediction_base_time,
  GREATEST(5.00, d.peak - 12.00) AS predicted_avg_score_60m,
  d.peak AS predicted_peak_score_60m,
  CASE
    WHEN d.peak <= 20 THEN 1
    WHEN d.peak <= 40 THEN 2
    WHEN d.peak <= 60 THEN 3
    WHEN d.peak <= 80 THEN 4
    ELSE 5
  END AS predicted_level,
  'scenario-s3-nextday-shift' AS model_version,
  'BATCH' AS source_type,
  @s3_now AS created_at
FROM (
  SELECT
    s.rn,
    s.ts,
    LEAST(
      100.00,
      GREATEST(
        25.00,
        CASE
          WHEN HOUR(s.ts) BETWEEN 9 AND 11 THEN 44.00
          WHEN HOUR(s.ts) BETWEEN 12 AND 14 THEN 62.00
          WHEN HOUR(s.ts) BETWEEN 15 AND 17 THEN 84.00
          WHEN HOUR(s.ts) BETWEEN 18 AND 21 THEN 58.00
          ELSE 42.00
        END
        + CASE WHEN WEEKDAY(s.ts) IN (5, 6) THEN 5.00 ELSE 0.00 END
      )
    ) AS peak
  FROM slots s
) d
WHERE d.ts <= @s3_horizon_end
  AND d.ts >= @s3_tomorrow_start
ON DUPLICATE KEY UPDATE
  prediction_base_time = VALUES(prediction_base_time),
  predicted_avg_score_60m = VALUES(predicted_avg_score_60m),
  predicted_peak_score_60m = VALUES(predicted_peak_score_60m),
  predicted_level = VALUES(predicted_level),
  model_version = VALUES(model_version),
  source_type = VALUES(source_type),
  created_at = VALUES(created_at);

-- PROGRAM next-day forecast (same buckets, per selected program).
INSERT INTO ai_prediction_logs (
  prediction_log_id, target_type, event_id, program_id, prediction_base_time,
  predicted_avg_score_60m, predicted_peak_score_60m, predicted_level,
  model_version, source_type, created_at
)
WITH RECURSIVE slots AS (
  SELECT 0 AS rn, @s3_tomorrow_start AS ts
  UNION ALL
  SELECT rn + 1, DATE_ADD(ts, INTERVAL 1 HOUR)
  FROM slots
  WHERE ts < @s3_horizon_end
    AND rn < 48
)
SELECT
  979100000 + (p.ord * 200) + d.rn AS prediction_log_id,
  'PROGRAM' AS target_type,
  @s3_event_id AS event_id,
  p.program_id AS program_id,
  d.ts AS prediction_base_time,
  GREATEST(5.00, p.program_peak - 10.00) AS predicted_avg_score_60m,
  p.program_peak AS predicted_peak_score_60m,
  CASE
    WHEN p.program_peak <= 20 THEN 1
    WHEN p.program_peak <= 40 THEN 2
    WHEN p.program_peak <= 60 THEN 3
    WHEN p.program_peak <= 80 THEN 4
    ELSE 5
  END AS predicted_level,
  'scenario-s3-nextday-shift' AS model_version,
  'BATCH' AS source_type,
  @s3_now AS created_at
FROM (
  SELECT
    s.rn,
    s.ts,
    LEAST(
      100.00,
      GREATEST(
        25.00,
        CASE
          WHEN HOUR(s.ts) BETWEEN 9 AND 11 THEN 44.00
          WHEN HOUR(s.ts) BETWEEN 12 AND 14 THEN 62.00
          WHEN HOUR(s.ts) BETWEEN 15 AND 17 THEN 84.00
          WHEN HOUR(s.ts) BETWEEN 18 AND 21 THEN 58.00
          ELSE 42.00
        END
        + CASE WHEN WEEKDAY(s.ts) IN (5, 6) THEN 5.00 ELSE 0.00 END
      )
    ) AS base_peak
  FROM slots s
) d
JOIN (
  SELECT
    tp.program_id,
    tp.ord,
    d2.rn,
    d2.ts,
    LEAST(
      100.00,
      GREATEST(
        18.00,
        d2.base_peak - ((tp.ord - 1) * 7.00) + CASE WHEN MOD(d2.rn, 3) = 0 THEN 3.00 ELSE 0.00 END
      )
    ) AS program_peak
  FROM tmp_s3_programs tp
  JOIN (
    SELECT
      s.rn,
      s.ts,
      LEAST(
        100.00,
        GREATEST(
          25.00,
          CASE
            WHEN HOUR(s.ts) BETWEEN 9 AND 11 THEN 44.00
            WHEN HOUR(s.ts) BETWEEN 12 AND 14 THEN 62.00
            WHEN HOUR(s.ts) BETWEEN 15 AND 17 THEN 84.00
            WHEN HOUR(s.ts) BETWEEN 18 AND 21 THEN 58.00
            ELSE 42.00
          END
          + CASE WHEN WEEKDAY(s.ts) IN (5, 6) THEN 5.00 ELSE 0.00 END
        )
      ) AS base_peak
    FROM slots s
  ) d2 ON 1 = 1
) p
  ON p.rn = d.rn AND p.ts = d.ts
WHERE d.ts <= @s3_horizon_end
  AND d.ts >= @s3_tomorrow_start
ON DUPLICATE KEY UPDATE
  prediction_base_time = VALUES(prediction_base_time),
  predicted_avg_score_60m = VALUES(predicted_avg_score_60m),
  predicted_peak_score_60m = VALUES(predicted_peak_score_60m),
  predicted_level = VALUES(predicted_level),
  model_version = VALUES(model_version),
  source_type = VALUES(source_type),
  created_at = VALUES(created_at);

DROP TEMPORARY TABLE IF EXISTS tmp_s3_programs;

COMMIT;
