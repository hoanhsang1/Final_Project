-- Migration 30: Remove class.approve_close from ACADEMIC_MANAGEMENT bundle
-- Target DB: mems_identity_db
-- Safe to run repeatedly (DELETE is idempotent if the row is already gone).
-- Rationale: DEC-02 / kế hoạch v2 §0.3 — Giáo vụ (via ACADEMIC_MANAGEMENT bundle)
--   must not be able to approve class closure; only the head of the responsible
--   department or a delegated approver may do so.

DELETE FROM permission_bundle_item
WHERE bundle_id = (SELECT id FROM permission_bundle WHERE code = 'ACADEMIC_MANAGEMENT')
  AND permission_code = 'class.approve_close';
