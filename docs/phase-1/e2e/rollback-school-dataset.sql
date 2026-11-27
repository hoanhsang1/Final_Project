-- =====================================================================
-- MEMS - Rollback bo du lieu mau "truong hoc that" (d1000000-*)
-- Chay tren MySQL local. Chi xoa du lieu do seed-school-dataset.sql tao.
-- Khong hoan tac viec sua ten toa nha (A/B) vi do la sua loi font.
-- =====================================================================
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

SET @org := 'eff0ce1e-1234-4892-a9f7-031383a681a5';

DELETE FROM mems_people_db.class_student WHERE class_id LIKE 'd1000000-bbbb-%';
DELETE FROM mems_people_db.class_subject WHERE class_id LIKE 'd1000000-bbbb-%';
DELETE FROM mems_people_db.student WHERE id LIKE 'd1000000-9999-%';
DELETE FROM mems_people_db.school_class WHERE id LIKE 'd1000000-bbbb-%';
DELETE FROM mems_schedule_db.class WHERE id LIKE 'd1000000-bbbb-%';

DELETE FROM mems_people_db.curriculum_subject WHERE curriculum_id LIKE 'd1000000-6666-%';
DELETE FROM mems_people_db.curriculum WHERE id LIKE 'd1000000-6666-%';

DELETE FROM mems_people_db.teacher_specialty WHERE user_id LIKE 'd1000000-aaaa-%';
DELETE FROM mems_people_db.teacher_profile WHERE user_id LIKE 'd1000000-aaaa-%';
DELETE FROM mems_people_db.staff_profile WHERE user_id LIKE 'd1000000-aaaa-%';
DELETE FROM mems_people_db.department_member WHERE user_id LIKE 'd1000000-aaaa-%';
DELETE FROM mems_identity_db.account_role WHERE account_id LIKE 'd1000000-aaaa-%';
DELETE FROM mems_identity_db.account WHERE id LIKE 'd1000000-aaaa-%';

DELETE FROM mems_people_db.subject WHERE id LIKE 'd1000000-5555-%';
DELETE FROM mems_people_db.specialty WHERE id LIKE 'd1000000-7777-%';
DELETE FROM mems_people_db.subject_category WHERE id LIKE 'd1000000-cccc-%';
DELETE FROM mems_people_db.department WHERE id LIKE 'd1000000-dddd-%';

DELETE FROM mems_facility_db.classroom WHERE id LIKE 'd1000000-3333-%';
DELETE FROM mems_schedule_db.time_slot WHERE id LIKE 'd1000000-8888-%';
