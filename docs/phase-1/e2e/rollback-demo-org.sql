-- =====================================================================
-- MEMS - Go du lieu mau xep lich cua seed-demo-org.sql (org DEMO)
-- Chi xoa dung cac id tien to "d0000000-". KHONG dung du lieu khac.
-- LUU Y: neu da tao lich nhap cho 2 lop demo thi xoa/huy nhap trong UI
--        truoc, de tranh ban ghi draft con tro toi lop da xoa.
-- =====================================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @org := 'eff0ce1e-1234-4892-a9f7-031383a681a5';

-- Nhap (neu co) cua 2 lop demo
DELETE FROM mems_schedule_db.session
 WHERE class_id LIKE 'd0000000-bbbb-4bbb-8bbb-%';

-- Lop mirror + cau hinh lop
DELETE FROM mems_schedule_db.class
 WHERE id LIKE 'd0000000-bbbb-4bbb-8bbb-%';

-- Hoc sinh demo
DELETE FROM mems_people_db.class_student
 WHERE class_id LIKE 'd0000000-bbbb-4bbb-8bbb-%';
DELETE FROM mems_people_db.student
 WHERE id LIKE 'd0000000-9999-4999-8999-%';

-- Chuong trinh mon + lop demo
DELETE FROM mems_people_db.class_subject
 WHERE class_id LIKE 'd0000000-bbbb-4bbb-8bbb-%';
DELETE FROM mems_people_db.school_class
 WHERE id LIKE 'd0000000-bbbb-4bbb-8bbb-%';

-- Giao vien demo
DELETE FROM mems_people_db.teacher_specialty
 WHERE user_id LIKE 'd0000000-aaaa-4aaa-8aaa-%';
DELETE FROM mems_people_db.teacher_subject
 WHERE user_id LIKE 'd0000000-aaaa-4aaa-8aaa-%';
DELETE FROM mems_people_db.department_member
 WHERE user_id LIKE 'd0000000-aaaa-4aaa-8aaa-%';
DELETE FROM mems_people_db.teacher_profile
 WHERE user_id LIKE 'd0000000-aaaa-4aaa-8aaa-%';
DELETE FROM mems_people_db.staff_profile
 WHERE user_id LIKE 'd0000000-aaaa-4aaa-8aaa-%';
DELETE FROM mems_identity_db.account_role
 WHERE account_id LIKE 'd0000000-aaaa-4aaa-8aaa-%';
DELETE FROM mems_identity_db.account
 WHERE id LIKE 'd0000000-aaaa-4aaa-8aaa-%';

-- Tiet hoc demo
DELETE FROM mems_schedule_db.time_slot
 WHERE id LIKE 'd0000000-8888-4888-8888-%';

-- Mon demo + tra danh muc ve NULL (chi khi dang tro toi danh muc demo)
DELETE FROM mems_people_db.subject
 WHERE id = 'd0000000-5555-4555-8555-000000000001';
UPDATE mems_people_db.subject
   SET category_id = NULL
 WHERE org_id = @org AND category_id LIKE 'd0000000-cccc-4ccc-8ccc-%';
UPDATE mems_people_db.specialty
   SET category_id = NULL
 WHERE org_id = @org AND category_id LIKE 'd0000000-cccc-4ccc-8ccc-%';

DELETE FROM mems_people_db.specialty
 WHERE id LIKE 'd0000000-7777-4777-8777-%';
DELETE FROM mems_people_db.subject_category
 WHERE id LIKE 'd0000000-cccc-4ccc-8ccc-%';

-- Quyen schedule.config (go neu muon tra Identity ve trang thai cu)
DELETE FROM mems_identity_db.role_permission
 WHERE permission_id IN (SELECT id FROM mems_identity_db.permission WHERE code = 'schedule.config');
DELETE FROM mems_identity_db.permission WHERE code = 'schedule.config';

-- Tuy chon: go 2 cot da them (chi khi chac chan khong con du lieu can)
-- ALTER TABLE mems_people_db.teacher_subject DROP COLUMN approved_by, DROP COLUMN approved_at;

SELECT 'rollback-demo-org' AS step,
       (SELECT COUNT(*) FROM mems_people_db.school_class WHERE id LIKE 'd0000000-bbbb-%') AS classes_left,
       (SELECT COUNT(*) FROM mems_identity_db.account WHERE id LIKE 'd0000000-aaaa-%') AS accounts_left,
       (SELECT COUNT(*) FROM mems_people_db.student WHERE id LIKE 'd0000000-9999-%') AS students_left;