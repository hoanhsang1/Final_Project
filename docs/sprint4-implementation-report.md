# Sprint 4 — Báo cáo triển khai backend

**Ngày hoàn thành:** 2026-11-06
**Phạm vi:** backend only (PeopleService, IdentityService, APIGateway, DB, test, tài liệu).
**Trạng thái:** đạt toàn bộ DoD Phần 0 → 7. Chưa commit/push.

Tài liệu liên quan:

- [`sprint4-feature-file-map.md`](sprint4-feature-file-map.md) — chức năng ↔ file mã nguồn.
- [`sprint4-fe-handoff.md`](sprint4-fe-handoff.md) — bàn giao frontend.
- [`sprint4-api.md`](sprint4-api.md) — đặc tả API đầy đủ.
- [`sprint4-ac-matrix.md`](sprint4-ac-matrix.md) — đối chiếu AC-15 → AC-19.
- [`sprint4-migration.md`](sprint4-migration.md) — chạy migration/local.
- [`sprint4-manual-scenario.http`](sprint4-manual-scenario.http) — kịch bản thử tay.

---

## 1. Kết quả theo từng phần

| Phần | Nội dung | Kết quả |
|---|---|---|
| 0 | Khảo sát code, quy ước bảng/cột/permission | Hoàn tất |
| 1 | Migration DB Sprint 4 | `13`, `14` chạy idempotent trên MySQL local |
| 2 | Permission mới, chức vụ mẫu, module | 5 quyền `CLASS_*`; seed 7 chức vụ |
| 3 | Hồ sơ giáo viên, chuyên môn, danh sách/tìm kiếm | API `/teachers`, `/specialties` hoạt động |
| 4 | Gán giáo viên cho lớp | `PUT /classes/{id}/teacher` |
| 5 | Trạng thái lớp, hủy lớp, đóng/mở lớp | Job tự động + luồng duyệt đầy đủ |
| 6 | Gateway + tài liệu API | Route `/api/*` hoạt động, `sprint4-api.md` |
| 7 | Test, dữ liệu mẫu, deploy | 82 test pass, 5 image Docker, kịch bản tay PASS |

---

## 2. Thay đổi cơ sở dữ liệu

### 2.1. People DB — `13_people_sprint4.sql`

| Nhóm | Thay đổi |
|---|---|
| Hồ sơ nhân sự | Bảng `staff_profile` (1:1 `department_member`): `staff_code`, `full_name`, `full_name_unaccented`, `phone`, `email`, `version`; backfill dữ liệu cũ |
| Danh mục | Bảng `specialty`, `subject` theo tổ chức, UNIQUE theo tên không dấu |
| Giáo viên | Bảng `teacher_profile` (hợp đồng, trạng thái dạy, version) và `teacher_specialty`; backfill người giữ chức vụ `TEACHER` |
| Chức vụ | Thêm `position.profile_type` (`GENERAL`/`TEACHER`) |
| Lớp | Thêm `teacher_id`, `start_date`, `end_date`, `subject_id`, `version`, `close_state` + index/FK |
| Trạng thái | Map `active → CHUA_BAT_DAU`, `inactive → DA_HUY`, `archived → DA_KET_THUC` |
| Nhật ký | Bảng `class_status_log`, `class_close_event` |
| Seed | Bảng `position_seed` đánh dấu tổ chức đã seed chức vụ |

Ghi chú: `class_close_event` có `actor_id NOT NULL`, `reason VARCHAR(1000)`; khối nâng cấp idempotent xử lý DB đã tạo bảng kiểu cũ.

### 2.2. Identity DB — `14_identity_sprint4_permissions.sql`

- Thêm 5 quyền: `CLASS_ASSIGN_TEACHER`, `CLASS_CANCEL`, `CLASS_CLOSE_REQUEST`, `CLASS_CLOSE_APPROVE`, `CLASS_REOPEN`.
- Gán cho `OWNER` và `ORG_OWNER`.
- Điều kiện cần: `06_identity_department_access.sql` (cột `must_change_password`, `provisioned_by`).

### 2.3. Dữ liệu mẫu — `15_sprint4_sample.sql` (dev/test only)

- Tổ chức `11111111-1111-4111-8111-111111111111`.
- Phòng ban `44444444-4444-4444-8444-444444444001` ("Tổ Toán – Tin").
- 7 chức vụ mẫu, 6 tài khoản (mật khẩu `Sample@123456`).
- Giáo viên `DANG_DAY` và `TAM_NGHI`, 3 chuyên môn, 5 lớp đủ 4 trạng thái, 1 lớp `CLOSED`.
- Idempotent: `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE`.

---

## 3. Chức năng đã triển khai

### 3.1. Danh mục chuyên môn

- `GET /specialties?q=` — tìm không dấu/hoa thường.
- `POST /specialties` — tạo mới, chống trùng sau chuẩn hóa; trả 409 `SPECIALTY_EXISTS`.

### 3.2. Hồ sơ giáo viên

- `POST /teachers` — tạo tài khoản + hồ sơ nhân sự + hồ sơ giáo viên trong một luồng.
  - Bắt buộc chức vụ `profile_type='TEACHER'`.
  - Trả `temporaryPassword` và `mustChangePassword`.
  - Chống trùng mã/email; UNIQUE ở DB chặn tạo song song.
- `GET /teachers` — phân trang, lọc `q`, `specialtyId`, `teachingStatus`.
  - Tìm theo mã/họ tên, không dấu, escape `% _ '`.
  - Trả `classCount`, `noClass`, `classLabel="Chưa có lớp"`.
  - Không phải OWNER chỉ thấy phòng ban của mình.
- `GET /teachers/assignable` — giáo viên `DANG_DAY` toàn tổ chức, dùng cho combobox gán lớp.
- `GET /teachers/{id}` — hồ sơ + lớp phụ trách + lịch sử thay đổi + `version`.
- `PUT /teachers/{id}` — cập nhật, trim text, email lowercase.
  - Đổi chuyên môn lệch môn lớp → 409 `SPECIALTY_MISMATCH` kèm danh sách lớp.
  - `confirm=true` mới lưu; `version` cũ → 409 `DATA_CHANGED`.
  - Ghi audit `TEACHER_UPDATED` với before/after từng trường.

### 3.3. Gán giáo viên cho lớp

- `PUT /classes/{id}/teacher`.
- Thứ tự kiểm tra: lớp thuộc tổ chức → lớp còn gán được → giáo viên thuộc tổ chức, có chức vụ giáo viên, `DANG_DAY` → module Phân công giáo viên.
- Module bật → 409 `TEACHER_ASSIGNMENT_MODULE_ACTIVE`.
- Sai `version` → 409 `DATA_CHANGED`.
- Không kiểm tra trùng lịch.

### 3.4. Trạng thái lớp

- `CHUA_BAT_DAU → DANG_DIEN_RA → DA_KET_THUC`; hủy thủ công → `DA_HUY`.
- Job `@Scheduled` hằng ngày + refresh trước mỗi lần đọc danh sách/chi tiết.
- Idempotent: chạy lại không sinh nhật ký thừa; `changed_by=NULL` cho hệ thống.
- `GET /classes/{id}/status-logs`.

### 3.5. Hủy lớp

- `POST /classes/{id}/cancel {reason, version}`.
- Chỉ từ `CHUA_BAT_DAU`/`DANG_DIEN_RA` và `closeState='NONE'`.
- Lý do rỗng → 400; sai version → 409 `STATUS_CHANGED`.
- Ghi đúng 1 dòng `class_status_log`.

### 3.6. Đóng lớp có duyệt

| Bước | API | Kết quả |
|---|---|---|
| Yêu cầu | `POST /classes/{id}/close-requests {note?}` | `NONE → PENDING`, ghi `REQUESTED` |
| Duyệt | `POST /classes/{id}/close-requests/approve` | `PENDING → CLOSED`, ghi `APPROVED` |
| Từ chối | `POST /classes/{id}/close-requests/reject {reason}` | `PENDING → NONE`, ghi `REJECTED` |
| Mở lại | `POST /classes/{id}/reopen {reason}` | `CLOSED → NONE`, ghi `REOPENED` |

- Không tự duyệt yêu cầu của mình (403 `SELF_APPROVAL_NOT_ALLOWED`).
- Không yêu cầu đóng lớp `DA_HUY`.
- `PENDING` vẫn sửa được; `CLOSED` chỉ xem, chặn sửa/gán giáo viên.
- `GET /classes/{id}/close-events`.

### 3.7. Danh sách lớp

- `GET /classes` thêm `teacher`, `closeState`, `version`, `studentCount`.
- `selectable=true` loại `DA_KET_THUC`, `DA_HUY`, `CLOSED`.
- Server tự refresh trạng thái trước khi trả.

---

## 4. Kiểm chứng

### 4.1. Test tự động

| Module | Số test | Kết quả |
|---|---|---|
| PeopleService | 80 | pass |
| IdentityService | 2 | pass |
| APIGateway / EurekaServer / ScheduleService / FacilityService | 0 | build xanh |

Nhóm test chính:

- `TeacherRequestValidationTest` — validate form theo từng trường.
- `StaffProfileRepositoryTest` — trùng mã/email, UNIQUE, optimistic lock.
- `TeacherRepositoryTest` — tìm không dấu, escape wildcard, phân trang, chuyên môn, cách ly tổ chức.
- `TeacherServiceTest` — trim/email, `SPECIALTY_MISMATCH`, audit, 403 phòng ban.
- `ClassTeacherAssignmentTest` — gán lớp, `TAM_NGHI`, module bật, lớp khóa, sai version.
- `ClassLifecycleTest` — job idempotent, hủy, đóng/duyệt/từ chối/mở lại, `selectable`.
- `PermissionEnforcementTest`, `ClassLifecyclePermissionTest` — 401/403.

### 4.2. Kịch bản tay qua gateway 8080

Đã chạy thành công:

1. `sample_hr` đăng nhập → tạo chuyên môn → tạo giáo viên.
2. `sample_academic` đăng nhập → tạo lớp A → gán giáo viên → tạo lớp B → hủy lớp B → yêu cầu đóng lớp A.
3. Kiểm tra quyền: Giáo vụ tự duyệt → 403; Nhân sự hủy lớp → 403.
4. `sample_head` đăng nhập → duyệt → `CLOSED` → mở lại → `NONE`.
5. `close-events` = `REQUESTED, APPROVED, REOPENED`.

### 4.3. Hạ tầng

- Build Docker thành công: people-service, identity-org-service, api-gateway, schedule-service, facility-service.
- Cả 5 service đăng ký Eureka `204`.
- `docker compose config` hợp lệ.
- URL service đọc từ biến môi trường (`EUREKA_URL`, `IDENTITY_SERVICE_URL`, `PEOPLE_SERVICE_URL`), mặc định `localhost`.

---

## 5. Quyết định tạm T1–T8

| Mã | Đã triển khai |
|---|---|
| T1 | Người giữ `CLASS_CLOSE_APPROVE` trong tổ chức được duyệt; seed cho "Trưởng phòng ban" |
| T2 | `CLASS_REOPEN` cho phép mở lại lớp đã đóng |
| T3 | `PENDING` không khóa sửa; chỉ `CLOSED` khóa |
| T4 | Được yêu cầu đóng mọi trạng thái trừ `DA_HUY` |
| T5 | 5 quyền `CLASS_*` mới; tái dùng `CLASS_VIEW/EDIT/CREATE` |
| T6 | Chưa chốt nơi deploy; không ảnh hưởng code |
| T7 | OWNER xem toàn bộ; `CLASS_ASSIGN_TEACHER` xem assignable toàn tổ chức; tạo/sửa chỉ trong phòng ban |
| T8 | Seed đủ 7 chức vụ mẫu |

---

## 6. Khoảng trống được phép

| AC | Lý do |
|---|---|
| AC-18.03 | Luồng phê duyệt phân công thuộc Epic 12; Sprint 4 chỉ đọc cờ module |
| AC-19.08 | Gửi email thuộc Epic khác |
| AC-19.09 | Hủy buổi học phụ thuộc Epic 6 (schedule/session) |

---

## 7. Cách chạy

```bash
# DB: xem docs/sprint4-migration.md
# Test
cd backend/PeopleService && ./mvnw clean test
cd backend/IdentityService && ./mvnw clean test

# Chạy toàn bộ
docker compose up -d --build

# Kịch bản tay: docs/sprint4-manual-scenario.http
```

Tài khoản mẫu (dev): `sample_owner`, `sample_hr`, `sample_academic`, `sample_head`,
`sample_teacher`, `sample_teacher2` — mật khẩu `Sample@123456`.

---

## 8. Lưu ý vận hành

- `15_sprint4_sample.sql` chỉ dùng dev/test, không chạy production.
- Môi trường mới cần chạy `06` (nếu thiếu cột provisioning), `10`, `14`, `13` theo thứ tự.
- Không bật `ddl-auto=create/create-drop`; cấu hình hiện tại là `update`.
- Các bảng legacy `staff`, `teacher`, `student_legacy_20261106` vẫn tồn tại nhưng không được code sử dụng.
