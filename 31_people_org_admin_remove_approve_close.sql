-- Migration 31: Remove class.approve_close from Quản trị viên tổ chức positions
-- Target DB: mems_people_db
-- Safe to run repeatedly (DELETE affects only matching rows; idempotent).
-- Rationale: DEC-02 / kế hoạch v2 §0.3 — class closure approval is restricted to the
--   head of the department responsible for STUDENT_MANAGEMENT (ClassApprovalPolicy).
--   Quản trị viên tổ chức received this permission via ALL_PERMISSIONS seeding, which
--   is corrected here. Direct grants from ClassApprovalPolicy (Trưởng phòng) stay.

DELETE pp FROM position_permission pp
JOIN `position` p ON p.id = pp.position_id
WHERE p.name = 'Quản trị viên tổ chức'
  AND pp.permission_code = 'class.approve_close';
