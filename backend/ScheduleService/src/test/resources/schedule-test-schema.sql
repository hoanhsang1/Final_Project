CREATE TABLE IF NOT EXISTS class (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36), code VARCHAR(50), name VARCHAR(200),
 subject VARCHAR(200), max_size INT, start_date DATE, end_date DATE, status VARCHAR(20),
 deleted_at TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS session (
 id VARCHAR(36) PRIMARY KEY,class_id VARCHAR(36),department_id VARCHAR(36),teacher_id VARCHAR(36),room_id VARCHAR(36),
 start_time TIMESTAMP,end_time TIMESTAMP,status VARCHAR(20),deleted_at TIMESTAMP,
 created_at TIMESTAMP,updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS schedule_resource_lock (
 org_id VARCHAR(36) NOT NULL,resource_type VARCHAR(20) NOT NULL,resource_id VARCHAR(36) NOT NULL,
 PRIMARY KEY (org_id, resource_type, resource_id)
);
