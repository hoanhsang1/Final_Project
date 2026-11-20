-- =============================================================================
-- DRAFT ONLY — READ-ONLY POST-CHECK. Run AFTER 51 and 52 on STAGING.
-- Target: MySQL 8.0.16+, mems_people_db.
-- =============================================================================
USE mems_people_db;

-- 1) Đếm bảng mới
SELECT 'curriculum' AS t, COUNT(*) AS n FROM curriculum
UNION ALL SELECT 'curriculum_subject', COUNT(*) FROM curriculum_subject
UNION ALL SELECT 'curriculum_subject_prerequisite', COUNT(*) FROM curriculum_subject_prerequisite
UNION ALL SELECT 'class_subject', COUNT(*) FROM class_subject
UNION ALL SELECT 'class_subject_history', COUNT(*) FROM class_subject_history
UNION ALL SELECT 'specialty_subject', COUNT(*) FROM specialty_subject
UNION ALL SELECT 'teacher_subject', COUNT(*) FROM teacher_subject;

-- 2) Bất biến primary — TẤT CẢ phải trả 0 dòng

-- 2a) Lớp có >1 primary (UNIQUE phải chặn; nếu có dòng => index chưa đúng)
SELECT class_id, COUNT(*) AS n
FROM class_subject
WHERE is_primary = 1
GROUP BY class_id
HAVING COUNT(*) > 1;

-- 2b) Lớp có class_subject nhưng KHÔNG có primary (UNIQUE không bảo đảm tối thiểu;
--     phải bảo đảm bằng transaction/app + báo cáo nếu khác 0)
SELECT c.id
FROM school_class c
JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id
WHERE c.deleted_at IS NULL
GROUP BY c.id
HAVING SUM(cs.is_primary = 1) = 0;

-- 2c) Primary lệch school_class.subject_id (phải 0)
SELECT c.id, c.subject_id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NULL OR c.subject_id <> cs.subject_id;

-- 2d) Lớp subject_id NULL nhưng lại có primary (phải 0)
SELECT c.id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NULL;

-- 2e) Lớp có subject_id nhưng KHÔNG có dòng class_subject nào.
--     Đây là danh sách UNRESOLVED (backfill không đoán được) — phải khớp
--     đúng báo cáo manual review từ pre-check, không được phát sinh mới.
SELECT c.id AS class_id, c.org_id, c.subject_id
FROM school_class c
WHERE c.subject_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_subject cs
    WHERE cs.class_id = c.id AND cs.org_id = c.org_id);

-- 3) Generated column primary_class_id đúng (MySQL only)
SELECT COUNT(*) AS wrong_generated
FROM class_subject
WHERE (is_primary = 1 AND primary_class_id IS NULL)
   OR (is_primary = 0 AND primary_class_id IS NOT NULL);

-- 4) Org chéo (phải 0)
SELECT COUNT(*) AS class_subject_org_mismatch
FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id;

SELECT COUNT(*) AS history_org_mismatch
FROM class_subject_history h JOIN school_class c ON c.id = h.class_id
WHERE c.org_id <> h.org_id;

SELECT COUNT(*) AS history_new_subject_cross_org
FROM class_subject_history h
LEFT JOIN subject s ON s.id = h.new_subject_id AND s.org_id = h.org_id
WHERE s.id IS NULL;

-- 5) Index/constraint tồn tại
SELECT table_name, index_name, non_unique
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN ('uq_school_class_id_org','uq_class_subject_primary','uq_csh_operation')
GROUP BY table_name, index_name, non_unique;

SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_name IN ('fk_class_subject_class','fk_school_class_curriculum',
                          'fk_csh_class','chk_class_subject_primary','chk_csh_subject_change');

-- 6) History phải rỗng ngay sau migration (không backfill hồi tố)
SELECT COUNT(*) AS history_rows_after_migration FROM class_subject_history;

-- =============================================================================
-- 7) PHÂN LOẠI SAU MIGRATION — chạy NGAY sau 52, trước mọi thay đổi nghiệp vụ.
-- Kỳ vọng: BLOCK_MIGRATION = 0, AUTO_BACKFILL_CANDIDATE = 0,
--         NO_ACTION = số lớp còn sống; MANUAL_REVIEW phải khớp đúng danh sách
--         người dùng đã chấp nhận từ pre-check section B (không phát sinh mới).
-- =============================================================================

-- 7a) Tổng hợp nhãn
WITH per_class AS (
  SELECT
    c.id AS class_id, c.org_id, c.subject_id,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id) AS cs_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND cs.subject_id = c.subject_id) AS exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1) AS primary_rows,
    (SELECT COUNT(*) FROM class_subject cs
      WHERE cs.class_id = c.id AND cs.org_id = c.org_id
        AND cs.is_primary = 1 AND cs.subject_id = c.subject_id) AS primary_exact_rows,
    (SELECT COUNT(*) FROM class_subject cs
      LEFT JOIN subject s ON s.id = cs.subject_id AND s.org_id = cs.org_id
      WHERE cs.class_id = c.id AND cs.org_id = cs.org_id AND s.id IS NULL) AS cs_orphan_rows,
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

-- 7b) Backfill không được tạo khóa trùng (PK phải chặn; nếu có dòng => PK thiếu)
SELECT class_id, subject_id, COUNT(*) AS n
FROM class_subject
GROUP BY class_id, subject_id
HAVING COUNT(*) > 1;

-- 7c) Không được tạo primary khi school_class.subject_id IS NULL
--     (chỉ lớp còn sống — phạm vi pre-check phần B)
SELECT c.id AS class_id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NULL AND c.deleted_at IS NULL;

-- 7d) Không được ghi đè primary đang mâu thuẫn: mọi primary phải khớp subject_id
SELECT c.id AS class_id, c.subject_id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NOT NULL AND c.subject_id <> cs.subject_id
  AND c.deleted_at IS NULL;

-- 7e) Dòng LEGACY phải khớp chính xác môn chính tại thời điểm ngay sau migration
SELECT cs.class_id, cs.subject_id
FROM class_subject cs
JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
WHERE cs.source = 'LEGACY'
  AND c.deleted_at IS NULL
  AND (c.subject_id IS NULL OR c.subject_id <> cs.subject_id);

