-- MEMS / Sprint 4 sample data (DEV/TEST ONLY)
-- Target DBs: mems_identity_db + mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 13_people_sprint4.sql and 14_identity_sprint4_permissions.sql applied.
-- Safe to run repeatedly: every INSERT has a fixed primary key and uses INSERT IGNORE
-- (or ON DUPLICATE KEY UPDATE for module status). Existing rows are never updated or deleted.
--
-- Demo organization : 11111111-1111-4111-8111-111111111111
-- Demo password     : Sample@123456   (all sample accounts)
-- Accounts          : sample_owner (OWNER), sample_hr (MANAGER, Nhân sự phòng ban),
--                     sample_academic (STAFF, Giáo vụ), sample_head (STAFF, Trưởng phòng ban),
--                     sample_teacher (STAFF, Giáo viên, DANG_DAY),
--                     sample_teacher2 (STAFF, Giáo viên, TAM_NGHI)
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p --default-character-set=utf8mb4 < 15_sprint4_sample.sql

-- ---------------------------------------------------------------------------
-- Identity DB: organization, enabled modules, accounts and account roles
-- ---------------------------------------------------------------------------
USE mems_identity_db;

INSERT IGNORE INTO organization (id, name, org_type, status, contact_email, created_at)
VALUES ('11111111-1111-4111-8111-111111111111', 'Trường THPT Mẫu MEMS', 'school', 'active',
        'contact@sample-mems.example', CURRENT_TIMESTAMP(3));

INSERT INTO organization_module (org_id, module_code, status) VALUES
    ('11111111-1111-4111-8111-111111111111', 'STUDENT_MANAGEMENT', 'active'),
    ('11111111-1111-4111-8111-111111111111', 'TEACHER_MANAGEMENT', 'active'),
    ('11111111-1111-4111-8111-111111111111', 'CLASS_MANAGEMENT', 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- BCrypt hash of "Sample@123456" (cost 10).
SET @sample_hash = '$2b$10$HHoto94Ged9eR927ydeSTOgnEpl.8WKxiXw9gWv5nulyBhTQa4UIW';
SET @sample_org = '11111111-1111-4111-8111-111111111111';

INSERT IGNORE INTO account (id, org_id, username, email, password_hash, status) VALUES
    ('22222222-2222-4222-8222-222222222001', @sample_org, 'sample_owner',
     'owner@sample-mems.example', @sample_hash, 'active'),
    ('22222222-2222-4222-8222-222222222002', @sample_org, 'sample_hr',
     'hr@sample-mems.example', @sample_hash, 'active'),
    ('22222222-2222-4222-8222-222222222003', @sample_org, 'sample_academic',
     'academic@sample-mems.example', @sample_hash, 'active'),
    ('22222222-2222-4222-8222-222222222004', @sample_org, 'sample_head',
     'head@sample-mems.example', @sample_hash, 'active'),
    ('22222222-2222-4222-8222-222222222005', @sample_org, 'sample_teacher',
     'teacher@sample-mems.example', @sample_hash, 'active'),
    ('22222222-2222-4222-8222-222222222006', @sample_org, 'sample_teacher2',
     'teacher2@sample-mems.example', @sample_hash, 'active');

-- OWNER/MANAGER/STAFF role rows are created by IdentityDataInitializer at startup.
-- If the script runs before the first startup, this statement is a no-op.
INSERT IGNORE INTO account_role (account_id, role_id)
SELECT '22222222-2222-4222-8222-222222222001', id FROM role WHERE code = 'OWNER';
INSERT IGNORE INTO account_role (account_id, role_id)
SELECT '22222222-2222-4222-8222-222222222002', id FROM role WHERE code = 'MANAGER';
INSERT IGNORE INTO account_role (account_id, role_id)
SELECT a.id, r.id FROM account a JOIN role r ON r.code = 'STAFF'
WHERE a.id IN ('22222222-2222-4222-8222-222222222003',
               '22222222-2222-4222-8222-222222222004',
               '22222222-2222-4222-8222-222222222005',
               '22222222-2222-4222-8222-222222222006');

-- ---------------------------------------------------------------------------
-- People DB: positions (mirroring DefaultPositionSeeder), department, members
-- ---------------------------------------------------------------------------
USE mems_people_db;

INSERT IGNORE INTO position (id, org_id, name, description, created_at, profile_type) VALUES
    ('33333333-3333-4333-8333-333333333001', @sample_org, 'Quản trị viên tổ chức',
     'Quản trị toàn bộ tổ chức', CURRENT_TIMESTAMP(3), 'GENERAL'),
    ('33333333-3333-4333-8333-333333333002', @sample_org, 'Giáo vụ',
     'Quản lý lớp học và sinh viên', CURRENT_TIMESTAMP(3), 'GENERAL'),
    ('33333333-3333-4333-8333-333333333003', @sample_org, 'Giáo viên',
     'Giáo viên giảng dạy', CURRENT_TIMESTAMP(3), 'TEACHER'),
    ('33333333-3333-4333-8333-333333333004', @sample_org, 'Trưởng phòng ban',
     'Phê duyệt đóng lớp trong phòng ban', CURRENT_TIMESTAMP(3), 'GENERAL'),
    ('33333333-3333-4333-8333-333333333005', @sample_org, 'Nhân sự phòng ban',
     'Quản lý nhân sự trong phòng ban', CURRENT_TIMESTAMP(3), 'GENERAL'),
    ('33333333-3333-4333-8333-333333333006', @sample_org, 'Nhân viên cơ sở vật chất',
     'Quản lý cơ sở vật chất', CURRENT_TIMESTAMP(3), 'GENERAL'),
    ('33333333-3333-4333-8333-333333333007', @sample_org, 'Nhân viên',
     'Nhân viên chung', CURRENT_TIMESTAMP(3), 'GENERAL');

-- Prevents DefaultPositionSeeder from adding the remaining default positions.
INSERT IGNORE INTO position_seed (org_id, seeded_at) VALUES (@sample_org, CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO position_permission (position_id, permission_code) VALUES
    ('33333333-3333-4333-8333-333333333001', 'FACILITY_MANAGE'),
    ('33333333-3333-4333-8333-333333333001', 'SCHEDULE_CREATE'),
    ('33333333-3333-4333-8333-333333333001', 'SCHEDULE_VIEW'),
    ('33333333-3333-4333-8333-333333333001', 'PEOPLE_VIEW'),
    ('33333333-3333-4333-8333-333333333001', 'PEOPLE_EDIT'),
    ('33333333-3333-4333-8333-333333333001', 'STUDENT_VIEW'),
    ('33333333-3333-4333-8333-333333333001', 'STUDENT_CREATE'),
    ('33333333-3333-4333-8333-333333333001', 'STUDENT_EDIT'),
    ('33333333-3333-4333-8333-333333333001', 'STUDENT_DELETE'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_VIEW'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_CREATE'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_EDIT'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_DELETE'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_ASSIGN_TEACHER'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_CANCEL'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_CLOSE_REQUEST'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_CLOSE_APPROVE'),
    ('33333333-3333-4333-8333-333333333001', 'CLASS_REOPEN'),
    ('33333333-3333-4333-8333-333333333002', 'CLASS_VIEW'),
    ('33333333-3333-4333-8333-333333333002', 'CLASS_CREATE'),
    ('33333333-3333-4333-8333-333333333002', 'CLASS_EDIT'),
    ('33333333-3333-4333-8333-333333333002', 'CLASS_ASSIGN_TEACHER'),
    ('33333333-3333-4333-8333-333333333002', 'CLASS_CANCEL'),
    ('33333333-3333-4333-8333-333333333002', 'CLASS_CLOSE_REQUEST'),
    ('33333333-3333-4333-8333-333333333002', 'STUDENT_VIEW'),
    ('33333333-3333-4333-8333-333333333002', 'STUDENT_CREATE'),
    ('33333333-3333-4333-8333-333333333002', 'STUDENT_EDIT'),
    ('33333333-3333-4333-8333-333333333002', 'STUDENT_DELETE'),
    ('33333333-3333-4333-8333-333333333003', 'CLASS_VIEW'),
    ('33333333-3333-4333-8333-333333333003', 'STUDENT_VIEW'),
    ('33333333-3333-4333-8333-333333333003', 'SCHEDULE_VIEW'),
    ('33333333-3333-4333-8333-333333333004', 'CLASS_VIEW'),
    ('33333333-3333-4333-8333-333333333004', 'CLASS_CLOSE_APPROVE'),
    ('33333333-3333-4333-8333-333333333004', 'CLASS_REOPEN'),
    ('33333333-3333-4333-8333-333333333005', 'PEOPLE_VIEW'),
    ('33333333-3333-4333-8333-333333333005', 'PEOPLE_EDIT'),
    ('33333333-3333-4333-8333-333333333005', 'CLASS_VIEW'),
    ('33333333-3333-4333-8333-333333333005', 'STUDENT_VIEW'),
    ('33333333-3333-4333-8333-333333333005', 'SCHEDULE_VIEW'),
    ('33333333-3333-4333-8333-333333333006', 'FACILITY_MANAGE');

INSERT IGNORE INTO department (id, org_id, name, description, created_at) VALUES
    ('44444444-4444-4444-8444-444444444001', @sample_org, 'Tổ Toán – Tin',
     'Phòng ban mẫu cho Sprint 4', CURRENT_TIMESTAMP(3));

-- Module-gated permissions (CLASS_*, STUDENT_*) are only effective when the
-- department has the module enabled.
INSERT IGNORE INTO department_module (department_id, org_id, module_code) VALUES
    ('44444444-4444-4444-8444-444444444001', @sample_org, 'STUDENT_MANAGEMENT');

INSERT IGNORE INTO department_member
    (user_id, org_id, department_id, role, appointed_by, appointed_at, username) VALUES
    ('22222222-2222-4222-8222-222222222001', @sample_org,
     '44444444-4444-4444-8444-444444444001', 'OWNER',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3), 'sample_owner'),
    ('22222222-2222-4222-8222-222222222002', @sample_org,
     '44444444-4444-4444-8444-444444444001', 'MANAGER',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3), 'sample_hr'),
    ('22222222-2222-4222-8222-222222222003', @sample_org,
     '44444444-4444-4444-8444-444444444001', 'STAFF',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3), 'sample_academic'),
    ('22222222-2222-4222-8222-222222222004', @sample_org,
     '44444444-4444-4444-8444-444444444001', 'STAFF',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3), 'sample_head'),
    ('22222222-2222-4222-8222-222222222005', @sample_org,
     '44444444-4444-4444-8444-444444444001', 'STAFF',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3), 'sample_teacher'),
    ('22222222-2222-4222-8222-222222222006', @sample_org,
     '44444444-4444-4444-8444-444444444001', 'STAFF',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3), 'sample_teacher2');

INSERT IGNORE INTO member_position (user_id, position_id, org_id) VALUES
    ('22222222-2222-4222-8222-222222222001', '33333333-3333-4333-8333-333333333001', @sample_org),
    ('22222222-2222-4222-8222-222222222002', '33333333-3333-4333-8333-333333333005', @sample_org),
    ('22222222-2222-4222-8222-222222222003', '33333333-3333-4333-8333-333333333002', @sample_org),
    ('22222222-2222-4222-8222-222222222004', '33333333-3333-4333-8333-333333333004', @sample_org),
    ('22222222-2222-4222-8222-222222222005', '33333333-3333-4333-8333-333333333003', @sample_org),
    ('22222222-2222-4222-8222-222222222006', '33333333-3333-4333-8333-333333333003', @sample_org);

-- ---------------------------------------------------------------------------
-- People DB: staff/teacher profiles, specialties, subjects and classes
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO staff_profile
    (user_id, org_id, staff_code, full_name, full_name_unaccented, phone, email,
     version, created_by, created_at) VALUES
    ('22222222-2222-4222-8222-222222222001', @sample_org, 'OW001', 'Nguyễn Chủ Tịch',
     'nguyen chu tich', '0900000001', 'owner@sample-mems.example', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('22222222-2222-4222-8222-222222222002', @sample_org, 'NS001', 'Trần Nhân Sự',
     'tran nhan su', '0900000002', 'hr@sample-mems.example', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('22222222-2222-4222-8222-222222222003', @sample_org, 'GV002', 'Lê Giáo Vụ',
     'le giao vu', '0900000003', 'academic@sample-mems.example', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('22222222-2222-4222-8222-222222222004', @sample_org, 'TP001', 'Phạm Trưởng Phòng',
     'pham truong phong', '0900000004', 'head@sample-mems.example', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('22222222-2222-4222-8222-222222222005', @sample_org, 'GV001', 'Nguyễn Văn An',
     'nguyen van an', '0900000005', 'teacher@sample-mems.example', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('22222222-2222-4222-8222-222222222006', @sample_org, 'GV003', 'Trần Thị Bình',
     'tran thi binh', '0900000006', 'teacher2@sample-mems.example', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO teacher_profile
    (user_id, org_id, contract_type, teaching_status, version, created_by, created_at) VALUES
    ('22222222-2222-4222-8222-222222222005', @sample_org, 'CO_HUU', 'DANG_DAY', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('22222222-2222-4222-8222-222222222006', @sample_org, 'THINH_GIANG', 'TAM_NGHI', 0,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO specialty (id, org_id, name, name_unaccented, is_active, created_by, created_at) VALUES
    ('88888888-8888-4888-8888-888888888001', @sample_org, 'Toán', 'toan', TRUE,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('88888888-8888-4888-8888-888888888002', @sample_org, 'Vật lý', 'vat ly', TRUE,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('88888888-8888-4888-8888-888888888003', @sample_org, 'Tin học', 'tin hoc', TRUE,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO teacher_specialty (user_id, specialty_id, org_id) VALUES
    ('22222222-2222-4222-8222-222222222005', '88888888-8888-4888-8888-888888888001', @sample_org),
    ('22222222-2222-4222-8222-222222222006', '88888888-8888-4888-8888-888888888002', @sample_org);

INSERT IGNORE INTO subject (id, org_id, name, name_unaccented, is_active, created_by, created_at) VALUES
    ('99999999-9999-4999-8999-999999999001', @sample_org, 'Toán', 'toan', TRUE,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('99999999-9999-4999-8999-999999999002', @sample_org, 'Vật lý', 'vat ly', TRUE,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('99999999-9999-4999-8999-999999999003', @sample_org, 'Tin học', 'tin hoc', TRUE,
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3));

-- One class per lifecycle state, plus one CLOSED class.
INSERT IGNORE INTO school_class
    (id, org_id, class_code, name, academic_year, status, teacher_id, start_date, end_date,
     subject_id, version, close_state, created_by, created_at) VALUES
    ('55555555-5555-4555-8555-555555555001', @sample_org, 'C001', 'Lớp 10A', '2026-2027',
     'CHUA_BAT_DAU', NULL, DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 300 DAY),
     '99999999-9999-4999-8999-999999999001', 0, 'NONE',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('55555555-5555-4555-8555-555555555002', @sample_org, 'C002', 'Lớp 10B', '2026-2027',
     'DANG_DIEN_RA', '22222222-2222-4222-8222-222222222005',
     DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 60 DAY),
     '99999999-9999-4999-8999-999999999001', 0, 'NONE',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('55555555-5555-4555-8555-555555555003', @sample_org, 'C003', 'Lớp 11A', '2025-2026',
     'DA_KET_THUC', '22222222-2222-4222-8222-222222222006',
     DATE_SUB(CURDATE(), INTERVAL 300 DAY), DATE_SUB(CURDATE(), INTERVAL 60 DAY),
     '99999999-9999-4999-8999-999999999002', 0, 'NONE',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('55555555-5555-4555-8555-555555555004', @sample_org, 'C004', 'Lớp 11B', '2025-2026',
     'DA_HUY', '22222222-2222-4222-8222-222222222006',
     DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 60 DAY),
     '99999999-9999-4999-8999-999999999003', 0, 'NONE',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3)),
    ('55555555-5555-4555-8555-555555555005', @sample_org, 'C005', 'Lớp 12A', '2026-2027',
     'DANG_DIEN_RA', '22222222-2222-4222-8222-222222222005',
     DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 40 DAY),
     '99999999-9999-4999-8999-999999999001', 0, 'CLOSED',
     '22222222-2222-4222-8222-222222222001', CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO class_status_log
    (id, class_id, org_id, from_status, to_status, reason, changed_by, changed_at) VALUES
    ('66666666-6666-4666-8666-666666666001', '55555555-5555-4555-8555-555555555003', @sample_org,
     'DANG_DIEN_RA', 'DA_KET_THUC', 'AUTO_END', NULL, CURRENT_TIMESTAMP(3)),
    ('66666666-6666-4666-8666-666666666002', '55555555-5555-4555-8555-555555555004', @sample_org,
     'CHUA_BAT_DAU', 'DA_HUY', 'Trùng lịch khai giảng', '22222222-2222-4222-8222-222222222001',
     CURRENT_TIMESTAMP(3));

INSERT IGNORE INTO class_close_event
    (id, class_id, org_id, action, actor_id, reason, created_at) VALUES
    ('77777777-7777-4777-8777-777777777001', '55555555-5555-4555-8555-555555555005', @sample_org,
     'REQUESTED', '22222222-2222-4222-8222-222222222003', 'Đã hết khoá học', CURRENT_TIMESTAMP(3)),
    ('77777777-7777-4777-8777-777777777002', '55555555-5555-4555-8555-555555555005', @sample_org,
     'APPROVED', '22222222-2222-4222-8222-222222222004', NULL, CURRENT_TIMESTAMP(3));

-- Verification queries (run manually):
-- SELECT username, status FROM mems_identity_db.account WHERE org_id='11111111-1111-4111-8111-111111111111';
-- SELECT class_code, status, close_state, teacher_id FROM mems_people_db.school_class
--   WHERE org_id='11111111-1111-4111-8111-111111111111';
