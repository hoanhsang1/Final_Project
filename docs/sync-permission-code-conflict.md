# Xung đột mã quyền: FE Astryx (cũ) vs BE `origin/main` (granular)

> Trạng thái: **phát hiện, chưa đổi gì — Cần xác minh/chốt**.  
> Nhánh: `chore/sync-main-class-flow`.

## 1. Hai bộ mã đang cùng tồn tại

| Lớp | Nguồn | Mã |
|---|---|---|
| FE Astryx hiện tại | `frontend/src/features/auth/permissions.ts`, `owner/permissionLabels.ts`, test `TeachersPage.test.tsx` | `PEOPLE_VIEW`, `PEOPLE_EDIT`, `FACILITY_MANAGE`, `SCHEDULE_CREATE`, `SCHEDULE_VIEW` |
| IdentityService HEAD | `PermissionCatalog.ENTRIES` (5 mã) | y hệt bộ FE ở trên |
| PeopleService đã port từ main | `DefaultPositionSeeder` | `employee.create/view/edit`, `class.view/create/edit/assign_teacher/cancel/request_close/reopen`, `teacher.change_status`, `class.teacher.reassign`, `subject.*`, `curriculum.*`, `student.*`, `schedule.*` |
| IdentityService main | `PermissionCatalog` (142 dòng diff) | mã `<module>.<resource>.<action>` + `BUNDLES`/`BundleDefinition` |

FE gate quyền giáo viên bằng `PEOPLE_VIEW`/`PEOPLE_EDIT`:

- `canViewTeachers(...)` = OWNER hoặc có `PEOPLE_VIEW`/`PEOPLE_EDIT`.
- `canEditTeachers(...)` = OWNER hoặc có `PEOPLE_EDIT`.

BE ported kiểm tra quyền granular (ví dụ `class.view`, `class.assign_teacher`). Nếu runtime trả permission list theo catalog main, FE sẽ tưởng người dùng không có quyền → ẩn nút/cột dù BE cho phép, hoặc ngược lại.

## 2. Điểm chưa rõ (Cần xác minh)

- API trả permission list cho FE lấy từ đâu: `PermissionCatalog.ENTRIES` của Identity HEAD hay bundle/chức danh PeopleService? Chưa chạy runtime nên chưa biết.
- Có lớp map legacy (`module_legacy_map` trong `db.sql`) ánh xạ mã cũ ↔ mã granular không, và FE có nên dùng mã mới không.
- `/internal/permissions/bundles` thiếu ở Identity HEAD (xem `docs/sync-identity-internal-slice.md`): nếu bổ sung thì catalog phải đổi, kéo theo quyết định FE dùng mã nào.

## 3. Quyết định tạm

- **Không đổi** `frontend/src/features/auth/permissions.ts`, `owner/permissionLabels.ts`, test FE.
- **Không đổi** `IdentityService/PermissionCatalog.java` (giữ 5 mã cũ).
- **Không đổi** `DefaultPositionSeeder` hay logic `Actor` của PeopleService.
- Mọi khác biệt được ghi là **Cần xác minh**; chỉ sửa sau khi chốt hướng map quyền.

## 4. Tiêu chí để chốt

1. Chọn nguồn chuẩn: FE theo mã cũ + BE map sang granular, hay FE chuyển sang mã granular.
2. Nếu chọn map: xác định nơi map (Identity trả cả 2 bộ / FE map / BE chấp nhận cả 2) và kiểm tra bảo mật (không được chỉ dựa vào FE gate).
3. Có JDK + DB schema khớp thì chạy runtime thử 2 kịch bản: `PEOPLE_VIEW` only và `employee.view` only → quan sát 403 và UI.
4. Cập nhật doc này + test tương ứng trước khi merge slice.

P4 (xếp lịch tự động) vẫn **BLOCKED** theo `docs/scope-can-chot-xep-lich.md`.
