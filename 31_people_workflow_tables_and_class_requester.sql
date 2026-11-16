-- MEMS / People Service / migration 31
-- Workflow tables the current code queries but that are missing from the DB_11_16
-- snapshot: assignment, position_bundle, notification, transfer_*, resignation_request,
-- delegation*, plus the class requester columns used by the approval escalation.
--
-- Idempotent and additive only: CREATE TABLE IF NOT EXISTS / ADD COLUMN when missing.
-- No rows are deleted, updated or re-created. Foreign keys are intentionally omitted
-- for the new workflow tables so the migration cannot fail on differing key shapes;
-- the code always writes valid ids and keeps history via status columns.
USE mems_people_db;

CREATE TABLE IF NOT EXISTS assignment (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    position_id CHAR(36) NOT NULL,
    scope_type VARCHAR(20) NOT NULL,
    department_id CHAR(36) DEFAULT NULL,
    effective_from DATETIME(3) NOT NULL,
    effective_to DATETIME(3) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    assigned_by CHAR(36) DEFAULT NULL,
    created_at DATETIME(3) NOT NULL,
    reason VARCHAR(1000) DEFAULT NULL,
    revoked_at DATETIME(3) DEFAULT NULL,
    revoked_by CHAR(36) DEFAULT NULL,
    revoked_reason VARCHAR(1000) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_assignment_user (org_id, user_id, status),
    KEY idx_assignment_position (org_id, position_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS position_bundle (
    position_id CHAR(36) NOT NULL,
    bundle_code VARCHAR(100) NOT NULL,
    PRIMARY KEY (position_id, bundle_code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body VARCHAR(1000) DEFAULT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id CHAR(36) DEFAULT NULL,
    read_at DATETIME(3) DEFAULT NULL,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_notification_user (org_id, user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transfer_request (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    from_department_id CHAR(36) NOT NULL,
    to_department_id CHAR(36) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by CHAR(36) NOT NULL,
    requested_at DATETIME(3) NOT NULL,
    applied_at DATETIME(3) DEFAULT NULL,
    applied_by CHAR(36) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_transfer_request_org_status (org_id, status),
    KEY idx_transfer_request_user (org_id, user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transfer_approval (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    request_id CHAR(36) NOT NULL,
    step VARCHAR(20) NOT NULL,
    decision VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    decided_by CHAR(36) DEFAULT NULL,
    decided_at DATETIME(3) DEFAULT NULL,
    note VARCHAR(1000) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_transfer_approval_step (request_id, step)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resignation_request (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    department_id CHAR(36) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_by CHAR(36) NOT NULL,
    requested_at DATETIME(3) NOT NULL,
    decided_by CHAR(36) DEFAULT NULL,
    decided_at DATETIME(3) DEFAULT NULL,
    decision_note VARCHAR(1000) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_resignation_org_dept_status (org_id, department_id, status),
    KEY idx_resignation_user (org_id, user_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delegation (
    id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    delegator_id CHAR(36) NOT NULL,
    delegate_id CHAR(36) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'ORGANIZATION',
    effective_from DATETIME(3) NOT NULL,
    effective_to DATETIME(3) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    reason VARCHAR(1000) DEFAULT NULL,
    created_by CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) DEFAULT NULL,
    revoked_by CHAR(36) DEFAULT NULL,
    revoked_at DATETIME(3) DEFAULT NULL,
    revoked_reason VARCHAR(1000) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_delegation_delegate (org_id, delegate_id, status),
    KEY idx_delegation_org_status (org_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS delegation_permission (
    delegation_id CHAR(36) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    PRIMARY KEY (delegation_id, permission_code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

DELIMITER $
DROP PROCEDURE IF EXISTS mems_m31_class_columns$
CREATE PROCEDURE mems_m31_class_columns()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND column_name = 'cancel_state'
    ) THEN
        ALTER TABLE school_class ADD COLUMN cancel_state VARCHAR(10) NOT NULL DEFAULT 'NONE';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND column_name = 'cancel_request_reason'
    ) THEN
        ALTER TABLE school_class ADD COLUMN cancel_request_reason VARCHAR(1000) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND column_name = 'cancel_requested_by'
    ) THEN
        ALTER TABLE school_class ADD COLUMN cancel_requested_by CHAR(36) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND column_name = 'close_requested_by'
    ) THEN
        ALTER TABLE school_class ADD COLUMN close_requested_by CHAR(36) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND column_name = 'needs_reassignment'
    ) THEN
        ALTER TABLE school_class ADD COLUMN needs_reassignment BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND column_name = 'reassignment_reason'
    ) THEN
        ALTER TABLE school_class ADD COLUMN reassignment_reason VARCHAR(255) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = DATABASE() AND table_name = 'school_class'
          AND constraint_name = 'chk_school_class_cancel_state'
    ) THEN
        ALTER TABLE school_class
            ADD CONSTRAINT chk_school_class_cancel_state
            CHECK (cancel_state IN ('NONE', 'PENDING'));
    END IF;

    -- student account link columns used by the student provisioning flow.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'student'
          AND column_name = 'account_username'
    ) THEN
        ALTER TABLE student ADD COLUMN account_username VARCHAR(100) DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'student'
          AND column_name = 'account_created_at'
    ) THEN
        ALTER TABLE student ADD COLUMN account_created_at DATETIME(3) DEFAULT NULL;
    END IF;

    -- Widen the close-event action CHECK so the cancel workflow can write its events.
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = DATABASE() AND table_name = 'class_close_event'
          AND constraint_name = 'chk_class_close_event_action'
          AND constraint_type = 'CHECK'
    ) THEN
        ALTER TABLE class_close_event DROP CHECK chk_class_close_event_action;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'class_close_event'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = DATABASE() AND table_name = 'class_close_event'
          AND constraint_name = 'chk_class_close_event_action'
    ) THEN
        ALTER TABLE class_close_event
            ADD CONSTRAINT chk_class_close_event_action
            CHECK (action IN ('REQUESTED', 'APPROVED', 'REJECTED', 'REOPENED',
                              'CANCEL_REQUESTED', 'CANCEL_APPROVED', 'CANCEL_REJECTED'));
    END IF;
END$
CALL mems_m31_class_columns()$
DROP PROCEDURE IF EXISTS mems_m31_class_columns$
DELIMITER ;

-- Verification:
-- SHOW TABLES LIKE 'assignment';
-- SHOW COLUMNS FROM school_class LIKE '%requested_by';
