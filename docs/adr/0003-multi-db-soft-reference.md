# ADR-0003 — Tham chiếu liên dịch vụ là soft reference

- **Ngày:** 26/11/2026
- **Trạng thái:** Accepted (ghi nhận hiện trạng, chưa có cơ chế ràng buộc tự động)

## Bối cảnh

Mỗi service có schema riêng (`mems_identity_db`, `mems_people_db`, `mems_schedule_db`,
`mems_facility_db`). MySQL khóa ngoại chỉ tác động trong một database, nên không thể dùng FK
xuyên service cho các quan hệ như `org_id`, `account_id`, `teacher_id`, `student_id`, `room_id`.

## Quyết định

- Lưu **ID/UUID ở dạng tham chiếu mềm**; tính hợp lệ và thuộc tổ chức phải do tầng
  service/ứng dụng kiểm tra.
- Migration bổ sung (`06`–`09`) dùng ID phòng ban dạng soft reference; dữ liệu cũ có
  `department_id = NULL` cần được gán đúng phòng + tổ chức trước khi lọc theo phòng ban.

## Phương án bị bỏ

- Gộp chung một database để dùng FK: mất ranh giới service, gây phụ thuộc ngược khi deploy.
- Giả định FK tự hoạt động: sai về mặt kỹ thuật, tạo dữ liệu mồ côi.

## Hệ quả / rủi ro

- Cần kiểm tra quyền/thuộc tổ chức ở mỗi endpoint; không tin vào FK.
- ⛔ `07_people_department_access.sql` đang **lỗi DDL** (`position(id)` — reserved word),
  đã revert, **không tự sửa**, không coi 06–09 là đã apply. Xem `../trang-thai-hien-tai-2026-11-26.md`.
- D1/D7 (phòng cấp tổ chức hay phòng ban) và D8–D11 vẫn chưa chốt — P4 BLOCKED.
- Nguồn mô tả: `../du-lieu-nen-tang-thiet-lap-MEMS.md`, `../department-access.md`.
