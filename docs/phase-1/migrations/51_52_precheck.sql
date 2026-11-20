-- =============================================================================
-- DRAFT ONLY — READ-ONLY PRE-CHECK (PART A: SCHEMA). DO NOT RUN ON PRODUCTION.
-- Run on STAGING before 51/52. Target: MySQL 8.0.16+, mems_people_db.
--
-- WHY TWO FILES:
--   This file (PART A) only reads tables that always exist in the base schema
--   (school_class, subject, staff_profile) plus information_schema. It is safe
--   on a database that has NEVER had class_subject.
--   PART B (data pre-check) reads class_subject and is in
--   `51_52_precheck_data.sql`. Run it ONLY when this file's query 0b returns
--   next_step = 'DATA_PRECHECK_READY'.
--
--   If class_subject exists but is an OLD table missing required columns,
--   query 0b returns 'BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE'. Do NOT run 52:
--   draft 52 aborts on an incomplete old table (no silent upgrade).
-- =============================================================================
USE mems_people_db;

-- 0) Bảng/cột đã tồn tại chưa (cho biết migration đã chạy một phần)
SELECT table_name, column_name, ordinal_position
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('curriculum','curriculum_subject','curriculum_subject_prerequisite',
                     'class_subject','class_subject_history','specialty_subject','teacher_subject')
ORDER BY table_name, ordinal_position;

-- 0b) Kết luận bước tiếp theo (điều khiển việc có chạy PART B hay không)
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'class_subject') AS class_subject_exists,
  (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'class_subject'
      AND column_name IN ('class_id','subject_id','org_id','is_primary')) AS cs_key_columns,
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'teacher_subject') AS teacher_subject_exists,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = 'class_subject') = 0
      THEN 'SKIP_DATA_PRECHECK_NO_TABLE'
    WHEN (SELECT COUNT(*) FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'class_subject'
             AND column_name IN ('class_id','subject_id','org_id','is_primary')) < 4
      THEN 'BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE'
    ELSE 'DATA_PRECHECK_READY'
  END AS next_step;

-- 0c) Cột bắt buộc của class_subject (Revision 3). present = 0 => thiếu.
--     Bảng không tồn tại => tất cả present = 0 (đúng: sẽ được tạo mới bởi 52).
SELECT req.name AS required_column, COALESCE(MAX(c.column_name IS NOT NULL), 0) AS present
FROM (
  SELECT 'class_id' AS name UNION ALL SELECT 'subject_id' UNION ALL SELECT 'org_id'
  UNION ALL SELECT 'curriculum_id' UNION ALL SELECT 'source' UNION ALL SELECT 'sequence_no'
  UNION ALL SELECT 'teacher_id' UNION ALL SELECT 'is_primary' UNION ALL SELECT 'primary_class_id'
  UNION ALL SELECT 'required_sessions' UNION ALL SELECT 'planned_sessions'
  UNION ALL SELECT 'theory_sessions' UNION ALL SELECT 'practice_sessions'
  UNION ALL SELECT 'session_minutes' UNION ALL SELECT 'status' UNION ALL SELECT 'note'
  UNION ALL SELECT 'created_by' UNION ALL SELECT 'created_at' UNION ALL SELECT 'updated_by'
  UNION ALL SELECT 'updated_at'
) req
LEFT JOIN information_schema.columns c
  ON c.table_schema = DATABASE() AND c.table_name = 'class_subject' AND c.column_name = req.name
GROUP BY req.name;

-- 0d) Index bắt buộc của class_subject. present = 0 => thiếu.
WITH req_idx AS (
  SELECT 'idx_class_subject_org_subject' AS name UNION ALL
  SELECT 'idx_class_subject_teacher' UNION ALL
  SELECT 'idx_class_subject_curriculum' UNION ALL
  SELECT 'uq_class_subject_primary'
)
SELECT req_idx.name AS required_index, COALESCE(MAX(st.index_name IS NOT NULL), 0) AS present
FROM req_idx
LEFT JOIN information_schema.statistics st
  ON st.table_schema = DATABASE() AND st.table_name = 'class_subject' AND st.index_name = req_idx.name
GROUP BY req_idx.name;

-- 0d2) PRIMARY KEY phải đúng (class_id, subject_id). present = 0 => sai/thiếu.
SELECT 'PRIMARY(class_id,subject_id)' AS required_pk,
       (SELECT COUNT(*) FROM (
          SELECT index_name
          FROM information_schema.statistics
          WHERE table_schema = DATABASE() AND table_name = 'class_subject' AND index_name = 'PRIMARY'
          GROUP BY index_name
          HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') = 'class_id,subject_id'
        ) pk) AS present;

-- 0e) FK/CHECK bắt buộc của class_subject. present = 0 => thiếu.
WITH req_con AS (
  SELECT 'fk_class_subject_class' AS name UNION ALL
  SELECT 'fk_class_subject_subject' UNION ALL
  SELECT 'fk_class_subject_curriculum' UNION ALL
  SELECT 'fk_class_subject_teacher' UNION ALL
  SELECT 'chk_class_subject_status' UNION ALL
  SELECT 'chk_class_subject_source' UNION ALL
  SELECT 'chk_class_subject_primary' UNION ALL
  SELECT 'chk_class_subject_sessions' UNION ALL
  SELECT 'chk_class_subject_sequence'
)
SELECT req_con.name AS required_constraint,
       COALESCE(MAX(tc.constraint_name IS NOT NULL), 0) AS present, MAX(tc.constraint_type) AS type
FROM req_con
LEFT JOIN information_schema.table_constraints tc
  ON tc.table_schema = DATABASE() AND tc.table_name = 'class_subject' AND tc.constraint_name = req_con.name
GROUP BY req_con.name;

-- 0f) Generated column primary_class_id (MySQL). 0 dòng => thiếu/sai.
SELECT column_name, extra, generation_expression
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'class_subject' AND column_name = 'primary_class_id';

-- 0g) teacher_subject phải theo D-06a: CHECK không chứa PENDING.
--     has_pending > 0 => bảng cũ, 52 sẽ ABORT (không tự sửa).
SELECT constraint_name, check_clause,
       (check_clause LIKE '%PENDING%') AS has_pending
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE() AND constraint_name = 'chk_teacher_subject_status';

-- 1) subject.code trùng trong cùng org (phải 0 trước khi đổi UNIQUE)
SELECT org_id, code, COUNT(*) AS n
FROM subject
WHERE code IS NOT NULL
GROUP BY org_id, code
HAVING COUNT(*) > 1;

-- 2) Index/constraint 51/52 đã có (idempotency + tránh tạo trùng)
SELECT table_name, index_name, non_unique, seq_in_index, column_name
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN ('uq_school_class_id_org','uq_class_subject_primary','uq_csh_operation')
ORDER BY table_name, index_name, seq_in_index;

SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_name IN ('fk_class_subject_class','fk_school_class_curriculum',
                          'fk_csh_class','chk_class_subject_primary','chk_csh_subject_change');

-- 3) Lớp đã kết thúc/huỷ nhưng vẫn có subject_id (backfill vẫn giữ, không đổi trạng thái)
SELECT c.id, c.org_id, c.status, c.subject_id
FROM school_class c
WHERE c.subject_id IS NOT NULL
  AND c.status IN ('DA_KET_THUC','DA_HUY','CLOSED');

-- 4) school_class.subject_id không tồn tại trong subject cùng org
--    (backfill LEGACY sẽ fail FK (subject_id, org_id)) — phải xử lý tay trước 52.
SELECT c.id AS class_id, c.org_id, c.subject_id
FROM school_class c
LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
WHERE c.subject_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND s.id IS NULL;

-- 5) school_class.teacher_id không tồn tại trong staff_profile cùng org (C3).
--    Ở schema gốc đã có fk_school_class_teacher nên kỳ vọng 0 dòng; nếu có dòng
--    nghĩa là dữ liệu/FK lệch — 52 sẽ ABORT, KHÔNG tự set teacher_id = NULL.
SELECT c.id AS class_id, c.org_id, c.teacher_id, c.subject_id
FROM school_class c
LEFT JOIN staff_profile sp ON sp.user_id = c.teacher_id AND sp.org_id = c.org_id
WHERE c.teacher_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND sp.user_id IS NULL;

-- =============================================================================
-- BƯỚC TIẾP THEO:
--   next_step = 'DATA_PRECHECK_READY'            -> chạy 51_52_precheck_data.sql
--   next_step = 'SKIP_DATA_PRECHECK_NO_TABLE'    -> không có class_subject, bỏ qua PART B
--   next_step = 'BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE'
--       -> KHÔNG chạy 52. Bảng cũ thiếu cột Revision 3; xử lý tay (drop/tạo lại
--          hoặc forward-fix có kiểm chứng) rồi chạy lại pre-check.
-- =============================================================================
