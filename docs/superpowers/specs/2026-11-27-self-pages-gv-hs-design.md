# Design — Page cơ bản Giáo viên / Học sinh (self-service)

## Mục tiêu
Sau khi lưới tuần xong, sửa dead-end `/dao-tao` cho user self-only và thêm các màn **đọc** tối thiểu cho TEACHER / STUDENT dùng endpoint `/me` có sẵn của PeopleService. Không mở quyền quản lý, không thêm BE/contract.

## Phạm vi
- FE-only: `frontend/src`.
- Không đổi BE, gateway, seed, DB, migration, build/lint/CI, dependency.
- Không commit/push/merge; HEAD vẫn `5a4a286`; staged 0; deleted 0.
- Không copy FE từ `origin/main`; không dùng từ “VIP”.
- Giữ Astryx + component dùng chung trong dự án (`PageHeader`, `PageLoading`, `Banner`, `ForbiddenNotice`, `EmptyState`, `DetailSection`, `MetadataList`, `Table`, `AppLink`).
- `http://localhost:5173` khi chạy thật (không `127.0.0.1`).

## Contract backend đã kiểm chứng (21:xx 2026-11-27, gateway :8080)
| Endpoint | Quyền BE | Payload |
|---|---|---|
| `GET /api/teachers/me` | `isAuthenticated()`, actor từ JWT | `TeacherDetailResponse` (FE: `TeacherDetail`) |
| `GET /api/teachers/me/classes` | `isAuthenticated()` | mảng `TeacherClassResponse` |
| `GET /api/classes/me/{id}/students` | `class.self_view`/`class.view`, phải là GV được gán | mảng `StudentResponse` (FE: `StudentListItem`) |
| `GET /api/students/me` | `student.self_view` | `StudentResponse` |
| `GET /api/students/me/classes` | `student.self_view` | mảng `StudentClassResponse` |

Payload mẫu: GV `vyvy` có 1 lớp `12A1`; HS `demo_student` có 1 lớp `12A1`; class-students trả đúng 1 học sinh. Cả TEACHER lẫn STUDENT đều có `class.self_view`, `student.self_view`, `schedule.self_view` trong JWT → **không được dùng permission làm gate phân biệt hai vai trò**; phải dùng `backendRoles`.

## Route và gate
| Route | Màn | Gate UX |
|---|---|---|
| `/dao-tao/trang-ca-nhan` | Trang cá nhân (đích mới của index self-only) | TEACHER hoặc STUDENT |
| `/dao-tao/giao-vien/cua-toi` | Hồ sơ giáo viên của tôi | `backendRoles.includes('TEACHER')` |
| `/dao-tao/lop-hoc-cua-toi` | Lớp tôi phụ trách | TEACHER **và** `class.self_view` |
| `/dao-tao/lop-hoc-cua-toi/:id` | Học sinh trong lớp tôi | TEACHER **và** `class.self_view` |
| `/dao-tao/hoc-sinh/cua-toi` | Hồ sơ học sinh của tôi | `backendRoles.includes('STUDENT')` |
| `/dao-tao/hoc-sinh/lop-cua-toi` | Lớp của tôi | STUDENT **và** `student.self_view` |

- `/dao-tao` index: OWNER hoặc user có `PEOPLE_VIEW`/`PEOPLE_EDIT` → giữ `giao-vien`; còn lại → `trang-ca-nhan`. Không đổi `LoginPage` (vẫn vào `/dao-tao` khi `canAccessAcademicArea`).
- Các route self khai **trước** `/giao-vien/:id`, `/hoc-sinh/:id`.
- `AcademicGuard` vẫn áp dụng cho toàn khu vực. Thêm `class.self_view` và `student.self_view` vào `ACADEMIC_AREA_PERMISSIONS` + alias `CLASS_SELF_VIEW` / `STUDENT_SELF_VIEW` để user chỉ có self-permission cũng vào được `/dao-tao`.
- Gate là UX; backend vẫn là nguồn quyền thật. Khi gate sai hiển thị `ForbiddenNotice`, không gọi API.

## Menu (`academicMenu.ts`)
- Giữ chữ ký `getAcademicMenu(permissions, isOwner, backendRoles = [])` (tham số mới optional để không phá test cũ).
- Thêm mục, chỉ hiện khi role tương ứng (không dùng permission để phân biệt GV/HS):
  - `trang-ca-nhan` → `/dao-tao/trang-ca-nhan` (TEACHER hoặc STUDENT).
  - `ho-so-cua-toi` → path GV hoặc HS tuỳ role.
  - `lop-cua-toi` → path GV hoặc HS tuỳ role (và chỉ khi có self-permission tương ứng).
- `activeAcademicMenuKey` nhận diện các path mới **trước** prefix `/dao-tao/giao-vien`, `/dao-tao/hoc-sinh`, `/dao-tao/lop-hoc`.

## API wrapper & type (`sprint4Api.ts`, `types.ts`)
- `fetchTeacherSelf()`, `fetchTeacherSelfClasses()`, `fetchMyClassStudents(classId)`, `fetchStudentSelf()`, `fetchStudentSelfClasses()` — dùng `request()` hiện có để mapping lỗi `Sprint4ApiError`; trả mảng thuần; không new dependency.
- `TeacherClass` bổ sung optional `needsReassignment?: boolean`, `reassignmentReason?: string | null`.
- Thêm `StudentClass { id; classCode?; name?; academicYear?; startDate?; endDate?; status?; closeState?; teacherName?; subjectName? }`.
- `StudentListItem` giữ nguyên; BE có thêm `orgId`/`createdBy` là field thừa, bỏ qua.
- Thêm `MSG_SELF` vào `sprint4Messages.ts` cho mọi nhãn mới (không hardcode chuỗi trong page).

## Hành vi chung của các page
- 5 trạng thái: forbidden (gate), loading (`PageLoading`), error (`Banner status="error" role="alert"` + nút `Thử lại` gọi `refetch`), empty (`EmptyState` với câu gợi ý cụ thể), success.
- `useQuery` với queryKey riêng từng endpoint; `enabled: gate`.
- Profile: `PageHeader` + `DetailSection` + `MetadataList`/`MetadataListItem`; chỉ đọc, dùng `formatDate`/`formatDateTime`/`labelOf` từ `features/sprint4/labels.ts`.
- Danh sách: `Table` của Astryx, `emptyState={<EmptyState compact description=... />}`, dòng lớp là `AppLink` tới `/dao-tao/lop-hoc-cua-toi/:id`.
- Trang lớp → học sinh: lấy tên lớp từ `fetchTeacherSelfClasses()` (query song song) và fallback về id nếu không tìm thấy; có liên kết “Về danh sách lớp”.
- Không có thao tác ghi, không dialog sửa, không gọi endpoint quản lý (`/api/teachers`, `/api/students`, `/api/classes` dạng list/detail).

## Testing & nghiệm thu
- Vitest + Testing Library: mock 5 wrapper API, assertions cho gate (role sai → `ForbiddenNotice`, không gọi API), loading/error+retry/empty/success, aria/heading, link điều hướng.
- Full FE suite xanh, `npm run lint`, `npx tsc -b --pretty false`, `git diff --check`.
- Chụp màn hình thật qua `http://localhost:5173` với `vyvy`/`demo_student`: landing, 2 hồ sơ, 2 danh sách lớp, danh sách học sinh trong lớp. Không console/HTTP/page error.
- Git invariant như trước.
