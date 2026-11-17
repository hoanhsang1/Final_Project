# Runbook: migrate DB live + deploy backend mới (16/11/2026)

## Bối cảnh

- DB live được bootstrap từ snapshot `DB_11_16.sql`, thiếu các migration 17–39.
- Ảnh mới của identity/people/facility/schedule yêu cầu schema mới hơn:
  - Identity crash ngay khi khởi động: `Unknown column 'allowed_scopes'` (bảng `permission`), sau đó là `permission_bundle*`, cột `is_core`, `locked_*`.
  - PeopleService mới query `assignment`, `position_bundle`, `notification`, `transfer_request`, `resignation_request`, `delegation*`, cột `position.department_id`, `member_position.status`.
  - FacilityService mới cần `department_id` trên `classroom`/`equipment`.
- Hiện tại identity đang chạy bản tạm `rollback-60c8997` (login OK, nhưng thiếu tính năng mới). People/gateway/facility/schedule vẫn là ảnh 13/11.

Chạy SQL bên dưới theo đúng thứ tự, sau đó deploy ảnh mới và kiểm thử đầy đủ.

## 1. Thứ tự chạy SQL (tất cả đều idempotent, chỉ thêm cấu trúc/cột/bảng)

### 1.1. `mems_people_db`

| # | File | Nội dung |
|---|------|----------|
| 1 | `34_people_core_schema_catchup.sql` | `position.department_id`, soft-delete, `member_position.status` |
| 2 | `31_people_workflow_tables_and_class_requester.sql` | Bảng `assignment`, `position_bundle`, `notification`, `transfer_*`, `resignation_request`, `delegation*`, cột requester của `school_class` |
| 3 | `32_people_workflow_constraint_alignment.sql` | CHECK/FK/index cho các bảng trên |
| 4 | `33_people_org_admin_remove_approve_close.sql` | Bỏ grant `class.approve_close` của "Quản trị viên tổ chức" |
| 5 | `36_people_permission_backfill.sql` | Map mã quyền legacy sang catalog, seed `position_bundle`, backfill `assignment` |

### 1.2. `mems_identity_db`

| # | File | Nội dung |
|---|------|----------|
| 6 | `28_identity_module_core_flag.sql` | `module.is_core` |
| 7 | `29_identity_module_owner_toggle.sql` | `organization_module.status` mở rộng, `disabled_at`, `locked_*`, `status_before_lock`, `module_legacy_map` |
| 8 | `35_identity_permission_bundle_tables.sql` | Bảng `permission_bundle`, `permission_bundle_item` |
| 9 | `30_identity_remove_approve_close_from_academic.sql` | Bỏ `class.approve_close` khỏi bundle ACADEMIC_MANAGEMENT |
| 10 | `38_identity_permission_allowed_scopes.sql` | `permission.allowed_scopes` |

### 1.3. Cả hai DB + facility

| # | File | DB | Nội dung |
|---|------|----|----------|
| 11 | `39_identity_self_permissions_and_department_class_scope.sql` | identity + people | Quyền SELF cho STUDENT/TEACHER, `class.view`/`class.reopen` cho phép DEPARTMENT, chỉnh `position_permission` mặc định |
| 12 | `37_facility_department_scope_catchup.sql` | facility | `classroom.department_id`, `equipment.department_id` |

### Lệnh chạy bằng mysql CLI

Cách 1 (khuyến nghị) — chạy script có sẵn, chỉ hỏi username/password một lần và tự dừng ở file lỗi đầu tiên:

```bat
cd /d D:\User\documents\Final_Project\Final_Project
scripts\apply-live-migrations.bat
```

Cách 2 — chạy từng file. Thay `%DBUSER%` bằng tài khoản MySQL trong `.env` (`DB_USERNAME`), không phải tài khoản đăng nhập ứng dụng:

```bat
cd /d D:\User\documents\Final_Project\Final_Project
set DBUSER=<tai_khoan_mysql>
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 34_people_core_schema_catchup.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 31_people_workflow_tables_and_class_requester.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 32_people_workflow_constraint_alignment.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 33_people_org_admin_remove_approve_close.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 36_people_permission_backfill.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 28_identity_module_core_flag.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 29_identity_module_owner_toggle.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 35_identity_permission_bundle_tables.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 30_identity_remove_approve_close_from_academic.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 38_identity_permission_allowed_scopes.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 39_identity_self_permissions_and_department_class_scope.sql
mysql -h 127.0.0.1 -P 3306 -u %DBUSER% -p < 37_facility_department_scope_catchup.sql
```

Nếu dùng MySQL Workbench: mở lần lượt từng file theo đúng thứ tự trên và Execute (Workbench hỗ trợ `DELIMITER`).

## 2. Kiểm tra sau khi chạy

```sql
-- mems_identity_db
USE mems_identity_db;
SHOW COLUMNS FROM permission LIKE 'allowed_scopes';
SHOW TABLES LIKE 'permission_bundle%';
SHOW COLUMNS FROM module LIKE 'is_core';
SHOW COLUMNS FROM organization_module LIKE 'locked_reason';
SELECT code, allowed_scopes FROM permission
 WHERE code IN ('class.view','class.reopen','class.self_view');

-- mems_people_db
USE mems_people_db;
SHOW COLUMNS FROM position LIKE 'department_id';
SHOW COLUMNS FROM member_position LIKE 'status';
SHOW TABLES LIKE 'transfer_request';
SHOW TABLES LIKE 'assignment';
SHOW TABLES LIKE 'notification';
SELECT COUNT(*) AS assignments FROM assignment;

-- mems_facility_db
USE mems_facility_db;
SHOW COLUMNS FROM classroom LIKE 'department_id';
SHOW COLUMNS FROM equipment LIKE 'department_id';
```

## 3. Lỗi có thể gặp

- **`SQLSTATE 45000` khi chạy file 32**: dữ liệu hiện có vi phạm FK (orphan row). Migration dừng có chủ đích — gửi lại nguyên văn thông báo, tôi sẽ chỉ ra bảng/dòng cần xử lý. Không tự xoá dữ liệu.
- **`ERROR 1146 Table ... doesn't exist` ở file 30/38**: sai thứ tự — chạy lại đúng thứ tự (30 sau 35; 39 sau 38).
- **`'mysql' is not recognized`**: dùng MySQL Workbench, hoặc gọi đầy đủ đường dẫn `"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"`.

## 4. Triển khai sau khi migration xong

1. Deploy identity (ảnh `head-2026-11-16`) → kiểm tra `/api/v1/modules/status`, login.
2. Deploy people → facility → schedule → gateway (theo thứ tự phụ thuộc: schedule mới gọi `/internal/rooms` của facility và `/internal/classes` của people).
3. Kiểm thử: 5 endpoint từng 404, login/JWT, CRUD, workflow duyệt, 8 vai trò, browser.
4. Viết `docs/BUG_FIX_AND_REBUILD_REPORT.md` đủ 10 mục.

Gián đoạn dự kiến khi deploy: identity ~60s (login/api lỗi trong lúc restart), people/facility/schedule mỗi service ~30s, gateway ~10s.

## 5. Rollback

- Ảnh cũ: `mems-backup-people-service:2026-11-13`, `mems-backup-facility-service:2026-11-13`, `mems-backup-schedule-service:2026-11-13`, identity `final_project-identity-org-service:rollback-60c8997`.
- DB: restore từ `backup_pre_deploy_20261116.sql` (chỉ khi thật cần; các migration đều additive nên thường không phải rollback).
