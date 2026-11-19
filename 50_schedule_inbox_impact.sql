-- MEMS / Schedule Service / migration 50 — PHASE 2 / CC-03 + SCH-01 + CLS-03 + SCH-04
-- Inbox idempotency, thứ tự theo aggregate và bảng "buổi học bị ảnh hưởng".
-- Consumer KHÔNG sửa session/enrollment/phòng; chỉ ghi nhận cần người có quyền xử lý.
--
-- Idempotent, additive, không xoá/đổi bảng sẵn có. Apply to mems_schedule_db (local/test).
USE mems_schedule_db;

CREATE TABLE IF NOT EXISTS inbox_event (
  event_id        CHAR(36)      NOT NULL,
  consumer_name   VARCHAR(80)   NOT NULL,
  event_type      VARCHAR(80)   NOT NULL,
  organization_id CHAR(36)      NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'PROCESSING',
  attempts        INT           NOT NULL DEFAULT 0,
  error_message   VARCHAR(1000) NULL,
  received_at     DATETIME(3)   NOT NULL,
  processed_at    DATETIME(3)   NULL,
  PRIMARY KEY (event_id, consumer_name),
  KEY idx_inbox_status (consumer_name, status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consumer_aggregate_state (
  consumer_name    VARCHAR(80) NOT NULL,
  aggregate_type   VARCHAR(40) NOT NULL,
  aggregate_id     CHAR(36)    NOT NULL,
  last_version     BIGINT      NULL,
  last_occurred_at DATETIME(3) NULL,
  PRIMARY KEY (consumer_name, aggregate_type, aggregate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS session_impact (
  id          CHAR(36)    NOT NULL,
  org_id      CHAR(36)    NOT NULL,
  session_id  CHAR(36)    NOT NULL,
  source_type VARCHAR(40) NOT NULL,
  source_id   CHAR(36)    NOT NULL,
  event_id    CHAR(36)    NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  details     LONGTEXT    NULL,
  created_at  DATETIME(3) NOT NULL,
  resolved_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_session_impact (session_id, source_type, event_id),
  KEY idx_impact_org_status (org_id, status),
  KEY idx_impact_source (source_type, source_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification:
-- SELECT status, COUNT(*) FROM inbox_event GROUP BY status;
-- SELECT source_type, status, COUNT(*) FROM session_impact GROUP BY source_type, status;
