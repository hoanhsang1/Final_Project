# Màn Quản lý học sinh (FE) — thiết kế ngắn 26/11/2026 (cập nhật hồ sơ)

> **Trạng thái: đã duyệt và triển khai 26/11/2026; chưa commit.** Bản đầu duyệt 26/11/2026; bản này bổ sung màn hồ sơ theo yêu cầu người dùng. Code đã có trong working tree, chưa commit; chưa chạy DB/build BE.
>
> Nguồn contract: `backend/PeopleService/.../controller/StudentController.java`,
> `dto/StudentRequest.java`, `dto/StudentUpdateRequest.java`, `dto/StudentResponse.java`,
> `repository/StudentRepository.java`. Quy ước UI: `frontend/src/pages/TeachersPage`,
> `frontend/src/pages/ClassesPage`, `frontend/src/pages/TeacherDetailPage`.
> Nghiệp vụ hồ sơ tham chiếu: `docs/Sprint4-docx-extracted.txt` (FN-10/FN-12), nhưng chỉ làm phần BE đã có.

## 1. Mục tiêu & lý do

BE đã có đầy đủ CRUD học sinh nhưng FE chưa có màn nào. Gói chuẩn vừa chốt lấy
**học sinh** làm nghiệp vụ lõi. Người dùng yêu cầu màn học sinh phải có **hồ sơ**, không chỉ danh sách/lớp/lịch.

**Làm được:**
- `/dao-tao/hoc-sinh`: danh sách phân trang phía server, lọc `q`/`status`, tạo/sửa/xoá cơ bản.
- `/dao-tao/hoc-sinh/:id`: **hồ sơ học sinh** — thông tin cá nhân + lớp hiện tại + trạng thái/tài khoản, có nút sửa hồ sơ.
- FE gọi được endpoint People thật qua gateway.

**Không làm (non-goals):**
- `gender`, `số phiên bản` (optimistic locking), **danh sách lớp quá khứ** và **lịch sử thay đổi** theo SRS — BE/DB hiện chưa có (`student` không có `gender`/`version`; `/students/me/classes` chỉ cho chính học sinh). Ghi nhận là task BE riêng, không bịa dữ liệu.
- Nút “tạo tài khoản” (`POST /students/{id}/account` trả mật khẩu tạm, cần UX no-store + xác nhận riêng).
- Đổi authority BE (`student.view`), DB/migration phân gói, build/lint/CI; thêm thư viện; dùng antd/Tailwind.

## 2. Cách làm đã chọn

- **A (chọn):** sát mẫu Sprint 4 — type/API/message trong `features/sprint4`, query/mutation inline trong page, dùng chung `PageHeader`/`Table`/`Dialog`/`useTablePagination`.
- B: tách `features/students` riêng — thêm file/helper trùng, chưa có lợi.
- C: chỉ đọc — bị loại vì người dùng yêu cầu có hồ sơ và quản lý.

## 3. Ràng buộc

- Chỉ `@astryxdesign/core`; form `useFormState` (type alias); toast `useNotify`.
- Giữ 5 trạng thái danh sách: `ForbiddenNotice` / error Banner + retry / `PageLoading` / `EmptyState` / bảng + phân trang. Trang hồ sơ cũng có loading/error/không tìm thấy. Không bỏ live-region a11y.
- Không sửa `frontend/e2e/*.spec.ts`; không đụng worktree FE shell; không đụng `07_people_department_access.sql`.
- FE dùng `STUDENT_VIEW`/`STUDENT_CREATE`/`STUDENT_EDIT`/`STUDENT_DELETE`; BE dùng `student.view`. Thử nghiệm bằng `OWNER`; không sửa BE trong slice này.

## 4. Thiết kế chi tiết

### 4.1 Contract FE (theo BE)

- `GET /api/students` (`page,size,q,status,classId`) → `{ items, total, page, size }` → `normalizePaged`.
- `GET /api/students/{id}` → `StudentResponse` map sang `StudentListItem`.
- `POST /api/students`: `{ studentCode?, fullName, dateOfBirth?, email?, phone?, status? }`.
- `PUT /api/students/{id}`: `{ fullName, dateOfBirth?, email?, phone?, status? }`.
- `DELETE /api/students/{id}` → 204.
- Row/chi tiết dùng chung `StudentListItem` (xem plan để biết field chính xác). Status `active|inactive|suspended`.

### 4.2 File sẽ đổi/thêm

| Việc | File |
|---|---|
| Type + API + message | `features/sprint4/types.ts`, `sprint4Api.ts`, `sprint4Messages.ts` |
| Phân quyền/menu | `features/auth/permissions.ts`, `features/sprint4/academicMenu.ts` |
| Danh sách + test | `pages/StudentsPage/StudentsPage.tsx`, `StudentsPage.test.tsx` |
| **Hồ sơ + test** | `pages/StudentDetailPage/StudentDetailPage.tsx`, `StudentDetailPage.test.tsx` |
| Route | `router.tsx` (lazy + `hoc-sinh`, `hoc-sinh/:id`) |
| Gateway | `backend/APIGateway/src/main/resources/application.yml`: `people-students`, `StripPrefix=1` |
| Docker | `docker-compose.yml`: `PEOPLE_SERVICE_URL` cho `api-gateway` |

### 4.3 Hành vi màn

**Danh sách:** lọc `q` (TextInput search) + `status` (3 giá trị); **không** đưa `classId` lên UI; bảng có mã học sinh (AppLink tới hồ sơ), họ tên, lớp, ngày sinh, trạng thái, cột thao tác (Sửa/Xoá) chỉ khi `canEditStudents`; phân trang server.

**Hồ sơ `/hoc-sinh/:id`:** `PageHeader` với nút “Sửa hồ sơ” (chỉ khi có quyền) + liên kết “Về danh sách”. Hiện các nhóm:
- Thông tin hồ sơ: mã học sinh (chỉ đọc), họ tên, ngày sinh, email, điện thoại, trạng thái (Badge).
- Lớp hiện tại: `classCode` + `className` (nếu có); nếu không ghi “Chưa ghi danh lớp”.
- Tài khoản: `accountUsername` + ngày tạo tài khoản (nếu có); nếu không ghi “Chưa tạo tài khoản”.
- Ngày tạo/cập nhật hồ sơ.
Sửa dùng cùng payload `updateStudent`, sau lưu `invalidateQueries(['students'])` và `['students', id]`. Không hiện field `gender`/`version`/lịch sử (chưa có BE).

### 4.4 Kiểm chứng

- `vitest run` cho API, danh sách, hồ sơ; `tsc -b --pretty false`; `eslint` sạch; dùng node exe có sẵn.
- **Không build BE** (thiếu JDK); gateway/docker chỉ đối chiếu cấu hình.

## 5. Còn lại cho người triển khai

- Plan: `docs/superpowers/plans/2026-11-26-hoc-sinh-fe.md` (cập nhật theo bản này).
- Khi BE bổ sung `gender`/`version`/lịch sử/lớp quá khứ, mở task mới để nối vào màn hồ sơ — không tự suy đoán ở đây.
