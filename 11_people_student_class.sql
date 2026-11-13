-- Additive migration for People database.
-- department_module, student, school_class, and class_student tables.
USE mems_people_db;

CREATE TABLE IF NOT EXISTS department_module (
    department_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    module_code VARCHAR(60) NOT NULL,
    PRIMARY KEY (department_id, module_code),
    INDEX idx_department_module_org(org_id),
    FOREIGN KEY (department_id, org_id) REFERENCES department(id, org_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student (
    id CHAR(36) PRIMARY KEY,
    org_id CHAR(36) NOT NULL,
    student_code VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    date_of_birth DATE NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NULL,
    deleted_at DATETIME(3) NULL,
    UNIQUE KEY uq_student_org_code(org_id, student_code),
    INDEX idx_student_org_deleted(org_id, deleted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS school_class (
    id CHAR(36) PRIMARY KEY,
    org_id CHAR(36) NOT NULL,
    class_code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    academic_year VARCHAR(50) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_by CHAR(36) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NULL,
    deleted_at DATETIME(3) NULL,
    UNIQUE KEY uq_school_class_org_code(org_id, class_code),
    INDEX idx_school_class_org_deleted(org_id, deleted_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS class_student (
    class_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    org_id CHAR(36) NOT NULL,
    enrolled_at DATETIME(3) NOT NULL,
    PRIMARY KEY (class_id, student_id),
    UNIQUE KEY uq_class_student_student(student_id),
    INDEX idx_class_student_org(org_id),
    FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES school_class(id) ON DELETE CASCADE
) ENGINE=InnoDB;

