-- Additive migration. Run against existing People DB before starting the service.
-- No cross-service foreign keys. org_id and user_id are soft references.
USE mems_people_db;
CREATE TABLE IF NOT EXISTS department (
 id CHAR(36) PRIMARY KEY, org_id CHAR(36) NOT NULL,
 name VARCHAR(200) NOT NULL, description VARCHAR(1000),
 created_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_department_org_name(org_id,name),
 UNIQUE KEY uq_department_id_org(id,org_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `position` (
 id CHAR(36) PRIMARY KEY, org_id CHAR(36) NOT NULL,
 name VARCHAR(200) NOT NULL, description VARCHAR(1000),
 created_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_position_org_name(org_id,name),
 UNIQUE KEY uq_position_id_org(id,org_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS position_permission (
 position_id CHAR(36) NOT NULL, permission_code VARCHAR(100) NOT NULL,
 PRIMARY KEY(position_id,permission_code),
 FOREIGN KEY(position_id) REFERENCES `position`(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS department_member (
 user_id CHAR(36) PRIMARY KEY, org_id CHAR(36) NOT NULL,
 department_id CHAR(36) NOT NULL, role ENUM('OWNER','MANAGER','STAFF') NOT NULL,
 appointed_by CHAR(36) NOT NULL, appointed_at DATETIME(3) NOT NULL,
 UNIQUE KEY uq_member_user_org(user_id,org_id),
 FOREIGN KEY(department_id,org_id) REFERENCES department(id,org_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS member_position (
 user_id CHAR(36) NOT NULL, position_id CHAR(36) NOT NULL, org_id CHAR(36) NOT NULL,
 PRIMARY KEY(user_id,position_id),
 FOREIGN KEY(user_id,org_id) REFERENCES department_member(user_id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(position_id,org_id) REFERENCES `position`(id,org_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS people_audit_log (
 id CHAR(36) PRIMARY KEY, org_id CHAR(36) NOT NULL, actor_user_id CHAR(36) NOT NULL,
 action VARCHAR(100) NOT NULL, target_id CHAR(36) NOT NULL,
 details TEXT NOT NULL, created_at DATETIME(3) NOT NULL,
 INDEX idx_people_audit_org_time(org_id,created_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS account_compensation (
 user_id CHAR(36) PRIMARY KEY, org_id CHAR(36) NOT NULL,
 created_at DATETIME(3) NOT NULL, attempts INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
