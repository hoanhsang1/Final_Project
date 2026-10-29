CREATE TABLE IF NOT EXISTS classroom (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36),department_id VARCHAR(36),
 code VARCHAR(50),name VARCHAR(200),capacity INT,status VARCHAR(20),deleted_at TIMESTAMP
);
