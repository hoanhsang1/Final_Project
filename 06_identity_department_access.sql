-- Additive, rerunnable migration for existing Identity databases.
USE mems_identity_db;
DELIMITER $
DROP PROCEDURE IF EXISTS mems_department_account_migration$
CREATE PROCEDURE mems_department_account_migration()
BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='account' AND column_name='must_change_password') THEN
  ALTER TABLE account ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
 END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='account' AND column_name='provisioned_by') THEN
  ALTER TABLE account ADD COLUMN provisioned_by CHAR(36) NULL;
 END IF;
END$
CALL mems_department_account_migration()$
DROP PROCEDURE mems_department_account_migration$
DELIMITER ;
