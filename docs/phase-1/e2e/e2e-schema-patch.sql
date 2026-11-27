-- =====================================================================
-- Vá cấu trúc cho các schema E2E (mems_e2e_*), CHỈ chạy trên MySQL local.
-- Lý do: schema E2E được clone từ DB live, mà DB live đang thiếu các cột/bảng
-- của migration 43–59 (chưa chạy). Code ở HEAD cần các cột/bảng này để khởi động.
-- Mọi cột thêm vào đều NULL-able để dữ liệu cũ không hỏng; chạy lại nhiều lần
-- không lỗi (kiểm tra information_schema trước khi ALTER).
-- KHÔNG chạy trên mems_identity_db / mems_people_db / mems_schedule_db /
-- mems_facility_db (DB thật).
-- =====================================================================
SET NAMES utf8mb4;

DROP PROCEDURE IF EXISTS mems_e2e_identity_db.e2e_add_col;
DELIMITER $$
CREATE PROCEDURE mems_e2e_identity_db.e2e_add_col(
    IN p_schema VARCHAR(64), IN p_table VARCHAR(64), IN p_column VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = p_schema AND table_name = p_table AND column_name = p_column) THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_schema, '`.`', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ---------- People: position.system_code (DefaultPositionSeeder) ----------
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','position','system_code','VARCHAR(50) NULL');

-- ---------- People: class_subject cột của migration 52/57 ----------
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','org_id','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','sequence_no','SMALLINT NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','primary_class_id','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','theory_sessions','SMALLINT NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','practice_sessions','SMALLINT NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','note','VARCHAR(500) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','created_by','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','class_subject','updated_by','VARCHAR(36) NULL');

-- ---------- People: teacher_subject cột duyệt của migration 51/52 ----------
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','teacher_subject','approved_by','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','teacher_subject','approved_at','TIMESTAMP NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','teacher_subject','created_by','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','teacher_subject','updated_at','TIMESTAMP NULL');

-- ---------- People: curriculum (migration 51/52) ----------
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum','name_unaccented','VARCHAR(200) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum','program_code','VARCHAR(50) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject','org_id','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject','theory_sessions','SMALLINT NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject','practice_sessions','SMALLINT NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject','note','VARCHAR(500) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject','created_at','TIMESTAMP NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject','updated_at','TIMESTAMP NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject_prerequisite','org_id','VARCHAR(36) NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','curriculum_subject_prerequisite','created_at','TIMESTAMP NULL');

-- ---------- People: outbox replay trace (Phase 2) ----------
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','outbox_event','replayed_at','TIMESTAMP NULL');
CALL mems_e2e_identity_db.e2e_add_col('mems_e2e_people_db','outbox_event','replayed_by','VARCHAR(36) NULL');

-- ---------- People: bảng class_subject_history (migration 52) ----------
CREATE TABLE IF NOT EXISTS mems_e2e_people_db.class_subject_history (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    class_id VARCHAR(36) NOT NULL,
    old_subject_id VARCHAR(36) NULL,
    old_subject_code VARCHAR(50) NULL,
    old_subject_name VARCHAR(200) NULL,
    old_teacher_id VARCHAR(36) NULL,
    old_teacher_name VARCHAR(200) NULL,
    old_source VARCHAR(20) NULL,
    new_subject_id VARCHAR(36) NOT NULL,
    new_subject_code VARCHAR(50) NULL,
    new_subject_name VARCHAR(200) NOT NULL,
    new_source VARCHAR(20) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    operation_id VARCHAR(64) NOT NULL,
    request_fingerprint VARCHAR(64) NOT NULL,
    changed_by VARCHAR(36) NOT NULL,
    changed_by_name VARCHAR(200) NULL,
    changed_at TIMESTAMP NOT NULL,
    UNIQUE KEY uq_csh_org_operation (org_id, operation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- People: bảng specialty_subject (migration 54) ----------
CREATE TABLE IF NOT EXISTS mems_e2e_people_db.specialty_subject (
    specialty_id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    org_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (specialty_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Schedule: bảng inbox/consumer/session_impact (Phase 2) ----------
CREATE TABLE IF NOT EXISTS mems_e2e_schedule_db.inbox_event (
    event_id VARCHAR(36) NOT NULL,
    consumer_name VARCHAR(80) NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    organization_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    attempts INT NOT NULL DEFAULT 0,
    error_message VARCHAR(1000) NULL,
    received_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP NULL,
    PRIMARY KEY (event_id, consumer_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mems_e2e_schedule_db.consumer_aggregate_state (
    consumer_name VARCHAR(80) NOT NULL,
    aggregate_type VARCHAR(40) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    last_version BIGINT NULL,
    last_occurred_at TIMESTAMP NULL,
    PRIMARY KEY (consumer_name, aggregate_type, aggregate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS mems_e2e_schedule_db.session_impact (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    org_id VARCHAR(36) NOT NULL,
    session_id VARCHAR(36) NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_id VARCHAR(36) NOT NULL,
    event_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    details LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP NULL,
    UNIQUE KEY uq_session_impact (session_id, source_type, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Facility: bảng outbox_event (Phase 2) ----------
CREATE TABLE IF NOT EXISTS mems_e2e_facility_db.outbox_event (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    aggregate_type VARCHAR(40) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    aggregate_version BIGINT NULL,
    event_type VARCHAR(80) NOT NULL,
    event_version INT NOT NULL DEFAULT 1,
    organization_id VARCHAR(36) NOT NULL,
    correlation_id VARCHAR(36) NULL,
    payload LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL,
    locked_until TIMESTAMP NULL,
    last_error VARCHAR(1000) NULL,
    replayed_at TIMESTAMP NULL,
    replayed_by VARCHAR(36) NULL,
    created_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP NULL,
    UNIQUE KEY uq_outbox_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS mems_e2e_identity_db.e2e_add_col;

SELECT 'patch done' AS result;
