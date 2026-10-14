-- MEMS / Schedule Service / MySQL 8.0.16+
CREATE DATABASE IF NOT EXISTS mems_schedule_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mems_schedule_db;

CREATE TABLE `class` (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 org_id CHAR(36) NOT NULL, code VARCHAR(50) NOT NULL,
 name VARCHAR(200) NOT NULL, subject VARCHAR(200) NULL,
 max_size INT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
 status ENUM('draft','ongoing','closed') NOT NULL DEFAULT 'draft',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 UNIQUE KEY uq_class_org_code (org_id,code),
 INDEX idx_class_org_status (org_id,status,deleted_at),
 CONSTRAINT chk_class_size CHECK (max_size > 0),
 CONSTRAINT chk_class_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB;

CREATE TABLE class_enrollment (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 class_id CHAR(36) NOT NULL, student_id CHAR(36) NOT NULL,
 enrolled_at DATE NOT NULL DEFAULT (CURRENT_DATE),
 status ENUM('active','dropped','completed') NOT NULL DEFAULT 'active',
 UNIQUE KEY uq_enrollment_class_student (class_id,student_id),
 INDEX idx_enrollment_student (student_id),
 FOREIGN KEY (class_id) REFERENCES `class`(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE teacher_assignment (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 class_id CHAR(36) NOT NULL, teacher_id CHAR(36) NOT NULL,
 assigned_at DATE NOT NULL DEFAULT (CURRENT_DATE),
 status ENUM('active','ended') NOT NULL DEFAULT 'active',
 -- One assignment per teacher/class; reactivation uses UPDATE.
 UNIQUE KEY uq_assignment_class_teacher (class_id,teacher_id),
 INDEX idx_assignment_teacher (teacher_id),
 FOREIGN KEY (class_id) REFERENCES `class`(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Each row is one concrete class meeting. Recurrence is handled by generating sessions.
CREATE TABLE session (
 id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
 class_id CHAR(36) NOT NULL, teacher_id CHAR(36) NOT NULL,
 room_id CHAR(36) NULL, -- Facility Service classroom.id (including computer rooms)
 start_time DATETIME(3) NOT NULL, end_time DATETIME(3) NOT NULL,
 status ENUM('scheduled','cancelled','completed') NOT NULL DEFAULT 'scheduled',
 deleted_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
 INDEX idx_session_teacher_time (teacher_id,start_time,end_time),
 INDEX idx_session_room_time (room_id,start_time,end_time),
 INDEX idx_session_class (class_id),
 FOREIGN KEY (class_id) REFERENCES `class`(id) ON DELETE RESTRICT,
 CONSTRAINT chk_session_time CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- Transactional lock rows for serializing concurrent scheduling of the same teacher/room.
-- Backend: create rows if missing, SELECT ... FOR UPDATE in stable sorted order,
-- then query overlaps and INSERT/UPDATE session in the SAME transaction.
CREATE TABLE schedule_resource_lock (
 org_id CHAR(36) NOT NULL,
 resource_type ENUM('teacher','room') NOT NULL,
 resource_id CHAR(36) NOT NULL,
 PRIMARY KEY (org_id,resource_type,resource_id)
) ENGINE=InnoDB;

-- Overlap condition: existing.start_time < new.end_time AND existing.end_time > new.start_time.
-- Ignore cancelled and soft-deleted sessions; validate org, class dates, teacher assignment,
-- room availability and student capacity in Schedule Service.
