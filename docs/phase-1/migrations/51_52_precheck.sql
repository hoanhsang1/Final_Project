-- =============================================================================
-- DRAFT ONLY — READ-ONLY PRE-CHECK. DO NOT RUN ON PRODUCTION.
-- Run on STAGING before 51/52. Every returned row must go into the manual
-- review report; migrations must NOT guess or auto-fix ambiguous data.
-- Target: MySQL 8.0.16+, mems_people_db.
-- NOTE: queries 4-7 and section B read class_subject; run them only after
--       confirming the table exists (query 0). Skip them on a database that
--       never had class_subject.
--
-- SECTION B CLASSIFIES EVERY LIVE CLASS INTO EXACTLY ONE OF:
--   AUTO_BACKFILL_CANDIDATE — deterministic exact-match backfill (safe for 52)
--   MANUAL_REVIEW           — conflict; migration may run but row must be
--                             resolved by a human, never auto-picked
--   BLOCK_MIGRATION         — 52 cannot run safely; fix data first
--   NO_ACTION               — already consistent
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

-- =============================================================================
-- SECTION B — PHÂN LOẠI BACKFILL (chạy sau query 0; cần bảng class_subject)
-- Một lớp chỉ thuộc đúng một nhãn, theo thứ tự ưu tiên:
--   BLOCK_MIGRATION > MANUAL_REVIEW > AUTO_BACKFILL_CANDIDATE > NO_ACTION
-- =============================================================================

-- 10) Phân loại từng lớp còn sống (một dòng/lớp)
--     BLOCK_MIGRATION:
--       CS_ORPHAN_SUBJECT   — class_subject.subject_id không có trong subject cùng org
--       CS_ORG_MISMATCH     — class_subject.org_id lệch school_class.org_id
--       CLASS_ORPHAN_SUBJECT— school_class.subject_id không có trong subject cùng org
--       MULTI_PRIMARY       — >1 dòng is_primary=1 cho cùng lớp (UNIQUE sẽ fail)
--     MANUAL_REVIEW:
--       PRIMARY_SUBJECT_MISMATCH — có primary nhưng khác school_class.subject_id
--       PRIMARY_WITHOUT_CLASS_SUBJECT — school_class.subject_id NULL nhưng có primary
--     AUTO_BACKFILL_CANDIDATE:
--       INSERT_LEGACY_ROW — chưa có dòng khớp, chưa có primary (5a)
--       MARK_EXACT_PRIMARY — đã có dòng khớp, chưa có primary (5b)
--     NO_ACTION: đã có primary khớp chính xác, hoặc lớp không có môn.
WITH per_class AS (
  SELECT
    c.id AS class_id,
    c.org_id,
    c.status,
    c.subject_id,
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
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND s.id IS NULL) AS cs_orphan_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id <> c.org_id) AS cs_org_bad_rows,
    (SELECT COUNT(*) FROM subject s
      WHERE s.id = c.subject_id AND s.org_id = c.org_id) AS subject_ok
  FROM school_class c
  WHERE c.deleted_at IS NULL
)
SELECT
  class_id, org_id, status, subject_id,
  cs_rows, exact_rows, primary_rows, primary_exact_rows,
  cs_orphan_rows, cs_org_bad_rows,
  CASE
    WHEN cs_orphan_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN cs_org_bad_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NOT NULL AND subject_ok = 0 THEN 'BLOCK_MIGRATION'
    WHEN primary_rows > 1 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NULL AND primary_rows > 0 THEN 'MANUAL_REVIEW'
    WHEN subject_id IS NULL THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_exact_rows = 1 THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    WHEN exact_rows > 0 AND primary_rows > 0 THEN 'MANUAL_REVIEW'
    WHEN exact_rows = 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    ELSE 'MANUAL_REVIEW'
  END AS classification,
  CASE
    WHEN cs_orphan_rows > 0 THEN 'CS_ORPHAN_SUBJECT'
    WHEN cs_org_bad_rows > 0 THEN 'CS_ORG_MISMATCH'
    WHEN subject_id IS NOT NULL AND subject_ok = 0 THEN 'CLASS_ORPHAN_SUBJECT'
    WHEN primary_rows > 1 THEN 'MULTI_PRIMARY'
    WHEN subject_id IS NULL AND primary_rows > 0 THEN 'PRIMARY_WITHOUT_CLASS_SUBJECT'
    WHEN subject_id IS NULL THEN 'NO_SUBJECT'
    WHEN exact_rows > 0 AND primary_exact_rows = 1 THEN 'PRIMARY_OK'
    WHEN exact_rows > 0 AND primary_rows = 0 THEN 'MARK_EXACT_PRIMARY'
    WHEN exact_rows > 0 AND primary_rows > 0 THEN 'PRIMARY_SUBJECT_MISMATCH'
    WHEN exact_rows = 0 AND primary_rows = 0 THEN 'INSERT_LEGACY_ROW'
    ELSE 'PRIMARY_SUBJECT_MISMATCH'
  END AS reason_code
FROM per_class
ORDER BY
  FIELD(classification, 'BLOCK_MIGRATION', 'MANUAL_REVIEW', 'AUTO_BACKFILL_CANDIDATE', 'NO_ACTION'),
  org_id, class_id;

-- 11) Tổng hợp theo nhãn — 52 chỉ được chạy khi BLOCK_MIGRATION = 0 và
--     MANUAL_REVIEW đã được người dùng xử lý hoặc chấp nhận ghi nhận.
WITH per_class AS (
  SELECT
    c.id AS class_id, c.org_id, c.subject_id,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND cs.subject_id = c.subject_id) AS exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1) AS primary_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.is_primary = 1 AND cs.subject_id = c.subject_id) AS primary_exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND s.id IS NULL) AS cs_orphan_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id <> c.org_id) AS cs_org_bad_rows,
    (SELECT COUNT(*) FROM subject s
      WHERE s.id = c.subject_id AND s.org_id = c.org_id) AS subject_ok
  FROM school_class c
  WHERE c.deleted_at IS NULL
)
SELECT classification, COUNT(*) AS classes
FROM (
  SELECT CASE
    WHEN cs_orphan_rows > 0 OR cs_org_bad_rows > 0 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NOT NULL AND subject_ok = 0 THEN 'BLOCK_MIGRATION'
    WHEN primary_rows > 1 THEN 'BLOCK_MIGRATION'
    WHEN subject_id IS NULL AND primary_rows > 0 THEN 'MANUAL_REVIEW'
    WHEN subject_id IS NULL THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_exact_rows = 1 THEN 'NO_ACTION'
    WHEN exact_rows > 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    WHEN exact_rows > 0 AND primary_rows > 0 THEN 'MANUAL_REVIEW'
    WHEN exact_rows = 0 AND primary_rows = 0 THEN 'AUTO_BACKFILL_CANDIDATE'
    ELSE 'MANUAL_REVIEW'
  END AS classification
  FROM per_class
) t
GROUP BY classification;

-- 12) Danh sách BLOCK_MIGRATION (phải 0 dòng trước khi chạy 52)
SELECT 'CS_ORPHAN_SUBJECT' AS block_code, cs.class_id, cs.subject_id, cs.org_id
FROM class_subject cs
LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
WHERE s.id IS NULL
UNION ALL
SELECT 'CS_ORG_MISMATCH', cs.class_id, cs.subject_id, cs.org_id
FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id
UNION ALL
SELECT 'CLASS_ORPHAN_SUBJECT', c.id, c.subject_id, c.org_id
FROM school_class c
LEFT JOIN subject s ON s.id = c.subject_id AND s.org_id = c.org_id
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL AND s.id IS NULL
UNION ALL
SELECT 'MULTI_PRIMARY', class_id, NULL, org_id
FROM class_subject
WHERE is_primary = 1
GROUP BY class_id, org_id
HAVING COUNT(*) > 1;

-- 13) Danh sách MANUAL_REVIEW (không tự sửa; đưa vào báo cáo duyệt tay)
SELECT 'PRIMARY_SUBJECT_MISMATCH' AS review_code, c.id AS class_id, c.subject_id,
       cs.subject_id AS primary_subject_id, c.org_id
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NOT NULL AND c.subject_id <> cs.subject_id
UNION ALL
SELECT 'PRIMARY_WITHOUT_CLASS_SUBJECT', c.id, NULL, cs.subject_id, c.org_id
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NULL;

