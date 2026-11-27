-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS Schedule DB — Migration 59: draft schedules (preview / edit / confirm).
-- Target: MySQL 8.0.16+ (CHECK enforced), database mems_schedule_db.
-- Additive and idempotent. Does NOT touch `session` or any existing table.
--
-- Adds:
--   * schedule_draft             — một lượt xếp lịch nháp (DRAFT|CONFIRMED|DISCARDED)
--   * schedule_draft_item        — từng buổi dự kiến trong lịch nháp
--   * schedule_draft_unscheduled — mục không xếp được kèm lý do
--
-- Không ghi thẳng `session`: chỉ khi người dùng xác nhận mới tạo buổi thật.
-- class_id/subject_id/teacher_id/room_id thuộc service khác; không đặt FK chéo DB.
-- =============================================================================
USE mems_schedule_db;

-- -----------------------------------------------------------------------------
-- 1) schedule_draft — params/summary lưu JSON dạng LONGTEXT (không phụ thuộc
--    kiểu JSON của MySQL, giữ tương thích H2 khi test).
--    TTL xác nhận mặc định 7 ngày tính từ created_at.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_draft (
  id            CHAR(36)    NOT NULL,
  org_id        CHAR(36)    NOT NULL,
  department_id CHAR(36)    NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  params        LONGTEXT    NOT NULL,
  summary       LONGTEXT    DEFAULT NULL,
  created_by    CHAR(36)    DEFAULT NULL,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  confirmed_at  DATETIME(3) DEFAULT NULL,
  updated_at    DATETIME(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_schedule_draft_org_dept (org_id, department_id, created_at),
  KEY idx_schedule_draft_org_status (org_id, status),
  CONSTRAINT chk_schedule_draft_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'DISCARDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2) schedule_draft_item — buổi dự kiến. Giờ lưu theo múi giờ nghiệp vụ đã
--    quy đổi sang Instant trước khi ghi (cùng cách bảng `session`).
--    is_manual_edit=1 khi người dùng sửa tay phòng/giờ/giáo viên.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_draft_item (
  id               CHAR(36)     NOT NULL,
  draft_id         CHAR(36)     NOT NULL,
  class_id         CHAR(36)     NOT NULL,
  subject_id       CHAR(36)     DEFAULT NULL,
  teacher_id       CHAR(36)     DEFAULT NULL,
  teacher_name     VARCHAR(200) DEFAULT NULL,
  room_id          CHAR(36)     DEFAULT NULL,
  room_code        VARCHAR(50)  DEFAULT NULL,
  subject_name     VARCHAR(200) DEFAULT NULL,
  start_time       DATETIME(3)  NOT NULL,
  end_time         DATETIME(3)  NOT NULL,
  week_no          INT          NOT NULL,
  is_exception     TINYINT(1)   NOT NULL DEFAULT 0,
  exception_type   VARCHAR(20)  DEFAULT NULL,
  exception_reason VARCHAR(500) DEFAULT NULL,
  is_manual_edit   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_draft_item_draft (draft_id),
  KEY idx_draft_item_draft_class (draft_id, class_id),
  CONSTRAINT fk_draft_item_draft FOREIGN KEY (draft_id)
    REFERENCES schedule_draft (id) ON DELETE CASCADE,
  CONSTRAINT chk_draft_item_range CHECK (end_time > start_time),
  CONSTRAINT chk_draft_item_week CHECK (week_no >= 1),
  CONSTRAINT chk_draft_item_exception CHECK (
    exception_type IS NULL OR exception_type IN ('ROOM_CHANGED', 'PERIOD_CHANGED', 'DAY_CHANGED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3) schedule_draft_unscheduled — mục không xếp được (lớp/môn/buổi) + lý do.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedule_draft_unscheduled (
  id         CHAR(36)     NOT NULL,
  draft_id   CHAR(36)     NOT NULL,
  class_id   CHAR(36)     NOT NULL,
  subject_id CHAR(36)     DEFAULT NULL,
  session_no INT          DEFAULT NULL,
  reason     VARCHAR(500) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_draft_unscheduled_draft (draft_id),
  CONSTRAINT fk_draft_unscheduled_draft FOREIGN KEY (draft_id)
    REFERENCES schedule_draft (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- POST-CHECK (read-only)
-- =============================================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN ('schedule_draft', 'schedule_draft_item', 'schedule_draft_unscheduled')
ORDER BY table_name;

SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('schedule_draft', 'schedule_draft_item', 'schedule_draft_unscheduled')
ORDER BY table_name, ordinal_position;
