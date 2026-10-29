-- Additive. Existing records remain unassigned; assign an org-owned department before exposing them.
USE mems_schedule_db;
DELIMITER $
DROP PROCEDURE IF EXISTS mems_schedule_department_migration$
CREATE PROCEDURE mems_schedule_department_migration()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='session' AND column_name='department_id') THEN
  ALTER TABLE session ADD COLUMN department_id CHAR(36) NULL;
  CREATE INDEX idx_session_department ON session(department_id);
 END IF;
END$
CALL mems_schedule_department_migration()$
DROP PROCEDURE mems_schedule_department_migration$
DELIMITER ;
