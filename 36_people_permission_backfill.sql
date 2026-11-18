-- MEMS / People Service / migration 36
-- Backfills what 17_people_permission_foundation.sql did but 31 does not repeat:
--   * maps legacy position_permission codes (PEOPLE_VIEW, CLASS_CLOSE_APPROVE, ...)
--     to the <module>.<resource>.<action> catalog,
--   * seeds position_bundle for "Quản trị viên tổ chức",
--   * backfills position.department_id for single-department positions,
--   * backfills assignment from member_position (assignment is the only source
--     EffectivePermissionsService reads, so without this every non-OWNER member
--     resolves to zero permissions on a DB bootstrapped from DB_11_16.sql).
--
-- Apply AFTER 34 and 31/32. Idempotent and additive; no member/position rows are
-- deleted. The legacy permission codes are removed only after their replacement
-- rows have been inserted. class.approve_close is never re-granted to the
-- organization-admin position (DEC-02), even if migration 33 ran earlier.
USE mems_people_db;
SET NAMES utf8mb4;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m36_backfill$
CREATE PROCEDURE mems_m36_backfill()
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = 'position_permission') THEN
        INSERT IGNORE INTO position_permission(position_id, permission_code)
        SELECT pp.position_id, m.new_code
        FROM position_permission pp
        JOIN (
            SELECT 'PEOPLE_VIEW' AS old_code, 'employee.view' AS new_code
            UNION ALL SELECT 'STUDENT_VIEW', 'student.view'
            UNION ALL SELECT 'STUDENT_CREATE', 'student.create'
            UNION ALL SELECT 'STUDENT_EDIT', 'student.edit'
            UNION ALL SELECT 'STUDENT_DELETE', 'student.delete'
            UNION ALL SELECT 'CLASS_VIEW', 'class.view'
            UNION ALL SELECT 'CLASS_CREATE', 'class.create'
            UNION ALL SELECT 'CLASS_EDIT', 'class.edit'
            UNION ALL SELECT 'CLASS_DELETE', 'class.delete'
            UNION ALL SELECT 'CLASS_ASSIGN_TEACHER', 'class.assign_teacher'
            UNION ALL SELECT 'CLASS_CANCEL', 'class.cancel'
            UNION ALL SELECT 'CLASS_CLOSE_REQUEST', 'class.request_close'
            UNION ALL SELECT 'CLASS_CLOSE_APPROVE', 'class.approve_close'
            UNION ALL SELECT 'CLASS_REOPEN', 'class.reopen'
            UNION ALL SELECT 'SCHEDULE_VIEW', 'schedule.view'
            UNION ALL SELECT 'SCHEDULE_CREATE', 'schedule.create'
            UNION ALL SELECT 'FACILITY_MANAGE', 'facility.manage'
            UNION ALL SELECT 'FACILITY_MANAGE', 'facility.view'
        ) m ON m.old_code = pp.permission_code
        JOIN `position` p ON p.id = pp.position_id
        WHERE NOT (
            m.new_code = 'class.approve_close'
            AND LOWER(TRIM(p.name)) IN ('quản trị viên tổ chức', 'quan tri vien to chuc')
        );

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
    END IF;

    -- Bundles of the default positions, mirroring DefaultPositionSeeder. This is
    -- what gives "Nhân sự phòng ban" employee.approve_resignation/approve_transfer
    -- (DEC-08 level 1) and keeps class.approve_close out of ACADEMIC_MANAGEMENT.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = 'position_bundle') THEN
        INSERT IGNORE INTO position_bundle(position_id, bundle_code)
        SELECT p.id, b.code
        FROM `position` p
        JOIN (
            SELECT 'HR_MANAGEMENT' AS code
            UNION ALL SELECT 'ACADEMIC_MANAGEMENT'
            UNION ALL SELECT 'SCHEDULE_MANAGEMENT'
            UNION ALL SELECT 'FACILITY_MANAGEMENT'
        ) b ON 1 = 1
        WHERE LOWER(TRIM(p.name)) IN ('quản trị viên tổ chức', 'quan tri vien to chuc');

        INSERT IGNORE INTO position_bundle(position_id, bundle_code)
        SELECT p.id, b.code
        FROM `position` p
        JOIN (
            SELECT 'Nhân sự phòng ban' AS position_name, 'HR_MANAGEMENT' AS code
            UNION ALL SELECT 'Giáo vụ', 'ACADEMIC_MANAGEMENT'
            UNION ALL SELECT 'Nhân viên cơ sở vật chất', 'FACILITY_MANAGEMENT'
        ) b ON LOWER(TRIM(p.name)) = LOWER(b.position_name);
    END IF;

    -- A department position used by exactly one department belongs to it.
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = DATABASE() AND table_name = 'position'
                 AND column_name = 'scope') THEN
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
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = DATABASE() AND table_name = 'assignment') THEN
        INSERT INTO assignment(
            id, org_id, user_id, position_id, scope_type, department_id,
            effective_from, effective_to, status, assigned_by, created_at,
            reason, revoked_at, revoked_by, revoked_reason)
        SELECT UUID(), mp.org_id, mp.user_id, mp.position_id,
               CASE WHEN p.scope = 'ORGANIZATION' THEN 'ORGANIZATION' ELSE 'DEPARTMENT' END,
               CASE WHEN p.scope = 'ORGANIZATION' THEN NULL
                    ELSE COALESCE(p.department_id, dm.department_id) END,
               dm.appointed_at, NULL, 'ACTIVE', dm.appointed_by, dm.appointed_at,
               'Backfilled from member_position', NULL, NULL, NULL
        FROM member_position mp
        JOIN department_member dm ON dm.user_id = mp.user_id AND dm.org_id = mp.org_id
        JOIN `position` p ON p.id = mp.position_id AND p.org_id = mp.org_id
        WHERE NOT EXISTS (
            SELECT 1 FROM assignment a
            WHERE a.user_id = mp.user_id AND a.position_id = mp.position_id
              AND a.org_id = mp.org_id AND a.status = 'ACTIVE'
        );
    END IF;
END$
CALL mems_m36_backfill()$
DROP PROCEDURE IF EXISTS mems_m36_backfill$
DELIMITER ;

-- Verification:
-- SELECT COUNT(*) FROM assignment WHERE status='ACTIVE';      -- >= member_position rows
-- SELECT COUNT(*) FROM position_permission WHERE permission_code NOT LIKE '%.%';
-- SELECT p.name, pp.permission_code FROM position_permission pp JOIN `position` p
--   ON p.id=pp.position_id WHERE pp.permission_code='class.approve_close';
