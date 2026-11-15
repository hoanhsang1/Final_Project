-- MEMS / People Service / Phần 1: nền tảng phân quyền
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 07_people_department_access.sql, 11_people_student_class.sql,
--                12_people_member_username.sql, 13_people_sprint4.sql.
-- Safe to run repeatedly: CREATE TABLE IF NOT EXISTS + existence checks.
-- No DROP TABLE / DROP DATABASE. Bảng member_position được GIỮ LẠI (đồng bộ
-- như một projection của assignment) để các truy vấn cũ không bị vỡ.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 17_people_permission_foundation.sql

USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_pf_add_col$
CREATE PROCEDURE mems_pf_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64), IN p_ddl VARCHAR(500))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = p_table AND column_name = p_col
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_pf_add_index$
CREATE PROCEDURE mems_pf_add_index(IN p_table VARCHAR(64), IN p_index VARCHAR(64), IN p_cols VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = p_table AND index_name = p_index
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD INDEX `', p_index, '` (', p_cols, ')');
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DROP PROCEDURE IF EXISTS mems_pf_add_constraint$
CREATE PROCEDURE mems_pf_add_constraint(IN p_table VARCHAR(64), IN p_name VARCHAR(64), IN p_ddl VARCHAR(1000))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = DATABASE() AND table_name = p_table AND constraint_name = p_name
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_ddl);
        PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 1. Chức vụ: phạm vi ORGANIZATION (toàn tổ chức) hoặc DEPARTMENT (phòng ban).
--    department_id NULL với chức vụ DEPARTMENT = dùng phòng ban của nhân viên
--    tại thời điểm bổ nhiệm (giữ tương thích dữ liệu cũ).
-- ---------------------------------------------------------------------------
CALL mems_pf_add_col('position', 'scope', 'VARCHAR(20) NOT NULL DEFAULT ''DEPARTMENT''');
CALL mems_pf_add_col('position', 'department_id', 'CHAR(36) NULL');
CALL mems_pf_add_index('position', 'idx_position_org_scope', '`org_id`, `scope`');
CALL mems_pf_add_constraint('position', 'chk_position_scope',
    'CONSTRAINT `chk_position_scope` CHECK (`scope` IN (''ORGANIZATION'', ''DEPARTMENT''))');

-- Các chức vụ mặc định cấp tổ chức.
UPDATE `position`
SET scope = 'ORGANIZATION', department_id = NULL
WHERE LOWER(TRIM(name)) IN (
    'quản trị viên tổ chức', 'quan tri vien to chuc',
    'giáo vụ', 'giao vu'
);

-- Chức vụ phòng ban đang được dùng bởi đúng một phòng ban → gắn phòng ban đó.
UPDATE `position` p
JOIN (
    SELECT mp.position_id, MIN(dm.department_id) AS dept_id,
           COUNT(DISTINCT dm.department_id) AS dept_count
    FROM member_position mp
    JOIN department_member dm ON dm.user_id = mp.user_id AND dm.org_id = mp.org_id
    GROUP BY mp.position_id
) x ON x.position_id = p.id
SET p.department_id = x.dept_id
WHERE p.scope = 'DEPARTMENT' AND p.department_id IS NULL AND x.dept_count = 1;

CREATE TABLE IF NOT EXISTS position_bundle (
    position_id CHAR(36) NOT NULL,
    bundle_code VARCHAR(100) NOT NULL,
    PRIMARY KEY (position_id, bundle_code),
    CONSTRAINT fk_position_bundle_position FOREIGN KEY (position_id)
        REFERENCES `position` (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Assignment — lịch sử bổ nhiệm chức vụ, KHÔNG xoá cứng.
--    status: ACTIVE | REVOKED | EXPIRED
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignment (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    position_id CHAR(36) NOT NULL,
    scope_type VARCHAR(20) NOT NULL,
    department_id CHAR(36) NULL,
    effective_from DATETIME(3) NOT NULL,
    effective_to DATETIME(3) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_by CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    revoked_by CHAR(36) NULL,
    PRIMARY KEY (id),
    INDEX idx_assignment_user_org_status (user_id, org_id, status),
    INDEX idx_assignment_position (position_id),
    CONSTRAINT fk_assignment_position FOREIGN KEY (position_id)
        REFERENCES `position` (id) ON DELETE RESTRICT,
    CONSTRAINT chk_assignment_scope CHECK (scope_type IN ('ORGANIZATION', 'DEPARTMENT')),
    CONSTRAINT chk_assignment_status CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3. Chuyển mã quyền cũ trong position_permission sang mã mới.
--    Bước này là ánh xạ mã; các mã cũ bị thay thế để chức vụ không còn giữ
--    mã không tồn tại trong catalog.
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO position_permission(position_id, permission_code)
SELECT pp.position_id, m.new_code
FROM position_permission pp
JOIN (
    SELECT 'PEOPLE_VIEW'           AS old_code, 'employee.view'            AS new_code
    UNION ALL SELECT 'STUDENT_VIEW',  'student.view'
    UNION ALL SELECT 'STUDENT_CREATE','student.create'
    UNION ALL SELECT 'STUDENT_EDIT',  'student.edit'
    UNION ALL SELECT 'STUDENT_DELETE','student.delete'
    UNION ALL SELECT 'CLASS_VIEW',    'class.view'
    UNION ALL SELECT 'CLASS_CREATE',  'class.create'
    UNION ALL SELECT 'CLASS_EDIT',    'class.edit'
    UNION ALL SELECT 'CLASS_DELETE',  'class.delete'
    UNION ALL SELECT 'CLASS_ASSIGN_TEACHER','class.assign_teacher'
    UNION ALL SELECT 'CLASS_CANCEL',  'class.cancel'
    UNION ALL SELECT 'CLASS_CLOSE_REQUEST','class.request_close'
    UNION ALL SELECT 'CLASS_CLOSE_APPROVE','class.approve_close'
    UNION ALL SELECT 'CLASS_REOPEN',  'class.reopen'
    UNION ALL SELECT 'SCHEDULE_VIEW', 'schedule.view'
    UNION ALL SELECT 'SCHEDULE_CREATE','schedule.create'
    UNION ALL SELECT 'FACILITY_MANAGE','facility.manage'
    UNION ALL SELECT 'FACILITY_MANAGE','facility.view'
) m ON m.old_code = pp.permission_code;

INSERT IGNORE INTO position_permission(position_id, permission_code)
SELECT pp.position_id, m.new_code
FROM position_permission pp
JOIN (
    SELECT 'employee.view' AS new_code
    UNION ALL SELECT 'employee.create'
    UNION ALL SELECT 'employee.edit'
    UNION ALL SELECT 'employee.delete'
    UNION ALL SELECT 'employee.reset_password'
    UNION ALL SELECT 'employee.assign_position'
    UNION ALL SELECT 'position.view'
    UNION ALL SELECT 'position.manage'
    UNION ALL SELECT 'department.view'
) m ON 1 = 1
WHERE pp.permission_code = 'PEOPLE_EDIT';

DELETE FROM position_permission
WHERE permission_code IN (
    'PEOPLE_VIEW','PEOPLE_EDIT',
    'STUDENT_VIEW','STUDENT_CREATE','STUDENT_EDIT','STUDENT_DELETE',
    'CLASS_VIEW','CLASS_CREATE','CLASS_EDIT','CLASS_DELETE','CLASS_ASSIGN_TEACHER',
    'CLASS_CANCEL','CLASS_CLOSE_REQUEST','CLASS_CLOSE_APPROVE','CLASS_REOPEN',
    'SCHEDULE_VIEW','SCHEDULE_CREATE','FACILITY_MANAGE'
);

-- Chức vụ "Quản trị viên tổ chức" giữ toàn bộ catalog (gắn qua bundle HR + hai
-- bundle còn lại) để không phụ thuộc vào từng dòng position_permission.
INSERT INTO position_bundle(position_id, bundle_code)
SELECT p.id, b.code
FROM `position` p
JOIN (
    SELECT 'HR_MANAGEMENT' AS code
    UNION ALL SELECT 'ACADEMIC_MANAGEMENT'
    UNION ALL SELECT 'SCHEDULE_MANAGEMENT'
    UNION ALL SELECT 'FACILITY_MANAGEMENT'
) b ON 1 = 1
WHERE LOWER(TRIM(p.name)) IN ('quản trị viên tổ chức', 'quan tri vien to chuc')
ON DUPLICATE KEY UPDATE bundle_code = VALUES(bundle_code);

-- ---------------------------------------------------------------------------
-- 4. Backfill assignment từ member_position (một lần, không nhân đôi).
-- ---------------------------------------------------------------------------
INSERT INTO assignment(
    id, org_id, user_id, position_id, scope_type, department_id,
    effective_from, effective_to, status, assigned_by, created_at, revoked_at, revoked_by)
SELECT UUID(), mp.org_id, mp.user_id, mp.position_id,
       CASE WHEN p.scope = 'ORGANIZATION' THEN 'ORGANIZATION' ELSE 'DEPARTMENT' END,
       CASE WHEN p.scope = 'ORGANIZATION' THEN NULL
            ELSE COALESCE(p.department_id, dm.department_id) END,
       dm.appointed_at, NULL, 'ACTIVE', dm.appointed_by, dm.appointed_at, NULL, NULL
FROM member_position mp
JOIN department_member dm ON dm.user_id = mp.user_id AND dm.org_id = mp.org_id
JOIN `position` p ON p.id = mp.position_id AND p.org_id = mp.org_id
WHERE NOT EXISTS (
    SELECT 1 FROM assignment a
    WHERE a.user_id = mp.user_id AND a.position_id = mp.position_id AND a.status = 'ACTIVE'
);

DROP PROCEDURE IF EXISTS mems_pf_add_col;
DROP PROCEDURE IF EXISTS mems_pf_add_index;
DROP PROCEDURE IF EXISTS mems_pf_add_constraint;

-- Verification queries (run manually):
-- SELECT scope, COUNT(*) FROM `position` GROUP BY scope;
-- SELECT COUNT(*) FROM assignment WHERE status='ACTIVE';
-- SELECT code, COUNT(i.permission_code) FROM permission_bundle b
--   LEFT JOIN permission_bundle_item i ON i.bundle_id=b.id GROUP BY code;
