-- H2 test fixture mirroring constraints in 07_people_department_access.sql and 11_people_student_class.sql.
CREATE TABLE IF NOT EXISTS department (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 name VARCHAR(200) NOT NULL, description VARCHAR(1000), created_at TIMESTAMP NOT NULL,
 UNIQUE(org_id,name), UNIQUE(id,org_id)
);
CREATE TABLE IF NOT EXISTS department_module (
 department_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL, module_code VARCHAR(60) NOT NULL,
 PRIMARY KEY(department_id, module_code)
);
CREATE TABLE IF NOT EXISTS position (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 name VARCHAR(200) NOT NULL, description VARCHAR(1000), created_at TIMESTAMP NOT NULL,
 profile_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
 UNIQUE(org_id,name), UNIQUE(id,org_id)
);
CREATE TABLE IF NOT EXISTS position_seed (
 org_id VARCHAR(36) PRIMARY KEY, seeded_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS position_permission (
 position_id VARCHAR(36) NOT NULL, permission_code VARCHAR(100) NOT NULL,
 PRIMARY KEY(position_id,permission_code),
 FOREIGN KEY(position_id) REFERENCES position(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS department_member (
 user_id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, department_id VARCHAR(36) NOT NULL,
 role VARCHAR(20) NOT NULL, appointed_by VARCHAR(36) NOT NULL, appointed_at TIMESTAMP NOT NULL,
 username VARCHAR(100),
 UNIQUE(user_id,org_id), FOREIGN KEY(department_id,org_id) REFERENCES department(id,org_id)
);
CREATE TABLE IF NOT EXISTS member_position (
 user_id VARCHAR(36) NOT NULL,position_id VARCHAR(36) NOT NULL,org_id VARCHAR(36) NOT NULL,
 PRIMARY KEY(user_id,position_id),
 FOREIGN KEY(user_id,org_id) REFERENCES department_member(user_id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(position_id,org_id) REFERENCES position(id,org_id)
);
CREATE TABLE IF NOT EXISTS people_audit_log (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36) NOT NULL,actor_user_id VARCHAR(36) NOT NULL,
 action VARCHAR(100) NOT NULL,target_id VARCHAR(36) NOT NULL,details TEXT NOT NULL,created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS account_compensation (
 user_id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36) NOT NULL,created_at TIMESTAMP NOT NULL,attempts INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS staff_profile (
 user_id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 staff_code VARCHAR(50) NOT NULL, full_name VARCHAR(200) NOT NULL, full_name_unaccented VARCHAR(200) NOT NULL,
 phone VARCHAR(30), email VARCHAR(255), version BIGINT NOT NULL DEFAULT 0,
 created_by VARCHAR(36), created_at TIMESTAMP NOT NULL, updated_by VARCHAR(36), updated_at TIMESTAMP,
 UNIQUE(user_id,org_id), UNIQUE(org_id,staff_code),
 FOREIGN KEY(user_id,org_id) REFERENCES department_member(user_id,org_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS specialty (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 name VARCHAR(200) NOT NULL, name_unaccented VARCHAR(200) NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(36), created_at TIMESTAMP NOT NULL,
 UNIQUE(id,org_id), UNIQUE(org_id,name_unaccented)
);
CREATE TABLE IF NOT EXISTS subject (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 name VARCHAR(200) NOT NULL, name_unaccented VARCHAR(200) NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(36), created_at TIMESTAMP NOT NULL,
 UNIQUE(id,org_id), UNIQUE(org_id,name_unaccented)
);
CREATE TABLE IF NOT EXISTS teacher_profile (
 user_id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 contract_type VARCHAR(20), teaching_status VARCHAR(20) NOT NULL DEFAULT 'DANG_DAY',
 version BIGINT NOT NULL DEFAULT 0, created_by VARCHAR(36), created_at TIMESTAMP NOT NULL,
 updated_by VARCHAR(36), updated_at TIMESTAMP,
 UNIQUE(user_id,org_id),
 FOREIGN KEY(user_id,org_id) REFERENCES staff_profile(user_id,org_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS teacher_specialty (
 user_id VARCHAR(36) NOT NULL, specialty_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 PRIMARY KEY(user_id,specialty_id),
 FOREIGN KEY(user_id,org_id) REFERENCES teacher_profile(user_id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(specialty_id,org_id) REFERENCES specialty(id,org_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS student (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 student_code VARCHAR(100) NOT NULL, full_name VARCHAR(200) NOT NULL,
 date_of_birth DATE, email VARCHAR(255), phone VARCHAR(50), status VARCHAR(20) NOT NULL DEFAULT 'active',
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, deleted_at TIMESTAMP,
 UNIQUE(org_id, student_code)
);
CREATE TABLE IF NOT EXISTS school_class (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 class_code VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL,
 academic_year VARCHAR(50), status VARCHAR(20) NOT NULL DEFAULT 'active',
 teacher_id VARCHAR(36), start_date DATE, end_date DATE, subject_id VARCHAR(36),
 version BIGINT NOT NULL DEFAULT 0, close_state VARCHAR(10) NOT NULL DEFAULT 'NONE',
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, deleted_at TIMESTAMP,
 UNIQUE(org_id, class_code)
);
CREATE TABLE IF NOT EXISTS class_student (
 class_id VARCHAR(36) NOT NULL, student_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL, enrolled_at TIMESTAMP NOT NULL,
 PRIMARY KEY(class_id, student_id),
 UNIQUE(student_id)
);
CREATE TABLE IF NOT EXISTS class_status_log (
 id VARCHAR(36) PRIMARY KEY, class_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 from_status VARCHAR(20), to_status VARCHAR(20) NOT NULL, reason VARCHAR(1000),
 changed_by VARCHAR(36), changed_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS class_close_event (
 id VARCHAR(36) PRIMARY KEY, class_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 action VARCHAR(20) NOT NULL, actor_id VARCHAR(36) NOT NULL, reason VARCHAR(1000), created_at TIMESTAMP NOT NULL
);
