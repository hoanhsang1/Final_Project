-- =====================================================================
-- Identity & Organization Service — V1 schema
-- Trích từ mems_schema.sql gốc, chỉ giữ các bảng thuộc service này
-- (mỗi microservice sở hữu database riêng — xem SRS Phần 11)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE organization_type AS ENUM ('school', 'center');
CREATE TYPE organization_status AS ENUM ('active', 'suspended');

CREATE TYPE account_role AS ENUM (
    'super_admin', 'org_admin', 'academic_staff', 'facility_staff', 'teacher', 'student'
);
CREATE TYPE account_status AS ENUM ('active', 'locked', 'disabled');

CREATE TYPE module_code AS ENUM (
    'student_management', 'teacher_management', 'class_management', 'schedule_management',
    'staff_management', 'classroom_management', 'computer_room_management',
    'equipment_management', 'teacher_assignment', 'room_usage_management'
);

CREATE TABLE organization (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    org_type        organization_type NOT NULL,
    status          organization_status NOT NULL DEFAULT 'active',
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE account (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    username                VARCHAR(100) NOT NULL,
    email                   VARCHAR(255),
    password_hash           VARCHAR(255) NOT NULL,
    role                    account_role NOT NULL,
    status                  account_status NOT NULL DEFAULT 'active',
    failed_login_attempts   SMALLINT NOT NULL DEFAULT 0,
    locked_until            TIMESTAMPTZ,
    last_login_at           TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, username)
);

CREATE TABLE module_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    module          module_code NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT false,
    updated_by      UUID REFERENCES account(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, module)
);

CREATE TABLE refresh_token (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    device_info     VARCHAR(255),
    ip_address      VARCHAR(45),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    replaced_by     UUID REFERENCES refresh_token(id),
    UNIQUE (token_hash)
);

CREATE TABLE password_reset_token (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    UNIQUE (token_hash)
);

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
    actor_account_id UUID REFERENCES account(id),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_token_account ON refresh_token (account_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_token_expires ON refresh_token (expires_at);
CREATE INDEX idx_password_reset_account ON password_reset_token (account_id) WHERE used_at IS NULL;
CREATE INDEX idx_audit_log_org_time ON audit_log (org_id, created_at);
