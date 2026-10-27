-- Additive. Existing records remain unassigned; assign an org-owned department before exposing them.
USE mems_facility_db;
DELIMITER $
DROP PROCEDURE IF EXISTS mems_facility_department_migration$
CREATE PROCEDURE mems_facility_department_migration()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='classroom' AND column_name='department_id') THEN
  ALTER TABLE classroom ADD COLUMN department_id CHAR(36) NULL;
  CREATE INDEX idx_classroom_department ON classroom(department_id);
 END IF;
END$
CALL mems_facility_department_migration()$
DROP PROCEDURE mems_facility_department_migration$
DELIMITER ;
