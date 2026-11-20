-- =============================================================================
-- DRAFT ONLY — READ-ONLY PRE-CHECK. DO NOT RUN ON PRODUCTION.
-- Run on STAGING before 51/52. Every returned row must go into the manual
-- review report; migrations must NOT guess or auto-fix ambiguous data.
-- Target: MySQL 8.0.16+, mems_people_db.
-- NOTE: queries 4-7 read class_subject; run them only after confirming the table
--       exists (query 0). Skip them on a database that never had class_subject.
-- =============================================================================
USE mems_people_db;

-- 0) Bảng/cột đã tồn tại chưa (cho biết migration đã chạy một phần)
SELECT table_name, column_name, ordinal_position
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('curriculum','curriculum_subject','curriculum_subject_prerequisite',
                     'class_subject','class_subject_history','specialty_subject','teacher_subject')
ORDER BY table_name, ordinal_position;

-- 1) subject.code trùng trong cùng org (phải 0 trước khi đổi UNIQUE)
SELECT org_id, code, COUNT(*) AS n
FROM subject
WHERE code IS NOT NULL
GROUP BY org_id, code
HAVING COUNT(*) > 1;

-- 2) Lớp có subject_id nhưng CHƯA có dòng class_subject khớp chính xác.
--    Đây là danh sách backfill LEGACY hợp lệ (khớp ID chính xác, không mập mờ).
SELECT c.id AS class_id, c.org_id, c.subject_id
FROM school_class c
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_subject cs
    WHERE cs.class_id = c.id AND cs.subject_id = c.subject_id);

-- 3) Lớp có subject_id nhưng không có dòng khớp HOẶC đã có >1 primary.
--    d.primary_rows > 1 => mập mờ, dừng lại và xử lý tay.
SELECT c.id AS class_id, c.subject_id,
       COALESCE(SUM(cs.subject_id = c.subject_id), 0) AS exact_match_rows,
       COALESCE(SUM(cs.is_primary = 1), 0)            AS primary_rows
FROM school_class c
LEFT JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL
GROUP BY c.id, c.subject_id
HAVING exact_match_rows = 0 OR primary_rows > 1;

-- 4) Trùng khóa (class_id, subject_id) nếu bảng đã tồn tại
SELECT class_id, subject_id, COUNT(*) AS n
FROM class_subject
GROUP BY class_id, subject_id
HAVING COUNT(*) > 1;

-- 5) Org lệch (phải 0)
SELECT cs.class_id, cs.subject_id, cs.org_id AS cs_org, c.org_id AS class_org
FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id;

SELECT cs.class_id, cs.subject_id, cs.org_id AS cs_org, s.org_id AS subject_org
FROM class_subject cs JOIN subject s ON s.id = cs.subject_id
WHERE s.org_id <> cs.org_id;

-- 6) Index/constraint đã có (idempotency + tránh tạo trùng)
SELECT table_name, index_name, non_unique, seq_in_index, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN ('uq_school_class_id_org','uq_class_subject_primary','uq_csh_operation')
ORDER BY table_name, index_name, seq_in_index;

SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_name IN ('fk_class_subject_class','fk_csh_class',
                          'chk_class_subject_primary','chk_csh_subject_change');

-- 7) Loại dữ liệu subject_id không tồn tại trong subject (sẽ làm FK fail)
SELECT cs.class_id, cs.subject_id
FROM class_subject cs
LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
WHERE s.id IS NULL;

-- 8) Lớp đã kết thúc/huỷ nhưng vẫn có subject_id (backfill vẫn giữ, không đổi trạng thái)
SELECT c.id, c.org_id, c.status, c.subject_id
FROM school_class c
WHERE c.subject_id IS NOT NULL
  AND c.status IN ('DA_KET_THUC','DA_HUY','CLOSED');

-- 9) school_class.subject_id không tồn tại trong subject cùng org
--    (backfill LEGACY sẽ fail FK (subject_id, org_id)) — phải xử lý tay trước 52.
SELECT c.id AS class_id, c.org_id, c.subject_id
FROM school_class c
LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
WHERE c.subject_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND s.id IS NULL;
