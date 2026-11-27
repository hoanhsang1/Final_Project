# P4 — Xếp lịch tự động Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bàn giao luồng xếp lịch tự động khả dụng: nháp (`dryRun`) → xem trước → xác nhận ghi `session`, đúng các quyết định nghiệp vụ đã chốt 27/11.

**Architecture:** FE Astryx hiện tại tự dựng màn `/dao-tao/tu-dong-xep-lich` và gọi `POST /api/departments/{departmentId}/schedules/auto-generate?dryRun=...`. Backend mở rộng skeleton `ScheduleService` bằng JdbcTemplate + RestTemplate gọi internal API của PeopleService/FacilityService, thuật toán greedy có kiểm tra xung đột cứng; `dryRun=true` không ghi DB, `dryRun=false` kiểm tra lại rồi INSERT. Gateway thêm route. Không copy nguyên ref, không migration mới.

**Tech Stack:** React + TypeScript + Vitest + Astryx + TanStack Query (FE); Spring Boot 3.1.8 / Java 17 / JdbcTemplate / RestTemplate (BE); MySQL schema hiện có.

**Spec:** `docs/scope-can-chot-xep-lich.md` §3.3 (quyết định chốt 27/11) + `docs/trang-thai-hien-tai-2026-11-26.md` §5.

> **Cập nhật sau khi chạy thật 27/11:** user nới constraint “không chạy DB/E2E”; JDK/MySQL portable
> đã được dùng để build 5 service, chạy smoke `dryRun`/confirm thật và chụp FE qua Playwright.
> Các dòng “không có JDK”, “không build/smoke” bên dưới là snapshot lúc lập plan, không còn đúng
> với trạng thái hiện tại — đối chiếu `docs/trang-thai-hien-tai-2026-11-26.md` §3/§5.

## Global Constraints

- HEAD `5a4a286`; **không commit/push/merge**; staged rỗng; 0 file bị xoá (`D`).
- Không sửa `07_people_department_access.sql`; không lấy migration `53_people_subject_category.sql` (DRAFT ONLY); không chạy DB/E2E.
- Không đụng worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell` (chỉ đọc).
- FE giữ Astryx; không thêm Tailwind/shadcn/antd; không đổi build/lint/CI; không thêm thư viện.
- Không dùng từ “VIP”; chỉ Gói chuẩn / Gói doanh nghiệp (Enterprise).
- Máy **không có JDK/Maven** → BE chỉ review bằng mắt + diff, không build/smoke; phải báo cáo rõ.
- Error code FE/BE luôn là chuỗi; giữ `VALIDATION_ERROR`, `MODULE_NOT_ENABLED`, `FORBIDDEN`, `TEACHER_SCHEDULE_CONFLICT`, `ROOM_SCHEDULE_CONFLICT`, `CLASS_SCHEDULE_CONFLICT`, `ROOM_NOT_AVAILABLE`, `ROOM_TYPE_MISMATCH`, `CONFLICT`.

## Review Focus

| Input / failure mode | Hành vi kỳ vọng | Test/kiểm chứng |
|---|---|---|
| `dryRun` gửi nháp | Không có INSERT vào `session`; FE hiện bảng xem trước, chưa hiện “Đã xếp xong” | FE test mock `dryRun=true` + BE code review không gọi `jdbc.update` ở nhánh dryRun |
| Xác nhận sau khi có người khác đặt phòng | BE kiểm tra xung đột lần cuối, trả `ROOM_SCHEDULE_CONFLICT` thay vì ghi trùng | BE review query conflict trước INSERT |
| Slot 90’ nhưng `session_minutes=45` | Hợp lệ (2 tiết liền); slot 60’ hoặc có khoảng trống giữa các slot bị từ chối | Unit test pure helper `isContiguous45Slots` (FE) + BE validation |
| Thiếu giáo viên/phòng/ngày | Đưa vào `unscheduled` kèm lý do tiếng Việt, không tạo lịch giả | FE test render danh sách unscheduled |
| Người có `schedule.view` nhưng không `schedule.create` | Không thấy mục menu, không bấm được nút tạo nháp/xác nhận | FE test menu + page permission |

---

### Task 1: Hợp đồng backend auto-generate + dryRun

**Files:**
- Create: `backend/ScheduleService/src/main/java/com/mems/dto/AutoScheduleRequest.java`, `AutoScheduleResult.java`, `client/*.java`, `time/SchoolClock.java`, `security/OrganizationModuleGuard.java`, `service/AutoScheduleService.java`, `controller/AutoScheduleController.java`
- Modify: `backend/ScheduleService/src/main/java/com/mems/security/Actor.java`, `backend/ScheduleService/src/main/resources/application.properties`, `backend/APIGateway/src/main/resources/application.yml`
- Test: không chạy được (thiếu JDK) — review code thuần tĩnh.

**Interfaces:**
- Consumes: `PeopleService /internal/classes/{id}?orgId=`, `/internal/classes/{id}/subjects?orgId=`, `/internal/teachers/eligible?orgId=&subjectId=`; `FacilityService /internal/rooms?orgId=` (Task 2); Identity `/internal/orgs/{orgId}/modules`.
- Produces: `POST /api/departments/{departmentId}/schedules/auto-generate?dryRun={boolean}` → `{ scheduled, unscheduled, summary }` với `ScheduleResponse` hiện có (id `"PREVIEW-<n>"` khi dryRun).

- [ ] **Step 1: DTO + client + clock**

  Tạo `AutoScheduleRequest(classIds, dateFrom, dateTo, slots, sessionDays, sessionsPerWeek?, sessionMinutes?)` với nested `TimeSlot(startTime, endTime)` (hai field cuối là override khi FE chọn nguồn “Nhập tay”, xem §3.3); `AutoScheduleResult(scheduled, unscheduled, summary)` với nested `UnscheduledItem(classId, className, subjectName, reason)` và `Summary(totalRequested, scheduled, unscheduled)`. Tạo `ClassInfo`, `ClassSubjectInfo` (thêm `stageNo`, `sessionsPerWeek` từ Task 2 nhưng dùng giá trị mặc định khi JSON thiếu), `EligibleTeacherInfo`, `RoomInfo` (có `roomType`, `brokenEquipmentCount`). `PeopleClient`/`FacilityClient` dùng `RestTemplateBuilder` + `X-Internal-Api-Key`, timeout 3s/5s; `SchoolClock` dùng `${app.timezone:Asia/Ho_Chi_Minh}`.

- [ ] **Step 2: Permission + module guard**

  Thêm `Actor.requireAnyPermissionIn(Set<String>, departmentId)`: chấp nhận `owner()` hoặc bất kỳ alias `{schedule.create, SCHEDULE_CREATE}` trong claim `permissions` của JWT, đồng thời `requireDepartment(departmentId)`. `OrganizationModuleGuard.requireModuleForWrite(orgId, "SCHEDULE_MANAGEMENT")` gọi Identity internal API như implementation trong `origin/feature/auto-schedule-room-type`.

- [ ] **Step 3: Thuật toán greedy + dryRun**

  `AutoScheduleService.generate(orgId, departmentId, request, dryRun)`:
  1. Với mỗi classId: lấy `ClassInfo`; bỏ lớp `DA_HUY`/`DA_KET_THUC`; lấy `classSubjects`, fallback môn chính từ `ClassInfo`. Kiểm tra S6: nếu không có môn/giáo viên/phòng/slots/ngày hợp lệ → đưa vào `unscheduled` với lý do cụ thể.
  2. S2: intersect `[dateFrom,dateTo]` với `[class.startDate,class.endDate]` (null → giữ khoảng request).
  3. D8/D9: số buổi/tuần = `sessionsPerWeek` (default 2); sort theo `stageNo` rồi số giáo viên ít nhất.
  4. D1: giáo viên lấy từ `PeopleClient.eligibleTeachers` (nguồn duy nhất); nếu `classSubject.teacherId` có thì ưu tiên giáo viên đó nhưng vẫn phải nằm trong danh sách eligible; nếu không → `unscheduled`.
  5. D10/D11: mỗi slot phải có `duration % 45 == 0` và `duration >= sessionMinutes`; nếu cần ghép nhiều slot thì chỉ ghép khi `prev.end == next.start` (không qua giờ nghỉ), cùng ngày; dùng `SchoolClock.toInstant`.
  6. S3: sức chứa yêu cầu = `MAX(COALESCE(max_size,0), studentCount)` — schema hiện tại không có `max_size`; dùng `studentCount` nếu truy vấn cột đó thất bại.
  7. S7: phòng lấy `facility.roomsOfOrg(orgId)` (org-wide), lọc `status=active`, `brokenEquipmentCount=0`, `capacity >= sức chứa`, ưu tiên `classroom` trước `computer_room`; kiểm tra xung đột phòng trên toàn tổ chức.
  8. Với mỗi candidate & ngày & slot & giáo viên & phòng: kiểm tra冲突 bằng `SELECT COUNT(*)` trên `session` (teacher/room/class, `status='scheduled'`, `deleted_at IS NULL`, khoảng `[start,end)` giao nhau). Nếu `dryRun=true`: thêm vào danh sách preview (id `PREVIEW-n`, **không INSERT**), cập nhật bộ đếm trong bộ nhớ để các buổi sau không trùng nhau. Nếu `dryRun=false`: kiểm tra conflict lần cuối rồi `INSERT INTO session(...)` với UUID, `teacher_name`, `room_code`, `subject_name`, `department_id`, status `scheduled`. Lỗi conflict → thử giáo viên/phòng khác; hết candidate → reason tiếng Việt.
  9. Trả `AutoScheduleResult` + summary; `totalRequested` = số lớp yêu cầu (khớp contract ref).

- [ ] **Step 4: Controller + gateway + config**

  `@PostMapping("/auto-generate")` nhận `@RequestParam(defaultValue="true") boolean dryRun`, gọi module guard + permission rồi service. Thêm route `${SCHEDULE_SERVICE_URL:http://localhost:8083}` / `Path=/api/departments/*/schedules/**`, `StripPrefix=1` vào gateway (nếu route schedule đã có thì chỉ bổ sung env). Thêm `app.timezone`, `people.service.url`, `facility.service.url`, `internal.api.key` vào `application.properties` với default localhost.

- [ ] **Step 5: Verify tĩnh**

  Chạy `git diff --check`; đọc lại toàn bộ file mới để đảm bảo không reference class không tồn tại, không dùng `ErrorCode` (dùng `ApiException` hiện có), import đúng. Ghi rõ “không build do thiếu JDK”.

---

### Task 2: Internal room + thông tin môn cho ScheduleService

**Files:**
- Create: `backend/FacilityService/src/main/java/com/mems/controller/InternalRoomController.java`, `backend/FacilityService/src/main/java/com/mems/dto/InternalRoomResponse.java`, `backend/FacilityService/src/main/java/com/mems/security/InternalApiFilter.java`
- Modify: `backend/FacilityService/src/main/java/com/mems/security/SecurityConfig.java`, `backend/PeopleService/src/main/java/com/mems/dto/ClassSubjectResponse.java`, `backend/PeopleService/src/main/java/com/mems/repository/ClassSubjectRepository.java`

**Interfaces:**
- Consumes: bảng `classroom`, `equipment`; bảng `class_subject`, `curriculum_subject`, `school_class`.
- Produces: `GET /internal/rooms?orgId=&departmentId?` → `List<InternalRoomResponse(id, code, name, capacity, status, departmentId, brokenEquipmentCount, roomType)>`; `ClassSubjectResponse` có thêm `stageNo`, `sessionsPerWeek`.

- [ ] **Step 1: Facility internal rooms**

  `InternalRoomController` dùng `JdbcTemplate` truy vấn `classroom` theo `org_id`, `deleted_at IS NULL`, `status` tuỳ ý (service lọc active), `department_id` khi có param; `brokenEquipmentCount` = `SELECT COUNT(*) FROM equipment WHERE room_id=? AND status IN ('broken','maintenance') AND deleted_at IS NULL`. `InternalApiFilter` kiểm tra header `X-Internal-Api-Key` dài ≥32 ký tự, trả 401 JSON khi sai; đăng ký filter trước `UsernamePasswordAuthenticationFilter` và cho phép `/internal/**` trong `SecurityConfig` (giữ các route công khai cũ).

- [ ] **Step 2: PeopleService stageNo/sessionsPerWeek**

  Thêm 2 field vào `ClassSubjectResponse`; trong `ClassSubjectRepository.list/getSubject` LEFT JOIN `curriculum_subject cs2 ON cs2.curriculum_id = COALESCE(cs.curriculum_id, sc.curriculum_id) AND cs2.subject_id=cs.subject_id`, lấy `stageNo = COALESCE(cs2.sequence_no, 1)`, `sessionsPerWeek = COALESCE(cs.planned_sessions DIV ... , cs2.required_sessions, 2)`. Vì không có cột `sessions_per_week`, dùng `COALESCE(CAST(cs.planned_sessions/4 AS SIGNED), cs2.required_sessions, 2)` (4 tuần mẫu) và ghi comment rõ đây là default theo D8. Cập nhật `mapSubject` đúng thứ tự constructor. Không đổi API public khác.

- [ ] **Step 3: Verify tĩnh**

  `git diff --check`; đảm bảo không constructor `ClassSubjectResponse` nào khác bị sót; không đụng `07_people_department_access.sql`.

---

### Task 3: FE API + messages + pure helpers

**Files:**
- Create: `frontend/src/features/schedule/autoScheduleApi.ts`, `frontend/src/features/schedule/autoScheduleMessages.ts`, `frontend/src/features/schedule/autoScheduleHelpers.ts`, `frontend/src/features/schedule/autoScheduleApi.test.ts`
- Modify: `frontend/src/features/schedule/scheduleMessages.ts` (nếu cần thêm 1 câu lỗi chung)

**Interfaces:**
- Consumes: `apiClient`, `getApiCode`, `ScheduleApiError`, `scheduleErrorMessage` từ `scheduleApi.ts`.
- Produces: `generateAutoSchedule(departmentId, payload, dryRun)`; `AutoSchedulePayload`, `AutoScheduleResult`, `AutoScheduleUnscheduled`, `PreviewSession`; helpers `classOptionLabel`, `DAYS_OPTIONS`, `isContiguous45Slots`.

- [ ] **Step 1: Viết test trước**

  `autoScheduleApi.test.ts`: mock `apiClient.post`, kiểm tra (a) `dryRun=true` gọi đúng URL `/api/departments/d1/schedules/auto-generate?dryRun=true`; (b) `dryRun=false` gọi `?dryRun=false`; (c) lỗi 409 `ROOM_SCHEDULE_CONFLICT` được map sang câu tiếng Việt. `autoScheduleHelpers.test.ts`: `isContiguous45Slots([{start:'07:30',end:'08:15'},{start:'08:15',end:'09:00'}]) === true`; slot 60’ → false; slot có gap → false.

- [ ] **Step 2: Implement API + helpers**

  Dùng `request()` nội bộ hoặc export wrapper riêng nhưng vẫn đi qua `scheduleErrorMessage`; đổi `fetchRoomSuggestions` để gửi thêm `classId` tùy chọn (S7 đã chốt) — giữ tương thích cũ khi không truyền. Messages mới: tiêu đề, nhãn nguồn, ngày học, số buổi/tuần, số phút/buổi, nút “Tạo nháp lịch”, “Xác nhận xếp lịch”, bảng xem trước, trạng thái unscheduled. Không còn chữ “Cần xác nhận”.

- [ ] **Step 3: Chạy test FE**

  `npx vitest run src/features/schedule` trong `frontend` → PASS.

---

### Task 4: Màn AutoSchedulePage + menu + route

**Files:**
- Create: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.tsx`, `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx`
- Modify: `frontend/src/features/sprint4/academicMenu.ts`, `frontend/src/router.tsx`, `frontend/src/pages/SchedulePage/SchedulePage.tsx`

**Interfaces:**
- Consumes: Task 3 API/helpers; `fetchClasses` từ `sprint4Api`; `useAuthStore`; `useNotify`.
- Produces: route `/dao-tao/tu-dong-xep-lich`, menu key `tu-dong-xep-lich`, liên kết từ `/dao-tao/lich` (giữ `departmentId`).

- [ ] **Step 1: Viết test trước**

  Test render page với mock `fetchClasses` + mock `generateAutoSchedule`: (a) không có `schedule.create` → ForbiddenNotice, không gọi API; (b) bấm “Tạo nháp lịch” → gọi `dryRun=true`, hiện bảng preview, **không** hiện “Đã xếp xong”; (c) bấm “Xác nhận xếp lịch” → gọi `dryRun=false`, hiện thông báo thành công; (d) unscheduled hiển thị lý do; (e) lỗi 409 hiển thị câu từ `scheduleErrorMessage`. Test menu: có `schedule.create` → có item; chỉ `schedule.view` → không có item. Test router: route trả component (pattern hiện có trong `router.test.tsx`).

- [ ] **Step 2: Implement page**

  Giữ cấu trúc shell (SegmentedControl 2 nguồn, DateRangeInput, CheckboxList ngày học, NumberInput khi nhập tay, Switch auto mặc định bật) nhưng mở nút submit. Trường “ngày học” map `mon..sun` → `1..7`; slot mặc định 45 phút do BE/FE gợi ý (`07:30–08:15`, `08:15–09:00`, …), có thể chỉnh giờ bắt đầu/kết thúc. Form validate: phải chọn lớp, khoảng ngày, ít nhất 1 ngày, ít nhất 1 slot; `auto=true` (S1). Dùng `useMutation` cho dryRun/confirm; sau confirm `invalidateQueries(['schedules', departmentId])`. PageHeader có breadcrumb về `/dao-tao/lich?departmentId=...`.

- [ ] **Step 3: Menu + route + liên kết**

  Thêm item `tu-dong-xep-lich` vào `getAcademicMenu` (điều kiện `isOwner || hasAnyPermissionWithAliases(permissions,['schedule.create'])`) và `activeAcademicMenuKey` (kiểm tra trước `lich`). Append route lazy dưới `/dao-tao`. Trên `SchedulePage`, thêm `AppLink` “Tự động xếp lịch” trong `extra`/đầu trang, giữ `departmentId`.

- [ ] **Step 4: Verify FE**

  `npx vitest run`, `npx tsc -b`, `npx eslint .` trong `frontend` → đều EXIT 0.

---

### Task 5: Cập nhật ledger + báo cáo

**Files:** `docs/trang-thai-hien-tai-2026-11-26.md`, `.superpowers/sdd/2026-11-26-fe-tu-be-cac-nhanh/progress.md`

- [ ] Ghi kết quả verify (số test, tsc/eslint), trạng thái BE “chưa build do thiếu JDK”, snapshot `git status` (HEAD/staged/deleted), và các ruling mới (S7=main+room-type, dryRun preview, không migration 53). Không commit.
