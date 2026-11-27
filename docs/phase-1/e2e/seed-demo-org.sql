-- =====================================================================
-- MEMS - Du lieu mau XEP LICH TU DONG cho mot to chuc dang dung that
-- To chuc dich: DEMO (eff0ce1e-1234-4892-a9f7-031383a681a5), owner AnhSang
-- CHI chay tren MySQL local. Chi INSERT (va 2 UPDATE co guard NULL).
-- Idempotent: chay lai khong tao trung, khong ghi de du lieu nguoi dung.
-- Id tien to "d0000000-" de nhan dien va rollback (rollback-demo-org.sql).
-- =====================================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 0) Hang so
-- ---------------------------------------------------------------------
SET @org   := 'eff0ce1e-1234-4892-a9f7-031383a681a5';
SET @dept  := '965f9d17-8c11-4191-8579-0e617875100e'; -- phong CNTT
SET @owner := 'b3bd1fe9-b739-42c2-9b04-86bd35ab1846'; -- account AnhSang
SET @pwd   := (SELECT password_hash FROM mems_identity_db.account WHERE id = @owner);

-- Danh muc mon
SET @catToan  := 'd0000000-cccc-4ccc-8ccc-000000000001';
SET @catLapTrinh := 'd0000000-cccc-4ccc-8ccc-000000000002';
SET @catCSDL  := 'd0000000-cccc-4ccc-8ccc-000000000003';
SET @catMang  := 'd0000000-cccc-4ccc-8ccc-000000000004';
SET @catNgoaiNgu := 'd0000000-cccc-4ccc-8ccc-000000000005';
SET @catAI    := 'd0000000-cccc-4ccc-8ccc-000000000006';
SET @catTin   := 'd0000000-cccc-4ccc-8ccc-000000000007';

-- Chuyen mon
SET @spToan := 'd0000000-7777-4777-8777-000000000001';
SET @spLapTrinh := 'd0000000-7777-4777-8777-000000000002';
SET @spCSDL := 'd0000000-7777-4777-8777-000000000003';
SET @spMang := 'd0000000-7777-4777-8777-000000000004';
SET @spTin  := 'd0000000-7777-4777-8777-000000000005';

-- Giao vien demo
SET @gv1 := 'd0000000-aaaa-4aaa-8aaa-000000000011';
SET @gv2 := 'd0000000-aaaa-4aaa-8aaa-000000000012';
SET @gv3 := 'd0000000-aaaa-4aaa-8aaa-000000000013';
SET @gv4 := 'd0000000-aaaa-4aaa-8aaa-000000000014';

-- Lop demo
SET @cls1 := 'd0000000-bbbb-4bbb-8bbb-000000000001'; -- XLDEMO1
SET @cls2 := 'd0000000-bbbb-4bbb-8bbb-000000000002'; -- XLDEMO2

-- Mon demo co yeu cau phong may
SET @sTinDemo := 'd0000000-5555-4555-8555-000000000001';

-- =====================================================================
-- 1) DANH MUC MON (org-level)
-- =====================================================================
INSERT INTO mems_people_db.subject_category(id, org_id, name, name_unaccented, is_active, created_by, created_at)
VALUES
 (@catToan     , @org, 'Toán'             , 'Toan'             , 1, @owner, NOW(3)),
 (@catLapTrinh, @org, 'Lập trình'         , 'Lap trinh'        , 1, @owner, NOW(3)),
 (@catCSDL     , @org, 'Cơ sở dữ liệu'    , 'Co so du lieu'    , 1, @owner, NOW(3)),
 (@catMang     , @org, 'Mạng & Hệ thống'  , 'Mang & He thong'  , 1, @owner, NOW(3)),
 (@catNgoaiNgu , @org, 'Ngoại ngữ'        , 'Ngoai ngu'        , 1, @owner, NOW(3)),
 (@catAI       , @org, 'Trí tuệ nhân tạo' , 'Tri tue nhan tao' , 1, @owner, NOW(3)),
 (@catTin      , @org, 'Tin học'          , 'Tin hoc'          , 1, @owner, NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), name_unaccented = VALUES(name_unaccented), is_active = 1;

-- Gan danh muc cho 13 mon san co (chi khi con NULL - khong ghi de)
UPDATE mems_people_db.subject SET category_id=@catToan,      updated_at=NOW(3)
 WHERE org_id=@org AND code='MATH101'      AND category_id IS NULL;
UPDATE mems_people_db.subject SET category_id=@catLapTrinh, updated_at=NOW(3)
 WHERE org_id=@org AND code IN ('JAVA','JAVA_AV','PYTHON','WEB_DEV','MOBILE','DATA_STRUCT') AND category_id IS NULL;
UPDATE mems_people_db.subject SET category_id=@catCSDL,      updated_at=NOW(3)
 WHERE org_id=@org AND code='DATABASE'     AND category_id IS NULL;
UPDATE mems_people_db.subject SET category_id=@catMang,      updated_at=NOW(3)
 WHERE org_id=@org AND code IN ('NETWORKING','DEVOPS','CYBER_SEC') AND category_id IS NULL;
UPDATE mems_people_db.subject SET category_id=@catNgoaiNgu,  updated_at=NOW(3)
 WHERE org_id=@org AND code='ENGLISH_IT'   AND category_id IS NULL;
UPDATE mems_people_db.subject SET category_id=@catAI,        updated_at=NOW(3)
 WHERE org_id=@org AND code='AI_ML'        AND category_id IS NULL;

-- Mon demo bat buoc phong may (de test ROOM_TYPE_MISMATCH / goi y phong may)
INSERT INTO mems_people_db.subject(id, org_id, code, name, name_unaccented, description,
                                   is_active, created_by, created_at, category_id, room_requirement)
VALUES (@sTinDemo, @org, 'TINHOC', 'Tin học văn phòng', 'Tin hoc van phong',
        'Mon demo: bat buoc phong may', 1, @owner, NOW(3), @catTin, 'COMPUTER')
ON DUPLICATE KEY UPDATE name=VALUES(name), name_unaccented=VALUES(name_unaccented),
                        category_id=VALUES(category_id), room_requirement='COMPUTER', is_active=1;

-- =====================================================================
-- 2) CHUYEN MON + gan danh muc
-- =====================================================================
INSERT INTO mems_people_db.specialty(id, org_id, name, name_unaccented, is_active, created_by, created_at, category_id)
VALUES
 (@spToan     , @org, 'Chuyên Toán'        , 'Chuyen Toan'    , 1, @owner, NOW(3), @catToan),
 (@spLapTrinh , @org, 'Chuyên Lập trình'   , 'Chuyen Lap trinh', 1, @owner, NOW(3), @catLapTrinh),
 (@spCSDL     , @org, 'Chuyên CSDL'        , 'Chuyen CSDL'    , 1, @owner, NOW(3), @catCSDL),
 (@spMang     , @org, 'Chuyên Mạng'        , 'Chuyen Mang'    , 1, @owner, NOW(3), @catMang),
 (@spTin      , @org, 'Chuyên Tin'         , 'Chuyen Tin'     , 1, @owner, NOW(3), @catTin)
ON DUPLICATE KEY UPDATE name=VALUES(name), name_unaccented=VALUES(name_unaccented),
                        category_id=VALUES(category_id), is_active=1;

-- Chuyen mon "English" san co: gan danh muc Ngoai ngu (chi khi con NULL)
UPDATE mems_people_db.specialty SET category_id=@catNgoaiNgu
 WHERE org_id=@org AND name_unaccented='English' AND category_id IS NULL;

-- =====================================================================
-- 3) TAI KHOAN + HO SO GIAO VIEN DEMO (mat khau = cua AnhSang)
-- =====================================================================
INSERT INTO mems_identity_db.account(id, org_id, username, email, password_hash, status, created_at, updated_at)
VALUES
 (@gv1, @org, 'demo_gv1', 'demo_gv1@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gv2, @org, 'demo_gv2', 'demo_gv2@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gv3, @org, 'demo_gv3', 'demo_gv3@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gv4, @org, 'demo_gv4', 'demo_gv4@demo.local', @pwd, 'active', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE org_id=VALUES(org_id), email=VALUES(email),
                        password_hash=VALUES(password_hash), status='active', updated_at=NOW(3);

INSERT IGNORE INTO mems_identity_db.account_role(account_id, role_id)
SELECT t.uid, r.id
  FROM (SELECT @gv1 AS uid UNION ALL SELECT @gv2 UNION ALL SELECT @gv3 UNION ALL SELECT @gv4) t
  JOIN mems_identity_db.role r ON r.code='TEACHER';

-- department_member phai co truoc staff_profile (FK fk_staff_profile_member)
INSERT INTO mems_people_db.department_member(user_id, org_id, department_id, role,
                                             appointed_by, appointed_at, username, status)
VALUES
 (@gv1, @org, @dept, 'STAFF', @owner, NOW(3), 'demo_gv1', 'ACTIVE'),
 (@gv2, @org, @dept, 'STAFF', @owner, NOW(3), 'demo_gv2', 'ACTIVE'),
 (@gv3, @org, @dept, 'STAFF', @owner, NOW(3), 'demo_gv3', 'ACTIVE'),
 (@gv4, @org, @dept, 'STAFF', @owner, NOW(3), 'demo_gv4', 'ACTIVE')
ON DUPLICATE KEY UPDATE department_id=VALUES(department_id), role='STAFF', status='ACTIVE';

INSERT INTO mems_people_db.staff_profile(user_id, org_id, staff_code, full_name, full_name_unaccented,
                                         phone, email, version, created_by, created_at)
VALUES
 (@gv1, @org, 'DEMO-GV1', 'Giáo viên Demo 1', 'Giao vien Demo 1', NULL, 'demo_gv1@demo.local', 0, @owner, NOW(3)),
 (@gv2, @org, 'DEMO-GV2', 'Giáo viên Demo 2', 'Giao vien Demo 2', NULL, 'demo_gv2@demo.local', 0, @owner, NOW(3)),
 (@gv3, @org, 'DEMO-GV3', 'Giáo viên Demo 3', 'Giao vien Demo 3', NULL, 'demo_gv3@demo.local', 0, @owner, NOW(3)),
 (@gv4, @org, 'DEMO-GV4', 'Giáo viên Demo 4', 'Giao vien Demo 4', NULL, 'demo_gv4@demo.local', 0, @owner, NOW(3))
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), full_name_unaccented=VALUES(full_name_unaccented),
                        email=VALUES(email);

INSERT INTO mems_people_db.teacher_profile(user_id, org_id, contract_type, teaching_status, version, created_by, created_at)
VALUES
 (@gv1, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gv2, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gv3, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gv4, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3))
ON DUPLICATE KEY UPDATE teaching_status='DANG_DAY', contract_type='CO_HUU';

-- Gan chuyen mon de du dieu kien D1 (cung danh muc voi mon)
INSERT IGNORE INTO mems_people_db.teacher_specialty(user_id, specialty_id, org_id) VALUES
 (@gv1, @spToan    , @org),
 (@gv2, @spLapTrinh, @org),
 (@gv3, @spCSDL    , @org),
 (@gv3, @spTin     , @org),
 (@gv4, @spMang    , @org);

-- =====================================================================
-- 4) TIET HOC (org-level) - bo qua row da co cung period_no
-- =====================================================================
INSERT INTO mems_schedule_db.time_slot(id, org_id, period_no, name, start_time, end_time, joins_next, is_active)
VALUES
 ('d0000000-8888-4888-8888-000000000001', @org, 1, 'Tiết 1', '07:30:00', '08:15:00', 1, 1),
 ('d0000000-8888-4888-8888-000000000002', @org, 2, 'Tiết 2', '08:15:00', '09:00:00', 0, 1),
 ('d0000000-8888-4888-8888-000000000003', @org, 3, 'Tiết 3', '09:15:00', '10:00:00', 1, 1),
 ('d0000000-8888-4888-8888-000000000004', @org, 4, 'Tiết 4', '10:00:00', '10:45:00', 0, 1),
 ('d0000000-8888-4888-8888-000000000005', @org, 5, 'Tiết 5', '10:55:00', '11:40:00', 1, 1),
 ('d0000000-8888-4888-8888-000000000006', @org, 6, 'Tiết 6', '11:40:00', '12:25:00', 0, 1)
ON DUPLICATE KEY UPDATE start_time=VALUES(start_time), end_time=VALUES(end_time),
                        joins_next=VALUES(joins_next), is_active=1;

-- =====================================================================
-- 5) LOP DEMO + HOC SINH DEMO
-- =====================================================================
SET @sMath := (SELECT id FROM mems_people_db.subject WHERE org_id=@org AND code='MATH101');
SET @sJava := (SELECT id FROM mems_people_db.subject WHERE org_id=@org AND code='JAVA');
SET @sDb   := (SELECT id FROM mems_people_db.subject WHERE org_id=@org AND code='DATABASE');
SET @sNet  := (SELECT id FROM mems_people_db.subject WHERE org_id=@org AND code='NETWORKING');
SET @sPy   := (SELECT id FROM mems_people_db.subject WHERE org_id=@org AND code='PYTHON');

INSERT INTO mems_people_db.school_class
 (id, org_id, class_code, name, academic_year, status, created_by, created_at,
  start_date, end_date, subject_id, version, close_state, cancel_state, needs_reassignment, teacher_id)
VALUES
 (@cls1, @org, 'XLDEMO1', 'Lớp Demo Xếp lịch 1', '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3),
  '2026-12-01', '2027-01-31', @sMath, 0, 'NONE', 'NONE', 0, @gv1),
 (@cls2, @org, 'XLDEMO2', 'Lớp Demo Xếp lịch 2', '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3),
  '2026-12-01', '2027-01-31', @sTinDemo, 0, 'NONE', 'NONE', 0, @gv3)
ON DUPLICATE KEY UPDATE status='DANG_DIEN_RA', start_date=VALUES(start_date), end_date=VALUES(end_date),
                        subject_id=VALUES(subject_id), teacher_id=VALUES(teacher_id),
                        close_state='NONE', cancel_state='NONE';

-- Hoc sinh demo: 01-10 vao XLDEMO1, 11-20 vao XLDEMO2
INSERT IGNORE INTO mems_people_db.student(id, org_id, student_code, full_name, date_of_birth, status, created_by, created_at)
SELECT CONCAT('d0000000-9999-4999-8999-', LPAD(n, 12, '0')), @org,
       CONCAT('DEMOHS', LPAD(n, 2, '0')), CONCAT('Học sinh Demo ', LPAD(n, 2, '0')),
       '2007-05-01', 'active', @owner, NOW(3)
  FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 20) SELECT n FROM seq) s;

INSERT IGNORE INTO mems_people_db.class_student(class_id, student_id, org_id, enrolled_at)
SELECT CASE WHEN n <= 10 THEN @cls1 ELSE @cls2 END,
       CONCAT('d0000000-9999-4999-8999-', LPAD(n, 12, '0')),
       @org, NOW(3)
  FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 20) SELECT n FROM seq) s;

-- Chuong trinh mon cua 2 lop demo (sessions_per_week bat buoc cho solver)
INSERT INTO mems_people_db.class_subject
 (class_id, subject_id, source, planned_sessions, session_minutes, sessions_per_week,
  stage_no, teacher_id, is_primary, status, created_at)
VALUES
 (@cls1, @sMath   , 'MANUAL', 8, 90, 1, 1, @gv1, 1, 'PLANNED', NOW(3)),
 (@cls1, @sJava   , 'MANUAL', 8, 90, 2, 1, @gv2, 0, 'PLANNED', NOW(3)),
 (@cls1, @sDb     , 'MANUAL', 8, 90, 1, 1, @gv3, 0, 'PLANNED', NOW(3)),
 (@cls2, @sTinDemo, 'MANUAL', 8, 90, 1, 1, @gv3, 1, 'PLANNED', NOW(3)),
 (@cls2, @sNet    , 'MANUAL', 8, 90, 2, 1, @gv4, 0, 'PLANNED', NOW(3)),
 (@cls2, @sPy     , 'MANUAL', 8, 90, 1, 1, @gv2, 0, 'PLANNED', NOW(3))
ON DUPLICATE KEY UPDATE planned_sessions=VALUES(planned_sessions), session_minutes=VALUES(session_minutes),
                        sessions_per_week=VALUES(sessions_per_week), stage_no=VALUES(stage_no),
                        teacher_id=VALUES(teacher_id), is_primary=VALUES(is_primary), status='PLANNED';

-- =====================================================================
-- 6) LOP MIRROR ben Schedule (session FK -> class.id)
-- =====================================================================
INSERT INTO mems_schedule_db.class(id, org_id, code, name, subject, max_size, start_date, end_date, status)
VALUES
 (@cls1, @org, 'XLDEMO1', 'Lớp Demo Xếp lịch 1', 'MATH101', 40, '2026-12-01', '2027-01-31', 'ongoing'),
 (@cls2, @org, 'XLDEMO2', 'Lớp Demo Xếp lịch 2', 'TINHOC' , 40, '2026-12-01', '2027-01-31', 'ongoing')
ON DUPLICATE KEY UPDATE name=VALUES(name), start_date=VALUES(start_date), end_date=VALUES(end_date),
                        status='ongoing';

-- =====================================================================
-- 7) Kiem tra nhanh
-- =====================================================================
SELECT 'subject_category.demo' AS entity, COUNT(*) AS n FROM mems_people_db.subject_category WHERE id LIKE 'd0000000-cccc-%'
UNION ALL SELECT 'subject.co_danh_muc (13 cu)', COUNT(*) FROM mems_people_db.subject WHERE org_id=@org AND category_id IS NOT NULL
UNION ALL SELECT 'specialty.demo',        COUNT(*) FROM mems_people_db.specialty WHERE id LIKE 'd0000000-7777-%'
UNION ALL SELECT 'account.demo_gv',       COUNT(*) FROM mems_identity_db.account WHERE username LIKE 'demo_gv%'
UNION ALL SELECT 'teacher_profile.demo',  COUNT(*) FROM mems_people_db.teacher_profile WHERE user_id LIKE 'd0000000-aaaa-%'
UNION ALL SELECT 'time_slot.org',         COUNT(*) FROM mems_schedule_db.time_slot WHERE org_id=@org
UNION ALL SELECT 'school_class.demo',     COUNT(*) FROM mems_people_db.school_class WHERE id LIKE 'd0000000-bbbb-%'
UNION ALL SELECT 'student.demo',          COUNT(*) FROM mems_people_db.student WHERE id LIKE 'd0000000-9999-%'
UNION ALL SELECT 'class_student.demo',    COUNT(*) FROM mems_people_db.class_student WHERE class_id LIKE 'd0000000-bbbb-%'
UNION ALL SELECT 'class_subject.demo',    COUNT(*) FROM mems_people_db.class_subject WHERE class_id LIKE 'd0000000-bbbb-%'
UNION ALL SELECT 'schedule.class_mirror', COUNT(*) FROM mems_schedule_db.class WHERE id LIKE 'd0000000-bbbb-%';