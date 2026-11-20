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
--     phải bảo đảm bằng transaction/app). Chỉ xét lớp có school_class.subject_id NOT NULL.
SELECT c.id
FROM school_class c
JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id
WHERE c.deleted_at IS NULL AND c.subject_id IS NOT NULL
GROUP BY c.id
HAVING SUM(cs.is_primary = 1) = 0;

-- 2c) Primary lệch school_class.subject_id (phải 0)
SELECT c.id, c.subject_id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.deleted_at IS NULL AND c.subject_id IS NOT NULL AND c.subject_id <> cs.subject_id;

-- 2d) Lớp subject_id NULL nhưng lại có primary (phải 0)
SELECT c.id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.deleted_at IS NULL AND c.subject_id IS NULL;

-- 2e) Lớp còn sống có subject_id nhưng KHÔNG có dòng class_subject nào.
--     Sau backfill 5a phải 0: mọi lớp như vậy đều được tạo dòng LEGACY hoặc đã bị
--     chặn ở BLOCK_MIGRATION trước khi chạy 52.
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

-- 4d) class_subject không có school_class tương ứng (orphan class)
SELECT cs.class_id, cs.subject_id, cs.org_id
FROM class_subject cs
LEFT JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
WHERE c.id IS NULL;

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

-- 5b) Số cột phải đúng Revision-5: history 19, specialty_subject 5.
SELECT 'class_subject_history' AS t, COUNT(*) AS cols,
       (COUNT(*) = 19) AS cols_ok
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'class_subject_history'
UNION ALL
SELECT 'specialty_subject', COUNT(*), (COUNT(*) = 5)
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'specialty_subject';

-- 5b.1) Cột Revision-5 phải tồn tại đúng nullability (0 dòng = đúng).
SELECT e.column_name, c.is_nullable AS actual_nullable, e.expect_nullable
FROM (
            SELECT 'old_teacher_name' AS column_name, 'YES' AS expect_nullable
  UNION ALL SELECT 'request_fingerprint', 'NO'
  UNION ALL SELECT 'changed_by_name', 'YES'
) e
LEFT JOIN information_schema.columns c
  ON c.table_schema = DATABASE() AND c.table_name = 'class_subject_history'
 AND c.column_name = e.column_name
WHERE c.column_name IS NULL OR c.is_nullable <> e.expect_nullable;

-- 5b.2) D-04: subject phải có UNIQUE (org_id, code) (0 dòng = đúng).
SELECT 'subject_uq_org_code_missing' AS issue
FROM (SELECT 1 AS one) x
WHERE NOT EXISTS (
  SELECT 1
  FROM (
    SELECT index_name, non_unique,
           GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols
    FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'subject'
    GROUP BY index_name, non_unique
  ) i
  WHERE i.non_unique = 0 AND i.cols = 'org_id,code'
);

-- 5c) PK + UNIQUE phải đúng cột/thứ tự (0 dòng = đúng).
SELECT x.table_name, x.index_name, x.cols, e.expect AS expected_cols
FROM (
  SELECT table_name, index_name,
         GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name IN ('class_subject_history','specialty_subject')
    AND index_name IN ('PRIMARY','uq_csh_operation')
  GROUP BY table_name, index_name
) x
JOIN (
            SELECT 'class_subject_history' AS table_name, 'PRIMARY' AS index_name,
                   'id' AS expect
  UNION ALL SELECT 'class_subject_history', 'uq_csh_operation', 'org_id,operation_id'
  UNION ALL SELECT 'specialty_subject', 'PRIMARY', 'specialty_id,subject_id'
) e ON e.table_name = x.table_name AND e.index_name = x.index_name
WHERE x.cols <> e.expect;

-- 5d) Referential action phải đúng DDL (0 dòng = đúng).
--     history.fk_csh_class bắt buộc RESTRICT/RESTRICT: xoá lớp KHÔNG được xoá lịch sử.
SELECT rc.table_name, rc.constraint_name,
       rc.update_rule, rc.delete_rule,
       CASE rc.constraint_name
         WHEN 'fk_class_subject_class'         THEN 'RESTRICT/CASCADE'
         WHEN 'fk_class_subject_subject'       THEN 'RESTRICT/RESTRICT'
         WHEN 'fk_class_subject_curriculum'    THEN 'RESTRICT/RESTRICT'
         WHEN 'fk_class_subject_teacher'       THEN 'RESTRICT/RESTRICT'
         WHEN 'fk_teacher_subject_teacher'     THEN 'RESTRICT/CASCADE'
         WHEN 'fk_teacher_subject_subject'     THEN 'RESTRICT/RESTRICT'
         WHEN 'fk_csh_class'                   THEN 'RESTRICT/RESTRICT'
         WHEN 'fk_specialty_subject_specialty' THEN 'RESTRICT/CASCADE'
         WHEN 'fk_specialty_subject_subject'   THEN 'RESTRICT/RESTRICT'
         ELSE '(ngoài phạm vi WP1)'
       END AS expected
FROM information_schema.referential_constraints rc
WHERE rc.constraint_schema = DATABASE()
  AND rc.table_name IN ('class_subject','teacher_subject',
                        'class_subject_history','specialty_subject')
  AND NOT (
        (rc.constraint_name = 'fk_class_subject_class'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'CASCADE')
     OR (rc.constraint_name = 'fk_class_subject_subject'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'RESTRICT')
     OR (rc.constraint_name = 'fk_class_subject_curriculum'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'RESTRICT')
     OR (rc.constraint_name = 'fk_class_subject_teacher'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'RESTRICT')
     OR (rc.constraint_name = 'fk_teacher_subject_teacher'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'CASCADE')
     OR (rc.constraint_name = 'fk_teacher_subject_subject'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'RESTRICT')
     OR (rc.constraint_name = 'fk_csh_class'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'RESTRICT')
     OR (rc.constraint_name = 'fk_specialty_subject_specialty'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'CASCADE')
     OR (rc.constraint_name = 'fk_specialty_subject_subject'
          AND rc.update_rule = 'RESTRICT' AND rc.delete_rule = 'RESTRICT'))
ORDER BY rc.table_name, rc.constraint_name;

-- 5e) Chẩn đoán CHECK_CLAUSE (F-01): in raw + normalized để xác nhận chuẩn hoá
--     bỏ được backslash của MySQL 8.0.16+ (_utf8mb4\'X\'). CHỈ ĐỌC, không phải
--     gate. `norm` phải khớp biểu thức kỳ vọng dù raw có `\'` hay không.
--     information_schema.check_constraints không có table_name -> join table_constraints.
SELECT tc.table_name, tc.constraint_name, cc.check_clause AS raw_clause,
       LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
         REPLACE(REPLACE(REPLACE(
         cc.check_clause, '`', ''), '_utf8mb4', ''), ' ', ''), '''', ''),
         '(', ''), ')', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''),
         CHAR(92), '')) AS norm
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_schema = tc.constraint_schema
 AND cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = DATABASE()
  AND tc.constraint_type = 'CHECK'
  AND tc.table_name IN ('class_subject','teacher_subject','class_subject_history',
                        'curriculum_subject','curriculum_subject_prerequisite')
ORDER BY tc.table_name, tc.constraint_name;

-- 6) History phải rỗng ngay sau migration (không backfill hồi tố)
SELECT COUNT(*) AS history_rows_after_migration FROM class_subject_history;

-- =============================================================================
-- 7) PHÂN LOẠI SAU MIGRATION — chạy NGAY sau 52, trước mọi thay đổi nghiệp vụ.
-- Kỳ vọng: BLOCK_MIGRATION = 0, AUTO_BACKFILL_CANDIDATE = 0,
--         NO_ACTION = đúng số lớp còn sống. Không có nhãn "chờ duyệt":
--         mọi mâu thuẫn primary phải được xử lý TRƯỚC 52, không ghi nhận suông.
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

