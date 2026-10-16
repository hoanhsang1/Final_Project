-- MEMS / Identity & Organization / MySQL 8.0.16+
-- Fresh install only. Each service owns its database.
CREATE DATABASE IF NOT EXISTS mems_identity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mems_identity_db;

CREATE TABLE organization (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 name VARCHAR(200) NOT NULL,
 org_type ENUM('school','center') NOT NULL,
 status ENUM('pending','active','rejected','suspended') NOT NULL DEFAULT 'pending',
 contact_email VARCHAR(255), contact_phone VARCHAR(30),
 approved_by CHAR(36) NULL, approved_at DATETIME(3) NULL, rejection_reason VARCHAR(500) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX idx_org_status (status)
) ENGINE=InnoDB;

-- Login username is globally unique; org_id NULL is reserved for platform administrators.
CREATE TABLE account (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NULL,
 username VARCHAR(100) NOT NULL,
 email VARCHAR(255) NULL,
 password_hash VARCHAR(255) NOT NULL,
 status ENUM('pending','active','locked','disabled') NOT NULL DEFAULT 'pending',
 failed_login_attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
 locked_until DATETIME(3) NULL, last_login_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_account_username (username),
 INDEX idx_account_org_status (org_id,status),
 CONSTRAINT fk_account_org FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE organization ADD CONSTRAINT fk_org_approved_by
 FOREIGN KEY (approved_by) REFERENCES account(id) ON DELETE SET NULL;

CREATE TABLE role (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL UNIQUE,
 name VARCHAR(100) NOT NULL,
 scope ENUM('platform','organization') NOT NULL,
 description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE permission (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(100) NOT NULL UNIQUE,
 description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE role_permission (
 role_id BIGINT UNSIGNED NOT NULL,
 permission_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY (role_id,permission_id),
 FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
 FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE account_role (
 account_id CHAR(36) NOT NULL,
 role_id BIGINT UNSIGNED NOT NULL,
 assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (account_id,role_id),
 FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE RESTRICT,
 FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE module_config (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL,
 module ENUM('student_management','teacher_management','class_management','schedule_management',
 'staff_management','classroom_management','computer_room_management','equipment_management',
 'teacher_assignment','room_usage_management') NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT FALSE,
 updated_by CHAR(36) NULL,
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_module_config_org_module (org_id,module),
 FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE RESTRICT,
 FOREIGN KEY (updated_by) REFERENCES account(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE refresh_token (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 token_hash CHAR(64) NOT NULL,
 device_info VARCHAR(255), ip_address VARCHAR(45),
 issued_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 expires_at DATETIME(3) NOT NULL, revoked_at DATETIME(3) NULL,
 replaced_by CHAR(36) NULL,
 UNIQUE KEY uq_refresh_hash (token_hash),
 INDEX idx_refresh_account (account_id), INDEX idx_refresh_expires (expires_at),
 FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE RESTRICT,
 FOREIGN KEY (replaced_by) REFERENCES refresh_token(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE password_reset_token (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 account_id CHAR(36) NOT NULL,
 token_hash CHAR(64) NOT NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 expires_at DATETIME(3) NOT NULL, used_at DATETIME(3) NULL,
 UNIQUE KEY uq_reset_hash (token_hash),
 INDEX idx_reset_account (account_id),
 FOREIGN KEY (account_id) REFERENCES account(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Organization may be NULL for platform-wide events. Preserve audit history.
CREATE TABLE audit_log (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NULL, actor_account_id CHAR(36) NULL,
 action VARCHAR(100) NOT NULL, entity_type VARCHAR(100) NOT NULL,
 entity_id CHAR(36) NULL, old_value JSON NULL, new_value JSON NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_audit_org_time (org_id,created_at),
 FOREIGN KEY (org_id) REFERENCES organization(id) ON DELETE RESTRICT,
 FOREIGN KEY (actor_account_id) REFERENCES account(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE user_session (
    id CHAR(36) NOT NULL PRIMARY KEY,
    account_id CHAR(36) NOT NULL,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    created_at DATETIME(3) NOT NULL,
    last_active_at DATETIME(3) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,

    INDEX idx_session_account (account_id),

    CONSTRAINT fk_session_account
        FOREIGN KEY (account_id)
        REFERENCES account(id)
);


CREATE TABLE IF NOT EXISTS module (
    code VARCHAR(60) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS organization_module (
    org_id CHAR(36) NOT NULL,
    module_code VARCHAR(60) NOT NULL,
    status ENUM('requested', 'active', 'rejected')
        NOT NULL DEFAULT 'requested',

    PRIMARY KEY (org_id, module_code),

    CONSTRAINT fk_org_module_org
        FOREIGN KEY (org_id)
        REFERENCES organization(id),

    CONSTRAINT fk_org_module_module
        FOREIGN KEY (module_code)
        REFERENCES module(code)
);


ALTER TABLE refresh_token
ADD COLUMN session_id CHAR(36) NULL,
ADD INDEX idx_refresh_session (session_id),
ADD CONSTRAINT fk_refresh_session
    FOREIGN KEY (session_id)
    REFERENCES user_session(id);
-- Enforce role scope and organization membership in Identity Service when assigning roles.
-- Platform role: account.org_id IS NULL; organization role: account.org_id IS NOT NULL.
