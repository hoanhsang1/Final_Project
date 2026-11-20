-- MEMS / Facility Service / migration 49 — PHASE 2 / CC-03 + SCH-04
-- Transactional outbox cho sự cố cơ sở vật chất. Facility phát event
-- FacilityIncidentOpened/Resolved trong cùng transaction với incident_report;
-- Schedule tiêu thụ để đánh dấu buổi học bị ảnh hưởng (không tự đổi phòng).
--
-- Idempotent, additive, không xoá/đổi bảng sẵn có. Apply to mems_facility_db (local/test).
USE mems_facility_db;

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
