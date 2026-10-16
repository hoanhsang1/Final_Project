-- MEMS / People Service / MySQL 8.0.16+
-- IDs of other services are soft references, NEVER cross-service FKs.
CREATE DATABASE IF NOT EXISTS mems_people_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mems_people_db;

CREATE TABLE student (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL, account_id CHAR(36) NULL,
 code VARCHAR(50) NOT NULL, full_name VARCHAR(200) NOT NULL,
 dob DATE NULL, gender ENUM('male','female','other') NULL,
 phone VARCHAR(30) NULL, email VARCHAR(255) NULL,
 status ENUM('active','inactive','graduated','withdrawn') NOT NULL DEFAULT 'active',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_student_org_code (org_id,code),
 UNIQUE KEY uq_student_account (account_id),
 INDEX idx_student_org_status (org_id,status,deleted_at)
) ENGINE=InnoDB;

CREATE TABLE teacher (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL, account_id CHAR(36) NULL,
 code VARCHAR(50) NOT NULL, full_name VARCHAR(200) NOT NULL,
 specialization VARCHAR(255) NULL, contract_type VARCHAR(50) NULL,
 phone VARCHAR(30) NULL, email VARCHAR(255) NULL,
 status ENUM('active','inactive','on_leave','resigned') NOT NULL DEFAULT 'active',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_teacher_org_code (org_id,code),
 UNIQUE KEY uq_teacher_account (account_id),
 INDEX idx_teacher_org_status (org_id,status,deleted_at)
) ENGINE=InnoDB;

CREATE TABLE staff (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL, account_id CHAR(36) NULL,
 code VARCHAR(50) NOT NULL, full_name VARCHAR(200) NOT NULL,
 position VARCHAR(100) NULL, department VARCHAR(100) NULL,
 status ENUM('active','inactive','on_leave','resigned') NOT NULL DEFAULT 'active',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_staff_org_code (org_id,code),
 UNIQUE KEY uq_staff_account (account_id),
 INDEX idx_staff_org_status (org_id,status,deleted_at)
) ENGINE=InnoDB;

-- Service must validate org/account ownership through Identity API.
-- UNIQUE(account_id) applies within each profile type; a person may have both teacher and staff profiles.
