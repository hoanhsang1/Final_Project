-- MEMS / People Service / Phần 6: bổ nhiệm Tổng quản lý và ủy quyền
-- Target DB: mems_people_db (MySQL 8.0.16+)
--
-- Prerequisites: 02_people_db.sql, 07_people_department_access.sql,
--                23_people_transfer_workflow.sql.
-- Safe to run repeatedly: CREATE TABLE IF NOT EXISTS; không xoá dữ liệu.
--
-- How to run:
--   mysql -h <host> -P <port> -u <user> -p < 25_people_delegation.sql

USE mems_people_db;

-- ---------------------------------------------------------------------------
-- 1. Ủy quyền (quy tắc 3, 7).
--    - delegator: người ủy quyền (hiện chỉ OWNER).
--    - delegate: Tổng quản lý — không có quyền nào ngoài các dòng ở bảng con.
--    - scope: mặc định ORGANIZATION (TODO: chỉ hỗ trợ cấp tổ chức ở Phần 6).
--    - effective_to NULL = không đặt hạn; hết hạn tự mất hiệu lực khi kiểm tra.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delegation (
 id CHAR(36) PRIMARY KEY,
 org_id CHAR(36) NOT NULL,
 delegator_id CHAR(36) NOT NULL,
 delegate_id CHAR(36) NOT NULL,
 scope VARCHAR(20) NOT NULL DEFAULT 'ORGANIZATION',
 effective_from DATETIME(3) NOT NULL,
 effective_to DATETIME(3) NULL,
 status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
 reason VARCHAR(1000) NULL,
 created_by CHAR(36) NOT NULL,
 created_at DATETIME(3) NOT NULL,
 updated_at DATETIME(3) NULL,
 revoked_by CHAR(36) NULL,
 revoked_at DATETIME(3) NULL,
 revoked_reason VARCHAR(1000) NULL,
 CONSTRAINT chk_delegation_status CHECK (status IN ('ACTIVE','REVOKED')),
 CONSTRAINT chk_delegation_scope CHECK (scope IN ('ORGANIZATION')),
 CONSTRAINT chk_delegation_window CHECK (effective_to IS NULL OR effective_to > effective_from),
 INDEX idx_delegation_delegate (org_id, delegate_id, status),
 INDEX idx_delegation_delegator (org_id, delegator_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 2. Danh sách quyền của từng lần ủy quyền. Bảng con bị xoá theo delegation
--    (delegation không bao giờ bị xoá cứng — thu hồi chỉ đổi status).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delegation_permission (
 delegation_id CHAR(36) NOT NULL,
 permission_code VARCHAR(100) NOT NULL,
 PRIMARY KEY (delegation_id, permission_code),
 CONSTRAINT fk_delegation_permission FOREIGN KEY (delegation_id)
     REFERENCES delegation(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Verification queries (run manually):
-- SELECT id, delegate_id, scope, status, effective_from, effective_to
--   FROM delegation WHERE org_id='11111111-1111-4111-8111-111111111111';
-- SELECT delegation_id, permission_code FROM delegation_permission;
