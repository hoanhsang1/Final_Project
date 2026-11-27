> ⚠️ **Snapshot lịch sử — đối chiếu 2026-11-26.** Mọi trạng thái/số liệu/lệnh bên dưới là tại thời điểm soạn, không phải hiện tại. Nguồn chuẩn hiện tại: `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md`; quyết định P4: `D:\Final_Project\docs\scope-can-chot-xep-lich.md`. Giữ lại để tra cứu, không xoá.

# Schema gap giữa HEAD và `db.sql` (origin/main)

> Trạng thái: **chỉ khảo sát, chưa apply migration nào**.  
> Nhánh: `chore/sync-main-class-flow`.

## 1. Con số

- HEAD: **33 bảng** (gồm `0*_*.sql` hiện có: `01_identity_db.sql`, `02_people_db.sql`, …).
- `db.sql` (copy từ `origin/main` làm reference): **62 bảng**.
- **Thiếu 29 bảng** ở HEAD.

## 2. Danh sách 29 bảng thiếu

`assignment`, `class_close_event`, `class_status_log`, `class_student`, `class_subject`, `curriculum`, `curriculum_subject`, `curriculum_subject_prerequisite`, `delegation`, `delegation_permission`, `department_module`, `module_legacy_map`, `notification`, `outbox_event`, `permission_bundle`, `permission_bundle_item`, `position_bundle`, `position_seed`, `resignation_request`, `school_class`, `specialty`, `staff_profile`, `student_legacy_20261106`, `subject`, `teacher_profile`, `teacher_specialty`, `teacher_subject`, `transfer_approval`, `transfer_request`.

## 3. Cách đọc kết quả

- Các bảng này là nền tảng cho slice Lớp/Giáo viên vừa port: `school_class`, `specialty`, `class_subject`, `class_student`, `assignment`, `teacher_profile`, `teacher_specialty`, `teacher_subject`, `subject`, `outbox_event`, `class_status_log`, `class_close_event`, `position_bundle`, `permission_bundle*`.
- `position_seed`/`position_bundle` liên quan `DefaultPositionSeeder`; `department_module`/`module_legacy_map` liên quan module guard; `notification`/`outbox_event` liên quan relay.
- `student_legacy_20261106` là bảng legacy theo tên; **Cần xác minh** trước khi tạo (có thể chỉ cần cho migration dữ liệu cũ).

## 4. Rào chắn / không làm

- `db.sql` chứa **62 lệnh `DROP TABLE` và 46 lệnh `INSERT`** → **không chạy trực tiếp** vào DB đang dùng (mất dữ liệu).
- Chưa chốt DB local, chưa có JDK để chạy ứng dụng → **không tạo/sửa schema lúc này**.
- Không đổi `docs/phase-1/migrations/*`; các file này chỉ để đối chiếu.

## 5. Column-level gap đã phát hiện (2026-11-25)

Ngoài 29 bảng thiếu, **bảng có sẵn cũng khác cột**:

| Bảng | HEAD (`01_identity_db.sql`) | `db.sql` (main) | Ảnh hưởng |
|---|---|---|---|
| `module` | `code, name, is_active` | + `is_core` | `InternalOrganizationController` query `m.is_core` → lỗi SQL với schema HEAD |
| `organization_module` | `status ENUM('requested','active','rejected')` | `status VARCHAR(20)` + `disabled_at`, `locked_by_admin`, `locked_reason`, `locked_at`, `status_before_lock` | Controller/guard cần trạng thái `locked`/`disabled`; HEAD không lưu được |

→ Slice IdentityService vừa port **compile được nhưng chưa chạy được** với schema HEAD. Không tự ALTER DB, không tự đổi query (sẽ đổi logic module guard); để **Cần xác minh** khi chốt schema.

## 6. Việc cần làm khi chốt môi trường

1. Tách riêng phần `CREATE TABLE` từ `db.sql` cho 29 bảng thiếu (bỏ `DROP`/`INSERT`), đối chiếu kiểu cột/khoá với schema hiện có; đồng thời upgrade 2 bảng ở mục 5.
2. Quyết định bảng legacy (`student_legacy_20261106`) có cần thiết cho slice hiện tại không.
3. Tạo DB local mới (hoặc migration expand-only) rồi mới chạy backend + test.
4. Chỉ sau khi schema khớp mới xác minh runtime 5 state lớp, 409 mismatch, outbox relay, module guard.

P4 (xếp lịch tự động) vẫn **BLOCKED** theo `docs/scope-can-chot-xep-lich.md`.
