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
 UNIQUE(org_id,name), UNIQUE(id,org_id)
);
CREATE TABLE IF NOT EXISTS position_permission (
 position_id VARCHAR(36) NOT NULL, permission_code VARCHAR(100) NOT NULL,
 PRIMARY KEY(position_id,permission_code),
 FOREIGN KEY(position_id) REFERENCES position(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS department_member (
 user_id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, department_id VARCHAR(36) NOT NULL,
 role VARCHAR(20) NOT NULL, appointed_by VARCHAR(36) NOT NULL, appointed_at TIMESTAMP NOT NULL,
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
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, deleted_at TIMESTAMP,
 UNIQUE(org_id, class_code)
);
CREATE TABLE IF NOT EXISTS class_student (
 class_id VARCHAR(36) NOT NULL, student_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL, enrolled_at TIMESTAMP NOT NULL,
 PRIMARY KEY(class_id, student_id),
 UNIQUE(student_id)
);
