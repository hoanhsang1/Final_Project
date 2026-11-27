-- =====================================================================
-- MEMS - Bo du lieu mau "mot truong hoc that" cho to chuc DEMO
-- To chuc dich: DEMO (eff0ce1e-1234-4892-a9f7-031383a681a5), owner AnhSang
-- CHI chay tren MySQL local. Idempotent: chay lai khong tao trung.
-- Id tien to "d1000000-" de nhan dien va rollback (rollback-school-dataset.sql).
--
-- Noi dung: 2 khoa moi (Ngoai ngu, Khoa hoc co ban), 2 danh muc mon,
-- 4 chuyen mon, 5 giao vien, 12 mon, 3 chuong trinh dao tao, 10 lop,
-- 300 sinh vien, 7 phong hoc, 4 tiet chieu.
-- =====================================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 0) Hang so
-- ---------------------------------------------------------------------
SET @org   := 'eff0ce1e-1234-4892-a9f7-031383a681a5';
SET @owner := 'b3bd1fe9-b739-42c2-9b04-86bd35ab1846'; -- account AnhSang
SET @deptCNTT := '965f9d17-8c11-4191-8579-0e617875100e';
SET @deptTC   := '5fe4ae08-a058-4196-ba8c-a7c75cf115fb';
SET @pwd   := (SELECT password_hash FROM mems_identity_db.account WHERE id = @owner);

-- Danh muc mon san co (tu seed-demo-org.sql)
SET @catToan   := 'd0000000-cccc-4ccc-8ccc-000000000001';
SET @catLT     := 'd0000000-cccc-4ccc-8ccc-000000000002';
SET @catCSDL   := 'd0000000-cccc-4ccc-8ccc-000000000003';
SET @catMang   := 'd0000000-cccc-4ccc-8ccc-000000000004';
SET @catNN     := 'd0000000-cccc-4ccc-8ccc-000000000005';

-- Danh muc moi
SET @catKT := 'd1000000-cccc-4ccc-8ccc-000000000001'; -- Kinh te - Tai chinh
SET @catXH := 'd1000000-cccc-4ccc-8ccc-000000000002'; -- Khoa hoc xa hoi

-- Khoa moi
SET @deptNN := 'd1000000-dddd-4ddd-8ddd-000000000001'; -- Khoa Ngoai ngu
SET @deptCB := 'd1000000-dddd-4ddd-8ddd-000000000002'; -- Khoa Khoa hoc co ban

-- Chuyen mon moi
SET @spTC  := 'd1000000-7777-4777-8777-000000000001'; -- Tai chinh - Ngan hang
SET @spKT  := 'd1000000-7777-4777-8777-000000000002'; -- Ke toan
SET @spNNA := 'd1000000-7777-4777-8777-000000000003'; -- Ngon ngu Anh
SET @spGD  := 'd1000000-7777-4777-8777-000000000004'; -- Giao duc chinh tri

-- Giao vien moi (mat khau = cua AnhSang)
SET @gvTC1 := 'd1000000-aaaa-4aaa-8aaa-000000000001'; -- Tran Quoc Hung
SET @gvTC2 := 'd1000000-aaaa-4aaa-8aaa-000000000002'; -- Le Thi Mai
SET @gvNN1 := 'd1000000-aaaa-4aaa-8aaa-000000000003'; -- Nguyen Thu Ha
SET @gvNN2 := 'd1000000-aaaa-4aaa-8aaa-000000000004'; -- Do Minh Tuan
SET @gvXH  := 'd1000000-aaaa-4aaa-8aaa-000000000005'; -- Pham Van Hoa

-- Giao vien demo san co (dung lam chu nhiem / giang day môn CNTT)
SET @tToan := 'd0000000-aaaa-4aaa-8aaa-000000000011';
SET @tLT   := 'd0000000-aaaa-4aaa-8aaa-000000000012';
SET @tCSDL := 'd0000000-aaaa-4aaa-8aaa-000000000013';
SET @tMang := 'd0000000-aaaa-4aaa-8aaa-000000000014';
SET @tGV002 := 'd95c9717-de4c-4a8d-9532-5a84d5d6714e';
SET @tGV003 := 'cda2940f-1b2e-4e8e-970a-89d41494017a';
SET @tGV004 := '1a76dae2-d488-4014-83fa-cc48f9b56e99';
SET @tGV006 := 'bcb36886-7353-4d93-a4e3-17157354726f';
SET @tGV007 := 'abd63224-d494-48a6-a14a-993db2c3338c';

-- Chuong trinh dao tao moi
SET @curCNTT := 'd1000000-6666-4666-8666-000000000001';
SET @curTC   := 'd1000000-6666-4666-8666-000000000002';
SET @curNN   := 'd1000000-6666-4666-8666-000000000003';

-- Lop moi
SET @c01 := 'd1000000-bbbb-4bbb-8bbb-000000000001'; -- CNTT-K27A
SET @c02 := 'd1000000-bbbb-4bbb-8bbb-000000000002'; -- CNTT-K27B
SET @c03 := 'd1000000-bbbb-4bbb-8bbb-000000000003'; -- CNTT-K26A
SET @c04 := 'd1000000-bbbb-4bbb-8bbb-000000000004'; -- KTPM-K26A
SET @c05 := 'd1000000-bbbb-4bbb-8bbb-000000000005'; -- HTTT-K27A
SET @c06 := 'd1000000-bbbb-4bbb-8bbb-000000000006'; -- TCNH-K27A
SET @c07 := 'd1000000-bbbb-4bbb-8bbb-000000000007'; -- TCNH-K27B
SET @c08 := 'd1000000-bbbb-4bbb-8bbb-000000000008'; -- MKT-K27A
SET @c09 := 'd1000000-bbbb-4bbb-8bbb-000000000009'; -- NNA-K27A
SET @c10 := 'd1000000-bbbb-4bbb-8bbb-000000000010'; -- NNA-K27B

-- =====================================================================
-- 1) KHOA + DANH MUC MON
-- =====================================================================
INSERT INTO mems_people_db.department(id, org_id, name, description, created_at)
VALUES
 (@deptNN, @org, 'Khoa Ngoại ngữ', 'Đào tạo ngôn ngữ Anh, Nhật cho toàn trường', NOW(3)),
 (@deptCB, @org, 'Khoa Khoa học cơ bản', 'Toán, chính trị, kỹ năng nền tảng', NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO mems_people_db.subject_category(id, org_id, name, name_unaccented, is_active, created_by, created_at)
VALUES
 (@catKT, @org, 'Kinh tế - Tài chính', 'Kinh te - Tai chinh', 1, @owner, NOW(3)),
 (@catXH, @org, 'Khoa học xã hội', 'Khoa hoc xa hoi', 1, @owner, NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), name_unaccented = VALUES(name_unaccented), is_active = 1;

INSERT INTO mems_people_db.specialty(id, org_id, name, name_unaccented, is_active, created_by, created_at, category_id)
VALUES
 (@spTC , @org, 'Tài chính - Ngân hàng', 'Tai chinh - Ngan hang', 1, @owner, NOW(3), @catKT),
 (@spKT , @org, 'Kế toán', 'Ke toan', 1, @owner, NOW(3), @catKT),
 (@spNNA, @org, 'Ngôn ngữ Anh', 'Ngon ngu Anh', 1, @owner, NOW(3), @catNN),
 (@spGD , @org, 'Giáo dục chính trị', 'Giao duc chinh tri', 1, @owner, NOW(3), @catXH)
ON DUPLICATE KEY UPDATE name = VALUES(name), name_unaccented = VALUES(name_unaccented),
                        category_id = VALUES(category_id), is_active = 1;

-- =====================================================================
-- 2) MON HOC MOI (12 mon)
-- =====================================================================
INSERT INTO mems_people_db.subject(id, org_id, code, name, name_unaccented, description,
                                   is_active, created_by, created_at, category_id, room_requirement)
VALUES
 ('d1000000-5555-4555-8555-000000000001', @org, 'DB_NC'      , 'Cơ sở dữ liệu nâng cao'      , 'Co so du lieu nang cao'     , NULL, 1, @owner, NOW(3), @catCSDL, 'ANY'),
 ('d1000000-5555-4555-8555-000000000002', @org, 'TH_CSDL'    , 'Thực hành Cơ sở dữ liệu'     , 'Thuc hanh Co so du lieu'    , NULL, 1, @owner, NOW(3), @catCSDL, 'COMPUTER'),
 ('d1000000-5555-4555-8555-000000000003', @org, 'KTMT'       , 'Kiến trúc máy tính'          , 'Kien truc may tinh'         , NULL, 1, @owner, NOW(3), @catMang, 'ANY'),
 ('d1000000-5555-4555-8555-000000000004', @org, 'TH_MMT'     , 'Thực hành Mạng máy tính'     , 'Thuc hanh Mang may tinh'    , NULL, 1, @owner, NOW(3), @catMang, 'COMPUTER'),
 ('d1000000-5555-4555-8555-000000000005', @org, 'XACSUAT'    , 'Xác suất thống kê'           , 'Xac suat thong ke'          , NULL, 1, @owner, NOW(3), @catToan, 'ANY'),
 ('d1000000-5555-4555-8555-000000000006', @org, 'DAI_SO'     , 'Đại số tuyến tính'           , 'Dai so tuyen tinh'          , NULL, 1, @owner, NOW(3), @catToan, 'ANY'),
 ('d1000000-5555-4555-8555-000000000007', @org, 'TRIET'      , 'Triết học Mác - Lênin'       , 'Triet hoc Mac - Lenin'      , NULL, 1, @owner, NOW(3), @catXH  , 'ANY'),
 ('d1000000-5555-4555-8555-000000000008', @org, 'TTHCM'      , 'Tư tưởng Hồ Chí Minh'        , 'Tu tuong Ho Chi Minh'       , NULL, 1, @owner, NOW(3), @catXH  , 'ANY'),
 ('d1000000-5555-4555-8555-000000000009', @org, 'ANH_VP'     , 'Tiếng Anh giao tiếp'         , 'Tieng Anh giao tiep'        , NULL, 1, @owner, NOW(3), @catNN  , 'ANY'),
 ('d1000000-5555-4555-8555-000000000010', @org, 'TIENG_NHAT' , 'Tiếng Nhật cơ bản'           , 'Tieng Nhat co ban'          , NULL, 1, @owner, NOW(3), @catNN  , 'ANY'),
 ('d1000000-5555-4555-8555-000000000011', @org, 'KETOAN'     , 'Nguyên lý kế toán'           , 'Nguyen ly ke toan'          , NULL, 1, @owner, NOW(3), @catKT  , 'ANY'),
 ('d1000000-5555-4555-8555-000000000012', @org, 'TCNH'       , 'Tài chính - Ngân hàng căn bản', 'Tai chinh - Ngan hang can ban', NULL, 1, @owner, NOW(3), @catKT, 'ANY')
ON DUPLICATE KEY UPDATE name = VALUES(name), name_unaccented = VALUES(name_unaccented),
                        category_id = VALUES(category_id), room_requirement = VALUES(room_requirement),
                        is_active = 1, updated_at = NOW(3);

-- =====================================================================
-- 3) TAI KHOAN + HO SO 5 GIAO VIEN MOI
-- =====================================================================
INSERT INTO mems_identity_db.account(id, org_id, username, email, password_hash, status, created_at, updated_at)
VALUES
 (@gvTC1, @org, 'gv_tc1', 'gv_tc1@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gvTC2, @org, 'gv_tc2', 'gv_tc2@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gvNN1, @org, 'gv_nn1', 'gv_nn1@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gvNN2, @org, 'gv_nn2', 'gv_nn2@demo.local', @pwd, 'active', NOW(3), NOW(3)),
 (@gvXH , @org, 'gv_xh1', 'gv_xh1@demo.local', @pwd, 'active', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE org_id = VALUES(org_id), email = VALUES(email),
                        password_hash = VALUES(password_hash), status = 'active', updated_at = NOW(3);

INSERT IGNORE INTO mems_identity_db.account_role(account_id, role_id)
SELECT t.uid, r.id
  FROM (SELECT @gvTC1 AS uid UNION ALL SELECT @gvTC2 UNION ALL SELECT @gvNN1
        UNION ALL SELECT @gvNN2 UNION ALL SELECT @gvXH) t
  JOIN mems_identity_db.role r ON r.code = 'TEACHER';

INSERT INTO mems_people_db.department_member(user_id, org_id, department_id, role,
                                             appointed_by, appointed_at, username, status)
VALUES
 (@gvTC1, @org, @deptTC, 'STAFF', @owner, NOW(3), 'gv_tc1', 'ACTIVE'),
 (@gvTC2, @org, @deptTC, 'STAFF', @owner, NOW(3), 'gv_tc2', 'ACTIVE'),
 (@gvNN1, @org, @deptNN, 'STAFF', @owner, NOW(3), 'gv_nn1', 'ACTIVE'),
 (@gvNN2, @org, @deptNN, 'STAFF', @owner, NOW(3), 'gv_nn2', 'ACTIVE'),
 (@gvXH , @org, @deptCB, 'STAFF', @owner, NOW(3), 'gv_xh1', 'ACTIVE')
ON DUPLICATE KEY UPDATE department_id = VALUES(department_id), role = 'STAFF', status = 'ACTIVE';

INSERT INTO mems_people_db.staff_profile(user_id, org_id, staff_code, full_name, full_name_unaccented,
                                         phone, email, version, created_by, created_at)
VALUES
 (@gvTC1, @org, 'GV101', 'Trần Quốc Hưng', 'Tran Quoc Hung', NULL, 'gv_tc1@demo.local', 0, @owner, NOW(3)),
 (@gvTC2, @org, 'GV102', 'Lê Thị Mai'    , 'Le Thi Mai'    , NULL, 'gv_tc2@demo.local', 0, @owner, NOW(3)),
 (@gvNN1, @org, 'GV103', 'Nguyễn Thu Hà' , 'Nguyen Thu Ha' , NULL, 'gv_nn1@demo.local', 0, @owner, NOW(3)),
 (@gvNN2, @org, 'GV104', 'Đỗ Minh Tuấn'  , 'Do Minh Tuan'  , NULL, 'gv_nn2@demo.local', 0, @owner, NOW(3)),
 (@gvXH , @org, 'GV105', 'Phạm Văn Hòa'  , 'Pham Van Hoa'  , NULL, 'gv_xh1@demo.local', 0, @owner, NOW(3))
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), full_name_unaccented = VALUES(full_name_unaccented),
                        email = VALUES(email);

INSERT INTO mems_people_db.teacher_profile(user_id, org_id, contract_type, teaching_status, version, created_by, created_at)
VALUES
 (@gvTC1, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gvTC2, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gvNN1, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gvNN2, @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3)),
 (@gvXH , @org, 'CO_HUU', 'DANG_DAY', 0, @owner, NOW(3))
ON DUPLICATE KEY UPDATE teaching_status = 'DANG_DAY', contract_type = 'CO_HUU';

INSERT IGNORE INTO mems_people_db.teacher_specialty(user_id, specialty_id, org_id) VALUES
 (@gvTC1, @spTC , @org),
 (@gvTC2, @spKT , @org),
 (@gvNN1, @spNNA, @org),
 (@gvNN2, @spNNA, @org),
 (@gvXH , @spGD , @org);

-- =====================================================================
-- 4) CHUONG TRINH DAO TAO MOI
-- =====================================================================
INSERT INTO mems_people_db.curriculum(id, org_id, code, name, description, grade_level, major_code,
                                      is_active, version, created_by, created_at)
VALUES
 (@curCNTT, @org, 'CTDT-CNTT-K27', 'Chương trình Công nghệ thông tin K27',
  'Học kỳ 1 khóa K27: lập trình, CSDL, mạng, chính trị', 'Cao đẳng', 'CNTT', 1, 0, @owner, NOW(3)),
 (@curTC  , @org, 'CTDT-TCNH-K27', 'Chương trình Tài chính - Ngân hàng K27',
  'Học kỳ 1 khóa K27: kế toán, tài chính, toán, ngoại ngữ', 'Cao đẳng', 'TCNH', 1, 0, @owner, NOW(3)),
 (@curNN  , @org, 'CTDT-NNA-K27' , 'Chương trình Ngôn ngữ Anh K27',
  'Học kỳ 1 khóa K27: tiếng Anh, tiếng Nhật, đại cương', 'Cao đẳng', 'NNA', 1, 0, @owner, NOW(3))
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description),
                        grade_level = VALUES(grade_level), major_code = VALUES(major_code), is_active = 1;

INSERT INTO mems_people_db.curriculum_subject(curriculum_id, subject_id, sequence_no, required_sessions,
                                              session_minutes, theory_hours, practice_hours, is_required,
                                              notes, sessions_per_week)
SELECT x.cur, s.id, x.seq, x.spw * 12, 90, NULL, NULL, 1, NULL, x.spw
  FROM (
    SELECT @curCNTT AS cur, 'JAVA'       AS code, 1 AS seq, 2 AS spw UNION ALL
    SELECT @curCNTT, 'DATABASE'   , 2, 1 UNION ALL
    SELECT @curCNTT, 'DATA_STRUCT', 3, 1 UNION ALL
    SELECT @curCNTT, 'NETWORKING' , 4, 1 UNION ALL
    SELECT @curCNTT, 'ENGLISH_IT' , 5, 1 UNION ALL
    SELECT @curCNTT, 'TRIET'      , 6, 1 UNION ALL
    SELECT @curTC  , 'KETOAN'     , 1, 2 UNION ALL
    SELECT @curTC  , 'TCNH'       , 2, 2 UNION ALL
    SELECT @curTC  , 'XACSUAT'    , 3, 1 UNION ALL
    SELECT @curTC  , 'ANH_VP'     , 4, 2 UNION ALL
    SELECT @curTC  , 'TRIET'      , 5, 1 UNION ALL
    SELECT @curNN  , 'ANH_VP'     , 1, 3 UNION ALL
    SELECT @curNN  , 'ENGLISH_IT' , 2, 2 UNION ALL
    SELECT @curNN  , 'TIENG_NHAT' , 3, 1 UNION ALL
    SELECT @curNN  , 'TRIET'      , 4, 1 UNION ALL
    SELECT @curNN  , 'TTHCM'      , 5, 1
  ) x
  JOIN mems_people_db.subject s ON s.org_id = @org AND s.code = x.code
ON DUPLICATE KEY UPDATE sequence_no = VALUES(sequence_no), required_sessions = VALUES(required_sessions),
                        session_minutes = VALUES(session_minutes), sessions_per_week = VALUES(sessions_per_week);

-- =====================================================================
-- 5) 10 LOP HOC
-- =====================================================================
INSERT INTO mems_people_db.school_class
 (id, org_id, class_code, name, academic_year, status, created_by, created_at,
  start_date, end_date, version, close_state, cancel_state, needs_reassignment,
  teacher_id, curriculum_id)
VALUES
 (@c01, @org, 'CNTT-K27A' , 'Công nghệ thông tin K27A'      , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @tGV002, @curCNTT),
 (@c02, @org, 'CNTT-K27B' , 'Công nghệ thông tin K27B'      , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @tGV003, @curCNTT),
 (@c03, @org, 'CNTT-K26A' , 'Công nghệ thông tin K26A'      , '2025-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-05-29', 0, 'NONE', 'NONE', 0, @tGV004, @curCNTT),
 (@c04, @org, 'KTPM-K26A' , 'Kỹ thuật phần mềm K26A'        , '2025-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-05-29', 0, 'NONE', 'NONE', 0, @tGV006, @curCNTT),
 (@c05, @org, 'HTTT-K27A' , 'Hệ thống thông tin K27A'       , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @tGV007, @curCNTT),
 (@c06, @org, 'TCNH-K27A' , 'Tài chính - Ngân hàng K27A'    , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @gvTC1 , @curTC),
 (@c07, @org, 'TCNH-K27B' , 'Tài chính - Ngân hàng K27B'    , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @gvTC2 , @curTC),
 (@c08, @org, 'MKT-K27A'  , 'Marketing K27A'                , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @gvTC1 , @curTC),
 (@c09, @org, 'NNA-K27A'  , 'Ngôn ngữ Anh K27A'             , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @gvNN1 , @curNN),
 (@c10, @org, 'NNA-K27B'  , 'Ngôn ngữ Anh K27B'             , '2026-2027', 'DANG_DIEN_RA', @owner, NOW(3), '2026-09-07', '2027-01-16', 0, 'NONE', 'NONE', 0, @gvNN2 , @curNN)
ON DUPLICATE KEY UPDATE name = VALUES(name), academic_year = VALUES(academic_year), status = 'DANG_DIEN_RA',
                        start_date = VALUES(start_date), end_date = VALUES(end_date),
                        teacher_id = VALUES(teacher_id), curriculum_id = VALUES(curriculum_id),
                        close_state = 'NONE', cancel_state = 'NONE', needs_reassignment = 0;

-- =====================================================================
-- 6) MON CUA TUNG LOP (class_subject)
-- Moi giai doan (stage_no) la mot khoi 3 tuan: 6 giai doan x 3 tuan = 18 tuan,
-- vua hoc ky 07/09/2026 - 16/01/2027. planned = sessions_per_week * 3.
-- =====================================================================
INSERT INTO mems_people_db.class_subject
 (class_id, subject_id, source, curriculum_id, required_sessions, planned_sessions,
  session_minutes, sessions_per_week, stage_no, teacher_id, is_primary, status, created_at)
SELECT x.class_id, s.id, 'CURRICULUM', x.cur, x.spw * 3, x.spw * 3,
       90, x.spw, x.seq, x.teacher_id, IF(x.seq = 1, 1, 0), 'PLANNED', NOW(3)
  FROM (
    SELECT @c01 AS class_id, @curCNTT AS cur, 'JAVA'       AS code, 2 AS spw, 1 AS seq, @tLT   AS teacher_id UNION ALL
    SELECT @c01, @curCNTT, 'DATABASE'   , 1, 2, @tCSDL UNION ALL
    SELECT @c01, @curCNTT, 'DATA_STRUCT', 1, 3, @tLT   UNION ALL
    SELECT @c01, @curCNTT, 'NETWORKING' , 1, 4, @tMang UNION ALL
    SELECT @c01, @curCNTT, 'ENGLISH_IT' , 1, 5, @gvNN1 UNION ALL
    SELECT @c01, @curCNTT, 'TRIET'      , 1, 6, @gvXH  UNION ALL
    SELECT @c02, @curCNTT, 'JAVA'       , 2, 1, @tLT   UNION ALL
    SELECT @c02, @curCNTT, 'DATABASE'   , 1, 2, @tCSDL UNION ALL
    SELECT @c02, @curCNTT, 'DATA_STRUCT', 1, 3, @tLT   UNION ALL
    SELECT @c02, @curCNTT, 'NETWORKING' , 1, 4, @tMang UNION ALL
    SELECT @c02, @curCNTT, 'ENGLISH_IT' , 1, 5, @gvNN2 UNION ALL
    SELECT @c02, @curCNTT, 'TRIET'      , 1, 6, @gvXH  UNION ALL
    SELECT @c03, @curCNTT, 'JAVA'       , 2, 1, @tLT   UNION ALL
    SELECT @c03, @curCNTT, 'DATABASE'   , 1, 2, @tCSDL UNION ALL
    SELECT @c03, @curCNTT, 'DATA_STRUCT', 1, 3, @tLT   UNION ALL
    SELECT @c03, @curCNTT, 'NETWORKING' , 1, 4, @tMang UNION ALL
    SELECT @c03, @curCNTT, 'ENGLISH_IT' , 1, 5, @gvNN1 UNION ALL
    SELECT @c03, @curCNTT, 'TRIET'      , 1, 6, @gvXH  UNION ALL
    SELECT @c04, @curCNTT, 'JAVA'       , 2, 1, @tLT   UNION ALL
    SELECT @c04, @curCNTT, 'DATABASE'   , 1, 2, @tCSDL UNION ALL
    SELECT @c04, @curCNTT, 'DATA_STRUCT', 1, 3, @tLT   UNION ALL
    SELECT @c04, @curCNTT, 'NETWORKING' , 1, 4, @tMang UNION ALL
    SELECT @c04, @curCNTT, 'ENGLISH_IT' , 1, 5, @gvNN2 UNION ALL
    SELECT @c04, @curCNTT, 'TRIET'      , 1, 6, @gvXH  UNION ALL
    SELECT @c05, @curCNTT, 'JAVA'       , 2, 1, @tLT   UNION ALL
    SELECT @c05, @curCNTT, 'DATABASE'   , 1, 2, @tCSDL UNION ALL
    SELECT @c05, @curCNTT, 'DATA_STRUCT', 1, 3, @tLT   UNION ALL
    SELECT @c05, @curCNTT, 'NETWORKING' , 1, 4, @tMang UNION ALL
    SELECT @c05, @curCNTT, 'ENGLISH_IT' , 1, 5, @gvNN1 UNION ALL
    SELECT @c05, @curCNTT, 'TRIET'      , 1, 6, @gvXH  UNION ALL
    SELECT @c06, @curTC  , 'KETOAN'     , 2, 1, @gvTC2 UNION ALL
    SELECT @c06, @curTC  , 'TCNH'       , 2, 2, @gvTC1 UNION ALL
    SELECT @c06, @curTC  , 'XACSUAT'    , 1, 3, @tToan UNION ALL
    SELECT @c06, @curTC  , 'ANH_VP'     , 2, 4, @gvNN2 UNION ALL
    SELECT @c06, @curTC  , 'TRIET'      , 1, 5, @gvXH  UNION ALL
    SELECT @c07, @curTC  , 'KETOAN'     , 2, 1, @gvTC2 UNION ALL
    SELECT @c07, @curTC  , 'TCNH'       , 2, 2, @gvTC1 UNION ALL
    SELECT @c07, @curTC  , 'XACSUAT'    , 1, 3, @tToan UNION ALL
    SELECT @c07, @curTC  , 'ANH_VP'     , 2, 4, @gvNN2 UNION ALL
    SELECT @c07, @curTC  , 'TRIET'      , 1, 5, @gvXH  UNION ALL
    SELECT @c08, @curTC  , 'KETOAN'     , 2, 1, @gvTC2 UNION ALL
    SELECT @c08, @curTC  , 'TCNH'       , 2, 2, @gvTC1 UNION ALL
    SELECT @c08, @curTC  , 'XACSUAT'    , 1, 3, @tToan UNION ALL
    SELECT @c08, @curTC  , 'ANH_VP'     , 2, 4, @gvNN2 UNION ALL
    SELECT @c08, @curTC  , 'TRIET'      , 1, 5, @gvXH  UNION ALL
    SELECT @c09, @curNN  , 'ANH_VP'     , 3, 1, @gvNN1 UNION ALL
    SELECT @c09, @curNN  , 'ENGLISH_IT' , 2, 2, @gvNN2 UNION ALL
    SELECT @c09, @curNN  , 'TIENG_NHAT' , 1, 3, @gvNN1 UNION ALL
    SELECT @c09, @curNN  , 'TRIET'      , 1, 4, @gvXH  UNION ALL
    SELECT @c09, @curNN  , 'TTHCM'      , 1, 5, @gvXH  UNION ALL
    SELECT @c10, @curNN  , 'ANH_VP'     , 3, 1, @gvNN1 UNION ALL
    SELECT @c10, @curNN  , 'ENGLISH_IT' , 2, 2, @gvNN2 UNION ALL
    SELECT @c10, @curNN  , 'TIENG_NHAT' , 1, 3, @gvNN1 UNION ALL
    SELECT @c10, @curNN  , 'TRIET'      , 1, 4, @gvXH  UNION ALL
    SELECT @c10, @curNN  , 'TTHCM'      , 1, 5, @gvXH
  ) x
  JOIN mems_people_db.subject s ON s.org_id = @org AND s.code = x.code
ON DUPLICATE KEY UPDATE source = VALUES(source), curriculum_id = VALUES(curriculum_id),
                        required_sessions = VALUES(required_sessions), planned_sessions = VALUES(planned_sessions),
                        session_minutes = VALUES(session_minutes), sessions_per_week = VALUES(sessions_per_week),
                        stage_no = VALUES(stage_no), teacher_id = VALUES(teacher_id),
                        is_primary = VALUES(is_primary), status = 'PLANNED', updated_at = NOW(3);

-- =====================================================================
-- 7) 300 SINH VIEN (30 em/lop) voi ten tieng Viet that
-- =====================================================================
INSERT INTO mems_people_db.student(id, org_id, student_code, full_name, date_of_birth, status, created_by, created_at)
SELECT CONCAT('d1000000-9999-4999-8999-', LPAD(n, 12, '0')), @org,
       CONCAT('SV', LPAD(27000 + n, 5, '0')),
       CONCAT(
         ELT(1 + MOD(n * 7 , 14), 'Nguyễn','Trần','Lê','Phạm','Hoàng','Phan','Vũ','Đặng','Bùi','Đỗ','Hồ','Ngô','Dương','Lý'), ' ',
         ELT(1 + MOD(n * 3 , 10), 'Văn','Thị','Minh','Quang','Hữu','Thanh','Ngọc','Đức','Gia','Khánh'), ' ',
         ELT(1 + MOD(n * 11, 36), 'An','Bình','Chi','Dũng','Giang','Hà','Hải','Hạnh','Hiếu','Hoa','Hùng','Hương',
                                  'Khánh','Lan','Linh','Long','Mai','Nam','Nga','Ngọc','Nhung','Phúc','Quân','Quỳnh',
                                  'Sơn','Tâm','Thảo','Thắng','Thủy','Trang','Trung','Tú','Tuấn','Vân','Việt','Yến')
       ),
       DATE_ADD('2006-01-01', INTERVAL MOD(n * 13, 700) DAY),
       'active', @owner, NOW(3)
  FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 300) SELECT n FROM seq) s
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), date_of_birth = VALUES(date_of_birth), status = 'active';

INSERT IGNORE INTO mems_people_db.class_student(class_id, student_id, org_id, enrolled_at)
SELECT CASE (FLOOR((n - 1) / 30))
         WHEN 0 THEN @c01 WHEN 1 THEN @c02 WHEN 2 THEN @c03 WHEN 3 THEN @c04 WHEN 4 THEN @c05
         WHEN 5 THEN @c06 WHEN 6 THEN @c07 WHEN 7 THEN @c08 WHEN 8 THEN @c09 ELSE @c10 END,
       CONCAT('d1000000-9999-4999-8999-', LPAD(n, 12, '0')),
       @org, NOW(3)
  FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 300) SELECT n FROM seq) s;

-- =====================================================================
-- 8) PHONG HOC MOI + sua ten toa nha bi loi font cu
-- =====================================================================
UPDATE mems_facility_db.classroom
   SET building = 'Tòa A'
 WHERE org_id = @org AND code IN ('A101','A102','A201','A202','A301','A302')
   AND building LIKE BINARY '%?%';
UPDATE mems_facility_db.classroom
   SET building = 'Tòa B'
 WHERE org_id = @org AND code IN ('B101','B102','B201','B202')
   AND building LIKE BINARY '%?%';

INSERT INTO mems_facility_db.classroom(id, org_id, code, name, building, floor, capacity, room_type, status, department_id)
VALUES
 ('d1000000-3333-4333-8333-000000000001', @org, 'C101', 'Phòng Lý thuyết C101'          , 'Tòa C', '1', 45, 'classroom'    , 'active', NULL),
 ('d1000000-3333-4333-8333-000000000002', @org, 'C102', 'Phòng Lý thuyết C102'          , 'Tòa C', '1', 45, 'classroom'    , 'active', NULL),
 ('d1000000-3333-4333-8333-000000000003', @org, 'C201', 'Phòng Lý thuyết C201'          , 'Tòa C', '2', 40, 'classroom'    , 'active', NULL),
 ('d1000000-3333-4333-8333-000000000004', @org, 'C202', 'Phòng Lý thuyết C202'          , 'Tòa C', '2', 40, 'classroom'    , 'active', NULL),
 ('d1000000-3333-4333-8333-000000000005', @org, 'C301', 'Hội trường C301'               , 'Tòa C', '3', 80, 'classroom'    , 'active', NULL),
 ('d1000000-3333-4333-8333-000000000006', @org, 'C401', 'Phòng Thực hành Máy tính C401' , 'Tòa C', '4', 40, 'computer_room', 'active', NULL),
 ('d1000000-3333-4333-8333-000000000007', @org, 'C402', 'Phòng Thực hành Máy tính C402' , 'Tòa C', '4', 40, 'computer_room', 'active', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name), building = VALUES(building), floor = VALUES(floor),
                        capacity = VALUES(capacity), room_type = VALUES(room_type), status = 'active';

-- =====================================================================
-- 9) TIET CHIEU (org-level)
-- =====================================================================
INSERT INTO mems_schedule_db.time_slot(id, org_id, period_no, name, start_time, end_time, joins_next, is_active)
VALUES
 ('d1000000-8888-4888-8888-000000000007', @org, 7 , 'Tiết 7' , '13:00:00', '13:45:00', 1, 1),
 ('d1000000-8888-4888-8888-000000000008', @org, 8 , 'Tiết 8' , '13:45:00', '14:30:00', 0, 1),
 ('d1000000-8888-4888-8888-000000000009', @org, 9 , 'Tiết 9' , '14:45:00', '15:30:00', 1, 1),
 ('d1000000-8888-4888-8888-000000000010', @org, 10, 'Tiết 10', '15:30:00', '16:15:00', 0, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), start_time = VALUES(start_time), end_time = VALUES(end_time),
                        joins_next = VALUES(joins_next), is_active = 1;

-- =====================================================================
-- 10) LOP MIRROR BEN SCHEDULE (session FK -> class.id)
-- =====================================================================
INSERT INTO mems_schedule_db.class(id, org_id, code, name, subject, max_size, start_date, end_date, status)
VALUES
 (@c01, @org, 'CNTT-K27A', 'Công nghệ thông tin K27A'  , 'CNTT', 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c02, @org, 'CNTT-K27B', 'Công nghệ thông tin K27B'  , 'CNTT', 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c03, @org, 'CNTT-K26A', 'Công nghệ thông tin K26A'  , 'CNTT', 40, '2026-09-07', '2027-05-29', 'ongoing'),
 (@c04, @org, 'KTPM-K26A', 'Kỹ thuật phần mềm K26A'    , 'CNTT', 40, '2026-09-07', '2027-05-29', 'ongoing'),
 (@c05, @org, 'HTTT-K27A', 'Hệ thống thông tin K27A'   , 'CNTT', 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c06, @org, 'TCNH-K27A', 'Tài chính - Ngân hàng K27A', 'TCNH', 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c07, @org, 'TCNH-K27B', 'Tài chính - Ngân hàng K27B', 'TCNH', 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c08, @org, 'MKT-K27A' , 'Marketing K27A'            , 'MKT' , 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c09, @org, 'NNA-K27A' , 'Ngôn ngữ Anh K27A'         , 'NNA' , 40, '2026-09-07', '2027-01-16', 'ongoing'),
 (@c10, @org, 'NNA-K27B' , 'Ngôn ngữ Anh K27B'         , 'NNA' , 40, '2026-09-07', '2027-01-16', 'ongoing')
ON DUPLICATE KEY UPDATE name = VALUES(name), max_size = VALUES(max_size),
                        start_date = VALUES(start_date), end_date = VALUES(end_date), status = 'ongoing';

-- =====================================================================
-- 11) KIEM TRA NHANH
-- =====================================================================
SELECT 'department.moi'          AS entity, COUNT(*) AS n FROM mems_people_db.department WHERE id LIKE 'd1000000-dddd-%'
UNION ALL SELECT 'subject_category.moi', COUNT(*) FROM mems_people_db.subject_category WHERE id LIKE 'd1000000-cccc-%'
UNION ALL SELECT 'specialty.moi'      , COUNT(*) FROM mems_people_db.specialty      WHERE id LIKE 'd1000000-7777-%'
UNION ALL SELECT 'subject.moi'        , COUNT(*) FROM mems_people_db.subject        WHERE id LIKE 'd1000000-5555-%'
UNION ALL SELECT 'account.gv_moi'     , COUNT(*) FROM mems_identity_db.account      WHERE id LIKE 'd1000000-aaaa-%'
UNION ALL SELECT 'teacher.gv_moi'     , COUNT(*) FROM mems_people_db.teacher_profile WHERE user_id LIKE 'd1000000-aaaa-%'
UNION ALL SELECT 'curriculum.moi'     , COUNT(*) FROM mems_people_db.curriculum     WHERE id LIKE 'd1000000-6666-%'
UNION ALL SELECT 'curriculum_subject' , COUNT(*) FROM mems_people_db.curriculum_subject WHERE curriculum_id LIKE 'd1000000-6666-%'
UNION ALL SELECT 'school_class.moi'   , COUNT(*) FROM mems_people_db.school_class   WHERE id LIKE 'd1000000-bbbb-%'
UNION ALL SELECT 'class_subject.moi'  , COUNT(*) FROM mems_people_db.class_subject  WHERE class_id LIKE 'd1000000-bbbb-%'
UNION ALL SELECT 'student.moi'        , COUNT(*) FROM mems_people_db.student        WHERE id LIKE 'd1000000-9999-%'
UNION ALL SELECT 'class_student.moi'  , COUNT(*) FROM mems_people_db.class_student  WHERE class_id LIKE 'd1000000-bbbb-%'
UNION ALL SELECT 'classroom.moi'      , COUNT(*) FROM mems_facility_db.classroom    WHERE id LIKE 'd1000000-3333-%'
UNION ALL SELECT 'time_slot.tong_org' , COUNT(*) FROM mems_schedule_db.time_slot    WHERE org_id = @org
UNION ALL SELECT 'schedule.class_mirror', COUNT(*) FROM mems_schedule_db.class      WHERE id LIKE 'd1000000-bbbb-%';
