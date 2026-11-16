# PHẦN 7 — Lịch học & Cơ sở vật chất: Báo cáo triển khai

Ngày hoàn tất: 2026-11-13
Phạm vi: kiểm tra quyền + tích hợp lịch học/cơ sở vật chất (backend + frontend).

---

## 1. Phát hiện quan trọng trước khi làm

Đề bài giả định "backend đã có endpoint". Thực tế **chỉ có `GET /departments/{id}/schedules`
và `GET /departments/{id}/facilities`**; không có API tạo/sửa/hủy buổi học, không có CRUD
phòng/thiết bị/sự cố. Vì DoD yêu cầu các thao tác này, tôi đã bổ sung endpoint còn thiếu
thay vì dừng lại — đây là điểm lệch so với mô tả ban đầu, ghi rõ để rà soát.

---

## 2. File đã sửa/tạo

### 2.1 Migration (chạy trước khi khởi động service)

| File | Nội dung |
|---|---|
| `26_identity_schedule_facility_permissions.sql` | Thêm mã quyền mới vào `permission` + gắn `module_code`; thêm item vào 2 bundle `SCHEDULE_MANAGEMENT` / `FACILITY_MANAGEMENT`; cấp cho OWNER/ORG_OWNER/SUPER_ADMIN. Idempotent. |
| `27_facility_equipment_department.sql` | Thêm `equipment.department_id` + index, backfill từ `classroom.department_id`. |

### 2.2 IdentityService

- `src/main/java/com/mems/service/PermissionCatalog.java` — thêm mã `schedule.update`,
  `schedule.cancel_session`, `facility.room.*`, `facility.equipment.*`, `facility.issue.report/resolve`;
  cập nhật bundle tương ứng. Giữ mã cũ `schedule.edit`, `facility.view/manage` để tương thích.

### 2.3 PeopleService

- `service/DefaultPositionSeeder.java` — thêm mã mới vào `ALL_PERMISSIONS` và chức vụ
  "Nhân viên cơ sở vật chất".
- `dto/ClassScheduleInfo.java` (mới) — dữ liệu lớp cho ScheduleService.
- `controller/InternalScheduleLookupController.java` (mới):
  - `GET /internal/classes/{classId}?orgId=`
  - `GET /internal/students/{studentId}/classes?orgId=`
- `src/test/java/com/mems/service/DefaultPositionSeederTest.java` — cập nhật số quyền owner 29 → 41.

### 2.4 FacilityService

Mới:
- `security/InternalApiFilter.java`, `security/OrganizationModuleGuard.java`
- `dto/RoomResponse.java`, `RoomRequest.java`, `EquipmentResponse.java`, `EquipmentRequest.java`,
  `IssueResponse.java`, `IssueReportRequest.java`, `InternalRoomResponse.java`
- `controller/InternalRoomController.java` (`GET /internal/rooms`, `GET /internal/rooms/{roomId}`)
- `src/test/java/com/mems/service/FacilityServiceTest.java` (5 test)

Sửa:
- `security/Actor.java` — thêm `departmentId()`, `role()`, `hasAnyPermissionIn`, `requireAnyPermissionIn`.
- `security/SecurityConfig.java` — thêm `InternalApiFilter`, permit `/internal/**`, authenticated
  cho `/departments/*/facilities(/**)`.
- `exception/ErrorCode.java` — 4101–4108.
- `service/FacilityService.java` — CRUD phòng/thiết bị, báo/xử lý sự cố, lọc org + department.
- `controller/DepartmentFacilityController.java` — mọi endpoint kiểm module + quyền + phạm vi.
- `src/test/resources/facility-test-schema.sql`.

### 2.5 ScheduleService

Mới:
- `security/OrganizationModuleGuard.java`
- `client/ClassInfo.java`, `StudentClass.java`, `RoomInfo.java`, `PeopleClient.java`, `FacilityClient.java`
- `dto/ScheduleResponse.java`, `ScheduleRequest.java`, `RoomSuggestionResponse.java`
- `src/test/java/com/mems/service/ScheduleServiceTest.java` (9 test)

Sửa:
- `security/Actor.java` — thêm `departmentId()`, `role()`, `hasAnyPermissionIn`, `requireAnyPermission`.
- `security/SecurityConfig.java` — authenticated cho `/departments/*/schedules(/**)` và `/schedules/me`.
- `exception/ErrorCode.java` — 3101–3113.
- `service/ScheduleService.java` — tạo/sửa/hủy/xóa buổi, chống trùng, gợi ý phòng, lịch của tôi.
- `controller/DepartmentScheduleController.java`, `controller/ScheduleController.java`.
- `src/main/resources/application.properties` — 2 cờ `SCHEDULE_APPROVAL_ENABLED`,
  `SCHEDULE_OUTSIDE_BOOKING_ENABLED` (mặc định `false`, kèm TODO).
- `src/test/resources/application.properties`, `schedule-test-schema.sql`.

### 2.6 APIGateway

- `src/main/resources/application.yml` — thêm route:
  - `/api/departments/*/schedules(/**)` → `SCHEDULE_SERVICE_URL` (StripPrefix=1)
  - `/api/schedules/**` → `SCHEDULE_SERVICE_URL` (StripPrefix=1)
  - `/api/departments/*/facilities(/**)` → `FACILITY_SERVICE_URL` (StripPrefix=1)

### 2.7 docker-compose

- `schedule-service`: thêm `INTERNAL_API_KEY`, `IDENTITY_SERVICE_URL`, `PEOPLE_SERVICE_URL`,
  `FACILITY_SERVICE_URL`.
- `facility-service`: thêm `INTERNAL_API_KEY`, `IDENTITY_SERVICE_URL`.
- `api-gateway`: thêm `SCHEDULE_SERVICE_URL`, `FACILITY_SERVICE_URL`.

### 2.8 Frontend

Mới:
- `src/features/operations/types.ts`, `operationsApi.ts`, `operationsMessages.ts`,
  `useDepartmentScope.ts`, `DepartmentSelect.tsx`
- `src/pages/SchedulePage/SchedulePage.tsx`
- `src/pages/MySchedulePage/MySchedulePage.tsx`
- `src/pages/FacilityPage/FacilityPage.tsx`

Sửa:
- `src/features/auth/jwt.ts` — thêm claim `departmentId`.
- `src/stores/authStore.ts` — lưu `departmentId` (restore, login, refresh).
- `src/features/auth/permissions.ts` — helper quyền lịch/cơ sở vật chất; mở rộng `SPRINT4_PERMISSIONS`.
- `src/features/sprint4/academicMenu.ts` — menu "Lịch học", "Lịch của tôi", "Cơ sở vật chất".
- `src/router.tsx` — route `/dao-tao/lich-hoc`, `/dao-tao/lich-cua-toi`,
  `/dao-tao/co-so-vat-chat`, `/lich-cua-toi`.
- `src/pages/StudentPortalPage/StudentPortalPage.tsx` — nút "Lịch học của tôi".

---

## 3. API mới/đổi

### 3.1 Lịch học (ScheduleService)

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/departments/{id}/schedules?from&to&classId` | `schedule.view` |
| POST | `/departments/{id}/schedules` | `schedule.create` |
| PUT | `/departments/{id}/schedules/{sessionId}` | `schedule.update` hoặc `schedule.edit` |
| POST | `/departments/{id}/schedules/{sessionId}/cancel` | `schedule.cancel_session` / `schedule.update` / `schedule.edit` |
| DELETE | `/departments/{id}/schedules/{sessionId}` | `schedule.delete` |
| GET | `/departments/{id}/schedules/room-suggestions?startTime&endTime` | `schedule.create` |
| GET | `/schedules/me?from&to` | `schedule.self_view` hoặc `schedule.view` |

Mọi endpoint gọi `OrganizationModuleGuard.requireModule(org, "SCHEDULE_MANAGEMENT")` và
`Actor.requireAnyPermissionIn(codes, departmentId)`; `org_id` lấy từ JWT.

### 3.2 Cơ sở vật chất (FacilityService)

| Method | Đường dẫn | Quyền |
|---|---|---|
| GET | `/departments/{id}/facilities/rooms` | `facility.room.view` / `facility.view` / `facility.manage` |
| POST | `/departments/{id}/facilities/rooms` | `facility.room.create` / `facility.manage` |
| PUT | `/departments/{id}/facilities/rooms/{roomId}` | `facility.room.update` / `facility.manage` |
| DELETE | `/departments/{id}/facilities/rooms/{roomId}` | `facility.room.delete` / `facility.manage` |
| GET | `/departments/{id}/facilities/equipment` | `facility.equipment.view` / `facility.view` / `facility.manage` |
| POST | `/departments/{id}/facilities/equipment` | `facility.equipment.create` / `facility.manage` |
| PUT | `/departments/{id}/facilities/equipment/{equipmentId}` | `facility.equipment.update` / `facility.manage` |
| DELETE | `/departments/{id}/facilities/equipment/{equipmentId}` | `facility.equipment.delete` / `facility.manage` |
| GET | `/departments/{id}/facilities/issues?status` | một trong bộ quyền sự cố/thiết bị |
| POST | `/departments/{id}/facilities/issues` | `facility.issue.report` / `facility.manage` |
| POST | `/departments/{id}/facilities/issues/{issueId}/resolve` | `facility.issue.resolve` / `facility.manage` |
| GET | `/departments/{id}/facilities` (legacy) | `facility.room.view` / `facility.view` |

### 3.3 Internal (service-to-service)

- People: `GET /internal/classes/{classId}?orgId=`, `GET /internal/students/{studentId}/classes?orgId=`
- Facility: `GET /internal/rooms?orgId&departmentId`, `GET /internal/rooms/{roomId}?orgId=`

Tất cả bảo vệ bằng `X-Internal-Api-Key` (≥32 ký tự).

---

## 4. Đối chiếu DoD

| # | Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Người không có quyền không gọi được endpoint | ✅ | Controller `authorize()` kiểm module + `requireAnyPermissionIn`; SecurityConfig chỉ cho request `authenticated`. Module tắt → `MODULE_NOT_ENABLED`. |
| 2 | Trùng lịch bị từ chối rõ ràng | ✅ | `TEACHER_SCHEDULE_CONFLICT` (3110), `ROOM_SCHEDULE_CONFLICT` (3111), `CLASS_SCHEDULE_CONFLICT` (3112); 2 test trùng giáo viên/phòng. |
| 3 | Giáo viên/ sinh viên chỉ thấy lịch của mình | ✅ | `GET /schedules/me` chia nhánh theo role: STUDENT → lớp của mình, còn lại → buổi do mình dạy; 2 test. FE có màn "Lịch của tôi". |
| 4 | Người tổ chức khác không thấy dữ liệu | ✅ | Mọi truy vấn lọc `org_id`; test `listIsScopedByOrganizationAndDepartment` (Schedule) và `cannotSeeIssuesFromAnotherOrganization` (Facility). |
| 5 | Module chỉ chạy khi tổ chức bật | ✅ | `OrganizationModuleGuard` gọi Identity `/internal/orgs/{orgId}/modules` mỗi request. |
| 6 | Lớp đã đóng/hủy không xếp lịch được | ✅ | `CLASS_NOT_SCHEDULABLE`; test `rejectsCancelledClass`. |
| 7 | Phòng hỏng/thiết bị hỏng không được gợi ý | ✅ | `roomSuggestions` loại phòng không `active`, `brokenEquipmentCount > 0`, phòng đã kín lịch; test `roomSuggestionsExcludeUnusableRooms`. |
| 8 | Màn hình lịch học + phòng/thiết bị theo quyền & module | ✅ | 3 trang FE, menu/route ẩn theo permission; lỗi module hiển thị câu riêng. |

### Chưa triển khai (đúng như prompt — "CHƯA CHỐT")

- Duyệt lịch (`schedule.approve`): chỉ có cờ `schedule.approval.enabled=false` + TODO.
- Đặt phòng ngoài lịch: chỉ có cờ `schedule.outside-room-booking.enabled=false` + TODO.

---

## 5. Kiểm thử & build

| Hạng mục | Kết quả |
|---|---|
| `ScheduleService` test | 9/9 pass |
| `FacilityService` test | 5/5 pass |
| `PeopleService` test | 150/150 pass |
| `IdentityService` test | 5/5 pass |
| `APIGateway` compile | pass |
| Frontend `npm run build` (tsc + vite) | pass |
| Frontend `npm test` | 144/144 pass |
| ESLint file mới/sửa | 0 lỗi, 0 cảnh báo |

---

## 6. Điểm chưa chắc / cần lưu ý

1. **Thiếu endpoint so với mô tả ban đầu** — đã bổ sung (mục 1). Nếu muốn giữ đúng "chỉ kiểm tra
   quyền", cần xác nhận lại phạm vi.
2. **`INTERNAL_API_KEY` phải khớp giữa Identity/People/Facility/Schedule**; thiếu hoặc lệch key →
   API trả `IDENTITY_UNAVAILABLE` / 401. Đã bổ sung biến vào docker-compose nhưng cần chạy lại
   `docker compose up -d` để container nhận biến mới.
3. **Phòng ban của tài khoản cấp tổ chức**: JWT có `departmentId`; FE mặc định dùng giá trị này.
   Nếu null (OWNER hoặc nhân sự org-level), FE lấy `DEPARTMENT:<id>` trong `permissionScopes`
   hoặc tải `GET /departments` (cần `department.view`). Trường hợp hiếm: org-level, không có
   `department.view`, không có scope phòng ban → FE không chọn được phòng ban (hiện cảnh báo).
4. **Gợi ý phòng yêu cầu `schedule.create`**, kể cả khi người dùng chỉ muốn xem. Đây là chủ ý vì
   endpoint phục vụ màn tạo buổi.
5. **Múi giờ**: BE lưu `Instant` (UTC); FE hiển thị theo múi giờ trình duyệt. Khi nhập giờ, FE gửi
   `toISOString()` nên không lệch dữ liệu; chỉ khác cách hiển thị nếu người dùng khác múi giờ.
6. **Route gateway mới** dùng `StripPrefix=1` để `/api/departments/...` khớp controller gốc
   `/departments/...`. Nếu triển khai sau reverse proxy có rewrite `/api` khác, cần rà lại.
7. **`schedule.self_view`** đã được cấp cho vai trò sinh viên từ migration 24; tài khoản giáo viên
   cần có quyền này (hoặc `schedule.view`) để thấy mục "Lịch của tôi".
