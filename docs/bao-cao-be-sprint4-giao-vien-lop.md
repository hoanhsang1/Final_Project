# Báo cáo BE — Sprint 4 (giáo viên & lớp) — **v2**

| | |
|---|---|
| **Người nhận** | Sang (Backend) |
| **Người gửi** | FE (Sprint 4) |
| **Ngày** | 12/11/2026 |
| **Thay thế** | Bản 11/11 (`v1`) — viết trên bản local **lùi 33 commit**, nên phần lớn nội dung "BE chưa làm" đã sai |
| **Đối chiếu với** | `main @ 2d5851f` (09/11/2026 21:15) — commit `feat(sprint4): add teacher profiles and class lifecycle workflows` |

> **Đọc 30 giây:** Sprint 4 BE **đã xong trên main**. Bản v1 của tôi sai vì repo local
> đang ở nhánh `nghia/fe-owner-console @ e924217` (30/10), cách main 33 commit. Báo cáo này
> chỉ còn **6 điểm lệch hợp đồng** (dòng 1–6) **+ 1 câu hỏi** về module code (dòng 7), không
> điểm nào chặn release: FE đã tự thích ứng được 5/6 điểm, phần còn lại chỉ là chất lượng hiển thị.

---

## 0. Tóm tắt

| # | Việc | Mức | FE xử lý được một mình? |
|---|---|---|---|
| 1 | `status-logs` trả `changedAt`/`changedBy` thay vì `at`/`actorId` | P1 | ✅ đã thích ứng, nhưng thiếu `actorName` |
| 2 | `close-events` trả `createdAt`, không có `actorName`, `note` nằm lẫn trong `reason` | P1 | ✅ một phần — người thực hiện đang hiện UUID |
| 3 | `history` của giáo viên không có `actorName` | P2 | ✅ hiện `actorUserId` |
| 4 | `assignable` không trả `teachingStatus` | P2 | ✅ mặc định `DANG_DAY` (đúng luật §6.3) |
| 5 | `SchoolClassResponse` thiếu `cancelReason`/`closeRequestNote`/`closeRejectReason` | P2 | ✅ ẩn, dữ liệu vẫn có ở 2 tab |
| 6 | `TeacherDetailResponse` thiếu `classCount`/`noClass`/`classLabel` | P3 | ✅ tự tính từ `classes.length` |
| 7 | Module code không thống nhất (`STUDENT_MANAGEMENT` cho lớp, teacher không check gì) | P2 | ❌ cần chốt |

**2 câu hỏi cần trả lời** ở mục 5. Không có blocker — FE đang chạy được với BE hiện tại.

---

## 1. Hiện trạng main (đã kiểm tra, không phải phỏng đoán)

Commit `2d5851f`, 90 file:

| Hạng mục | Đã có trên main |
|---|---|
| Controller | `TeacherController` (`/teachers`), `SpecialtyController` (`/specialties`), `SchoolClassController` (`/classes`), `StudentController` |
| DTO | `TeacherListItem`, `TeacherDetailResponse`, `TeacherAssignableItem`, `TeacherCreateRequest`, `TeacherUpdateRequest`, `TeacherProfileRequest`, `CreatedTeacherResponse`, `SchoolClassResponse`, `ClassCancelRequest`, `ClassCloseRequest`, `ClassCloseRejectRequest`, `ClassReopenRequest`, `ClassTeacherAssignRequest`, `ClassTeacherInfo`, `ClassMismatch`, `ClassStatusLogResponse`, `ClassCloseEventResponse` |
| Service | `TeacherService`, `SpecialtyService`, `SchoolClassService`, `ClassStatusService`, `TextNormalizer` |
| Quyền | 9 mã `CLASS_*` trong `14_identity_sprint4_permissions.sql` + `PermissionCatalog` + `PermissionCatalogTest` |
| Module | `OrganizationModuleGuard` + `IdentityClient.activeModules` → `400 MODULE_NOT_ENABLED` |
| DB | `11_people_student_class.sql` (`student`, `school_class`, `class_student`), `13_people_sprint4.sql` (`staff_profile`, `teacher_profile`, `teacher_specialty`, `specialty`, `subject`, `class_status_log`, `class_close_event`, `position_seed`), `14_…permissions`, `15_sprint4_sample.sql` |
| Seed | Đủ 6 tài khoản `sample_owner/hr/academic/head/teacher/teacher2`, org demo `11111111-…`, mật khẩu `Sample@123456` |
| Test | `TeacherServiceTest`, `ClassLifecycleTest`, `ClassTeacherAssignmentTest`, `PermissionEnforcementTest`, `ClassLifecyclePermissionTest`, `TeacherRepositoryTest`, `StaffProfileRepositoryTest`, `SchoolClassRepositoryTest`, `DefaultPositionSeederTest`, `TeacherRequestValidationTest` |
| Tài liệu | `docs/sprint4-api.md`, `sprint4-fe-handoff.md`, `sprint4-ac-matrix.md`, `sprint4-migration.md`, `sprint4-manual-scenario.http` |
| Gateway | `/api/teachers|specialties|classes/**` → PeopleService + `StripPrefix=1`; alias không `/api` cũng còn |

Hai câu blocker của bản v1 đã được trả lời ngay trong code:

- **`class` ở đâu?** → `school_class` trong **`mems_people_db`** (không phải ScheduleService). Gateway `/api/classes/**` → PeopleService, `StripPrefix=1`. FE không phải đổi gì.
- **`SPECIALTY_MISMATCH` so với gì?** → bảng `subject` (`school_class.subject_id` ↔ `subject.specialty_id`) và `teacher_specialty`. Không so chuỗi.

Cũng vì thế mà **không cần** `10_…`/`11_…` như bản v1 đề nghị — Sang đã dùng số `13`/`14`/`15`, đúng thứ tự sau `12_people_member_username.sql`.

---

## 2. FE đã tự thích ứng gì (không cần Sang làm gì)

Sửa trong `frontend/src/features/sprint4/sprint4Api.ts` + `types.ts`:

| Chỗ | Cách FE xử lý |
|---|---|
| `status-logs` | `at = at ?? changedAt ?? createdAt`, `actorId = actorId ?? changedBy` |
| `close-events` | `at = at ?? createdAt ?? changedAt`, `actorId = actorId ?? changedBy` |
| `assignable` | `teachingStatus ?? 'DANG_DAY'` (đúng luật: chỉ `DANG_DAY` mới vào danh sách này) |
| `teacher detail` | `classCount = classCount ?? classes.length`, `noClass`, `classLabel` suy ra |
| `class detail` | 3 field lý do render có điều kiện — thiếu thì ẩn, không vỡ |

Nghĩa là nếu Sang **không sửa gì**, FE vẫn demo được toàn bộ Sprint 4. Ba việc dưới đây chỉ để
màn hình đúng như đặc tả.

---

## 3. Ba việc nên sửa (P1/P2)

### 3.1. Trả `actorName` cho 2 tab lịch sử + tab Lịch sử giáo viên

Hiện DTO chỉ có id:

```java
// ClassStatusLogResponse
new ClassStatusLogResponse(id, classId, fromStatus, toStatus, reason, changedBy, changedAt)
// ClassCloseEventResponse
new ClassCloseEventResponse(id, classId, action, actorId, reason, createdAt)
// TeacherHistoryResponse
new TeacherHistoryResponse(id, action, actorUserId, createdAt, details)
```

FE đang hiện **UUID** ở cột "Người thực hiện" — đúng dữ liệu nhưng người dùng không đọc được.

**Đề nghị (chọn 1):**

- **A (rẻ nhất):** 3 DTO thêm `String actorName`; lúc map, join `staff_profile.full_name`
  theo `(user_id, org_id)`. Không join được thì trả `null` (đừng trả chuỗi rỗng).
- **B:** thêm endpoint `POST /internal/people/names` nhận `{userIds:[…]}`, trả
  `{userId: fullName}` để FE tự map. Không khuyến khích — thêm 1 vòng gọi cho mỗi tab.

FE đã sẵn sàng: `record.actorName || record.actorId` → có `actorName` là hiện tên ngay,
không cần sửa FE.

Kèm theo: `TeacherHistoryResponse.details` đang là `Object`. Cần đảm bảo nó serialize thành
`{ "specialtyIds": { "before": [...], "after": [...] } }` — nếu đang lưu chuỗi JSON trong
`people_audit_log.details` thì parse ra trước khi trả, đừng trả string.

### 3.2. Tách `note` (yêu cầu đóng) khỏi `reason` (từ chối / mở lại)

Hiện `class_close_event` chỉ có cột `reason`, và `requestClose` ghi `note` vào đó:

```java
String note = request.note() == null || request.note().isBlank() ? null : request.note().trim();
repository.insertCloseEvent(classId, orgId, "REQUESTED", actor.userId(), note);
```

Hệ quả: tab "Sự kiện đóng" không phân biệt được "ghi chú khi gửi yêu cầu" và "lý do từ chối".
FE đang gộp 1 cột "Lý do/Ghi chú" nên **không sai**, chỉ thiếu ngữ cảnh.

**Đề nghị:** thêm `note VARCHAR(1000) NULL` vào `class_close_event` + `note` vào
`ClassCloseEventResponse`; `reason` giữ nguyên cho `REJECTED`/`REOPENED`. Migration idempotent
theo đúng style `13_people_sprint4.sql`:

```sql
CALL mems_s4_add_col('class_close_event', 'note', 'VARCHAR(1000) NULL');
UPDATE class_close_event SET note = reason, reason = NULL WHERE action = 'REQUESTED' AND note IS NULL;
```

Nếu không muốn sửa DB: chỉ cần thêm `note` vào response và **copy** từ `reason` khi
`action='REQUESTED'`, để FE tách cột được.

### 3.3. `SchoolClassResponse` thiếu 3 field lý do (đặc tả §6.2)

Đặc tả yêu cầu `cancelReason`, `closeRequestNote`, `closeRejectReason` trong chi tiết lớp.
DB không có cột nào trong 3 cái này (kiểm tra `13_people_sprint4.sql`: chỉ `add_col` cho
`teacher_id`, `start_date`, `end_date`, `subject_id`, `version`, `close_state`).

Dữ liệu **vẫn còn**, chỉ nằm ở 2 bảng log:

| Field đặc tả | Nguồn thật |
|---|---|
| `cancelReason` | `class_status_log.reason` của dòng gần nhất có `to_status='DA_HUY'` |
| `closeRequestNote` | `class_close_event.reason` của `REQUESTED` mới nhất (sau khi làm 3.2 thì là `note`) |
| `closeRejectReason` | `class_close_event.reason` của `REJECTED` mới nhất |

**Đề nghị:** derive lúc đọc `GET /classes/{id}` (1 query con, không cần thêm cột). Nếu thấy
nặng thì để nguyên — FE đã ẩn, người dùng vẫn xem được ở tab tương ứng, chỉ là tab "Thông tin"
không có dòng lý do.

---

## 4. Ba việc nhỏ còn lại (P2/P3, tuỳ Sang)

| # | Hiện tại | Đề nghị | FE có cần sửa? |
|---|---|---|---|
| 4.1 | `TeacherAssignableItem(userId, staffCode, fullName, specialties, classCount)` | thêm `teachingStatus` | Không (đang mặc định `DANG_DAY`) |
| 4.2 | `TeacherDetailResponse` không có `classCount`/`noClass`/`classLabel` (chỉ list có) | thêm 3 field cho khớp đặc tả §5 | Không (đang tự tính) |
| 4.3 | `status-logs` trả `changedAt`/`changedBy`; `close-events` trả `createdAt` | đổi tên về `at`/`actorId` như đặc tả §6.5, hoặc giữ nguyên + ghi rõ trong `docs/sprint4-api.md` | Không (đọc được cả hai) |

Riêng 4.3: tôi **không** đề nghị đổi tên nếu đang có client khác dùng (`docs/sprint4-api.md`
hiện đã ghi `changedAt/changedBy`). Giữ nguyên cũng được — chỉ cần ghi rõ trong tài liệu để
người sau không sửa FE theo đặc tả rồi thấy trắng cột.

---

## 5. Hai câu cần Sang xác nhận

1. **`actorName` (mục 3.1) làm được không?** Đây là việc duy nhất ảnh hưởng trực tiếp đến
   trải nghiệm: 3 màn hình đang hiện UUID. Nếu join `staff_profile` tốn kém ở tab lịch sử
   (tối đa 200 dòng), có thể chỉ trả `actorName` cho 20 dòng mới nhất.
2. **Module code nào là chuẩn cho lớp?** Trong code hiện tại:

   | API | Guard |
   |---|---|
   | `POST/PUT/DELETE/…/cancel/close/reopen` (lớp) | `requireModule(orgId, "STUDENT_MANAGEMENT")` |
   | `GET /classes*`, `status-logs`, `close-events` | không check |
   | `/teachers*`, `/specialties*` | **không check module** |

   Đặc tả §8.2 nói `MODULE_NOT_ENABLED` cho `teacher_management`/`class_management`. Đề nghị
   chốt: dùng `STUDENT_MANAGEMENT` (như hiện tại, vì `class` đã nằm trong module sinh viên/lớp)
   hay `CLASS_MANAGEMENT`? Sau khi chốt, FE sẽ sửa lại câu báo lỗi cho khớp
   (`MSG_*` hiện ghi "Quản lý sinh viên/lớp").

---

## 6. Những điểm FE đã kiểm tra là **khớp** (không cần làm gì)

Cho Sang khỏi mất công rà lại:

- Path + method: đúng 19 endpoint FE gọi, kể cả alias `/api/*` + `StripPrefix=1`.
- `PUT /classes/{id}/teacher` body `{teacherId, version}`; `cancel` `{reason, version}`.
- 4 API đóng/mở lại **không** nhận `version` — đúng như FE đang gửi.
- `POST /api/teachers` body khớp `TeacherCreateRequest`: FE gửi `role: "STAFF"`, `teacherProfile.specialtyIds`, `teacherProfile.contractType`.
- `TeacherUpdateRequest` bắt buộc `specialtyIds` ≥ 1 + `version`; FE gửi đủ.
- `409 SPECIALTY_MISMATCH` trả `classes: [{id, name}]` — đúng field FE đọc (`response.data.classes`).
- Mã lỗi: `SELF_APPROVAL_NOT_ALLOWED`, `CLASS_NOT_CANCELLABLE`, `CLASS_NOT_CLOSABLE`, `CLOSE_STATE_CHANGED`, `STATUS_CHANGED`, `TEACHER_NOT_AVAILABLE`, `TEACHER_ASSIGNMENT_MODULE_ACTIVE` — FE có câu tiếng Việt cho từng mã.
- `GET /classes?selectable=true`, `GET /classes?status=…` nhận 4 giá trị mới.
- Seed 6 tài khoản + org demo đã đủ để test 5 kịch bản quyền.

---

## 7. Checklist nghiệm thu nhanh (đã cập nhật theo code main)

Không cần chạy lại toàn bộ checklist v1. Chỉ 6 dòng này:

- [ ] `GET /api/classes/{id}/status-logs` với 1 lớp vừa huỷ → mỗi dòng có `changedBy`, và
      (sau 3.1) `actorName`.
- [ ] `GET /api/classes/{id}/close-events` → có `REQUESTED` với `note` riêng (sau 3.2),
      `REJECTED` với `reason`.
- [ ] `GET /api/teachers/{id}` → `history[].actorName` có giá trị, `details.specialtyIds`
      là mảng (không phải string).
- [ ] `GET /api/teachers/assignable` → `items[].teachingStatus` (sau 4.1).
- [ ] `GET /api/classes/{id}` → 3 field lý do (sau 3.3) hoặc xác nhận "không làm".
- [ ] `PUT /api/classes/{id}/teacher` khi org bật `teacher_assignment` → `409 TEACHER_ASSIGNMENT_MODULE_ACTIVE`.

---

## 8. Ghi chú môi trường (để Sang hiểu vì sao bản v1 sai)

- Repo local đang ở `nghia/fe-owner-console @ e924217` (30/10), **2 ahead / 33 behind** `main`;
  `.git/index` cũng từ 30/10 → toàn bộ FE Sprint 4 đang là thay đổi chưa commit.
- Vì vậy bản local **không có** `TeacherController`, `SpecialtyController`, `13…15_*.sql`,
  `docs/sprint4-api.md` — dẫn đến bản v1 kết luận "BE chưa làm gì".
- Máy này **không có `git`** trong PATH và không có `git.exe` trên ổ C:/D: → tôi đối chiếu
  bằng GitHub API (`/repos/.../commits`, `/contents`, `/compare`) thay vì `git log`.
- Đề nghị: sau khi Sang merge xong, kéo main về máy FE rồi mới commit phần Sprint 4 FE
  (đừng commit đè lên cây cũ 30/10).

---

*Hết bản v2. Hai câu ở mục 5 trả lời xong là tôi đóng Sprint 4 phía FE.*
