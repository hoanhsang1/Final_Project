-- =============================================================================
-- DRAFT ONLY — DO NOT RUN AUTOMATICALLY.
-- MEMS Schedule DB — Migration 55: schedule configuration.
-- Target: MySQL 8.0.16+ (CHECK enforced), database mems_schedule_db.
-- Additive and idempotent. Does NOT touch `session` or any existing table.
--
-- Adds:
--   * time_slot           — period table per organization (no hard-coded hours)
--   * class_slot_rule     — per-class weekday/period rules, optional off ranges
--   * teacher_availability— per-teacher weekday/period availability windows
--
-- Legacy data: new tables only. No existing row is modified, so a database with
-- no schedule configuration keeps the current behaviour (fully free / no rules).
-- =============================================================================
USE mems_schedule_db;

-- -----------------------------------------------------------------------------
-- 1) time_slot — mỗi tổ chức một bộ tiết; period_no duy nhất trong org.
--    joins_next=1 nghĩa là tiết này gắn liền tiết kế tiếp (không được kết thúc
--    buổi học ngay sau tiết đó). Giờ nghỉ không phải là tiết.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_slot (
  id         CHAR(36)    NOT NULL,
  org_id     CHAR(36)    NOT NULL,
  period_no  INT         NOT NULL,
  name       VARCHAR(50) DEFAULT NULL,
  start_time TIME        NOT NULL,
  end_time   TIME        NOT NULL,
  joins_next TINYINT(1)  NOT NULL DEFAULT 0,
  is_active  TINYINT(1)  NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_time_slot_org_period (org_id, period_no),
  KEY idx_time_slot_org_active (org_id, is_active),
  CONSTRAINT chk_time_slot_period CHECK (period_no >= 1),
  CONSTRAINT chk_time_slot_range CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2) class_slot_rule — quy tắc tiết học của một lớp.
--    Không có dòng nào = lớp tự do. is_off=1 = khoảng không được xếp.
--    class_id thuộc PeopleService; không đặt FK qua DB khác.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS class_slot_rule (
  id          CHAR(36)    NOT NULL,
  org_id      CHAR(36)    NOT NULL,
  class_id    CHAR(36)    NOT NULL,
  weekday     TINYINT     NOT NULL,
  from_period INT         NOT NULL,
  to_period   INT         NOT NULL,
  is_off      TINYINT(1)  NOT NULL DEFAULT 0,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_slot_rule (org_id, class_id, weekday, from_period, to_period),
  KEY idx_class_slot_rule_class (org_id, class_id),
  CONSTRAINT chk_class_slot_weekday CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT chk_class_slot_from CHECK (from_period >= 1),
  CONSTRAINT chk_class_slot_range CHECK (to_period >= from_period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3) teacher_availability — khoảng rảnh/bận theo tuần của giáo viên.
--    Không có dòng nào = giáo viên tự do. teacher_id thuộc PeopleService.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_availability (
  id          CHAR(36)    NOT NULL,
  org_id      CHAR(36)    NOT NULL,
  teacher_id  CHAR(36)    NOT NULL,
  weekday     TINYINT     NOT NULL,
  from_period INT         NOT NULL,
  to_period   INT         NOT NULL,
  kind        VARCHAR(16) NOT NULL,
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_teacher_availability (org_id, teacher_id, weekday, from_period, to_period),
  KEY idx_teacher_availability_teacher (org_id, teacher_id),
  CONSTRAINT chk_teacher_availability_weekday CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT chk_teacher_availability_from CHECK (from_period >= 1),
  CONSTRAINT chk_teacher_availability_range CHECK (to_period >= from_period),
  CONSTRAINT chk_teacher_availability_kind CHECK (kind IN ('AVAILABLE','UNAVAILABLE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- POST-CHECK (read-only, expect the documented results)
-- =============================================================================
-- 1) Three tables exist with the expected columns.
SELECT table_name, column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('time_slot', 'class_slot_rule', 'teacher_availability')
ORDER BY table_name, ordinal_position;

-- 2) No duplicate period number per organization (expect 0 rows).
SELECT org_id, period_no, COUNT(*) AS total
FROM time_slot
GROUP BY org_id, period_no
HAVING COUNT(*) > 1;

-- 3) Configured period ranges stay within the organization's declared periods
--    (expect 0 rows). Run after time_slot is populated.
SELECT r.org_id, r.class_id, r.weekday, r.from_period, r.to_period
FROM class_slot_rule r
LEFT JOIN time_slot t1 ON t1.org_id = r.org_id AND t1.period_no = r.from_period
LEFT JOIN time_slot t2 ON t2.org_id = r.org_id AND t2.period_no = r.to_period
WHERE t1.id IS NULL OR t2.id IS NULL;

-- 4) Teacher availability ranges use the same period scale (expect 0 rows).
SELECT a.org_id, a.teacher_id, a.weekday, a.from_period, a.to_period
FROM teacher_availability a
LEFT JOIN time_slot t1 ON t1.org_id = a.org_id AND t1.period_no = a.from_period
LEFT JOIN time_slot t2 ON t2.org_id = a.org_id AND t2.period_no = a.to_period
WHERE t1.id IS NULL OR t2.id IS NULL;
