-- =============================================================================
-- DRAFT ONLY — READ-ONLY PRE-CHECK (PART B: DATA). DO NOT RUN ON PRODUCTION.
-- Target: MySQL 8.0.16+, mems_people_db.
--
-- RUN ONLY IF `51_52_precheck.sql` query 0b returned
--   next_step = 'DATA_PRECHECK_READY', which requires ALL of:
--   * class_subject exists with exactly 20 Revision-3 columns and matching
--     attributes (type/length/precision/scale, NULL, DEFAULT, collation,
--     generated flag);
--   * PK (class_id, subject_id); 5 index groups (+ at most 2 InnoDB FK-support
--     indexes); 4 FKs with exact mappings AND ON UPDATE/ON DELETE rules;
--   * 5 CHECKs with exact expressions; primary_class_id STORED GENERATED.
-- Any other verdict (BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE, or
-- SKIP_DATA_PRECHECK_NO_TABLE when the table does not exist) => STOP: do not
-- run PART B and do not run 52.
-- PART B uses only gated class_subject columns (class_id, subject_id, org_id,
-- is_primary, teacher_id) plus baseline school_class/subject/staff_profile
-- columns, so it never runs against a table the gate did not validate.
-- 52 re-audits all four target tables at apply time; READY here means the data
-- pre-check is meaningful, not that 52 is guaranteed to succeed.
--
-- Labels (exactly one per live class):
--   AUTO_BACKFILL_CANDIDATE — deterministic exact-match backfill (5a/5b)
--   NO_ACTION               — already consistent
--   BLOCK_MIGRATION         — 52 cannot run; EVERY BLOCK row must be fixed
--                             BEFORE 52. Recording it is NOT resolution.
-- There is no "review later" label: any conflict that would leave the primary
-- invariant unsatisfiable after migration is BLOCK_MIGRATION.
-- =============================================================================
USE mems_people_db;

-- 1) Trùng khóa (class_id, subject_id) — PK phải chặn; có dòng nghĩa là PK thiếu
SELECT class_id, subject_id, COUNT(*) AS n
FROM class_subject
GROUP BY class_id, subject_id
HAVING COUNT(*) > 1;

-- 2) Org lệch (phải 0)
SELECT 'class_subject_vs_class' AS kind, cs.class_id, cs.subject_id,
       cs.org_id AS cs_org, c.org_id AS ref_org
FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id
UNION ALL
SELECT 'class_subject_vs_subject', cs.class_id, cs.subject_id, cs.org_id, s.org_id
FROM class_subject cs JOIN subject s ON s.id = cs.subject_id
WHERE s.org_id <> cs.org_id;

-- 3) class_subject trỏ môn không tồn tại trong subject cùng org (FK sẽ fail)
SELECT cs.class_id, cs.subject_id, cs.org_id
FROM class_subject cs
LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
WHERE s.id IS NULL;

-- 4) class_subject không có school_class tương ứng (C: orphan class)
SELECT cs.class_id, cs.subject_id, cs.org_id
FROM class_subject cs
LEFT JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
WHERE c.id IS NULL;

-- 5) class_subject.teacher_id không tồn tại trong staff_profile cùng org (C3)
SELECT cs.class_id, cs.subject_id, cs.teacher_id, cs.org_id
FROM class_subject cs
LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id AND sp.org_id = cs.org_id
WHERE cs.teacher_id IS NOT NULL AND sp.user_id IS NULL;

-- 6) school_class trỏ môn/giáo viên mồ côi (backfill sẽ fail FK)
SELECT 'CLASS_ORPHAN_SUBJECT' AS kind, c.id AS class_id, c.subject_id AS ref_id, c.org_id
FROM school_class c
LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL AND s.id IS NULL
UNION ALL
SELECT 'CLASS_ORPHAN_TEACHER', c.id, c.teacher_id, c.org_id
FROM school_class c
LEFT JOIN staff_profile sp ON sp.user_id = c.teacher_id AND sp.org_id = c.org_id
WHERE c.teacher_id IS NOT NULL AND c.deleted_at IS NULL AND sp.user_id IS NULL;

-- 7) Phân loại từng lớp còn sống (một dòng/lớp)
WITH per_class AS (
  SELECT
    c.id AS class_id,
    c.org_id,
    c.status,
    c.subject_id,
    c.teacher_id,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id) AS cs_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.subject_id = c.subject_id) AS exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.is_primary = 1) AS primary_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.is_primary = 1 AND cs.subject_id = c.subject_id) AS primary_exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND s.id IS NULL) AS cs_orphan_subject_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id <> c.org_id) AS cs_org_bad_rows,
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id AND sp.org_id = cs.org_id
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.teacher_id IS NOT NULL AND sp.user_id IS NULL) AS cs_orphan_teacher_rows,
    (SELECT COUNT(*) FROM subject s
      WHERE s.id = c.subject_id AND s.org_id = c.org_id) AS subject_ok,
    (SELECT COUNT(*) FROM staff_profile sp
      WHERE sp.user_id = c.teacher_id AND sp.org_id = c.org_id) AS teacher_ok
  FROM school_class c
  WHERE c.deleted_at IS NULL
)
SELECT
  class_id, org_id, status, subject_id, teacher_id,
  cs_rows, exact_rows, primary_rows, primary_exact_rows,
  cs_orphan_subject_rows, cs_org_bad_rows, cs_orphan_teacher_rows,
  CASE
    WHEN cs_orphan_subject_rows > 0 OR cs_org_bad_rows > 0 OR cs_orphan_teacher_rows > 0
      THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NOT NULL AND subject_ok = 0 THEN 'BLOCK_MIGRATION'
    WHEN teacher_id IS NOT NULL AND teacher_ok = 0 THEN 'BLOCK_MIGRATION'
    WHEN primary_rows > 1 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NULL AND primary_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NULL THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_rows = 1 AND primary_exact_rows = 1 THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    WHEN exact_rows > 0 AND primary_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN exact_rows = 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    ELSE 'BLOCK_MIGRATION'
  END AS classification,
  CASE
    WHEN cs_orphan_subject_rows > 0 THEN 'CS_ORPHAN_SUBJECT'
    WHEN cs_org_bad_rows > 0 THEN 'CS_ORG_MISMATCH'
    WHEN cs_orphan_teacher_rows > 0 THEN 'CS_ORPHAN_TEACHER'
    WHEN subject_id IS NOT NULL AND subject_ok = 0 THEN 'CLASS_ORPHAN_SUBJECT'
    WHEN teacher_id IS NOT NULL AND teacher_ok = 0 THEN 'CLASS_ORPHAN_TEACHER'
    WHEN primary_rows > 1 THEN 'MULTI_PRIMARY'
    WHEN subject_id IS NULL AND primary_rows > 0 THEN 'PRIMARY_WITHOUT_CLASS_SUBJECT'
    WHEN subject_id IS NULL THEN 'NO_SUBJECT'
    WHEN exact_rows > 0 AND primary_rows = 1 AND primary_exact_rows = 1 THEN 'PRIMARY_OK'
    WHEN exact_rows > 0 AND primary_rows = 0 THEN 'MARK_EXACT_PRIMARY'
    WHEN exact_rows > 0 AND primary_rows > 0 THEN 'PRIMARY_SUBJECT_MISMATCH'
    WHEN exact_rows = 0 AND primary_rows = 0 THEN 'INSERT_LEGACY_ROW'
    ELSE 'PRIMARY_SUBJECT_MISMATCH'
  END AS reason_code
FROM per_class
ORDER BY
  FIELD(classification, 'BLOCK_MIGRATION', 'AUTO_BACKFILL_CANDIDATE', 'NO_ACTION'),
  org_id, class_id;

-- 8) Tổng hợp số lớp theo nhãn — kỳ vọng BLOCK_MIGRATION = 0 trước khi chạy 52
WITH per_class AS (
  SELECT
    c.id AS class_id, c.org_id, c.subject_id, c.teacher_id,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND cs.subject_id = c.subject_id) AS exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1) AS primary_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.is_primary = 1 AND cs.subject_id = c.subject_id) AS primary_exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND s.id IS NULL) AS cs_orphan_subject_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id <> c.org_id) AS cs_org_bad_rows,
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id AND sp.org_id = cs.org_id
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.teacher_id IS NOT NULL AND sp.user_id IS NULL) AS cs_orphan_teacher_rows,
    (SELECT COUNT(*) FROM subject s
      WHERE s.id = c.subject_id AND s.org_id = c.org_id) AS subject_ok,
    (SELECT COUNT(*) FROM staff_profile sp
      WHERE sp.user_id = c.teacher_id AND sp.org_id = c.org_id) AS teacher_ok
  FROM school_class c
  WHERE c.deleted_at IS NULL
)
SELECT classification, COUNT(*) AS classes
FROM (
  SELECT CASE
    WHEN cs_orphan_subject_rows > 0 OR cs_org_bad_rows > 0 OR cs_orphan_teacher_rows > 0
      THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NOT NULL AND subject_ok = 0 THEN 'BLOCK_MIGRATION'
    WHEN teacher_id IS NOT NULL AND teacher_ok = 0 THEN 'BLOCK_MIGRATION'
    WHEN primary_rows > 1 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NULL AND primary_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NULL THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_rows = 1 AND primary_exact_rows = 1 THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    WHEN exact_rows > 0 AND primary_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN exact_rows = 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    ELSE 'BLOCK_MIGRATION'
  END AS classification
  FROM per_class
) t
GROUP BY classification;

-- 9) Danh sách BLOCK_MIGRATION (phải 0 dòng trước khi chạy 52)
SELECT 'CS_ORPHAN_SUBJECT' AS block_code, cs.class_id, cs.subject_id, cs.org_id, NULL AS detail
FROM class_subject cs
LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
WHERE s.id IS NULL
UNION ALL
SELECT 'CS_ORG_MISMATCH', cs.class_id, cs.subject_id, cs.org_id, CAST(c.org_id AS CHAR(36))
FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id
UNION ALL
SELECT 'CS_ORPHAN_CLASS', cs.class_id, cs.subject_id, cs.org_id, NULL
FROM class_subject cs
LEFT JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
WHERE c.id IS NULL
UNION ALL
SELECT 'CS_ORPHAN_TEACHER', cs.class_id, cs.subject_id, cs.org_id, cs.teacher_id
FROM class_subject cs
LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id AND sp.org_id = cs.org_id
WHERE cs.teacher_id IS NOT NULL AND sp.user_id IS NULL
UNION ALL
SELECT 'CLASS_ORPHAN_SUBJECT', c.id, c.subject_id, c.org_id, NULL
FROM school_class c
LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL AND s.id IS NULL
UNION ALL
SELECT 'CLASS_ORPHAN_TEACHER', c.id, c.subject_id, c.org_id, c.teacher_id
FROM school_class c
LEFT JOIN staff_profile sp ON sp.user_id = c.teacher_id AND sp.org_id = c.org_id
WHERE c.teacher_id IS NOT NULL AND c.deleted_at IS NULL AND sp.user_id IS NULL
UNION ALL
SELECT 'MULTI_PRIMARY', class_id, NULL, org_id, CAST(COUNT(*) AS CHAR(10))
FROM class_subject
WHERE is_primary = 1
GROUP BY class_id, org_id
HAVING COUNT(*) > 1
UNION ALL
SELECT 'PRIMARY_SUBJECT_MISMATCH', c.id, c.subject_id, c.org_id, cs.subject_id
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.deleted_at IS NULL AND c.subject_id IS NOT NULL AND c.subject_id <> cs.subject_id
UNION ALL
SELECT 'PRIMARY_WITHOUT_CLASS_SUBJECT', c.id, NULL, c.org_id, cs.subject_id
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.deleted_at IS NULL AND c.subject_id IS NULL;

-- 10) Tổng hợp 9 điều kiện BLOCK (tất cả phải 0 trước khi chạy 52)
SELECT
  (SELECT COUNT(*) FROM class_subject cs
     LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
     WHERE s.id IS NULL) AS cs_orphan_subject,
  (SELECT COUNT(*) FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
     WHERE c.org_id <> cs.org_id) AS cs_org_mismatch,
  (SELECT COUNT(*) FROM class_subject cs
     LEFT JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
     WHERE c.id IS NULL) AS cs_orphan_class,
  (SELECT COUNT(*) FROM class_subject cs
     LEFT JOIN staff_profile sp ON sp.user_id = cs.teacher_id AND sp.org_id = cs.org_id
     WHERE cs.teacher_id IS NOT NULL AND sp.user_id IS NULL) AS cs_orphan_teacher,
  (SELECT COUNT(*) FROM school_class c
     LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
     WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL AND s.id IS NULL) AS class_orphan_subject,
  (SELECT COUNT(*) FROM school_class c
     LEFT JOIN staff_profile sp ON sp.user_id = c.teacher_id AND sp.org_id = c.org_id
     WHERE c.teacher_id IS NOT NULL AND c.deleted_at IS NULL AND sp.user_id IS NULL) AS class_orphan_teacher,
  (SELECT COUNT(*) FROM (
     SELECT class_id FROM class_subject WHERE is_primary = 1
     GROUP BY class_id HAVING COUNT(*) > 1) mp) AS multi_primary,
  (SELECT COUNT(*) FROM school_class c
     JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
     WHERE c.deleted_at IS NULL AND c.subject_id IS NOT NULL
       AND c.subject_id <> cs.subject_id) AS primary_subject_mismatch,
  (SELECT COUNT(*) FROM school_class c
     JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
     WHERE c.deleted_at IS NULL AND c.subject_id IS NULL) AS primary_without_class_subject;
