-- Scenario 2 (NOW-based): forecast from now to remaining event time
-- Goal:
--   1) Persist EVENT/PROGRAM prediction logs continuously from now to event end.
--   2) Reflect "remaining horizon" congestion changes for the ongoing event.

START TRANSACTION;

SET @s2_event_id := 3;
SET @s2_now := NOW();
SET @s2_event_end := CAST(COALESCE(
  (SELECT end_at FROM event WHERE event_id = @s2_event_id),
  DATE_ADD(@s2_now, INTERVAL 12 HOUR)
 ) AS DATETIME);

-- If event end is in the past, fallback horizon to +6h.
SET @s2_now_ts := UNIX_TIMESTAMP(@s2_now);
SET @s2_event_end_ts := UNIX_TIMESTAMP(@s2_event_end);
SET @s2_horizon_ts := IF(@s2_event_end_ts > (@s2_now_ts + 21600), @s2_event_end_ts, (@s2_now_ts + 21600));
SET @s2_horizon_end := FROM_UNIXTIME(@s2_horizon_ts);

-- Keep this model_version idempotent.
DELETE FROM ai_prediction_logs
WHERE model_version = 'scenario-s2-remaining-horizon'
  AND event_id = @s2_event_id;

DROP TEMPORARY TABLE IF EXISTS tmp_s2_programs;
CREATE TEMPORARY TABLE tmp_s2_programs AS
SELECT
  x.program_id,
  ROW_NUMBER() OVER (ORDER BY x.priority, x.program_id) AS ord
FROM (
  SELECT p.program_id, 0 AS priority
  FROM event_program p
  WHERE p.event_id = @s2_event_id
    AND p.program_id IN (9703101, 9703102, 9703103, 9703104)
  UNION ALL
  SELECT p.program_id, 1 AS priority
  FROM event_program p
  WHERE p.event_id = @s2_event_id
    AND p.program_id NOT IN (9703101, 9703102, 9703103, 9703104)
) x
ORDER BY x.priority, x.program_id
LIMIT 2;

-- EVENT forecast (30-minute buckets until event end).
INSERT INTO ai_prediction_logs (
  prediction_log_id, target_type, event_id, program_id, prediction_base_time,
  predicted_avg_score_60m, predicted_peak_score_60m, predicted_level,
  model_version, source_type, created_at
)
WITH RECURSIVE slots AS (
  SELECT 0 AS rn, @s2_now AS ts
  UNION ALL
  SELECT rn + 1, DATE_ADD(ts, INTERVAL 30 MINUTE)
  FROM slots
  WHERE ts < @s2_horizon_end
    AND rn < 960
)
SELECT
  978000000 + d.rn AS prediction_log_id,
  'EVENT' AS target_type,
  @s2_event_id AS event_id,
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
  'scenario-s2-remaining-horizon' AS model_version,
  'BATCH' AS source_type,
  @s2_now AS created_at
FROM (
  SELECT
    s.rn,
    s.ts,
    LEAST(
      100.00,
      GREATEST(
        28.00,
        CASE
          WHEN HOUR(s.ts) BETWEEN 10 AND 12 THEN 74.00
          WHEN HOUR(s.ts) BETWEEN 13 AND 16 THEN 86.00
          WHEN HOUR(s.ts) BETWEEN 17 AND 19 THEN 72.00
          WHEN HOUR(s.ts) BETWEEN 20 AND 22 THEN 62.00
          ELSE 48.00
        END
        + CASE WHEN WEEKDAY(s.ts) IN (5, 6) THEN 6.00 ELSE 0.00 END
        + CASE WHEN MOD(s.rn, 6) = 0 THEN 5.00 ELSE 0.00 END
      )
    ) AS peak
  FROM slots s
) d
WHERE d.ts <= @s2_horizon_end
ON DUPLICATE KEY UPDATE
  prediction_base_time = VALUES(prediction_base_time),
  predicted_avg_score_60m = VALUES(predicted_avg_score_60m),
  predicted_peak_score_60m = VALUES(predicted_peak_score_60m),
  predicted_level = VALUES(predicted_level),
  model_version = VALUES(model_version),
  source_type = VALUES(source_type),
  created_at = VALUES(created_at);

-- PROGRAM forecast (same buckets, per selected program).
INSERT INTO ai_prediction_logs (
  prediction_log_id, target_type, event_id, program_id, prediction_base_time,
  predicted_avg_score_60m, predicted_peak_score_60m, predicted_level,
  model_version, source_type, created_at
)
WITH RECURSIVE slots AS (
  SELECT 0 AS rn, @s2_now AS ts
  UNION ALL
  SELECT rn + 1, DATE_ADD(ts, INTERVAL 30 MINUTE)
  FROM slots
  WHERE ts < @s2_horizon_end
    AND rn < 960
)
SELECT
  978100000 + (p.ord * 2000) + d.rn AS prediction_log_id,
  'PROGRAM' AS target_type,
  @s2_event_id AS event_id,
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
  'scenario-s2-remaining-horizon' AS model_version,
  'BATCH' AS source_type,
  @s2_now AS created_at
FROM (
  SELECT
    s.rn,
    s.ts,
    LEAST(
      100.00,
      GREATEST(
        28.00,
        CASE
          WHEN HOUR(s.ts) BETWEEN 10 AND 12 THEN 74.00
          WHEN HOUR(s.ts) BETWEEN 13 AND 16 THEN 86.00
          WHEN HOUR(s.ts) BETWEEN 17 AND 19 THEN 72.00
          WHEN HOUR(s.ts) BETWEEN 20 AND 22 THEN 62.00
          ELSE 48.00
        END
        + CASE WHEN WEEKDAY(s.ts) IN (5, 6) THEN 6.00 ELSE 0.00 END
        + CASE WHEN MOD(s.rn, 6) = 0 THEN 5.00 ELSE 0.00 END
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
        20.00,
        d2.base_peak - ((tp.ord - 1) * 8.00) + CASE WHEN MOD(d2.rn, 4) = 0 THEN 4.00 ELSE 0.00 END
      )
    ) AS program_peak
  FROM tmp_s2_programs tp
  JOIN (
    SELECT
      s.rn,
      s.ts,
      LEAST(
        100.00,
        GREATEST(
          28.00,
          CASE
            WHEN HOUR(s.ts) BETWEEN 10 AND 12 THEN 74.00
            WHEN HOUR(s.ts) BETWEEN 13 AND 16 THEN 86.00
            WHEN HOUR(s.ts) BETWEEN 17 AND 19 THEN 72.00
            WHEN HOUR(s.ts) BETWEEN 20 AND 22 THEN 62.00
            ELSE 48.00
          END
          + CASE WHEN WEEKDAY(s.ts) IN (5, 6) THEN 6.00 ELSE 0.00 END
          + CASE WHEN MOD(s.rn, 6) = 0 THEN 5.00 ELSE 0.00 END
        )
      ) AS base_peak
    FROM slots s
  ) d2 ON 1 = 1
) p
  ON p.rn = d.rn AND p.ts = d.ts
WHERE d.ts <= @s2_horizon_end
ON DUPLICATE KEY UPDATE
  prediction_base_time = VALUES(prediction_base_time),
  predicted_avg_score_60m = VALUES(predicted_avg_score_60m),
  predicted_peak_score_60m = VALUES(predicted_peak_score_60m),
  predicted_level = VALUES(predicted_level),
  model_version = VALUES(model_version),
  source_type = VALUES(source_type),
  created_at = VALUES(created_at);

DROP TEMPORARY TABLE IF EXISTS tmp_s2_programs;

COMMIT;
