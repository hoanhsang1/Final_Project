-- MEMS / Facility Service / Phần 7: phòng ban cho thiết bị
-- Target DB: mems_facility_db (MySQL 8.0.16+)
--
-- Prerequisites: 04_facility_db.sql, 08_facility_department_access.sql.
-- Safe to run repeatedly; chỉ thêm cột/index và backfill, không xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 27_facility_equipment_department.sql

USE mems_facility_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_facility_equipment_department_migration$
CREATE PROCEDURE mems_facility_equipment_department_migration()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema=DATABASE() AND table_name='equipment' AND column_name='department_id') THEN
  ALTER TABLE equipment ADD COLUMN department_id CHAR(36) NULL;
  CREATE INDEX idx_equipment_department ON equipment(org_id, department_id, status, deleted_at);
 END IF;
END$
CALL mems_facility_equipment_department_migration()$
DROP PROCEDURE IF EXISTS mems_facility_equipment_department_migration$
DELIMITER ;

-- Thiết bị đã gán phòng thì thuộc phòng ban của phòng đó.
UPDATE equipment e
JOIN classroom c ON c.id = e.room_id AND c.org_id = e.org_id
SET e.department_id = c.department_id
WHERE e.department_id IS NULL AND c.department_id IS NOT NULL;

-- Verification queries (run manually):
-- SELECT id, org_id, department_id, room_id, asset_code, status FROM equipment;
