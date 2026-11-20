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
 name VARCHAR(200) NOT NULL, system_code VARCHAR(50), description VARCHAR(1000), created_at TIMESTAMP NOT NULL,
 profile_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
 scope VARCHAR(20) NOT NULL DEFAULT 'DEPARTMENT', department_id VARCHAR(36), deleted_at TIMESTAMP,
 UNIQUE(org_id,name), UNIQUE(id,org_id)
);
CREATE TABLE IF NOT EXISTS position_bundle (
 position_id VARCHAR(36) NOT NULL, bundle_code VARCHAR(100) NOT NULL,
 PRIMARY KEY(position_id,bundle_code),
 FOREIGN KEY(position_id) REFERENCES position(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS assignment (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 position_id VARCHAR(36) NOT NULL, scope_type VARCHAR(20) NOT NULL, department_id VARCHAR(36),
 effective_from TIMESTAMP NOT NULL, effective_to TIMESTAMP, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 assigned_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, revoked_at TIMESTAMP, revoked_by VARCHAR(36),
 reason VARCHAR(1000), revoked_reason VARCHAR(1000),
 FOREIGN KEY(position_id) REFERENCES position(id)
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
 username VARCHAR(100), status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', resigned_at TIMESTAMP,
 UNIQUE(user_id,org_id), FOREIGN KEY(department_id,org_id) REFERENCES department(id,org_id)
);
CREATE TABLE IF NOT EXISTS resignation_request (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 department_id VARCHAR(36) NOT NULL, reason VARCHAR(1000) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 requested_by VARCHAR(36) NOT NULL, requested_at TIMESTAMP NOT NULL,
 decided_by VARCHAR(36), decided_at TIMESTAMP, decision_note VARCHAR(1000)
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
-- H2 PARITY NOTE (D-04): uq_subject_org_code is UNIQUE here because the service
-- contract (409 on duplicate code) and the D-04 target require it. MySQL staging
-- has a NON-unique index from migration 42; migration 52 step 7 now replaces it
-- with UNIQUE after a duplicate self-check (Revision 5, 2026-11-20). Do not
-- weaken this fixture: tests prove the intended contract. Verify on MySQL staging.
CREATE TABLE IF NOT EXISTS subject (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 code VARCHAR(50), description VARCHAR(500),
 name VARCHAR(200) NOT NULL, name_unaccented VARCHAR(200) NOT NULL,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_by VARCHAR(36), created_at TIMESTAMP NOT NULL,
 updated_by VARCHAR(36), updated_at TIMESTAMP,
 UNIQUE(id,org_id), UNIQUE(org_id,name_unaccented), CONSTRAINT uq_subject_org_code UNIQUE(org_id,code)
);
-- Phase 1 (Revision 5): curriculum/class-subject schema (migrations 51/52).
-- H2 PARITY LIMITATION: secondary indexes of 51/52 (idx_curriculum_subject_subject,
-- idx_class_subject_*, idx_teacher_subject_*, idx_csh_*, idx_specialty_subject_*) are
-- omitted here; they do not change query semantics in H2. The MySQL migration audits
-- them on staging. `request_fingerprint` is VARCHAR(64) here vs CHAR(64) in MySQL;
-- both enforce 64 chars for the hex SHA-256. Constraint/column semantics mirror 51/52.
CREATE TABLE IF NOT EXISTS curriculum (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 code VARCHAR(50) NOT NULL, name VARCHAR(200) NOT NULL, name_unaccented VARCHAR(200) NOT NULL,
 description VARCHAR(1000), grade_level VARCHAR(50), program_code VARCHAR(50),
 is_active BOOLEAN NOT NULL DEFAULT TRUE, version BIGINT NOT NULL DEFAULT 0,
 created_by VARCHAR(36), created_at TIMESTAMP NOT NULL, updated_by VARCHAR(36), updated_at TIMESTAMP,
 UNIQUE(id,org_id), UNIQUE(org_id,code), UNIQUE(org_id,name_unaccented)
);
CREATE TABLE IF NOT EXISTS curriculum_subject (
 curriculum_id VARCHAR(36) NOT NULL, subject_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 sequence_no SMALLINT NOT NULL, required_sessions SMALLINT NOT NULL,
 theory_sessions SMALLINT NOT NULL DEFAULT 0, practice_sessions SMALLINT NOT NULL DEFAULT 0,
 session_minutes SMALLINT NOT NULL, is_required BOOLEAN NOT NULL DEFAULT TRUE, note VARCHAR(500),
 created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP,
 PRIMARY KEY(curriculum_id,subject_id), UNIQUE(curriculum_id,sequence_no),
 UNIQUE(curriculum_id,subject_id,org_id),
 FOREIGN KEY(curriculum_id,org_id) REFERENCES curriculum(id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(subject_id,org_id) REFERENCES subject(id,org_id),
 CONSTRAINT chk_curriculum_subject_sessions CHECK(
  required_sessions > 0 AND session_minutes > 0 AND theory_sessions >= 0 AND practice_sessions >= 0),
 CONSTRAINT chk_curriculum_subject_sequence CHECK(sequence_no > 0)
);
CREATE TABLE IF NOT EXISTS curriculum_subject_prerequisite (
 curriculum_id VARCHAR(36) NOT NULL, subject_id VARCHAR(36) NOT NULL,
 prerequisite_subject_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 created_at TIMESTAMP NOT NULL,
 PRIMARY KEY(curriculum_id,subject_id,prerequisite_subject_id),
 FOREIGN KEY(curriculum_id,subject_id,org_id)
  REFERENCES curriculum_subject(curriculum_id,subject_id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(curriculum_id,prerequisite_subject_id,org_id)
  REFERENCES curriculum_subject(curriculum_id,subject_id,org_id),
 CONSTRAINT chk_csp_not_self CHECK(subject_id <> prerequisite_subject_id)
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
 account_username VARCHAR(100), account_created_at TIMESTAMP,
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, deleted_at TIMESTAMP,
 UNIQUE(org_id, student_code)
);
CREATE TABLE IF NOT EXISTS school_class (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 class_code VARCHAR(100) NOT NULL, name VARCHAR(200) NOT NULL,
 academic_year VARCHAR(50), status VARCHAR(20) NOT NULL DEFAULT 'active',
 teacher_id VARCHAR(36), start_date DATE, end_date DATE, subject_id VARCHAR(36),
 curriculum_id VARCHAR(36),
 version BIGINT NOT NULL DEFAULT 0, close_state VARCHAR(10) NOT NULL DEFAULT 'NONE',
 cancel_state VARCHAR(10) NOT NULL DEFAULT 'NONE', cancel_request_reason VARCHAR(1000),
 cancel_requested_by VARCHAR(36), close_requested_by VARCHAR(36),
 needs_reassignment BOOLEAN NOT NULL DEFAULT FALSE, reassignment_reason VARCHAR(255),
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, deleted_at TIMESTAMP,
 UNIQUE(org_id, class_code), UNIQUE(id, org_id),
 FOREIGN KEY(curriculum_id,org_id) REFERENCES curriculum(id,org_id)
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
-- Phase 1 Revision 3: class-subject snapshot + history (migration 52 logical schema).
-- H2 PARITY LIMITATIONS:
--  * MySQL uses a STORED generated column primary_class_id = CASE WHEN is_primary = 1 THEN class_id END.
--    H2 2.x has no STORED generated column, so this is a plain column. The service must set it to
--    class_id when is_primary is true (1) and NULL otherwise; the UNIQUE index then enforces
--    "at most one primary per class". That is NOT the same as a DB-generated MySQL column.
--  * H2 cannot prove the minimum-primary invariant; transaction + application validation must.
--  * is_primary is BOOLEAN here (MySQL is tinyint(1)); tests must map true/false, not 1/0.
CREATE TABLE IF NOT EXISTS class_subject (
 class_id VARCHAR(36) NOT NULL, subject_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 curriculum_id VARCHAR(36), source VARCHAR(20) NOT NULL DEFAULT 'MANUAL', sequence_no SMALLINT,
 teacher_id VARCHAR(36), is_primary BOOLEAN NOT NULL DEFAULT FALSE, primary_class_id VARCHAR(36),
 required_sessions SMALLINT, planned_sessions SMALLINT, theory_sessions SMALLINT,
 practice_sessions SMALLINT, session_minutes SMALLINT,
 status VARCHAR(20) NOT NULL DEFAULT 'PLANNED', note VARCHAR(500),
 created_by VARCHAR(36), created_at TIMESTAMP NOT NULL, updated_by VARCHAR(36), updated_at TIMESTAMP,
 PRIMARY KEY(class_id,subject_id),
 UNIQUE(primary_class_id),
 FOREIGN KEY(class_id,org_id) REFERENCES school_class(id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(subject_id,org_id) REFERENCES subject(id,org_id),
 FOREIGN KEY(curriculum_id,org_id) REFERENCES curriculum(id,org_id),
 FOREIGN KEY(teacher_id,org_id) REFERENCES staff_profile(user_id,org_id),
 CONSTRAINT chk_class_subject_status CHECK(status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
 CONSTRAINT chk_class_subject_source CHECK(source IN ('LEGACY','CURRICULUM','MANUAL')),
 -- MySQL 52: CHECK (is_primary IN (0,1)); H2 BOOLEAN uses FALSE/TRUE for the same set.
 CONSTRAINT chk_class_subject_primary CHECK(is_primary IN (FALSE, TRUE)),
 CONSTRAINT chk_class_subject_sequence CHECK(sequence_no IS NULL OR sequence_no > 0),
 CONSTRAINT chk_class_subject_sessions CHECK(
  (planned_sessions IS NULL OR planned_sessions >= 0)
  AND (required_sessions IS NULL OR required_sessions > 0)
  AND (session_minutes IS NULL OR session_minutes > 0))
);
CREATE TABLE IF NOT EXISTS class_subject_history (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, class_id VARCHAR(36) NOT NULL,
 old_subject_id VARCHAR(36), old_subject_code VARCHAR(50), old_subject_name VARCHAR(200),
 old_teacher_id VARCHAR(36), old_teacher_name VARCHAR(200), old_source VARCHAR(20),
 new_subject_id VARCHAR(36) NOT NULL, new_subject_code VARCHAR(50), new_subject_name VARCHAR(200) NOT NULL,
 new_source VARCHAR(20) NOT NULL, reason VARCHAR(500) NOT NULL, operation_id VARCHAR(64) NOT NULL,
 request_fingerprint VARCHAR(64) NOT NULL,
 changed_by VARCHAR(36) NOT NULL, changed_by_name VARCHAR(200), changed_at TIMESTAMP NOT NULL,
 UNIQUE(org_id,operation_id),
 FOREIGN KEY(class_id,org_id) REFERENCES school_class(id,org_id),
 CONSTRAINT chk_csh_subject_change CHECK(old_subject_id IS NULL OR old_subject_id <> new_subject_id),
 CONSTRAINT chk_csh_old_source CHECK(old_source IS NULL OR old_source IN ('LEGACY','CURRICULUM','MANUAL')),
 CONSTRAINT chk_csh_new_source CHECK(new_source IN ('LEGACY','CURRICULUM','MANUAL'))
);
CREATE TABLE IF NOT EXISTS specialty_subject (
 specialty_id VARCHAR(36) NOT NULL, subject_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 created_by VARCHAR(36), created_at TIMESTAMP NOT NULL,
 PRIMARY KEY(specialty_id,subject_id),
 FOREIGN KEY(specialty_id,org_id) REFERENCES specialty(id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(subject_id,org_id) REFERENCES subject(id,org_id)
);
CREATE TABLE IF NOT EXISTS teacher_subject (
 user_id VARCHAR(36) NOT NULL, subject_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'APPROVED', source VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
 approved_by VARCHAR(36), approved_at TIMESTAMP, created_by VARCHAR(36), created_at TIMESTAMP NOT NULL,
 updated_at TIMESTAMP,
 PRIMARY KEY(user_id,subject_id),
 FOREIGN KEY(user_id,org_id) REFERENCES teacher_profile(user_id,org_id) ON DELETE CASCADE,
 FOREIGN KEY(subject_id,org_id) REFERENCES subject(id,org_id),
 CONSTRAINT chk_teacher_subject_source CHECK(source IN ('SPECIALTY','MANUAL')),
 -- D-06a: no approval workflow in Phase 1 -> no PENDING state (migration 52 parity).
 CONSTRAINT chk_teacher_subject_status CHECK(status IN ('APPROVED','REVOKED'))
);
CREATE TABLE IF NOT EXISTS class_close_event (
 id VARCHAR(36) PRIMARY KEY, class_id VARCHAR(36) NOT NULL, org_id VARCHAR(36) NOT NULL,
 action VARCHAR(20) NOT NULL, actor_id VARCHAR(36) NOT NULL, reason VARCHAR(1000), created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS transfer_request (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 from_department_id VARCHAR(36) NOT NULL, to_department_id VARCHAR(36) NOT NULL,
 reason VARCHAR(1000) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 requested_by VARCHAR(36) NOT NULL, requested_at TIMESTAMP NOT NULL,
 applied_at TIMESTAMP, applied_by VARCHAR(36)
);
CREATE TABLE IF NOT EXISTS transfer_approval (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, request_id VARCHAR(36) NOT NULL,
 step VARCHAR(20) NOT NULL, decision VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 decided_by VARCHAR(36), decided_at TIMESTAMP, note VARCHAR(1000),
 UNIQUE(request_id, step)
);
CREATE TABLE IF NOT EXISTS notification (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL, user_id VARCHAR(36) NOT NULL,
 type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, body VARCHAR(1000),
 entity_type VARCHAR(50), entity_id VARCHAR(36), read_at TIMESTAMP, created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS delegation (
 id VARCHAR(36) PRIMARY KEY, org_id VARCHAR(36) NOT NULL,
 delegator_id VARCHAR(36) NOT NULL, delegate_id VARCHAR(36) NOT NULL,
 scope VARCHAR(20) NOT NULL DEFAULT 'ORGANIZATION',
 effective_from TIMESTAMP NOT NULL, effective_to TIMESTAMP,
 status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE', reason VARCHAR(1000),
 created_by VARCHAR(36) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP,
 revoked_by VARCHAR(36), revoked_at TIMESTAMP, revoked_reason VARCHAR(1000)
);
CREATE TABLE IF NOT EXISTS delegation_permission (
 delegation_id VARCHAR(36) NOT NULL, permission_code VARCHAR(100) NOT NULL,
 PRIMARY KEY (delegation_id, permission_code),
 FOREIGN KEY (delegation_id) REFERENCES delegation(id) ON DELETE CASCADE
);

-- Phase 2 outbox: business row + event row share one transaction.
CREATE TABLE IF NOT EXISTS outbox_event (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 event_id VARCHAR(36) NOT NULL,
 aggregate_type VARCHAR(40) NOT NULL,
 aggregate_id VARCHAR(36) NOT NULL,
 aggregate_version BIGINT,
 event_type VARCHAR(80) NOT NULL,
 event_version INT NOT NULL DEFAULT 1,
 organization_id VARCHAR(36) NOT NULL,
 correlation_id VARCHAR(36),
 payload LONGTEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 attempts INT NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMP NOT NULL,
 locked_until TIMESTAMP,
 last_error VARCHAR(1000),
 replayed_at TIMESTAMP,
 replayed_by VARCHAR(36),
 created_at TIMESTAMP NOT NULL,
 published_at TIMESTAMP,
 UNIQUE (event_id)
);
