-- Test fixture for the Identity tables used by authentication/provisioning.
CREATE TABLE IF NOT EXISTS organization (
 id VARCHAR(36) PRIMARY KEY,name VARCHAR(200) NOT NULL,org_type VARCHAR(20) NOT NULL,status VARCHAR(20) NOT NULL
);
CREATE TABLE IF NOT EXISTS account (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36),username VARCHAR(100) NOT NULL UNIQUE,
 email VARCHAR(255),password_hash VARCHAR(255) NOT NULL,status VARCHAR(20) NOT NULL,
 last_login_at TIMESTAMP,must_change_password BOOLEAN NOT NULL DEFAULT FALSE,provisioned_by VARCHAR(36),
 FOREIGN KEY(org_id) REFERENCES organization(id)
);
CREATE TABLE IF NOT EXISTS role (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,code VARCHAR(50) NOT NULL UNIQUE,name VARCHAR(100) NOT NULL,
 scope VARCHAR(20) NOT NULL,description VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS permission (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,code VARCHAR(100) NOT NULL UNIQUE,description VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS role_permission (
 role_id BIGINT NOT NULL,permission_id BIGINT NOT NULL,PRIMARY KEY(role_id,permission_id),
 FOREIGN KEY(role_id) REFERENCES role(id),FOREIGN KEY(permission_id) REFERENCES permission(id)
);
CREATE TABLE IF NOT EXISTS account_role (
 account_id VARCHAR(36) NOT NULL,role_id BIGINT NOT NULL,PRIMARY KEY(account_id,role_id),
 FOREIGN KEY(account_id) REFERENCES account(id),FOREIGN KEY(role_id) REFERENCES role(id)
);
CREATE TABLE IF NOT EXISTS refresh_token (
 id VARCHAR(36) PRIMARY KEY,account_id VARCHAR(36) NOT NULL,token_hash VARCHAR(64) NOT NULL UNIQUE,
 issued_at TIMESTAMP NOT NULL,expires_at TIMESTAMP NOT NULL,revoked_at TIMESTAMP,replaced_by VARCHAR(36),
 FOREIGN KEY(account_id) REFERENCES account(id),FOREIGN KEY(replaced_by) REFERENCES refresh_token(id)
);
CREATE TABLE IF NOT EXISTS module (code VARCHAR(60) PRIMARY KEY,name VARCHAR(150),is_active BOOLEAN);
CREATE TABLE IF NOT EXISTS organization_module (
 org_id VARCHAR(36) NOT NULL,module_code VARCHAR(60) NOT NULL,status VARCHAR(20) NOT NULL,
 PRIMARY KEY(org_id, module_code),FOREIGN KEY(org_id) REFERENCES organization(id)
);
CREATE TABLE IF NOT EXISTS audit_log (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36),actor_account_id VARCHAR(36),
 action VARCHAR(100) NOT NULL,entity_type VARCHAR(100) NOT NULL,entity_id VARCHAR(36),
 old_value VARCHAR(1000),new_value VARCHAR(1000),created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
