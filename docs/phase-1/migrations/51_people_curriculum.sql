-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS People DB — Migration 51: curriculum templates (Phase 1 Revision 3).
-- Target: MySQL 8.0.16+ (CHECK enforced), database mems_people_db.
-- Run AFTER docs/phase-1/migrations/51_52_precheck.sql returned the expected results.
-- Additive and idempotent. Does NOT drop columns/data.
-- Must run BEFORE 52_people_class_subject.sql (52 needs uq_school_class_id_org).
--
-- EXISTING curriculum* TABLES (F-02): CREATE TABLE IF NOT EXISTS alone would
-- silently accept an older draft with a different definition. Before any DDL the
-- three curriculum tables are audited (columns + attributes, PK, unique/secondary
-- indexes, FK mappings + ON UPDATE/DELETE, CHECKs). Absent => created below;
-- present+matching => continue; present+different => SIGNAL 45000, no auto-ALTER.
--
-- PRIVILEGES (UNVERIFIED until checked on staging): CREATE, ALTER, DROP, INDEX,
-- REFERENCES, CREATE ROUTINE, ALTER ROUTINE, EXECUTE, SELECT/INSERT/UPDATE.
-- Verify with 51_52_precheck.sql §0j + SHOW GRANTS FOR CURRENT_USER().
-- =============================================================================
USE mems_people_db;

DELIMITER $

-- Helpers are idempotent but never silently accept a same-name object with a
-- different definition: absent => ADD, present+matching => continue,
-- present+mismatched => SIGNAL 45000 (no auto-ALTER of an unknown old object).

DROP PROCEDURE IF EXISTS mems_m51_add_col$
CREATE PROCEDURE mems_m51_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500), IN p_type VARCHAR(64),
                                  IN p_nullable VARCHAR(3), IN p_default VARCHAR(64))
BEGIN
  DECLARE v_type VARCHAR(64) DEFAULT NULL;
  DECLARE v_nullable VARCHAR(3) DEFAULT NULL;
  DECLARE v_default VARCHAR(64) DEFAULT NULL;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M51 ABORT: target table for add_col does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND column_name = p_col) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  ELSE
    SELECT column_type, is_nullable, column_default
      INTO v_type, v_nullable, v_default
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = p_table
      AND column_name = p_col;
    IF NOT (v_type <=> p_type) OR NOT (v_nullable <=> p_nullable)
       OR NOT (v_default <=> p_default) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M51 ABORT: existing column definition differs from expected (type/null/default)';
    END IF;
  END IF;
END$

DROP PROCEDURE IF EXISTS mems_m51_add_fk$
CREATE PROCEDURE mems_m51_add_fk(IN p_table VARCHAR(64), IN p_fk VARCHAR(64),
                                 IN p_ddl VARCHAR(500), IN p_map VARCHAR(500),
                                 IN p_update_rule VARCHAR(16), IN p_delete_rule VARCHAR(16))
BEGIN
  DECLARE v_map VARCHAR(500) DEFAULT NULL;
  DECLARE v_update VARCHAR(16) DEFAULT NULL;
  DECLARE v_delete VARCHAR(16) DEFAULT NULL;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M51 ABORT: target table for add_fk does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND constraint_name = p_fk AND constraint_type = 'FOREIGN KEY') THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_fk, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  ELSE
    SELECT GROUP_CONCAT(CONCAT(column_name, '->', referenced_table_name, '.',
                               referenced_column_name)
                        ORDER BY ordinal_position SEPARATOR ',')
      INTO v_map
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND table_name = p_table
      AND constraint_name = p_fk AND referenced_table_name IS NOT NULL;
    SELECT update_rule, delete_rule INTO v_update, v_delete
    FROM information_schema.referential_constraints
    WHERE constraint_schema = DATABASE() AND table_name = p_table
      AND constraint_name = p_fk;
    IF NOT (v_map <=> p_map) OR NOT (v_update <=> p_update_rule)
       OR NOT (v_delete <=> p_delete_rule) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M51 ABORT: existing FK differs from expected (mapping/update/delete rule)';
    END IF;
  END IF;
END$

DROP PROCEDURE IF EXISTS mems_m51_add_unique$
CREATE PROCEDURE mems_m51_add_unique(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                     IN p_cols VARCHAR(255))
BEGIN
  DECLARE v_cols VARCHAR(500) DEFAULT NULL;
  DECLARE v_non_unique INT DEFAULT NULL;
  DECLARE v_prefix INT DEFAULT NULL;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE() AND table_name = p_table) THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M51 ABORT: target table for add_unique does not exist';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND index_name = p_index) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE KEY `', p_index, '` (', p_cols, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  ELSE
    SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ','),
           MAX(non_unique), MAX(sub_part IS NOT NULL)
      INTO v_cols, v_non_unique, v_prefix
    FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = p_table
      AND index_name = p_index;
    IF v_non_unique <> 0 OR v_prefix <> 0
       OR NOT (v_cols <=> REPLACE(p_cols, ' ', '')) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M51 ABORT: existing index differs from expected (unique/columns/prefix)';
    END IF;
  END IF;
END$

-- ---------------------------------------------------------------------------
-- F-04: pin the schema explicitly. `USE mems_people_db` above already selects it,
-- but an account without access would fail there with an unclear error; this guard
-- makes "wrong schema" abort immediately. Privileges are NOT verified here (see
-- 51_52_precheck.sql §0j); CREATE ROUTINE / ALTER ROUTINE / EXECUTE and
-- CREATE/ALTER/INDEX/REFERENCES are required by this file.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m51_assert_database$
CREATE PROCEDURE mems_m51_assert_database()
BEGIN
  IF DATABASE() IS NULL OR NOT (DATABASE() <=> 'mems_people_db') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'M51 ABORT: current schema is not mems_people_db; run USE mems_people_db first';
  END IF;
END$

-- ---------------------------------------------------------------------------
-- F-02: CREATE TABLE IF NOT EXISTS is NOT a compatibility check. A same-name
-- table from an older draft with missing columns/wrong keys would be silently
-- accepted and then break 52 (FK to curriculum(id,org_id)) or the service.
-- Absent => LEFT (created below); present+matching => continue; present+wrong
-- => SIGNAL 45000. Never auto-ALTER an unknown old table.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS mems_m51_assert_curriculum_schema$
CREATE PROCEDURE mems_m51_assert_curriculum_schema()
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_total_cols INT DEFAULT 0;
  DECLARE v_cols INT DEFAULT 0;
  DECLARE v_attr_bad INT DEFAULT 0;
  DECLARE v_idx_ok INT DEFAULT 0;
  DECLARE v_idx_prefix INT DEFAULT 0;
  DECLARE v_idx_extra INT DEFAULT 0;
  DECLARE v_pk INT DEFAULT 0;
  DECLARE v_fk_total INT DEFAULT 0;
  DECLARE v_chk_total INT DEFAULT 0;

  cur_check: BEGIN
    SELECT COUNT(*) INTO v_exists FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'curriculum';
    IF v_exists = 0 THEN
      LEAVE cur_check;
    END IF;

    SELECT COUNT(*),
           COALESCE(SUM(column_name IN (
             'id','org_id','code','name','name_unaccented','description',
             'grade_level','program_code','is_active','version','created_by',
             'created_at','updated_by','updated_at')), 0)
    INTO v_total_cols, v_cols
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'curriculum';

    SELECT COUNT(*) INTO v_attr_bad
    FROM (
      SELECT e.column_name
      FROM (
        SELECT 'id' AS column_name, 'char(36)' AS column_type, 'NO' AS is_nullable,
               NULL AS def_value, 36 AS char_len, -1 AS num_precision, -1 AS num_scale,
               'utf8mb4_unicode_ci' AS collation_rule, 'NONE' AS extra_rule
        UNION ALL SELECT 'org_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'code','varchar(50)','NO',NULL,50,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'name','varchar(200)','NO',NULL,200,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'name_unaccented','varchar(200)','NO',NULL,200,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'description','varchar(1000)','YES',NULL,1000,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'grade_level','varchar(50)','YES',NULL,50,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'program_code','varchar(50)','YES',NULL,50,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'is_active','tinyint(1)','NO','1',-1,3,0,'NONE','NONE'
        UNION ALL SELECT 'version','bigint','NO','0',-1,-1,-1,'NONE','NONE'
        UNION ALL SELECT 'created_by','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'created_at','datetime(3)','NO',NULL,-1,-1,-1,'NONE','NONE'
        UNION ALL SELECT 'updated_by','char(36)','YES',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'updated_at','datetime(3)','YES',NULL,-1,-1,-1,'NONE','NONE'
      ) e
      LEFT JOIN information_schema.columns c
        ON c.table_schema = DATABASE() AND c.table_name = 'curriculum'
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
    ) d;

    -- Exactly the 4 declared index groups; no InnoDB FK-support index exists on
    -- this parent table, so any extra index is drift.
    SELECT COALESCE(SUM(ok), 0), COALESCE(MAX(has_prefix), 0), COALESCE(SUM(bad_extra), 0)
    INTO v_idx_ok, v_idx_prefix, v_idx_extra
    FROM (
      SELECT i.index_name, i.non_unique, i.cols, i.has_prefix,
        CASE
          WHEN i.index_name = 'PRIMARY' AND i.non_unique = 0
            AND i.cols = 'id' THEN 1
          WHEN i.index_name = 'uq_curriculum_id_org' AND i.non_unique = 0
            AND i.cols = 'id,org_id' THEN 1
          WHEN i.index_name = 'uq_curriculum_org_code' AND i.non_unique = 0
            AND i.cols = 'org_id,code' THEN 1
          WHEN i.index_name = 'uq_curriculum_org_name' AND i.non_unique = 0
            AND i.cols = 'org_id,name_unaccented' THEN 1
          WHEN i.index_name = 'idx_curriculum_org_active' AND i.non_unique = 1
            AND i.cols = 'org_id,is_active' THEN 1
          ELSE 0
        END AS ok,
        CASE
          WHEN (i.index_name = 'PRIMARY' AND i.non_unique = 0 AND i.cols = 'id')
            OR (i.index_name = 'uq_curriculum_id_org' AND i.non_unique = 0
                AND i.cols = 'id,org_id')
            OR (i.index_name = 'uq_curriculum_org_code' AND i.non_unique = 0
                AND i.cols = 'org_id,code')
            OR (i.index_name = 'uq_curriculum_org_name' AND i.non_unique = 0
                AND i.cols = 'org_id,name_unaccented')
            OR (i.index_name = 'idx_curriculum_org_active' AND i.non_unique = 1
                AND i.cols = 'org_id,is_active')
            THEN 0
          ELSE 1
        END AS bad_extra
      FROM (
        SELECT index_name, non_unique,
               GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols,
               MAX(sub_part IS NOT NULL) AS has_prefix
        FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'curriculum'
        GROUP BY index_name, non_unique
      ) i
    ) x;

    SELECT COUNT(*) INTO v_pk
    FROM (
      SELECT index_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'curriculum'
        AND index_name = 'PRIMARY'
      GROUP BY index_name
      HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') = 'id'
    ) pk;

    SELECT COUNT(*) INTO v_fk_total
    FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND table_name = 'curriculum'
      AND referenced_table_name IS NOT NULL;

    SELECT COUNT(*) INTO v_chk_total
    FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = 'curriculum'
      AND constraint_type = 'CHECK';

    IF v_total_cols <> 14 OR v_cols <> 14 OR v_attr_bad <> 0
       OR v_idx_ok <> 5 OR v_idx_prefix <> 0 OR v_idx_extra <> 0
       OR v_pk <> 1 OR v_fk_total <> 0 OR v_chk_total <> 0 THEN
      SELECT 'curriculum_schema_mismatch' AS issue,
             v_total_cols AS total_cols_14, v_cols AS named_cols_14,
             v_attr_bad AS attr_mismatch_0,
             v_idx_ok AS idx_ok_5, v_idx_prefix AS idx_prefix_0,
             v_idx_extra AS idx_extra_0, v_pk AS pk_1,
             v_fk_total AS fk_0, v_chk_total AS chk_0;
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M51 ABORT: existing curriculum is not Revision-3 schema; fix manually';
    END IF;
  END cur_check;
END$

DROP PROCEDURE IF EXISTS mems_m51_assert_curriculum_subject_schema$
CREATE PROCEDURE mems_m51_assert_curriculum_subject_schema()
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_total_cols INT DEFAULT 0;
  DECLARE v_cols INT DEFAULT 0;
  DECLARE v_attr_bad INT DEFAULT 0;
  DECLARE v_idx_ok INT DEFAULT 0;
  DECLARE v_idx_prefix INT DEFAULT 0;
  DECLARE v_idx_extra INT DEFAULT 0;
  DECLARE v_pk INT DEFAULT 0;
  DECLARE v_fk_total INT DEFAULT 0;
  DECLARE v_fk_ok INT DEFAULT 0;
  DECLARE v_fk_schema_bad INT DEFAULT 0;
  DECLARE v_fk_rule_bad INT DEFAULT 0;
  DECLARE v_chk_total INT DEFAULT 0;
  DECLARE v_chk_ok INT DEFAULT 0;

  cs_check: BEGIN
    SELECT COUNT(*) INTO v_exists FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject';
    IF v_exists = 0 THEN
      LEAVE cs_check;
    END IF;

    SELECT COUNT(*),
           COALESCE(SUM(column_name IN (
             'curriculum_id','subject_id','org_id','sequence_no',
             'required_sessions','theory_sessions','practice_sessions','session_minutes',
             'is_required','note','created_at','updated_at')), 0)
    INTO v_total_cols, v_cols
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject';

    SELECT COUNT(*) INTO v_attr_bad
    FROM (
      SELECT e.column_name
      FROM (
        SELECT 'curriculum_id' AS column_name, 'char(36)' AS column_type, 'NO' AS is_nullable,
               NULL AS def_value, 36 AS char_len, -1 AS num_precision, -1 AS num_scale,
               'utf8mb4_unicode_ci' AS collation_rule, 'NONE' AS extra_rule
        UNION ALL SELECT 'subject_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'org_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'sequence_no','smallint','NO',NULL,-1,5,0,'NONE','NONE'
        UNION ALL SELECT 'required_sessions','smallint','NO',NULL,-1,5,0,'NONE','NONE'
        UNION ALL SELECT 'theory_sessions','smallint','NO','0',-1,5,0,'NONE','NONE'
        UNION ALL SELECT 'practice_sessions','smallint','NO','0',-1,5,0,'NONE','NONE'
        UNION ALL SELECT 'session_minutes','smallint','NO',NULL,-1,5,0,'NONE','NONE'
        UNION ALL SELECT 'is_required','tinyint(1)','NO','1',-1,3,0,'NONE','NONE'
        UNION ALL SELECT 'note','varchar(500)','YES',NULL,500,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'created_at','datetime(3)','NO',NULL,-1,-1,-1,'NONE','NONE'
        UNION ALL SELECT 'updated_at','datetime(3)','YES',NULL,-1,-1,-1,'NONE','NONE'
      ) e
      LEFT JOIN information_schema.columns c
        ON c.table_schema = DATABASE() AND c.table_name = 'curriculum_subject'
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
    ) d;

    -- 4 declared groups + the InnoDB FK-support index (curriculum_id, org_id)
    -- that fk_curriculum_subject_curriculum needs because no declared index has
    -- that left prefix. Any other index is drift.
    SELECT COALESCE(SUM(ok), 0), COALESCE(MAX(has_prefix), 0), COALESCE(SUM(bad_extra), 0)
    INTO v_idx_ok, v_idx_prefix, v_idx_extra
    FROM (
      SELECT i.index_name, i.non_unique, i.cols, i.has_prefix,
        CASE
          WHEN i.index_name = 'PRIMARY' AND i.non_unique = 0
            AND i.cols = 'curriculum_id,subject_id' THEN 1
          WHEN i.index_name = 'uq_curriculum_subject_sequence' AND i.non_unique = 0
            AND i.cols = 'curriculum_id,sequence_no' THEN 1
          WHEN i.index_name = 'uq_curriculum_subject_org' AND i.non_unique = 0
            AND i.cols = 'curriculum_id,subject_id,org_id' THEN 1
          WHEN i.index_name = 'idx_curriculum_subject_subject' AND i.non_unique = 1
            AND i.cols = 'subject_id,org_id' THEN 1
          ELSE 0
        END AS ok,
        CASE
          WHEN (i.index_name = 'PRIMARY' AND i.non_unique = 0
                AND i.cols = 'curriculum_id,subject_id')
            OR (i.index_name = 'uq_curriculum_subject_sequence' AND i.non_unique = 0
                AND i.cols = 'curriculum_id,sequence_no')
            OR (i.index_name = 'uq_curriculum_subject_org' AND i.non_unique = 0
                AND i.cols = 'curriculum_id,subject_id,org_id')
            OR (i.index_name = 'idx_curriculum_subject_subject' AND i.non_unique = 1
                AND i.cols = 'subject_id,org_id')
            OR (i.non_unique = 1 AND i.has_prefix = 0
                AND i.cols = 'curriculum_id,org_id')
            THEN 0
          ELSE 1
        END AS bad_extra
      FROM (
        SELECT index_name, non_unique,
               GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols,
               MAX(sub_part IS NOT NULL) AS has_prefix
        FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject'
        GROUP BY index_name, non_unique
      ) i
    ) x;

    SELECT COUNT(*) INTO v_pk
    FROM (
      SELECT index_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject'
        AND index_name = 'PRIMARY'
      GROUP BY index_name
      HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',')
             = 'curriculum_id,subject_id'
    ) pk;

    SELECT COUNT(*), COALESCE(SUM(ok), 0), COALESCE(MAX(wrong_schema), 0),
           COALESCE(SUM(bad_rule), 0)
    INTO v_fk_total, v_fk_ok, v_fk_schema_bad, v_fk_rule_bad
    FROM (
      SELECT k.constraint_name, k.map, k.wrong_schema, k.update_rule, k.delete_rule,
        CASE
          WHEN k.constraint_name = 'fk_curriculum_subject_curriculum'
            AND k.map = 'curriculum_id->curriculum.id,org_id->curriculum.org_id' THEN 1
          WHEN k.constraint_name = 'fk_curriculum_subject_subject'
            AND k.map = 'subject_id->subject.id,org_id->subject.org_id' THEN 1
          ELSE 0
        END AS ok,
        CASE
          WHEN k.constraint_name = 'fk_curriculum_subject_curriculum'
            AND k.update_rule = 'RESTRICT' AND k.delete_rule = 'CASCADE' THEN 0
          WHEN k.constraint_name = 'fk_curriculum_subject_subject'
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
        WHERE kcu.table_schema = DATABASE() AND kcu.table_name = 'curriculum_subject'
          AND kcu.referenced_table_name IS NOT NULL
        GROUP BY kcu.constraint_name
      ) k
    ) y;

    SELECT COUNT(*), COALESCE(SUM(ok), 0)
    INTO v_chk_total, v_chk_ok
    FROM (
      SELECT tc.constraint_name, cc.norm,
        CASE
          WHEN tc.constraint_name = 'chk_curriculum_subject_sessions'
            AND cc.norm = 'required_sessions>0andsession_minutes>0andtheory_sessions>=0andpractice_sessions>=0' THEN 1
          WHEN tc.constraint_name = 'chk_curriculum_subject_sequence'
            AND cc.norm = 'sequence_no>0' THEN 1
          ELSE 0
        END AS ok
      FROM information_schema.table_constraints tc
      JOIN (
        SELECT constraint_schema, constraint_name,
               -- CHAR(92) removal keeps this match independent of MySQL's escaped
               -- CHECK_CLAUSE display (8.0.16+ uses (_utf8mb4\'X\',...)).
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
      WHERE tc.table_schema = DATABASE() AND tc.table_name = 'curriculum_subject'
        AND tc.constraint_type = 'CHECK'
    ) z;

    IF v_total_cols <> 12 OR v_cols <> 12 OR v_attr_bad <> 0
       OR v_idx_ok <> 4 OR v_idx_prefix <> 0 OR v_idx_extra <> 0
       OR v_pk <> 1
       OR v_fk_total <> 2 OR v_fk_ok <> 2 OR v_fk_schema_bad <> 0
       OR v_fk_rule_bad <> 0
       OR v_chk_total <> 2 OR v_chk_ok <> 2 THEN
      SELECT 'curriculum_subject_schema_mismatch' AS issue,
             v_total_cols AS total_cols_12, v_cols AS named_cols_12,
             v_attr_bad AS attr_mismatch_0,
             v_idx_ok AS idx_ok_4, v_idx_prefix AS idx_prefix_0,
             v_idx_extra AS idx_extra_0, v_pk AS pk_1,
             v_fk_total AS fk_2, v_fk_ok AS fk_ok_2, v_fk_schema_bad AS fk_schema_0,
             v_fk_rule_bad AS fk_rule_0,
             v_chk_total AS chk_2, v_chk_ok AS chk_ok_2;
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M51 ABORT: existing curriculum_subject is not Revision-3 schema; fix manually';
    END IF;
  END cs_check;
END$

DROP PROCEDURE IF EXISTS mems_m51_assert_csp_schema$
CREATE PROCEDURE mems_m51_assert_csp_schema()
BEGIN
  DECLARE v_exists INT DEFAULT 0;
  DECLARE v_total_cols INT DEFAULT 0;
  DECLARE v_cols INT DEFAULT 0;
  DECLARE v_attr_bad INT DEFAULT 0;
  DECLARE v_idx_ok INT DEFAULT 0;
  DECLARE v_idx_prefix INT DEFAULT 0;
  DECLARE v_idx_extra INT DEFAULT 0;
  DECLARE v_pk INT DEFAULT 0;
  DECLARE v_fk_total INT DEFAULT 0;
  DECLARE v_fk_ok INT DEFAULT 0;
  DECLARE v_fk_schema_bad INT DEFAULT 0;
  DECLARE v_fk_rule_bad INT DEFAULT 0;
  DECLARE v_chk_total INT DEFAULT 0;
  DECLARE v_chk_ok INT DEFAULT 0;

  csp_check: BEGIN
    SELECT COUNT(*) INTO v_exists FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject_prerequisite';
    IF v_exists = 0 THEN
      LEAVE csp_check;
    END IF;

    SELECT COUNT(*),
           COALESCE(SUM(column_name IN (
             'curriculum_id','subject_id','prerequisite_subject_id','org_id',
             'created_at')), 0)
    INTO v_total_cols, v_cols
    FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject_prerequisite';

    SELECT COUNT(*) INTO v_attr_bad
    FROM (
      SELECT e.column_name
      FROM (
        SELECT 'curriculum_id' AS column_name, 'char(36)' AS column_type, 'NO' AS is_nullable,
               NULL AS def_value, 36 AS char_len, -1 AS num_precision, -1 AS num_scale,
               'utf8mb4_unicode_ci' AS collation_rule, 'NONE' AS extra_rule
        UNION ALL SELECT 'subject_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'prerequisite_subject_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'org_id','char(36)','NO',NULL,36,-1,-1,'utf8mb4_unicode_ci','NONE'
        UNION ALL SELECT 'created_at','datetime(3)','NO',NULL,-1,-1,-1,'NONE','NONE'
      ) e
      LEFT JOIN information_schema.columns c
        ON c.table_schema = DATABASE() AND c.table_name = 'curriculum_subject_prerequisite'
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
    ) d;

    -- 3 declared groups + the two composite FK-support indexes InnoDB creates
    -- for fk_csp_subject and fk_csp_prerequisite (no declared index has those
    -- left prefixes). Anything else is drift.
    SELECT COALESCE(SUM(ok), 0), COALESCE(MAX(has_prefix), 0), COALESCE(SUM(bad_extra), 0)
    INTO v_idx_ok, v_idx_prefix, v_idx_extra
    FROM (
      SELECT i.index_name, i.non_unique, i.cols, i.has_prefix,
        CASE
          WHEN i.index_name = 'PRIMARY' AND i.non_unique = 0
            AND i.cols = 'curriculum_id,subject_id,prerequisite_subject_id' THEN 1
          WHEN i.index_name = 'idx_csp_prereq' AND i.non_unique = 1
            AND i.cols = 'org_id,prerequisite_subject_id' THEN 1
          WHEN i.index_name = 'idx_csp_subject' AND i.non_unique = 1
            AND i.cols = 'org_id,subject_id' THEN 1
          ELSE 0
        END AS ok,
        CASE
          WHEN (i.index_name = 'PRIMARY' AND i.non_unique = 0
                AND i.cols = 'curriculum_id,subject_id,prerequisite_subject_id')
            OR (i.index_name = 'idx_csp_prereq' AND i.non_unique = 1
                AND i.cols = 'org_id,prerequisite_subject_id')
            OR (i.index_name = 'idx_csp_subject' AND i.non_unique = 1
                AND i.cols = 'org_id,subject_id')
            OR (i.non_unique = 1 AND i.has_prefix = 0
                AND i.cols IN ('curriculum_id,subject_id,org_id',
                               'curriculum_id,prerequisite_subject_id,org_id'))
            THEN 0
          ELSE 1
        END AS bad_extra
      FROM (
        SELECT index_name, non_unique,
               GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',') AS cols,
               MAX(sub_part IS NOT NULL) AS has_prefix
        FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject_prerequisite'
        GROUP BY index_name, non_unique
      ) i
    ) x;

    SELECT COUNT(*) INTO v_pk
    FROM (
      SELECT index_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'curriculum_subject_prerequisite'
        AND index_name = 'PRIMARY'
      GROUP BY index_name
      HAVING GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ',')
             = 'curriculum_id,subject_id,prerequisite_subject_id'
    ) pk;

    SELECT COUNT(*), COALESCE(SUM(ok), 0), COALESCE(MAX(wrong_schema), 0),
           COALESCE(SUM(bad_rule), 0)
    INTO v_fk_total, v_fk_ok, v_fk_schema_bad, v_fk_rule_bad
    FROM (
      SELECT k.constraint_name, k.map, k.wrong_schema, k.update_rule, k.delete_rule,
        CASE
          WHEN k.constraint_name = 'fk_csp_subject'
            AND k.map = 'curriculum_id->curriculum_subject.curriculum_id,subject_id->curriculum_subject.subject_id,org_id->curriculum_subject.org_id' THEN 1
          WHEN k.constraint_name = 'fk_csp_prerequisite'
            AND k.map = 'curriculum_id->curriculum_subject.curriculum_id,prerequisite_subject_id->curriculum_subject.subject_id,org_id->curriculum_subject.org_id' THEN 1
          ELSE 0
        END AS ok,
        CASE
          WHEN k.constraint_name = 'fk_csp_subject'
            AND k.update_rule = 'RESTRICT' AND k.delete_rule = 'CASCADE' THEN 0
          WHEN k.constraint_name = 'fk_csp_prerequisite'
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
        WHERE kcu.table_schema = DATABASE()
          AND kcu.table_name = 'curriculum_subject_prerequisite'
          AND kcu.referenced_table_name IS NOT NULL
        GROUP BY kcu.constraint_name
      ) k
    ) y;

    SELECT COUNT(*), COALESCE(SUM(ok), 0)
    INTO v_chk_total, v_chk_ok
    FROM (
      SELECT tc.constraint_name, cc.norm,
        CASE
          WHEN tc.constraint_name = 'chk_csp_not_self'
            AND cc.norm = 'subject_id<>prerequisite_subject_id' THEN 1
          ELSE 0
        END AS ok
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
      WHERE tc.table_schema = DATABASE()
        AND tc.table_name = 'curriculum_subject_prerequisite'
        AND tc.constraint_type = 'CHECK'
    ) z;

    IF v_total_cols <> 5 OR v_cols <> 5 OR v_attr_bad <> 0
       OR v_idx_ok <> 3 OR v_idx_prefix <> 0 OR v_idx_extra <> 0
       OR v_pk <> 1
       OR v_fk_total <> 2 OR v_fk_ok <> 2 OR v_fk_schema_bad <> 0
       OR v_fk_rule_bad <> 0
       OR v_chk_total <> 1 OR v_chk_ok <> 1 THEN
      SELECT 'csp_schema_mismatch' AS issue,
             v_total_cols AS total_cols_5, v_cols AS named_cols_5,
             v_attr_bad AS attr_mismatch_0,
             v_idx_ok AS idx_ok_3, v_idx_prefix AS idx_prefix_0,
             v_idx_extra AS idx_extra_0, v_pk AS pk_1,
             v_fk_total AS fk_2, v_fk_ok AS fk_ok_2, v_fk_schema_bad AS fk_schema_0,
             v_fk_rule_bad AS fk_rule_0,
             v_chk_total AS chk_1, v_chk_ok AS chk_ok_1;
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'M51 ABORT: existing curriculum_subject_prerequisite is not Revision-3; fix manually';
    END IF;
  END csp_check;
END$

DELIMITER ;

-- 0) Existing curriculum* tables must already match Revision 3, else abort
--    BEFORE any DDL. Absent tables are created below; no silent upgrade.
CALL mems_m51_assert_database();
CALL mems_m51_assert_curriculum_schema();
CALL mems_m51_assert_curriculum_subject_schema();
CALL mems_m51_assert_csp_schema();

-- 1) curriculum (template cấp tổ chức, D-02/D-12)
CREATE TABLE IF NOT EXISTS curriculum (
  id              char(36)     NOT NULL,
  org_id          char(36)     NOT NULL,
  code            varchar(50)  NOT NULL,
  name            varchar(200) NOT NULL,
  name_unaccented varchar(200) NOT NULL,
  description     varchar(1000) DEFAULT NULL,
  grade_level     varchar(50)  DEFAULT NULL,
  program_code    varchar(50)  DEFAULT NULL,
  is_active       tinyint(1)   NOT NULL DEFAULT 1,
  version         bigint       NOT NULL DEFAULT 0,
  created_by      char(36)     DEFAULT NULL,
  created_at      datetime(3)  NOT NULL,
  updated_by      char(36)     DEFAULT NULL,
  updated_at      datetime(3)  DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curriculum_id_org (id, org_id),
  UNIQUE KEY uq_curriculum_org_code (org_id, code),
  UNIQUE KEY uq_curriculum_org_name (org_id, name_unaccented),
  KEY idx_curriculum_org_active (org_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) curriculum_subject (số buổi/thời lượng bắt buộc ở đây, D-03)
CREATE TABLE IF NOT EXISTS curriculum_subject (
  curriculum_id     char(36) NOT NULL,
  subject_id        char(36) NOT NULL,
  org_id            char(36) NOT NULL,
  sequence_no       smallint NOT NULL,
  required_sessions smallint NOT NULL,
  theory_sessions   smallint NOT NULL DEFAULT 0,
  practice_sessions smallint NOT NULL DEFAULT 0,
  session_minutes   smallint NOT NULL,
  is_required       tinyint(1) NOT NULL DEFAULT 1,
  note              varchar(500) DEFAULT NULL,
  created_at        datetime(3) NOT NULL,
  updated_at        datetime(3) DEFAULT NULL,
  PRIMARY KEY (curriculum_id, subject_id),
  UNIQUE KEY uq_curriculum_subject_sequence (curriculum_id, sequence_no),
  UNIQUE KEY uq_curriculum_subject_org (curriculum_id, subject_id, org_id),
  KEY idx_curriculum_subject_subject (subject_id, org_id),
  CONSTRAINT fk_curriculum_subject_curriculum
    FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_curriculum_subject_sessions CHECK (
    required_sessions > 0 AND session_minutes > 0
    AND theory_sessions >= 0 AND practice_sessions >= 0),
  CONSTRAINT chk_curriculum_subject_sequence CHECK (sequence_no > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) curriculum_subject_prerequisite (D-07 — 0..n tiên quyết, bảng nối)
CREATE TABLE IF NOT EXISTS curriculum_subject_prerequisite (
  curriculum_id           char(36) NOT NULL,
  subject_id              char(36) NOT NULL,
  prerequisite_subject_id char(36) NOT NULL,
  org_id                  char(36) NOT NULL,
  created_at              datetime(3) NOT NULL,
  PRIMARY KEY (curriculum_id, subject_id, prerequisite_subject_id),
  KEY idx_csp_prereq (org_id, prerequisite_subject_id),
  KEY idx_csp_subject (org_id, subject_id),
  -- F-05: removing one curriculum_subject row cascades its dependent edges
  -- (fk_csp_subject) but is RESTRICT-blocked while that subject is a prerequisite
  -- of another row (fk_csp_prerequisite). Deleting a whole curriculum can hit
  -- MySQL 1451 mid-cascade because InnoDB does not guarantee that prerequisite
  -- edges are removed before the referenced curriculum_subject row. Business rule
  -- is is_active=0; a hard delete must remove this curriculum's prerequisite
  -- edges first, in the same transaction.
  CONSTRAINT fk_csp_subject
    FOREIGN KEY (curriculum_id, subject_id, org_id)
    REFERENCES curriculum_subject (curriculum_id, subject_id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_csp_prerequisite
    FOREIGN KEY (curriculum_id, prerequisite_subject_id, org_id)
    REFERENCES curriculum_subject (curriculum_id, subject_id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_csp_not_self CHECK (subject_id <> prerequisite_subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4) school_class.curriculum_id + FK tổ hợp
CALL mems_m51_add_col('school_class', 'curriculum_id', 'CHAR(36) DEFAULT NULL',
  'char(36)', 'YES', NULL);
CALL mems_m51_add_fk('school_class', 'fk_school_class_curriculum',
  'FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE RESTRICT',
  'curriculum_id->curriculum.id,org_id->curriculum.org_id', 'RESTRICT', 'RESTRICT');

-- 5) UNIQUE bắt buộc để 52 tạo FK (class_id, org_id) -> school_class(id, org_id).
--    Không thể fail vì id đã là PK; vẫn kiểm tồn tại để idempotent.
CALL mems_m51_add_unique('school_class', 'uq_school_class_id_org', 'id, org_id');

DROP PROCEDURE IF EXISTS mems_m51_add_col;
DROP PROCEDURE IF EXISTS mems_m51_add_fk;
DROP PROCEDURE IF EXISTS mems_m51_add_unique;
DROP PROCEDURE IF EXISTS mems_m51_assert_database;
DROP PROCEDURE IF EXISTS mems_m51_assert_curriculum_schema;
DROP PROCEDURE IF EXISTS mems_m51_assert_curriculum_subject_schema;
DROP PROCEDURE IF EXISTS mems_m51_assert_csp_schema;

-- Post-check: chạy docs/phase-1/migrations/51_52_postcheck.sql
