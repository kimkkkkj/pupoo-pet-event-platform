-- demo_today_realtime.sql 이 만든 데모 방문객·입장 QR·입장 기록을 지운다.
-- 부스·프로그램 대기와 혼잡 측정값은 "마지막 측정값"으로 남는다(다음 실제 측정으로 덮어써짐).

SET NAMES utf8mb4;
START TRANSACTION;

DELETE l FROM qr_logs l
JOIN qr_codes q ON q.qr_id = l.qr_id
WHERE q.original_url = 'demo://visitor';

DELETE FROM qr_codes WHERE original_url = 'demo://visitor';

DELETE FROM users WHERE email LIKE '%@demo.pupoo.local';

COMMIT;
