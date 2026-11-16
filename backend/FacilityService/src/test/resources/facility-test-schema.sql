CREATE TABLE IF NOT EXISTS classroom (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36),department_id VARCHAR(36),
 code VARCHAR(50),name VARCHAR(200),building VARCHAR(100),floor VARCHAR(20),
 capacity INT,room_type VARCHAR(20),status VARCHAR(20),deleted_at TIMESTAMP,
 created_at TIMESTAMP,updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipment (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36),department_id VARCHAR(36),room_id VARCHAR(36),
 asset_code VARCHAR(50),name VARCHAR(200),equipment_type VARCHAR(100),purchase_date DATE,
 status VARCHAR(20),deleted_at TIMESTAMP,created_at TIMESTAMP,updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS incident_report (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36),equipment_id VARCHAR(36),reported_by VARCHAR(36),
 description VARCHAR(2000),photo_url VARCHAR(500),status VARCHAR(20),
 resolved_at TIMESTAMP,created_at TIMESTAMP,updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS equipment_status_log (
 id VARCHAR(36) PRIMARY KEY,equipment_id VARCHAR(36),incident_report_id VARCHAR(36),
 changed_by VARCHAR(36),old_status VARCHAR(20),new_status VARCHAR(20),reason VARCHAR(500),
 changed_at TIMESTAMP
);
