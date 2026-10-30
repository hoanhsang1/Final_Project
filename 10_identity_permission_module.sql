-- Additive, rerunnable migration for Identity database.
USE mems_identity_db;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_permission_module_migration$
CREATE PROCEDURE mems_permission_module_migration()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = 'permission' AND column_name = 'module_code'
    ) THEN
        ALTER TABLE permission ADD COLUMN module_code VARCHAR(60) NULL;
    END IF;
END$
CALL mems_permission_module_migration()$
DROP PROCEDURE mems_permission_module_migration$
DELIMITER ;

-- Insert or update the 8 new student & class permissions
INSERT INTO permission(code, description, module_code) VALUES
('STUDENT_VIEW', 'View students', 'STUDENT_MANAGEMENT'),
('STUDENT_CREATE', 'Create students', 'STUDENT_MANAGEMENT'),
('STUDENT_EDIT', 'Edit students', 'STUDENT_MANAGEMENT'),
('STUDENT_DELETE', 'Delete students', 'STUDENT_MANAGEMENT'),
('CLASS_VIEW', 'View classes', 'STUDENT_MANAGEMENT'),
('CLASS_CREATE', 'Create classes', 'STUDENT_MANAGEMENT'),
('CLASS_EDIT', 'Edit classes', 'STUDENT_MANAGEMENT'),
('CLASS_DELETE', 'Delete classes', 'STUDENT_MANAGEMENT')
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    module_code = VALUES(module_code);

-- Grant new permissions to OWNER and ORG_OWNER roles
INSERT INTO role_permission(role_id, permission_id)
SELECT r.id, p.id 
FROM role r 
JOIN permission p ON p.code IN (
    'STUDENT_VIEW', 'STUDENT_CREATE', 'STUDENT_EDIT', 'STUDENT_DELETE',
    'CLASS_VIEW', 'CLASS_CREATE', 'CLASS_EDIT', 'CLASS_DELETE'
)
WHERE r.code IN ('OWNER', 'ORG_OWNER')
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

