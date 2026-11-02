-- Additive migration: keep the member's login username in People for display.
-- Identity remains the source of truth; this is a display copy captured at appointment time.
USE mems_people_db;
DELIMITER $
DROP PROCEDURE IF EXISTS mems_people_member_username_migration$
CREATE PROCEDURE mems_people_member_username_migration()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='department_member' AND column_name='username') THEN
  ALTER TABLE department_member ADD COLUMN username VARCHAR(100) NULL;
 END IF;
END$
CALL mems_people_member_username_migration()$
DROP PROCEDURE mems_people_member_username_migration$
DELIMITER ;
