-- MEMS / migration 46 — thống nhất chủ sở hữu module của quyền lớp học (item 10).
--
-- Quyết định: quyền `class.*` thuộc STUDENT_MANAGEMENT, không thuộc CLASS_MANAGEMENT.
--   * Backend PeopleService gate mọi thao tác lớp bằng STUDENT_MANAGEMENT
--     (SchoolClassService/ClassStatusService.requireModuleReadable).
--   * Frontend lọc menu Lớp học / Lớp của tôi theo STUDENT_MANAGEMENT.
--   * CLASS_MANAGEMENT chỉ còn là dòng danh mục cũ trong bảng `module`; không quyền
--     nào gắn vào module này nên không dùng để bật/tắt hay lọc hiệu lực.
--
-- Migration chỉ sửa `permission.module_code` — không xoá dòng, không đổi quyền,
-- không đổi allowed_scopes. Idempotent: chạy lại nhiều lần vẫn cùng kết quả.
-- Áp dụng SAU 45. Không service nào tự chạy file này.
USE mems_identity_db;

-- Mã quyền chuẩn (lowercase, dùng trong @PreAuthorize).
UPDATE permission
SET module_code = 'STUDENT_MANAGEMENT'
WHERE code IN (
    'class.view', 'class.create', 'class.edit', 'class.delete',
    'class.assign_teacher', 'class.teacher.reassign', 'class.cancel',
    'class.request_close', 'class.approve_close', 'class.reopen'
)
  AND (module_code IS NULL OR module_code <> 'STUDENT_MANAGEMENT');

-- Mã quyền legacy (uppercase) còn trong DB cũ — giữ nguyên dòng, chỉ sửa module.
UPDATE permission
SET module_code = 'STUDENT_MANAGEMENT'
WHERE code IN (
    'CLASS_READ', 'CLASS_WRITE', 'CLASS_VIEW', 'CLASS_CREATE', 'CLASS_EDIT',
    'CLASS_DELETE', 'CLASS_ASSIGN_TEACHER', 'CLASS_CANCEL',
    'CLASS_CLOSE_REQUEST', 'CLASS_CLOSE_APPROVE', 'CLASS_REOPEN'
)
  AND (module_code IS NULL OR module_code <> 'STUDENT_MANAGEMENT');

-- `class.self_view` / `CLASS_SELF_VIEW` cố tình để module_code NULL: đây là quyền
-- self, không gate theo module (khớp PermissionCatalog).

-- Verification:
-- USE mems_identity_db;
-- SELECT code, module_code FROM permission
--  WHERE code LIKE 'class.%' OR code LIKE 'CLASS_%' ORDER BY code;
--
-- Audit (chỉ đọc): phòng ban còn gán CLASS_MANAGEMENT — cần quyết định dữ liệu riêng,
-- migration này KHÔNG tự sửa để tránh cấp thêm quyền ngoài ý muốn.
-- USE mems_people_db;
-- SELECT dm.department_id, d.name
--   FROM department_module dm JOIN department d ON d.id = dm.department_id
--  WHERE dm.module_code = 'CLASS_MANAGEMENT';
