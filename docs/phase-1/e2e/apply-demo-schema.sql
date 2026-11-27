-- =====================================================================
-- MEMS - Chuan bi schema cho phep test xep lich tren DB local that
-- CHI chay tren MySQL local (127.0.0.1:3306), KHONG chay production.
-- Chi them (additive), khong xoa/doi kieu du lieu cu.
-- Idempotent: chay lai nhieu lan khong loi.
-- =====================================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 1) teacher_subject.approved_by / approved_at
--    TeacherRepository.replaceSubjectExceptions() ghi 2 cot nay; DB local
--    (schema cu, migration 51/52 chua ap dung) chua co.
-- ---------------------------------------------------------------------
SET @ddl := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE mems_people_db.teacher_subject ADD COLUMN approved_by char(36) NULL',
    'DO 0')
  FROM information_schema.columns
 WHERE table_schema = 'mems_people_db' AND table_name = 'teacher_subject'
   AND column_name = 'approved_by');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (SELECT IF(COUNT(*) = 0,
    'ALTER TABLE mems_people_db.teacher_subject ADD COLUMN approved_at datetime(3) NULL',
    'DO 0')
  FROM information_schema.columns
 WHERE table_schema = 'mems_people_db' AND table_name = 'teacher_subject'
   AND column_name = 'approved_at');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- 2) Quyen schedule.config (P1 - cau hinh lich, chi pham vi to chuc)
--    PermissionCatalog khai bao orgOnly('schedule.config') - cap cho
--    ORG_OWNER va SUPER_ADMIN de khong bi 403 o man "Cau hinh lich".
-- ---------------------------------------------------------------------
INSERT INTO mems_identity_db.permission(code, description, module_code, allowed_scopes)
VALUES ('schedule.config', 'Configure organization schedule', 'SCHEDULE_MANAGEMENT', 'ORGANIZATION')
ON DUPLICATE KEY UPDATE description = VALUES(description),
                        module_code = VALUES(module_code),
                        allowed_scopes = VALUES(allowed_scopes);

INSERT IGNORE INTO mems_identity_db.role_permission(role_id, permission_id)
SELECT r.id, p.id
  FROM mems_identity_db.role r
  JOIN mems_identity_db.permission p ON p.code = 'schedule.config'
 WHERE r.code IN ('ORG_OWNER', 'SUPER_ADMIN');

SELECT 'apply-demo-schema' AS step,
       (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema='mems_people_db' AND table_name='teacher_subject'
           AND column_name IN ('approved_by','approved_at')) AS teacher_subject_cols,
       (SELECT COUNT(*) FROM mems_identity_db.permission WHERE code='schedule.config') AS schedule_config_perm,
       (SELECT COUNT(*) FROM mems_identity_db.role_permission rp
          JOIN mems_identity_db.permission p ON p.id=rp.permission_id
         WHERE p.code='schedule.config') AS schedule_config_grants;