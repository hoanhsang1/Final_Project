-- =====================================================================
-- Xoa toan bo buoi hoc cua MOT schema schedule local (soft delete).
-- Chi chay tren DB local/test. Muon khoi phuc: UPDATE session SET deleted_at=NULL.
--
-- Chay (vi du schema local mems_schedule_db, khong dung cho mems_e2e_*):
--   mysql -h127.0.0.1 -P3306 -u<user> -p mems_schedule_db < docs/phase-1/e2e/clear-all-sessions.sql
--
-- Xoa cung (khong hoan tac duoc) — bo comment 2 dong duoi va bo UPDATE:
--   DELETE FROM session WHERE deleted_at IS NULL;
-- =====================================================================

UPDATE session
SET deleted_at = NOW(), updated_at = NOW()
WHERE deleted_at IS NULL;

SELECT COUNT(*) AS alive_sessions FROM session WHERE deleted_at IS NULL;
