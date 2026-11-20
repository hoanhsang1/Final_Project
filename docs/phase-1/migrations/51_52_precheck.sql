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

-- 0b) Verdict bước tiếp theo. DATA_PRECHECK_READY CHỈ khi class_subject đã đúng
--     toàn bộ schema Revision 3: 20 cột (không thiếu/không thừa) ĐÚNG thuộc tính
--     (kiểu, độ dài, precision/scale, NULL, default, collation, generated), PK,
--     5 nhóm index (PRIMARY + 4), 4 FK đúng bảng/cột đích + đúng ON UPDATE/
--     ON DELETE, 5 CHECK đúng biểu thức, và primary_class_id là cột sinh STORED
--     đúng biểu thức.
--     Thiếu/sai bất kỳ thành phần nào => BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE.
--
--     Index: 5 nhóm index Revision 3 phải đúng tên + danh sách cột + thứ tự +
--     tính UNIQUE + không dùng prefix (SUB_PART). Ngoài 5 nhóm đó chỉ cho phép
--     index hỗ trợ FK do InnoDB tự tạo khi FK chưa có index tiền tố trái:
--       (class_id, org_id)  cho fk_class_subject_class
--       (subject_id, org_id) cho fk_class_subject_subject
--     Các index này phải non-unique và không prefix; mọi index lạ/UNIQUE thừa
--     => bad_extra > 0 => BLOCKED.
--
--     So khớp CHECK/cột sinh bằng cách chuẩn hoá check_clause/generation_expression:
--     bỏ backtick, tiền tố _utf8mb4, khoảng trắng, dấu nháy, ngoặc và backslash,
--     rồi so sánh nguyên văn với biểu thức kỳ vọng (lowercase).
WITH cs_cols AS (
  SELECT COUNT(*) AS total_cols,
         COALESCE(SUM(column_name IN (
           'class_id','subject_id','org_id','curriculum_id','source','sequence_no',
           'teacher_id','is_primary','primary_class_id','required_sessions',
           'planned_sessions','theory_sessions','practice_sessions','session_minutes',
           'status','note','created_by','created_at','updated_by','updated_at')), 0) AS named_cols
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'class_subject'
),
-- Column attributes must match CREATE TABLE in 52. COLUMN_TYPE is compared
-- verbatim; length/precision/scale only where applicable. MySQL 8 reports
-- explicit DEFAULT NULL and "no default" both as NULL, which is semantically
-- identical here (no NOT NULL column relies on an implicit default).
cs_attr AS (
  SELECT COUNT(*) AS bad
  FROM (
    SELECT e.column_name
    FROM (
      SELECT 'class_id' AS column_name, 'char(36)' AS column_type, 'NO' AS is_nullable,
             NULL AS def_value, 36 AS char_len, -1 AS num_precision, -1 AS num_scale,
             'utf8mb4_unicode_ci' AS collation_rule, 'NONE' AS extra_rule
      UNION ALL SELECT 'subject_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'org_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'curriculum_id','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'source','varchar(20)','NO','MANUAL',20,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'sequence_no','smallint','YES',NULL,-1,5,0,'NONE','NONE'
      UNION ALL SELECT 'teacher_id','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'is_primary','tinyint(1)','NO','0',-1,3,0,'NONE','NONE'
      UNION ALL SELECT 'primary_class_id','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','STORED'
      UNION ALL SELECT 'required_sessions','smallint','YES',NULL,-1,5,0,'NONE','NONE'
      UNION ALL SELECT 'planned_sessions','smallint','YES',NULL,-1,5,0,'NONE','NONE'
      UNION ALL SELECT 'theory_sessions','smallint','YES',NULL,-1,5,0,'NONE','NONE'
      UNION ALL SELECT 'practice_sessions','smallint','YES',NULL,-1,5,0,'NONE','NONE'
      UNION ALL SELECT 'session_minutes','smallint','YES',NULL,-1,5,0,'NONE','NONE'
      UNION ALL SELECT 'status','varchar(20)','NO','PLANNED',20,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'note','varchar(500)','YES',NULL,500,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'created_by','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'created_at','datetime(3)','NO',NULL,-1,-1,-1,'NONE','NONE'
      UNION ALL SELECT 'updated_by','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
      UNION ALL SELECT 'updated_at','datetime(3)','YES',NULL,-1,-1,-1,'NONE','NONE'
    ) e
    LEFT JOIN information_schema.columns c
      ON c.table_schema = DATABASE() AND c.table_name = 'class_subject'
     AND c.column_name = e.column_name
    WHERE c.column_name IS NULL
       OR NOT (c.column_type <=> e.column_type)
       OR NOT (c.is_nullable <=> e.is_nullable)
       OR NOT (c.column_default <=> e.def_value)
       OR (e.char_len > -1 AND NOT (c.character_maximum_length <=> e.char_len))
       OR (e.num_precision > -1 AND NOT (c.numeric_precision <=> e.num_precision))
       OR (e.num_scale > -1 AND NOT (c.numeric_scale <=> e.num_scale))
       OR (e.collation_rule = 'NONE' AND c.collation_name IS NOT NULL)
       OR (e.collation_rule <> 'NONE' AND NOT (c.collation_name <=> e.collation_rule))
       OR (e.extra_rule = 'NONE' AND c.extra LIKE '%GENERATED%')
       OR (e.extra_rule = 'STORED'
           AND NOT (c.extra LIKE '%GENERATED%' AND c.extra LIKE '%STORED%'))
  ) d
),
cs_idx AS (
  SELECT COUNT(*) AS total_idx,
         COALESCE(SUM(ok), 0) AS ok_idx,
         COALESCE(MAX(has_prefix), 0) AS idx_prefix,
         COALESCE(SUM(bad_extra), 0) AS bad_extra
  FROM (
    SELECT i.index_name, i.non_unique, i.cols, i.has_prefix,
      CASE
        WHEN i.index_name = 'PRIMARY' AND i.non_unique = 0
          AND i.cols = 'class_id,subject_id' THEN 1
        WHEN i.index_name = 'uq_class_subject_primary' AND i.non_unique = 0
          AND i.cols = 'primary_class_id' THEN 1
        WHEN i.index_name = 'idx_class_subject_org_subject' AND i.non_unique = 1
          AND i.cols = 'org_id,subject_id' THEN 1
        WHEN i.index_name = 'idx_class_subject_teacher' AND i.non_unique = 1
          AND i.cols = 'teacher_id,org_id' THEN 1
        WHEN i.index_name = 'idx_class_subject_curriculum' AND i.non_unique = 1
          AND i.cols = 'curriculum_id,org_id' THEN 1
        ELSE 0
      END AS ok,
      CASE
        WHEN (i.index_name = 'PRIMARY' AND i.non_unique = 0
              AND i.cols = 'class_id,subject_id')
          OR (i.index_name = 'uq_class_subject_primary' AND i.non_unique = 0
              AND i.cols = 'primary_class_id')
          OR (i.index_name = 'idx_class_subject_org_subject' AND i.non_unique = 1
              AND i.cols = 'org_id,subject_id')
          OR (i.index_name = 'idx_class_subject_teacher' AND i.non_unique = 1
              AND i.cols = 'teacher_id,org_id')
          OR (i.index_name = 'idx_class_subject_curriculum' AND i.non_unique = 1
              AND i.cols = 'curriculum_id,org_id')
          OR (i.non_unique = 1 AND i.has_prefix = 0
              AND i.cols IN ('class_id,org_id', 'subject_id,org_id'))
          THEN 0
        ELSE 1
      END AS bad_extra
    FROM (
      SELECT index_name, non_unique,
             GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols,
             MAX(sub_part IS NOT NULL) AS has_prefix
      FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'class_subject'
      GROUP BY index_name, non_unique
    ) i
  ) x
),
cs_fk AS (
  SELECT COUNT(*) AS total_fk,
         COALESCE(SUM(ok), 0) AS ok_fk,
         COALESCE(MAX(wrong_schema), 0) AS fk_wrong_schema,
         COALESCE(SUM(bad_rule), 0) AS fk_rule_bad
  FROM (
    SELECT k.constraint_name, k.map, k.wrong_schema, k.update_rule, k.delete_rule,
      CASE
        WHEN k.constraint_name = 'fk_class_subject_class'
          AND k.map = 'class_id->school_class.id,org_id->school_class.org_id' THEN 1
        WHEN k.constraint_name = 'fk_class_subject_subject'
          AND k.map = 'subject_id->subject.id,org_id->subject.org_id' THEN 1
        WHEN k.constraint_name = 'fk_class_subject_curriculum'
          AND k.map = 'curriculum_id->curriculum.id,org_id->curriculum.org_id' THEN 1
        WHEN k.constraint_name = 'fk_class_subject_teacher'
          AND k.map = 'teacher_id->staff_profile.user_id,org_id->staff_profile.org_id' THEN 1
        ELSE 0
      END AS ok,
      CASE
        WHEN k.constraint_name = 'fk_class_subject_class'
          AND k.update_rule = 'RESTRICT' AND k.delete_rule = 'CASCADE' THEN 0
        WHEN k.constraint_name = 'fk_class_subject_subject'
          AND k.update_rule = 'RESTRICT' AND k.delete_rule = 'RESTRICT' THEN 0
        WHEN k.constraint_name = 'fk_class_subject_curriculum'
          AND k.update_rule = 'RESTRICT' AND k.delete_rule = 'RESTRICT' THEN 0
        WHEN k.constraint_name = 'fk_class_subject_teacher'
          AND k.update_rule = 'RESTRICT' AND k.delete_rule = 'RESTRICT' THEN 0
        ELSE 1
      END AS bad_rule
    FROM (
      SELECT kcu.constraint_name,
             GROUP_CONCAT(CONCAT(kcu.column_name, '->', kcu.referenced_table_name, '.',
                                 kcu.referenced_column_name)
                          ORDER BY kcu.ordinal_position SEPARATOR ',') AS map,
             MAX(kcu.referenced_table_schema <> DATABASE()) AS wrong_schema,
             MAX(rc.update_rule) AS update_rule,
             MAX(rc.delete_rule) AS delete_rule
      FROM information_schema.key_column_usage kcu
      LEFT JOIN information_schema.referential_constraints rc
        ON rc.constraint_schema = kcu.constraint_schema
       AND rc.constraint_name = kcu.constraint_name
       AND rc.table_name = kcu.table_name
      WHERE kcu.table_schema = DATABASE() AND kcu.table_name = 'class_subject'
        AND kcu.referenced_table_name IS NOT NULL
      GROUP BY kcu.constraint_name
    ) k
  ) y
),
cs_chk AS (
  SELECT COUNT(*) AS total_chk,
         COALESCE(SUM(ok), 0) AS ok_chk
  FROM (
    SELECT tc.constraint_name, cc.norm,
      CASE
        WHEN tc.constraint_name = 'chk_class_subject_status'
          AND cc.norm = 'statusinplanned,active,completed,cancelled' THEN 1
        WHEN tc.constraint_name = 'chk_class_subject_source'
          AND cc.norm = 'sourceinlegacy,curriculum,manual' THEN 1
        WHEN tc.constraint_name = 'chk_class_subject_primary'
          AND cc.norm = 'is_primaryin0,1' THEN 1
        WHEN tc.constraint_name = 'chk_class_subject_sessions'
          AND cc.norm = 'planned_sessionsisnullorplanned_sessions>=0andrequired_sessionsisnullorrequired_sessions>0andsession_minutesisnullorsession_minutes>0' THEN 1
        WHEN tc.constraint_name = 'chk_class_subject_sequence'
          AND cc.norm = 'sequence_noisnullorsequence_no>0' THEN 1
        ELSE 0
      END AS ok
    FROM information_schema.table_constraints tc
    -- MySQL 8 stores CHECK_CLAUSE with escaped string literals:
    --   (_utf8mb4\'PLANNED\',_utf8mb4\'ACTIVE\')   on 8.0.16+ via information_schema
    -- while SHOW CREATE / dumps print _utf8mb4'PLANNED'. Removing CHAR(92) (backslash)
    -- after the quotes makes the match independent of that display form. Tab/LF/CR
    -- are removed too so a clause spread over several lines normalises the same way
    -- as the single-line expected string.
    JOIN (
      SELECT constraint_schema, constraint_name,
             LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
               REPLACE(REPLACE(REPLACE(
               check_clause, '`', ''), '_utf8mb4', ''), ' ', ''), '''', ''),
               '(', ''), ')', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''),
               CHAR(92), '')) AS norm
      FROM information_schema.check_constraints
      WHERE constraint_schema = DATABASE()
    ) cc
      ON cc.constraint_schema = tc.constraint_schema
     AND cc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = DATABASE() AND tc.table_name = 'class_subject'
      AND tc.constraint_type = 'CHECK'
  ) z
),
cs_gen AS (
  SELECT COUNT(*) AS n,
         COALESCE(SUM(
           LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
             REPLACE(REPLACE(
             generation_expression, '`', ''), ' ', ''), '(', ''), ')', ''),
             '''', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''),
             CHAR(92), '')) = 'casewhenis_primary=1thenclass_idend'
         ), 0) AS ok
  FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'class_subject'
    AND column_name = 'primary_class_id'
    AND extra LIKE '%GENERATED%' AND extra LIKE '%STORED%'
)
SELECT
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'class_subject') AS class_subject_exists,
  (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'teacher_subject') AS teacher_subject_exists,
  cs_cols.total_cols, cs_cols.named_cols,
  cs_attr.bad AS attr_mismatch,
  cs_idx.ok_idx, cs_idx.idx_prefix, cs_idx.bad_extra, cs_idx.total_idx,
  cs_fk.total_fk, cs_fk.ok_fk, cs_fk.fk_wrong_schema, cs_fk.fk_rule_bad,
  cs_chk.total_chk, cs_chk.ok_chk,
  cs_gen.n AS gen_rows, cs_gen.ok AS gen_ok,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables
           WHERE table_schema = DATABASE() AND table_name = 'class_subject') = 0
      THEN 'SKIP_DATA_PRECHECK_NO_TABLE'
    WHEN cs_cols.total_cols = 20 AND cs_cols.named_cols = 20
      AND cs_attr.bad = 0
      AND cs_idx.ok_idx = 5 AND cs_idx.idx_prefix = 0 AND cs_idx.bad_extra = 0
      AND cs_fk.total_fk = 4 AND cs_fk.ok_fk = 4 AND cs_fk.fk_wrong_schema = 0
      AND cs_fk.fk_rule_bad = 0
      AND cs_chk.total_chk = 5 AND cs_chk.ok_chk = 5
      AND cs_gen.n = 1 AND cs_gen.ok = 1
      THEN 'DATA_PRECHECK_READY'
    ELSE 'BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE'
  END AS next_step
FROM cs_cols, cs_attr, cs_idx, cs_fk, cs_chk, cs_gen;

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

-- 0d) Cấu trúc index thực tế của class_subject (đối chiếu kỳ vọng ở 0b).
--     expect_cols: danh sách cột + thứ tự; non_unique=0 => UNIQUE.
--     Dòng '(FK-support ...)' là index InnoDB tự tạo cho FK khi chưa có index
--     tiền tố trái; được phép nếu non_unique=1 và không prefix.
SELECT i.index_name, i.non_unique, i.cols,
       CASE i.index_name
         WHEN 'PRIMARY' THEN 'class_id,subject_id'
         WHEN 'uq_class_subject_primary' THEN 'primary_class_id'
         WHEN 'idx_class_subject_org_subject' THEN 'org_id,subject_id'
         WHEN 'idx_class_subject_teacher' THEN 'teacher_id,org_id'
         WHEN 'idx_class_subject_curriculum' THEN 'curriculum_id,org_id'
         ELSE
           CASE
             WHEN i.non_unique = 1
               AND i.cols IN ('class_id,org_id', 'subject_id,org_id')
               THEN CONCAT('(FK-support ', i.cols, ')')
             ELSE '(không thuộc Revision 3)'
           END
       END AS expect_cols
FROM (
  SELECT index_name, non_unique,
         GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols
  FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'class_subject'
  GROUP BY index_name, non_unique
) i
ORDER BY i.index_name;

-- 0d2) PRIMARY KEY phải đúng (class_id, subject_id). present = 0 => sai/thiếu.
SELECT 'PRIMARY(class_id,subject_id)' AS required_pk,
       (SELECT COUNT(*) FROM (
          SELECT index_name
          FROM information_schema.statistics
          WHERE table_schema = DATABASE() AND table_name = 'class_subject' AND index_name = 'PRIMARY'
          GROUP BY index_name
          HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') = 'class_id,subject_id'
        ) pk) AS present;

-- 0e) FK thực tế của class_subject: cột nguồn -> bảng.cột đích (theo thứ tự).
--     expect_map: mapping kỳ vọng; lệch => 0b trả BLOCKED.
SELECT k.constraint_name, k.map,
       CASE k.constraint_name
         WHEN 'fk_class_subject_class'
           THEN 'class_id->school_class.id,org_id->school_class.org_id'
         WHEN 'fk_class_subject_subject'
           THEN 'subject_id->subject.id,org_id->subject.org_id'
         WHEN 'fk_class_subject_curriculum'
           THEN 'curriculum_id->curriculum.id,org_id->curriculum.org_id'
         WHEN 'fk_class_subject_teacher'
           THEN 'teacher_id->staff_profile.user_id,org_id->staff_profile.org_id'
         ELSE '(không thuộc Revision 3)'
       END AS expect_map
FROM (
  SELECT constraint_name,
         GROUP_CONCAT(CONCAT(column_name, '->', referenced_table_name, '.',
                             referenced_column_name)
                      ORDER BY ordinal_position SEPARATOR ',') AS map
  FROM information_schema.key_column_usage
  WHERE table_schema = DATABASE() AND table_name = 'class_subject'
    AND referenced_table_name IS NOT NULL
  GROUP BY constraint_name
) k
ORDER BY k.constraint_name;

-- 0e2) CHECK thực tế của class_subject (biểu thức đã chuẩn hoá như 0b).
SELECT tc.constraint_name, cc.norm AS normalized_clause,
       CASE tc.constraint_name
         WHEN 'chk_class_subject_status'
           THEN 'statusinplanned,active,completed,cancelled'
         WHEN 'chk_class_subject_source'
           THEN 'sourceinlegacy,curriculum,manual'
         WHEN 'chk_class_subject_primary' THEN 'is_primaryin0,1'
         WHEN 'chk_class_subject_sessions'
           THEN 'planned_sessionsisnullorplanned_sessions>=0andrequired_sessionsisnullorrequired_sessions>0andsession_minutesisnullorsession_minutes>0'
         WHEN 'chk_class_subject_sequence' THEN 'sequence_noisnullorsequence_no>0'
         ELSE '(không thuộc Revision 3)'
       END AS expect_clause
FROM information_schema.table_constraints tc
JOIN (
  SELECT constraint_schema, constraint_name,
         LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
           REPLACE(REPLACE(REPLACE(
           check_clause, '`', ''), '_utf8mb4', ''), ' ', ''), '''', ''),
           '(', ''), ')', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''),
           CHAR(92), '')) AS norm
  FROM information_schema.check_constraints
  WHERE constraint_schema = DATABASE()
) cc
  ON cc.constraint_schema = tc.constraint_schema
 AND cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = DATABASE() AND tc.table_name = 'class_subject'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.constraint_name;

-- 0f) Generated column primary_class_id: phải là STORED GENERATED và đúng biểu thức
--     `CASE WHEN is_primary = 1 THEN class_id END`. 0 dòng => thiếu/sai/sai loại.
SELECT column_name, extra, generation_expression,
       LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
         generation_expression, '`', ''), ' ', ''), '(', ''), ')', ''),
         '''', ''), CHAR(92), '')) AS normalized_expression,
       (LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          generation_expression, '`', ''), ' ', ''), '(', ''), ')', ''),
          '''', ''), CHAR(92), '')) = 'casewhenis_primary=1thenclass_idend') AS expression_ok
FROM information_schema.columns
WHERE table_schema = DATABASE() AND table_name = 'class_subject'
  AND column_name = 'primary_class_id'
  AND extra LIKE '%GENERATED%' AND extra LIKE '%STORED%';

-- 0g) teacher_subject phải theo D-06a: CHECK không chứa PENDING.
--     has_pending > 0 => bảng cũ, 52 sẽ ABORT (không tự sửa).
SELECT constraint_name, check_clause,
       (check_clause LIKE '%PENDING%') AS has_pending
FROM information_schema.check_constraints
WHERE constraint_schema = DATABASE() AND constraint_name = 'chk_teacher_subject_status';

-- 0h) Hai bảng phụ của 52: nếu đã tồn tại, 52 sẽ audit đầy đủ và ABORT khi lệch.
--     Kỳ vọng: history có FK class kiểu RESTRICT/RESTRICT (không CASCADE);
--     specialty_subject có specialty CASCADE/RESTRICT và subject RESTRICT/RESTRICT.
--     0h column_count = 0 => bảng chưa tồn tại (52 sẽ CREATE).
SELECT 'class_subject_history' AS table_name,
       (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'class_subject_history') AS column_count
UNION ALL
SELECT 'specialty_subject',
       (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = 'specialty_subject');

SELECT table_name, constraint_name, update_rule, delete_rule
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
  AND table_name IN ('class_subject_history', 'specialty_subject')
ORDER BY table_name, constraint_name;

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
