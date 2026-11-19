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
CREATE TABLE IF NOT EXISTS inbox_event (
 event_id VARCHAR(36) NOT NULL,consumer_name VARCHAR(80) NOT NULL,event_type VARCHAR(80) NOT NULL,
 organization_id VARCHAR(36) NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
 attempts INT NOT NULL DEFAULT 0,error_message VARCHAR(1000),received_at TIMESTAMP NOT NULL,
 processed_at TIMESTAMP,PRIMARY KEY (event_id, consumer_name)
);
CREATE TABLE IF NOT EXISTS consumer_aggregate_state (
 consumer_name VARCHAR(80) NOT NULL,aggregate_type VARCHAR(40) NOT NULL,
 aggregate_id VARCHAR(36) NOT NULL,last_version BIGINT,last_occurred_at TIMESTAMP,
 PRIMARY KEY (consumer_name, aggregate_type, aggregate_id)
);
CREATE TABLE IF NOT EXISTS session_impact (
 id VARCHAR(36) NOT NULL,org_id VARCHAR(36) NOT NULL,session_id VARCHAR(36) NOT NULL,
 source_type VARCHAR(40) NOT NULL,source_id VARCHAR(36) NOT NULL,event_id VARCHAR(36) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'OPEN',details LONGTEXT,created_at TIMESTAMP NOT NULL,
 resolved_at TIMESTAMP,PRIMARY KEY (id),UNIQUE (session_id, source_type, event_id)
);
