-- MEMS / Facility Service / MySQL 8.0.16+
CREATE DATABASE IF NOT EXISTS mems_facility_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mems_facility_db;

CREATE TABLE classroom (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL, code VARCHAR(50) NOT NULL,
 name VARCHAR(200) NOT NULL, building VARCHAR(100), floor VARCHAR(20),
 capacity INT NOT NULL,
 room_type ENUM('classroom','computer_room') NOT NULL DEFAULT 'classroom',
 status ENUM('active','maintenance','closed') NOT NULL DEFAULT 'active',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_classroom_org_code (org_id,code),
 UNIQUE KEY uq_classroom_id_org (id,org_id),
 INDEX idx_classroom_org_status (org_id,status,deleted_at),
 CONSTRAINT chk_classroom_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE TABLE computer_room (
 classroom_id CHAR(36) NOT NULL PRIMARY KEY,
 machine_count INT NOT NULL, spec_description TEXT NULL, installed_software TEXT NULL,
 FOREIGN KEY (classroom_id) REFERENCES classroom(id) ON DELETE RESTRICT,
 CONSTRAINT chk_computer_room_machines CHECK (machine_count >= 0)
) ENGINE=InnoDB;

CREATE TABLE equipment (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL,
 room_id CHAR(36) NULL, -- NULL: storage / unassigned
 asset_code VARCHAR(50) NOT NULL, name VARCHAR(200) NOT NULL,
 equipment_type VARCHAR(100) NULL, purchase_date DATE NULL,
 status ENUM('in_use','broken','maintenance','in_storage','retired') NOT NULL DEFAULT 'in_use',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_equipment_org_asset (org_id,asset_code),
 UNIQUE KEY uq_equipment_id_org (id,org_id),
 INDEX idx_equipment_room_status (room_id,status),
 INDEX idx_equipment_org_status (org_id,status,deleted_at),
 FOREIGN KEY (room_id,org_id) REFERENCES classroom(id,org_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE incident_report (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL,
 equipment_id CHAR(36) NOT NULL,
 reported_by CHAR(36) NOT NULL, -- soft reference to Identity account
 description TEXT NOT NULL, photo_url VARCHAR(500) NULL,
 status ENUM('open','in_progress','resolved','unresolved') NOT NULL DEFAULT 'open',
 resolved_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_incident_id_equipment (id,equipment_id),
 INDEX idx_incident_org_status (org_id,status),
 INDEX idx_incident_equipment_status (equipment_id,status),
 FOREIGN KEY (equipment_id,org_id) REFERENCES equipment(id,org_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE equipment_status_log (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 equipment_id CHAR(36) NOT NULL,
 incident_report_id CHAR(36) NULL,
 changed_by CHAR(36) NOT NULL, -- soft reference to Identity account
 old_status ENUM('in_use','broken','maintenance','in_storage','retired') NULL,
 new_status ENUM('in_use','broken','maintenance','in_storage','retired') NOT NULL,
 reason TEXT NULL,
 changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_equipment_log_equipment (equipment_id,changed_at),
 FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
 FOREIGN KEY (incident_report_id,equipment_id)
 REFERENCES incident_report(id,equipment_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Facility Service must ensure computer_room.classroom_id has room_type='computer_room'.
-- Audit and room availability checks are implemented in application services.
