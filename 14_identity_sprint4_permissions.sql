-- MEMS / Identity Service / Sprint 4 permissions
-- Target DB: mems_identity_db (MySQL 8.0.16+)
--
-- Prerequisite: 10_identity_permission_module.sql. This script re-checks the
-- module_code column so it is also safe on databases where 10 was not applied.
-- Safe to run repeatedly: existence check + INSERT ... ON DUPLICATE KEY UPDATE.
-- No DROP TABLE / DROP DATABASE / data reset.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 14_identity_sprint4_permissions.sql

USE mems_identity_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_s4_identity_add_module_col$
CREATE PROCEDURE mems_s4_identity_add_module_col()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'permission'
          AND column_name = 'module_code'
    ) THEN
        ALTER TABLE permission ADD COLUMN module_code VARCHAR(60) NULL;
    END IF;
END$

CALL mems_s4_identity_add_module_col()$
DROP PROCEDURE IF EXISTS mems_s4_identity_add_module_col$

DELIMITER ;

-- Student & class permissions, including the Sprint 4 additions used by
-- teacher assignment and the class close/reopen workflow.
INSERT INTO permission(code, description, module_code) VALUES
('STUDENT_VIEW', 'View students', 'STUDENT_MANAGEMENT'),
('STUDENT_CREATE', 'Create students', 'STUDENT_MANAGEMENT'),
('STUDENT_EDIT', 'Edit students', 'STUDENT_MANAGEMENT'),
('STUDENT_DELETE', 'Delete students', 'STUDENT_MANAGEMENT'),
('CLASS_VIEW', 'View classes', 'STUDENT_MANAGEMENT'),
('CLASS_CREATE', 'Create classes', 'STUDENT_MANAGEMENT'),
('CLASS_EDIT', 'Edit classes', 'STUDENT_MANAGEMENT'),
('CLASS_DELETE', 'Delete classes', 'STUDENT_MANAGEMENT'),
('CLASS_ASSIGN_TEACHER', 'Assign teachers to classes', 'STUDENT_MANAGEMENT'),
('CLASS_CANCEL', 'Cancel classes', 'STUDENT_MANAGEMENT'),
('CLASS_CLOSE_REQUEST', 'Request class closure', 'STUDENT_MANAGEMENT'),
('CLASS_CLOSE_APPROVE', 'Approve class closure', 'STUDENT_MANAGEMENT'),
('CLASS_REOPEN', 'Reopen closed classes', 'STUDENT_MANAGEMENT')
ON DUPLICATE KEY UPDATE
    description = VALUES(description),
    module_code = VALUES(module_code);

-- OWNER (and the legacy ORG_OWNER alias) always hold the full catalog.
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id
FROM role r
JOIN permission p ON p.code IN (
    'STUDENT_VIEW', 'STUDENT_CREATE', 'STUDENT_EDIT', 'STUDENT_DELETE',
    'CLASS_VIEW', 'CLASS_CREATE', 'CLASS_EDIT', 'CLASS_DELETE',
    'CLASS_ASSIGN_TEACHER', 'CLASS_CANCEL', 'CLASS_CLOSE_REQUEST',
    'CLASS_CLOSE_APPROVE', 'CLASS_REOPEN'
)
WHERE r.code IN ('OWNER', 'ORG_OWNER')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Verification queries (run manually):
-- SELECT code, module_code FROM permission WHERE module_code = 'STUDENT_MANAGEMENT';
-- SELECT r.code, COUNT(*) FROM role_permission rp JOIN role r ON r.id = rp.role_id
--   WHERE r.code IN ('OWNER', 'ORG_OWNER') GROUP BY r.code;
