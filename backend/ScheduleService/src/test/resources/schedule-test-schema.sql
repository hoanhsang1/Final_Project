CREATE TABLE IF NOT EXISTS class (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36), code VARCHAR(50), name VARCHAR(200),
 subject VARCHAR(200), max_size INT, start_date DATE, end_date DATE, status VARCHAR(20),
 deleted_at TIMESTAMP, created_at TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS session (
 id VARCHAR(36) PRIMARY KEY,class_id VARCHAR(36),department_id VARCHAR(36),teacher_id VARCHAR(36),room_id VARCHAR(36),
 teacher_name VARCHAR(200),room_code VARCHAR(50),subject_name VARCHAR(200),
 subject_id VARCHAR(36),
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
CREATE TABLE IF NOT EXISTS time_slot (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36) NOT NULL,period_no INT NOT NULL,
 name VARCHAR(50),start_time TIME NOT NULL,end_time TIME NOT NULL,
 joins_next BOOLEAN NOT NULL DEFAULT FALSE,is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP NOT NULL,updated_at TIMESTAMP,
 UNIQUE (org_id, period_no),CHECK (period_no >= 1),CHECK (end_time > start_time)
);
CREATE TABLE IF NOT EXISTS class_slot_rule (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36) NOT NULL,class_id VARCHAR(36) NOT NULL,
 weekday TINYINT NOT NULL,from_period INT NOT NULL,to_period INT NOT NULL,
 is_off BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMP NOT NULL,updated_at TIMESTAMP,
 UNIQUE (org_id, class_id, weekday, from_period, to_period),
 CHECK (weekday BETWEEN 1 AND 7),CHECK (from_period >= 1),CHECK (to_period >= from_period)
);
CREATE TABLE IF NOT EXISTS teacher_availability (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36) NOT NULL,teacher_id VARCHAR(36) NOT NULL,
 weekday TINYINT NOT NULL,from_period INT NOT NULL,to_period INT NOT NULL,
 kind VARCHAR(16) NOT NULL,created_at TIMESTAMP NOT NULL,updated_at TIMESTAMP,
 UNIQUE (org_id, teacher_id, weekday, from_period, to_period),
 CHECK (weekday BETWEEN 1 AND 7),CHECK (from_period >= 1),CHECK (to_period >= from_period),
 CHECK (kind IN ('AVAILABLE','UNAVAILABLE'))
);
CREATE TABLE IF NOT EXISTS schedule_draft (
 id VARCHAR(36) PRIMARY KEY,org_id VARCHAR(36) NOT NULL,department_id VARCHAR(36) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',params LONGTEXT NOT NULL,summary LONGTEXT,
 created_by VARCHAR(36),created_at TIMESTAMP NOT NULL,confirmed_at TIMESTAMP,updated_at TIMESTAMP,
 CHECK (status IN ('DRAFT','CONFIRMED','DISCARDED'))
);
CREATE TABLE IF NOT EXISTS schedule_draft_item (
 id VARCHAR(36) PRIMARY KEY,draft_id VARCHAR(36) NOT NULL,class_id VARCHAR(36) NOT NULL,
 subject_id VARCHAR(36),teacher_id VARCHAR(36),teacher_name VARCHAR(200),
 room_id VARCHAR(36),room_code VARCHAR(50),subject_name VARCHAR(200),
 start_time TIMESTAMP NOT NULL,end_time TIMESTAMP NOT NULL,week_no INT NOT NULL,
 is_exception BOOLEAN NOT NULL DEFAULT FALSE,exception_type VARCHAR(20),
 exception_reason VARCHAR(500),is_manual_edit BOOLEAN NOT NULL DEFAULT FALSE,
 CHECK (end_time > start_time),CHECK (week_no >= 1),
 CHECK (exception_type IS NULL OR exception_type IN ('ROOM_CHANGED','PERIOD_CHANGED','DAY_CHANGED'))
);
CREATE TABLE IF NOT EXISTS schedule_draft_unscheduled (
 id VARCHAR(36) PRIMARY KEY,draft_id VARCHAR(36) NOT NULL,class_id VARCHAR(36) NOT NULL,
 subject_id VARCHAR(36),session_no INT,reason VARCHAR(500) NOT NULL
);
