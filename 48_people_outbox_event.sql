-- MEMS / People Service / migration 48 — PHASE 2 / CC-03
-- Transactional outbox cho đồng bộ liên service (SCH-01 giáo viên, CLS-03 vòng đời lớp).
-- Event được ghi CÙNG transaction với dòng nghiệp vụ; publisher gửi HTTP nội bộ tới
-- ScheduleService, retry có backoff, event FAILED được giữ lại để tra cứu/replay.
--
-- Idempotent, additive, không xoá/đổi bảng sẵn có. Apply to mems_people_db (local/test).
USE mems_people_db;

CREATE TABLE IF NOT EXISTS outbox_event (
  id BIGINT NOT NULL AUTO_INCREMENT,
  event_id CHAR(36) NOT NULL,
  aggregate_type VARCHAR(40) NOT NULL,
  aggregate_id VARCHAR(36) NOT NULL,
  aggregate_version BIGINT NULL,
  event_type VARCHAR(80) NOT NULL,
  event_version INT NOT NULL DEFAULT 1,
  organization_id VARCHAR(36) NOT NULL,
  correlation_id CHAR(36) NULL,
  payload LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NOT NULL,
  locked_until DATETIME(3) NULL,
  last_error VARCHAR(1000) NULL,
  replayed_at DATETIME(3) NULL,
  replayed_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL,
  published_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_outbox_event_event_id (event_id),
  KEY idx_outbox_event_due (status, next_attempt_at),
  KEY idx_outbox_event_org_created (organization_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verification:
-- SELECT status, COUNT(*) FROM outbox_event GROUP BY status;
-- SELECT event_id, event_type, attempts, last_error FROM outbox_event
--  WHERE status = 'FAILED' ORDER BY id DESC LIMIT 20;
