# MEMS – Báo cáo Review cuối WP1 & Cổng triển khai Backend

> **Ngày review:** 2026-11-20
> **Vai trò:** Senior Backend Architect & Technical Reviewer
> **Phạm vi:** Business Requirements → Database/Migration → API Contract → Backend Architecture
> **Tính chất:** Review tĩnh, không sửa source, không chạy migration, không kết nối MySQL.
> **Trạng thái cổng:** **BLOCKED** — còn 1 BLOCKER và 7 MAJOR (chi tiết mục 7).
> Cổng này **không phải** `MIGRATION APPROVED`; migration 51/52 vẫn cần xác minh staging độc lập và sự cho phép của người dùng.

---

## 1. Git branch, HEAD, working tree

| Mục | Giá trị thực tế (đã kiểm bằng `git rev-parse`/`git status`) |
|---|---|
| Branch hiện tại | `fixFlowCreateEmployee` |
| HEAD | `be2b049d3dd00830244d7019d6c0797316667ddf` |
| So với mốc tham chiếu `be2b049d…` | **Trùng khớp** |
| Commit gần nhất | `be2b049 fix flox class managment` |

**Working tree có thay đổi chưa commit (không được chạm vào):**

```
 M frontend/src/app/app.tsx
 M frontend/src/features/academic/api.ts
 M frontend/src/features/academic/hooks.ts
 M frontend/src/features/academic/types.ts
 M frontend/src/lib/nav.ts
 M frontend/src/lib/permissions.ts
 M frontend/src/services/mock/adapter.ts
 M frontend/src/services/mock/fixtures.ts
?? frontend/src/features/academic/pages/curricula-page.tsx
?? frontend/src/features/academic/pages/curriculum-detail-page.tsx
```

Đây là công việc Frontend dở dang của người dùng. Trong suốt quá trình review **không** reset, checkout, stash, commit, push hay sửa bất kỳ file nào trong danh sách trên. Báo cáo chỉ đọc để đối chiếu hợp đồng.

> Ghi chú: HEAD doc `api-contract.md` §4.7 còn ghi mốc `bfa9b53`; HEAD thực tế đã tiến tới `be2b049`. Chênh lệch này chỉ là ghi chú tài liệu (xem F-LOW-02), không ảnh hưởng logic.

---

## 2. Danh sách tài liệu/source đã review

### 2.1. Tài liệu nghiệp vụ & thiết kế

| Nhóm | File |
|---|---|
| Yêu cầu nghiệp vụ | `docs/phase-1/subject-business-requirements.md` |
| Thiết kế Curriculum | `docs/phase-1/curriculum-business-design.md` |
| Thiết kế Teacher Subject | `docs/phase-1/teacher-subject-design.md` |
| Ma trận phân quyền | `docs/phase-1/role-permission-matrix.md` |
| Validation & mã lỗi | `docs/phase-1/validation-and-error-cases.md` |
| Hợp đồng API | `docs/phase-1/api-contract.md` |
| Kế hoạch UI | `docs/phase-1/frontend-ui-plan.md` |
| Test cases | `docs/phase-1/test-cases.md` |
| Lộ trình | `docs/phase-1/implementation-roadmap.md` |

### 2.2. Tài liệu Database/Migration

| File | Nội dung đã đọc |
|---|---|
| `docs/phase-1/database-schema.md` | §3.3 `class_subject`, §3.3.1 `class_subject_history`, §5.3 backfill, §5.4 D-04, §6 precheck |
| `docs/phase-1/erd.md` | Quan hệ bảng, composite FK, index phục vụ FK |
| `docs/phase-1/migrations/51_people_curriculum.sql` | 7 bảng + 4 assert procedure |
| `docs/phase-1/migrations/52_people_class_subject.sql` | `class_subject` (generated `primary_class_id`), history, teacher/specialty subject, 5 assert procedure |
| `docs/phase-1/migrations/51_52_precheck.sql` | Kiểm tra schema/database/privilege |
| `docs/phase-1/migrations/51_52_precheck_data.sql` | Kiểm tra dữ liệu trước backfill |
| `docs/phase-1/migrations/51_52_postcheck.sql` | Kiểm tra sau migration |
| `docs/phase-1/migrations/ROLLBACK.md` | Thứ tự rollback, index/FK |
| `docs/phase-1/staging-validation-report.md` | Kết quả validation staging trước đó |
| `docs/phase-1/revision-4-fix-report.md` | Trạng thái F-01…F-06 |

### 2.3. Source Backend đã đọc

| File | Nội dung kiểm |
|---|---|
| `backend/PeopleService/.../exception/ErrorCode.java` | Mã lỗi hiện có, khoảng số trống, trùng tên |
| `backend/PeopleService/.../dto/ApiResponse.java` | Overload `failure` 2 và 3 tham số |
| `backend/PeopleService/.../dto/SchoolClassUpdateRequest.java` | Field hiện có của `PUT /classes/{id}` |
| `backend/PeopleService/.../controller/SubjectController.java` | Chuỗi quyền `READ`, module guard |
| `backend/PeopleService/.../controller/SchoolClassController.java` | Quyền theo endpoint lớp |
| `backend/PeopleService/.../repository/SchoolClassRepository.java` | Optimistic locking, org isolation, paging |
| `backend/PeopleService/.../service/SchoolClassService.java` | `ensureEditable`, module guard, mã lỗi version |
| `backend/PeopleService/.../security/OrganizationModuleGuard.java` | `requireModule*`, `isActive/isReadable` |
| `backend/PeopleService/.../security/*` + `PermissionInterceptor` | `@RequirePermission`, `Actor` |
| `backend/PeopleService/src/test/resources/people-test-schema.sql` | Schema H2 WP1 đã có |
| `backend/PeopleService/src/test/resources/application.properties` | `MODE=MySQL`, load schema |
| `backend/IdentityService/.../service/PermissionCatalog.java` | Catalog quyền (chưa có curriculum) |
| `backend/APIGateway/src/main/resources/application.yml` | Route gateway (chưa có `/api/curricula`) |
| `backend/PeopleService/pom.xml`, `application.properties` | JPA trên classpath nhưng không dùng |

### 2.4. Frontend đang dở dang (chỉ đọc đối chiếu, không sửa)

`frontend/src/features/academic/types.ts`, `api.ts`, `src/lib/permissions.ts`, `src/services/mock/fixtures.ts`.

---

## 3. Kết quả Business Requirements

Đối chiếu 11 điểm bắt buộc:

| # | Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | Lớp có nhiều môn | **PASS** | D-01; `class_subject` PK `(class_id, subject_id)`; `database-schema.md` §3.3 |
| 2 | Curriculum dùng chung cấp Organization | **PASS** | `curriculum.org_id`, composite FK `(curriculum_id, org_id)`; `curriculum-business-design.md` |
| 3 | Giáo viên dạy nhiều môn | **PASS** | `teacher_subject` PK `(user_id, subject_id)`; `teacher-subject-design.md` |
| 4 | `specialty_subject` ≠ `teacher_subject` | **PASS** | Mapping gợi ý vs nguồn sự thật; `teacher-subject-design.md` §2–§3 |
| 5 | Không PENDING/APPROVE/REJECT | **PASS** | CHECK 2 giá trị `APPROVED/REVOKED` (`teacher-subject-design.md:106`); không endpoint duyệt (`api-contract.md:737`) |
| 6 | Prerequisite chỉ cảnh báo | **PASS** | `api-contract.md:332`; D-07 |
| 7 | Quy tắc đổi môn theo trạng thái lớp | **PASS (thiết kế)** | D-08; `curriculum-business-design.md:390-392`; `api-contract.md:493-509` |
| 8 | Đồng bộ `school_class.subject_id` ↔ `class_subject.is_primary` | **PASS (thiết kế)**, chưa có code | D-15; UNIQUE `uq_class_subject_primary` trên generated column |
| 9 | History giữ dữ liệu cũ | **PASS một phần** | Snapshot cột cũ/mới trong `class_subject_history`; nhưng thiếu tên hiển thị (F-MAJ-05) |
| 10 | Idempotency + optimistic locking | **FAIL** | Idempotency không khả thi như đặc tả (F-BLK-01); OL thủ công đã có cho `school_class`, chưa có cho `curriculum` |
| 11 | Phân quyền theo scope + module, không chỉ role | **CONFLICT** | Mâu thuẫn quyền áp curriculum (F-MAJ-02) và quyền đọc môn (F-MAJ-03); module guard có nhưng chưa áp cho Subject |

**Kết luận mục 3:** mô hình nghiệp vụ D-01…D-15 nhìn chung nhất quán và đủ để code, trừ idempotency (BLOCKER) và các mâu thuẫn quyền/hợp đồng ở mục 7.

---

## 4. Kết quả Database/Migration

### 4.1. Nội dung đã xác nhận (tĩnh)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| Đủ 7 bảng WP1 | **PASS** | 51: `curriculum`, `curriculum_subject`, `curriculum_subject_prerequisite`; 52: `specialty_subject`, `teacher_subject`, `class_subject`, `class_subject_history` |
| Cô lập org bằng composite FK | **PASS** | `class_subject (class_id, org_id) → school_class(id, org_id)`; `curriculum_subject → curriculum(id, org_id)`; `teacher_subject → teacher_profile(user_id, org_id)` |
| UNIQUE `primary_class_id` | **PASS (MySQL)** | Generated STORED + `uq_class_subject_primary`; 52 assert kiểm kiểu/cột/generated flag |
| Backfill exact-match | **PASS** | 52 chỉ tạo dòng LEGACY khi lớp có `subject_id` và chưa có primary; không suy đoán |
| Precheck / precheck_data / postcheck | **PASS** | Đủ 3 file; assert procedures `mems_m51_*`/`mems_m52_*` dùng `SIGNAL SQLSTATE '45000'` |
| Rollback | **PASS** | `ROLLBACK.md` có thứ tự FK/index/table |
| Không auto-ALTER bảng cũ sai cấu trúc | **PASS** | Assert phát hiện lệch và dừng; `CREATE TABLE IF NOT EXISTS` không bị dùng như kiểm tra tương thích |
| F-01…F-06 (Rev 4) | **PASS (tĩnh)** | `revision-4-fix-report.md`; chưa chạy lại trên MySQL |
| H2 đủ schema WP1 | **PASS** | `people-test-schema.sql:96-238` |
| Khác biệt H2/MySQL được ghi rõ | **PASS** | Generated column → cột thường, BOOLEAN, bỏ secondary index, `uq_subject_org_code` chỉ có ở H2 |

### 4.2. Điểm chưa đóng

| # | Vấn đề | Mức |
|---|---|---|
| D-1 | D-04: `ALTER TABLE subject ADD UNIQUE (org_id, code)` vẫn **comment** trong 52 (`database-schema.md:577-580`). MySQL chưa unique → `409 SUBJECT_CODE_EXISTS` chỉ dựa pre-check ứng dụng. | MEDIUM |
| D-2 | `class_subject`/`teacher_subject` không có cột `version`; optimistic locking phải mượn `school_class.version` / `staff_profile.version` (đúng như `validation-and-error-cases.md:296-301`, nhưng cần code nhất quán). | MEDIUM |
| D-3 | H2 không lưu generated column và không enforce "tối thiểu 1 primary" — phải do transaction/service bảo đảm. | MEDIUM (đã ghi nhận) |
| D-4 | `class_subject_history` **không** có cột session/fingerprint → xem F-BLK-01. | BLOCKER |

---

## 5. Kết quả API Contract

### 5.1. Endpoint đã đối chiếu

| Nhóm | Endpoint | Trạng thái hợp đồng |
|---|---|---|
| Subject | `GET/POST/PUT/PATCH /subjects`, `check-code`, `usage` | Có; lệch quyền đọc (F-MAJ-03) |
| Curriculum | `GET/POST/PUT/PATCH /curricula`, `/subjects`, `/status` | Có; gateway chưa route (F-MED-01) |
| Teacher Subject | `GET/POST/PUT /teachers/{id}/subjects`, `GET /teachers/assignable?subjectId=` | Có, không duyệt |
| Class Subject | `GET/PUT/POST/PUT/DELETE /classes/{id}/subjects...`, `/curriculum` | Có; lệch quyền áp (F-MAJ-02) |
| Primary + History | `PUT .../subjects/primary`, `GET .../subject-history` | Có; idempotency (F-BLK-01), tên hiển thị (F-MAJ-05) |

### 5.2. Điểm phải chốt trước khi code

1. **Idempotency (F-BLK-01):** `api-contract.md:606-613` so sánh payload `(subjectId, reason, plannedSessions, sessionMinutes)` nhưng bảng history (và migration 52) không lưu 2 trường session lẫn fingerprint. Không thể phân biệt "retry cùng payload" với "cùng operationId nhưng payload khác".
2. **`PUT /classes/{id}` (F-MAJ-04):** contract bắt buộc thêm `reason`/`operationId` khi đổi `subjectId`, nhưng DTO hiện tại (`SchoolClassUpdateRequest`) không có; §8 lại khai "không đổi request/response".
3. **Mã lỗi version:** `PUT /classes/{id}` trả `STATUS_CHANGED` (2207), `assignTeacher` trả `DATA_CHANGED` (2212), §4.8 dùng `DATA_CHANGED`. Phải chốt một mã cho luồng primary change và ghi rõ có đổi hành vi endpoint cũ hay không.
4. **`REASON_TOO_LONG` (F-MAJ-01):** tài liệu đề xuất mã mới 3054 nhưng `ErrorCode.REASON_TOO_LONG` đã tồn tại ở 3018 với giới hạn 1000; enum không thể có 2 hằng trùng tên.
5. **Curriculum-subject version (F-MAJ-07):** body POST không có `version`, §3.8 nói `version` "có thể có", nhưng bảng khóa lạc quan lại yêu cầu `curriculum.version` cho thêm/sửa/xóa môn.
6. **Phân trang:** curriculum 1-based (`api-contract.md` §1.2), history 0-based (§4.9). Không sai nếu ghi rõ, nhưng dễ lỗi ở FE.
7. **HTTP status:** §4.3 xếp `CURRICULUM_NOT_FOUND` vào 400, §4.4 xếp `SUBJECT_NOT_FOUND`/`TEACHER_NOT_FOUND` vào 400 và `SUBJECT_MISMATCH` vào 400; §7 lại xếp các `*_NOT_FOUND` vào 404 và `SUBJECT_MISMATCH` vào 409 (F-MED-02/03).

---

## 6. Kết quả Backend Architecture

### 6.1. Quy ước hiện có của PeopleService

| Khía cạnh | Thực tế source | Hệ quả cho WP1 |
|---|---|---|
| Package | `com.mems.{controller,dto,repository,service,security,exception,outbox,config,client}`; **không** có `entity`, `mapper`, `impl` | Không tạo Entity/Mapper; viết SQL tay + `record` row |
| Persistence | **JdbcTemplate only**; JPA starter có trên classpath nhưng 0 `@Entity`, `ddl-auto=update` không dùng | Bám pattern `XxxRepository` + `ResultSet` map |
| Org isolation | Mọi query có `org_id=?` từ `Actor.orgId()`; JOIN lặp `org_id` | Bắt buộc cho mọi bảng WP1 |
| Soft delete | `deleted_at IS NULL` | Giữ cho `school_class`/`subject` |
| Response | Trả payload thô; `ApiResponse` chỉ dùng cho lỗi, có overload 3 tham số | Có thể trả `data` khi cần |
| Status code | 201 + `Location`, 204 cho xóa; lỗi qua `ErrorCode` | Thống nhất khi thêm endpoint |
| Bảo mật | `@PreAuthorize` + `@RequirePermission(department)` + `Actor` từ JWT | Dùng lại, không tạo cơ chế mới |
| Module guard | `OrganizationModuleGuard.requireModule*` gọi Identity | Subject/Curriculum cần áp |
| Optimistic locking | `SET version=version+1 ... WHERE version=?` + rowcount → 409; `SELECT ... FOR UPDATE` | Curriculum cần làm tương tự |
| Audit / Outbox | `PeopleAuditService`, `outbox_event` (2 event type) | Có thể tái dùng, không mở rộng ngoài phạm vi |
| Test | 15 `@JdbcTest`, Mockito service test, `@WebMvcTest` + `jwt()`; **không** `@SpringBootTest` | Viết test theo đúng 3 kiểu này |
| H2 | `people-test-schema.sql` đã có đủ bảng WP1 | Có thể code/test WP1 ngay trên H2 |

### 6.2. Khoảng trống kỹ thuật (chưa phải lỗi thiết kế)

| # | Khoảng trống | Ảnh hưởng |
|---|---|---|
| G-01 | Không có code Java nào tham chiếu bảng WP1 (`grep curriculum|class_subject|teacher_subject|specialty_subject` = 0) | Toàn bộ WP1 là code mới |
| G-02 | `PermissionCatalog` chưa có `curriculum.view/manage` | Phải seed IdentityService + gán chức danh Giáo vụ |
| G-03 | Gateway chưa có route `/api/curricula` | FE gọi sẽ 404 qua gateway |
| G-04 | Chưa có hạ tầng idempotency; `operation_id` mới chỉ là UNIQUE trong schema | Xem F-BLK-01 |
| G-05 | `class_subject`/`teacher_subject` không có `version` | Phải dùng version bảng cha |
| G-06 | `SubjectController` chưa áp module guard `STUDENT_MANAGEMENT` (D-10) | Tổ chức tắt module vẫn gọi được subject |
| G-07 | `TEACHER_ASSIGNMENT` chỉ xuất hiện trong config PeopleService, không có trong IdentityService | `isActive` luôn false; luồng gán GV cũ không bị chặn |
| G-08 | `SubjectStatusRequest` dùng key `ACTIVE_REQUIRED` không có trong `ErrorCode` | Rơi về `INVALID_KEY` |
| G-09 | Phát hiện trùng code dựa vào tên constraint (`DuplicateKeyException`) | Dễ vỡ nếu đổi tên unique index |
| G-10 | `people_audit_log.target_id` là `VARCHAR(36)` | Không lưu được target không phải UUID |
| G-11 | Hình dạng response không đồng nhất (`/subjects` trả mảng, `/classes` trả `Map`) | WP1 phải chọn theo từng endpoint như tài liệu |

---

## 7. Danh sách finding và mức độ

> Quy ước: **BLOCKER** = không thể code đúng hợp đồng; **MAJOR** = phải chốt trước khi code để tránh chọn sai; **MEDIUM** = ảnh hưởng chất lượng/đồng bộ nhưng không chặn; **LOW** = vệ sinh tài liệu.
> **Không finding nào được sửa trong vòng review này.**

### 7.1. BLOCKER

#### F-BLK-01 — Idempotency của đổi môn chính không thể thực hiện như đặc tả

| Trường | Nội dung |
|---|---|
| Vị trí | `docs/phase-1/api-contract.md:606-613`; đối chiếu `docs/phase-1/database-schema.md:347-376`; `docs/phase-1/migrations/52_people_class_subject.sql` (bảng `class_subject_history`) |
| Nguyên nhân | Hợp đồng yêu cầu so sánh "cùng `operationId` + cùng payload chuẩn hoá `(subjectId, reason, plannedSessions, sessionMinutes)`". Bảng history chỉ lưu `old/new subject`, `old_teacher_id`, `old/new source`, `reason`, `operation_id`, `changed_by`, `changed_at`; **không** lưu `planned_sessions`, `session_minutes`, cũng không có `request_fingerprint`. |
| Ảnh hưởng | Retry sau timeout: server không có dữ liệu để biết payload lần trước có giống hay khác. Nếu trả 200 vô điều kiện → che giấu xung đột; nếu trả 409 vô điều kiện → retry hợp lệ bị chặn, vi phạm D-15. Không thể viết test TC-CLS idempotency một cách xác định. |
| Đề xuất xử lý (người dùng quyết) | **A.** Thêm cột `request_fingerprint char(64)` (SHA-256 của payload chuẩn hoá) và/hoặc `planned_sessions`/`session_minutes` vào `class_subject_history`: sửa `database-schema.md`, migration 52, postcheck, H2 schema, `api-contract.md` §4.9. **B.** Thu hẹp hợp đồng: chỉ so `subjectId + reason`; retry bỏ qua session params và ghi rõ trong §4.8/validation. |
| Trạng thái | **Chưa xử lý** — chặn WP1.5 |

### 7.2. MAJOR

#### F-MAJ-01 — `REASON_TOO_LONG` trùng tên mã lỗi

| Trường | Nội dung |
|---|---|
| Vị trí | `docs/phase-1/validation-and-error-cases.md:209, 217-218, 407` đề xuất `REASON_TOO_LONG (3054)`; `backend/PeopleService/src/main/java/com/mems/exception/ErrorCode.java:142` đã có `REASON_TOO_LONG(3018, ..., "at most 1000 characters")` |
| Nguyên nhân | Enum name là khóa tra cứu; không thể khai báo hai hằng trùng tên. Giới hạn nghiệp vụ D-15 là 500, còn 3018 là 1000. |
| Ảnh hưởng | Không thể thêm mã mới theo tài liệu; nếu tái dùng 3018 thì message sai (1000 thay vì 500); nếu đổi message 3018 sẽ ảnh hưởng luồng huỷ/đóng lớp đang dùng. |
| Đề xuất | Chốt một trong hai: (a) tái dùng 3018 + đổi message thành "at most 500 characters" và rà lại mọi chỗ dùng; (b) tạo mã mới tên khác, ví dụ `PRIMARY_REASON_TOO_LONG(3054)`. Cập nhật `validation-and-error-cases.md` + test. |

#### F-MAJ-02 — Quyền áp curriculum mâu thuẫn giữa hai tài liệu

| Trường | Nội dung |
|---|---|
| Vị trí | `docs/phase-1/curriculum-business-design.md:314, 390` yêu cầu `class.edit` **và** `curriculum.view`; `docs/phase-1/role-permission-matrix.md:93, 178` và `api-contract.md` (bảng §4.1) chỉ yêu cầu `class.edit` |
| Nguyên nhân | Tài liệu thiết kế curriculum thêm điều kiện đọc curriculum; ma trận quyền chốt chỉ `class.edit`. |
| Ảnh hưởng | Người có `class.edit` nhưng không có `curriculum.view` sẽ bị 403 hay 200? Không thể viết `@PreAuthorize` đúng nếu chưa chốt; ảnh hưởng AC-RBAC. |
| Đề xuất | Chốt `class.edit` (đơn giản, khớp ma trận quyền) hoặc bắt buộc cả hai (an toàn hơn, cần nêu rõ trong §8 compat). Cập nhật đồng loạt 3 tài liệu. |

#### F-MAJ-03 — Chuỗi quyền đọc Subject rộng hơn RBAC

| Trường | Nội dung |
|---|---|
| Vị trí | `docs/phase-1/api-contract.md:63-78` (`READ` gồm `class.view`, `class.create`, `student.view`, `class.assign_teacher`, `class.teacher.reassign`); `role-permission-matrix.md:57, 105-107` chốt chỉ `subject.view` (ORGANIZATION), trưởng phòng DEPARTMENT **không** xem danh mục môn; source `SubjectController.java:21-23` đang hiện thực chuỗi rộng |
| Nguyên nhân | READ chain kế thừa từ code cũ; D-05 thu hẹp scope nhưng chưa cập nhật controller/hợp đồng. |
| Ảnh hưởng | Người có `class.view` scope DEPARTMENT đọc được toàn bộ danh mục môn của tổ chức — trái D-05; test RBAC sẽ không nhất quán. |
| Đề xuất | Chốt chuỗi READ chính thức. Nếu theo D-05: rút gọn còn `OWNER or subject.view` (và cân nhắc `subject.manage`), ghi rõ breaking change cho FE; nếu giữ chuỗi rộng: sửa RBAC + ghi lý do. |

#### F-MAJ-04 — `PUT /classes/{id}` đổi `subjectId` là thay đổi phá vỡ hợp đồng

| Trường | Nội dung |
|---|---|
| Vị trí | `docs/phase-1/api-contract.md:493-505` bắt buộc thêm `reason`, `operationId`; `api-contract.md:823` khai "Không đổi request/response"; `backend/PeopleService/.../dto/SchoolClassUpdateRequest.java:8-19` không có 2 field này; FE `ClassUpdateInput` cũng không |
| Nguyên nhân | D-15 buộc mọi thay đổi primary phải qua history, trong khi endpoint cũ vẫn nhận `subjectId`. |
| Ảnh hưởng | FE/khách hàng cũ gửi `subjectId` sẽ nhận 400; nếu để optional thì có đường ghi vòng qua history. Đồng thời mã lỗi version chưa thống nhất (`STATUS_CHANGED` 2207 vs `DATA_CHANGED` 2212). |
| Đề xuất | Chốt: (a) chỉ cho đổi `subjectId` qua endpoint mới `PUT .../subjects/primary`, còn `PUT /classes/{id}` bỏ/không cho đổi subject; hoặc (b) giữ nhưng khai báo breaking change + version bump API, và chốt mã lỗi. Sửa §4.7/§8 tương ứng. |

#### F-MAJ-05 — History thiếu tên hiển thị so với UI

| Trường | Nội dung |
|---|---|
| Vị trí | `frontend-ui-plan.md:704, 707` yêu cầu `changedByName`, `oldTeacherName`; `api-contract.md:615-649` chỉ trả `changedBy`, `oldTeacherId` và ghi "không join lại subject/staff_profile"; schema chỉ lưu UUID + snapshot môn |
| Nguyên nhân | Thiết kế snapshot-only mâu thuẫn yêu cầu hiển thị tên người thực hiện/giáo viên cũ. |
| Ảnh hưởng | FE không thể hiển thị cột "Người thực hiện"/"GV cũ" nếu backend không join. |
| Đề xuất | Chốt join ở tầng đọc: `LEFT JOIN staff_profile` (và `user_account`) để lấy tên hiện tại, trả thêm `changedByName`/`oldTeacherName` (nullable); hoặc bỏ 2 cột khỏi UI. Nếu chọn join, cập nhật `api-contract.md` §4.9 + response DTO; snapshot môn vẫn giữ nguyên. |

#### F-MAJ-06 — Frontend WIP lệch hợp đồng (chưa commit)

| Trường | Nội dung |
|---|---|
| Vị trí | `frontend/src/features/academic/types.ts:388, 485-488` (`IN_PROGRESS`), `:394-412` (`theoryHours/practiceHours/isRequired/notes`, thiếu `sequenceNo`), `:432-439` (response primary), `:414-428` (create thiếu `version`); đối chiếu `database-schema.md:286` và `curriculum-business-design.md:207` (`ACTIVE`), `api-contract.md:302-317` (`theorySessions/practiceSessions/required/note`) |
| Nguyên nhân | FE đang phát triển song song, dùng tên/giá trị khác hợp đồng. |
| Ảnh hưởng | Khi backend trả `ACTIVE` hoặc `theorySessions`, FE map sai/không hiển thị; `status` badge rơi vào undefined. |
| Đề xuất | Chốt vocabulary theo tài liệu backend (`ACTIVE`, `theorySessions`, `practiceSessions`, `required`/`isRequired` — chọn một) rồi FE sửa; **không** đổi backend theo WIP. Ghi nhận đây là việc của người dùng, review không sửa FE. |

#### F-MAJ-07 — `version` của curriculum-subject không bắt buộc nhưng khóa lạc quan lại cần

| Trường | Nội dung |
|---|---|
| Vị trí | `api-contract.md:302-317` (POST không có `version`), `:334-341` (§3.8 "có thể có `version`"); `validation-and-error-cases.md:296-297` yêu cầu `curriculum.version` + 409 `DATA_CHANGED` cho thêm/sửa/xóa môn |
| Nguyên nhân | Hợp đồng không thống nhất giữa body và bảng khóa. |
| Ảnh hưởng | Không thể bảo đảm 409 `DATA_CHANGED` nếu client không gửi version; hai client sửa đồng thời sẽ ghi đè. |
| Đề xuất | Bắt buộc `version` trên POST/PUT/DELETE curriculum-subject (nhất quán với mọi thao tác ghi khác), hoặc ghi rõ "không khóa lạc quan" và bỏ 409 tương ứng. |

### 7.3. MEDIUM

| ID | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|
| F-MED-01 | Gateway chưa route `/api/curricula` | `backend/APIGateway/src/main/resources/application.yml` (không có `curricula`); `api-contract.md` §1.1 còn mô tả route cũ | Thêm route trước WP1.2 hoặc ghi rõ đây là việc WP1.6 |
| F-MED-02 | `CURRICULUM_NOT_FOUND`, `SUBJECT_NOT_FOUND`, `TEACHER_NOT_FOUND` bị xếp 400 ở §4.3/§4.4 nhưng 404 ở §7 | `api-contract.md:438, 455` vs `:799` | Sửa §4.3/§4.4 theo §7 (404) |
| F-MED-03 | `SUBJECT_MISMATCH` 400 ở §4.4 nhưng 409 ở §7 | `api-contract.md:455` vs `:800` | Chốt 409 (xung đột nghiệp vụ) và sửa §4.4 |
| F-MED-04 | `CLASS_SUBJECT_LOCKED` xuất hiện trong §4.3/§4.5/§4.6 nhưng không có trong bảng mã lỗi/ErrorCode | `api-contract.md:437, 475, 482`; `ErrorCode.java` không có | Hoặc thêm mã, hoặc dùng `CLASS_NOT_EDITABLE`/`CONFLICT` |
| F-MED-05 | D-04 UNIQUE `(org_id, code)` vẫn comment | `database-schema.md:577-580` | Chốt có chạy sau khi precheck 0 trùng hay không |
| F-MED-06 | Tài liệu validation nói `ApiResponse.failure` chỉ có 2 tham số | `validation-and-error-cases.md:285` vs `ApiResponse.java` (có overload 3 tham số) | Cập nhật tài liệu; không ảnh hưởng code |
| F-MED-07 | `SubjectController` chưa áp module guard `STUDENT_MANAGEMENT` (D-10) | `SubjectController.java` không gọi `OrganizationModuleGuard` | Bổ sung ở WP1.1 |
| F-MED-08 | `TEACHER_ASSIGNMENT` không có trong IdentityService | `PermissionCatalog.java` không có; chỉ config PeopleService | Xác nhận mã module chuẩn trước WP1.4/WP6 |
| F-MED-09 | Phân trang lệch chuẩn: curriculum 1-based, history 0-based | `api-contract.md` §1.2 vs `:618` | Ghi rõ từng endpoint; FE đang theo 0-based cho history |
| F-MED-10 | `class_subject` H2 không có generated column; "tối thiểu 1 primary" không do DB bảo đảm | `people-test-schema.sql:175-182` | Test H2 phải assert qua service; ghi rõ giới hạn |

### 7.4. LOW

| ID | Vấn đề | Bằng chứng |
|---|---|---|
| F-LOW-01 | §4.7 ghi HEAD `bfa9b53`, HEAD thực tế `be2b049` | `api-contract.md:500` |
| F-LOW-02 | §1.1 mô tả gateway chỉ route `/api/subjects/**`, thực tế đã route teachers/specialties/classes… | `api-contract.md` §1.1 vs `application.yml:95-149` |
| F-LOW-03 | `SubjectStatusRequest` dùng key `ACTIVE_REQUIRED` không có trong `ErrorCode` | `SubjectStatusRequest.java:5`; `GlobalExceptionHandler.java:47-56` |
| F-LOW-04 | Phát hiện trùng code dựa tên constraint | `SubjectRepository.java:119-125` |
| F-LOW-05 | `teachesSubject` đổi sang ID chưa có backfill/đối soát code | `teacher-subject-design.md` §4; chưa có migration backfill |
| F-LOW-06 | ERD/History index: `idx_csh_class_time` đã có, tài liệu ERD cần đồng bộ tên | `database-schema.md:362` vs `erd.md` |

---

## 8. Những nội dung chưa được xác minh bằng MySQL

Toàn bộ kết quả mục 4 là **review tĩnh**. Chưa có bất kỳ kết nối/DDL/DML nào tới MySQL trong phiên này. Các mục sau **chưa được xác minh**:

1. Chạy thực tế `51_52_precheck.sql`, `51_52_precheck_data.sql` trên staging MySQL 8.0.16+.
2. Hành vi `information_schema.check_constraints.check_clause` (escape dấu nháy, collation) — F-01 của Rev 4 mới được sửa tĩnh, chưa chạy lại.
3. Tạo bảng thật: `class_subject` với `primary_class_id` STORED GENERATED + UNIQUE; xác nhận MySQL chấp nhận biểu thức CASE.
4. Backfill exact-match trên dữ liệu thật: số dòng LEGACY tạo ra, xung đột primary, orphan subject/teacher.
5. Composite FK và hành vi `ON DELETE RESTRICT/CASCADE` thực tế.
6. Hành vi MySQL 1093 (bảng tạm 5b) và `assert_no_duplicate_primary`.
7. Postcheck/assert procedures `SIGNAL 45000` trên schema đúng và schema lệch.
8. Rollback theo `ROLLBACK.md` (thứ tự FK/index).
9. D-04: số nhóm `subject.code` trùng trong org trước khi bật UNIQUE.
10. Tương thích H2 ↔ MySQL: generated column, BOOLEAN, collation, CHECK enforcement.
11. Hiệu năng truy vấn history/assignable với index thật (H2 bỏ secondary index).

> Mọi kết luận PASS ở mục 4 chỉ có giá trị "đạt review tĩnh", **không** thay thế staging validation.

---

## 9. Các điều kiện còn thiếu

### 9.1. Quyết định nghiệp vụ/kỹ thuật người dùng phải chốt

| # | Điều kiện | Liên quan |
|---|---|---|
| 1 | Chọn hướng idempotency: thêm `request_fingerprint`/cột session vào history **hoặc** thu hẹp so sánh | F-BLK-01 |
| 2 | Chọn mã/giới hạn cho reason đổi môn chính | F-MAJ-01 |
| 3 | Chốt quyền áp curriculum (`class.edit` hay `class.edit + curriculum.view`) | F-MAJ-02 |
| 4 | Chốt chuỗi quyền đọc Subject (giữ rộng hay thu về `subject.view`) | F-MAJ-03 |
| 5 | Chốt backward compatibility cho `PUT /classes/{id}` khi đổi `subjectId` + mã lỗi version | F-MAJ-04 |
| 6 | Chốt có join tên hiển thị history hay bỏ cột UI | F-MAJ-05 |
| 7 | Chốt vocabulary/enum FE theo backend (ACTIVE, theorySessions, …) | F-MAJ-06 |
| 8 | Chốt `version` bắt buộc cho curriculum-subject | F-MAJ-07 |
| 9 | Chốt HTTP status cho các mã NOT_FOUND/MISMATCH | F-MED-02/03 |
| 10 | Chốt có bật UNIQUE `subject(org_id, code)` sau precheck hay không | F-MED-05 |

### 9.2. Điều kiện kỹ thuật trước khi code

| # | Điều kiện | Ghi chú |
|---|---|---|
| 1 | Seed `curriculum.view/manage` vào `PermissionCatalog` + gán chức danh Giáo vụ | IdentityService; người dùng thao tác |
| 2 | Thêm route gateway `/api/curricula` (+ `StripPrefix=1`) | `application.yml` |
| 3 | Áp module guard `STUDENT_MANAGEMENT` cho Subject/Curriculum (D-10) | Tái dùng `OrganizationModuleGuard` |
| 4 | Xác nhận mã module `TEACHER_ASSIGNMENT` có đăng ký hay không | Ảnh hưởng luồng gán GV cũ |
| 5 | Bổ sung fixture H2 cho các case biên (nếu cần) | Không sửa schema H2 trong review này |
| 6 | Chốt cách trả `data` trong lỗi (dùng overload 3 tham số sẵn có) | `ApiResponse` |
| 7 | Chốt response shape cho từng endpoint WP1 | Theo `api-contract.md` |
| 8 | Migration 51/52 vẫn **chưa được chạy**; cần staging riêng + cho phép của người dùng | Gate này không phải migration approval |

---

## 10. Thứ tự triển khai Backend đề xuất

> Điều kiện tiên quyết: các quyết định ở mục 9.1 phải được chốt. Schema H2 đã sẵn sàng nên có thể code/test không cần MySQL.

```
WP1.0 (đã xong: schema H2 + migration drafts)
   │
   ├─> WP1.1 Subject (hardening) ──┬─> WP1.2 Curriculum ──┐
   │                                └─> WP1.3 Teacher Subject ──┤
   │                                                             ▼
   └──────────────────────────────────────────────────> WP1.4 Class Subject
                                                                  │
                                                                  ▼
                                                          WP1.5 History + Idempotency
                                                                  │
                                                                  ▼
                                                          WP1.6 Integration & Testing
```

### WP1.1 — Subject (hardening, không phá hợp đồng hiện có)

- **Phạm vi:** giữ CRUD hiện có; chốt F-MAJ-03 (READ chain); áp module guard; sửa F-LOW-03; bổ sung test 403/404/400.
- **Không làm:** đổi response shape, đổi D-04.
- **Exit:** toàn bộ test Subject xanh trên H2; không đổi hành vi ngoài phạm vi đã chốt.

### WP1.2 — Curriculum

- **Phạm vi:** repository/service/controller cho `curriculum`, `curriculum_subject`, `curriculum_subject_prerequisite`; version + 409; kiểm cycle/duplicate; org isolation; quyền `curriculum.*`; module guard.
- **Phụ thuộc:** WP1.1 (Subject), quyết định F-MAJ-07.
- **Exit:** CRUD + subject + prerequisite + version chạy trên H2; test org isolation trả 404.

### WP1.3 — Teacher Subject

- **Phạm vi:** thay thế danh sách môn GV theo ID; `teacher_subject` mặc định `APPROVED`; đồng bộ từ specialty; `assignable?subjectId=`; version `staff_profile.version`; confirm khi thu hồi môn đang dùng.
- **Phụ thuộc:** WP1.1; có thể song song WP1.2.
- **Exit:** không có PENDING/approve/reject; assignable lọc đúng; test AC-TCH.

### WP1.4 — Class Subject

- **Phạm vi:** list/apply/add/update/delete môn lớp; `is_primary`; đồng bộ `school_class.subject_id` trong cùng transaction; chặn xóa primary; chặn xóa lớp có history; quyền theo F-MAJ-02.
- **Phụ thuộc:** WP1.2 + WP1.3.
- **Exit:** TC-CLS (trừ history) xanh; không có primary thứ hai.

### WP1.5 — Primary change + History + Idempotency

- **Phạm vi:** `PUT .../subjects/primary`, `GET .../subject-history`; xử lý `operation_id` theo quyết định F-BLK-01; optimistic locking `school_class.version`; snapshot đầy đủ; phân trang 0-based; join tên nếu chốt F-MAJ-05.
- **Phụ thuộc:** WP1.4 + quyết định F-BLK-01/F-MAJ-05.
- **Exit:** retry cùng payload trả 200 không tạo bản ghi mới; payload khác trả 409; history bất biến.

### WP1.6 — Integration & Testing

- **Phạm vi:** gateway `/api/curricula`; seed quyền; module guard toàn bộ; E2E API qua gateway; đối chiếu FE WIP; regression lớp/giáo viên; bàn giao MySQL staging.
- **Exit:** E2E trên H2 xanh; checklist MySQL staging sẵn sàng; **chưa** chạy migration.

---

## 11. Test checklist theo nhóm chức năng

### 11.1. Subject

- [ ] Tạo môn có `code` / không `code` (D-04); trùng code trong org → 409; khác org → không thấy.
- [ ] `name` rỗng/ quá dài → 400 đúng mã; `description` > 1000 → 400.
- [ ] Ngừng môn đang được lớp dùng: cho phép, trả usage; không xóa tham chiếu.
- [ ] `GET /subjects` theo chuỗi quyền đã chốt; DEPARTMENT không có quyền → 403.
- [ ] Module `STUDENT_MANAGEMENT` tắt → 400 `MODULE_NOT_ENABLED` (sau khi áp guard).
- [ ] Audit ghi `SUBJECT_*` đúng before/after.

### 11.2. Curriculum

- [ ] CRUD curriculum; version lệch → 409 `DATA_CHANGED`.
- [ ] Trùng `code`/`name` → 409; org khác → 404.
- [ ] Thêm môn: trùng subject/sequence → 409; môn inactive → 400; subject khác org → 404.
- [ ] Prerequisite: mảng rỗng, trùng phần tử → 400; tự tiên quyết → 400 kèm `path`; chu trình A→B→A → 400; > 50 → 400; chỉ cảnh báo, không chặn.
- [ ] Sửa/xóa môn curriculum: version bắt buộc (theo quyết định F-MAJ-07); 404 khi không thuộc curriculum.
- [ ] Xóa subject đang là prerequisite của môn khác → 409/CONFLICT.
- [ ] Ngừng curriculum đang được lớp dùng → cho phép + cảnh báo, không xóa `class_subject`.

### 11.3. Teacher Subject

- [ ] Gán nhiều môn; tất cả `APPROVED` ngay; không có endpoint approve/reject.
- [ ] Thay danh sách với `version = staff_profile.version`; lệch → 409.
- [ ] Thu hồi môn đang được lớp dùng: yêu cầu confirm; thiếu confirm → 409.
- [ ] Đồng bộ từ specialty: mapping `specialty_subject` sinh `teacher_subject APPROVED` theo quy tắc đã chốt.
- [ ] `assignable?subjectId=` chỉ trả GV `DANG_DAY` + `teacher_subject APPROVED`; `NGHI_VIEC` không xuất hiện.
- [ ] GV khác org → 404.

### 11.4. Class Subject

- [ ] Áp curriculum: lớp `CHUA_BAT_DAU`; curriculum active cùng org; thiếu `confirmReplace` khi đã có dòng CURRICULUM → 409; `keepManualSubjects` đúng.
- [ ] Lớp `DANG_DIEN_RA`/`DA_KET_THUC`: áp curriculum bị chặn đúng mã.
- [ ] Thêm môn thủ công; trùng → 409; môn inactive → 400; GV không có chuyên môn → 409 `SUBJECT_MISMATCH` (theo quyết định F-MED-03).
- [ ] Sửa/xóa môn: version lớp lệch → 409; xóa primary bị chặn; xóa dòng LEGACY bị chặn.
- [ ] Sau mọi thao tác: `school_class.subject_id` = môn primary; tối đa 1 primary/lớp.
- [ ] Xóa lớp đã có history → 409; lớp chưa có history → 204.

### 11.5. Primary change + History + Idempotency

- [ ] `CHUA_BAT_DAU`: đổi primary tự do (kèm reason/operationId/version).
- [ ] `DANG_DIEN_RA`: chỉ đổi primary; thao tác khác bị chặn.
- [ ] `DA_KET_THUC`/`DA_HUY`/`CLOSED` → 409 `CLASS_NOT_EDITABLE`.
- [ ] `expectedVersion` lệch → 409 `DATA_CHANGED`.
- [ ] Retry cùng `operationId` + cùng payload → 200, cùng `historyId`, không thêm dòng.
- [ ] Cùng `operationId` + payload khác → 409 `CLASS_SUBJECT_OPERATION_CONFLICT`.
- [ ] Đua đồng thời 2 request primary: một thành công, một 409; không có 2 primary.
- [ ] Transaction lỗi giữa chừng: không history một phần, `school_class.subject_id` không lệch.
- [ ] History: sắp xếp `changed_at DESC`, phân trang 0-based, chỉ đọc, snapshot giữ nguyên sau khi môn đổi tên/ngừng.
- [ ] Hiển thị `changedByName`/`oldTeacherName` theo quyết định F-MAJ-05.
- [ ] Xóa lớp có history bị chặn (FK RESTRICT + pre-check 409).

### 11.6. Tích hợp & hồi quy

- [ ] Gateway route đủ `/api/subjects`, `/api/curricula`, `/api/teachers`, `/api/classes`, `/api/specialties`.
- [ ] JWT org isolation: mọi GET/PUT chéo org → 404, không lộ tồn tại.
- [ ] Ma trận 403: OWNER, Giáo vụ, Trưởng phòng, GV, SV theo bảng RBAC đã chốt.
- [ ] Module guard: bật/tắt `STUDENT_MANAGEMENT` ảnh hưởng đúng Subject/Curriculum/Class.
- [ ] Hồi quy luồng lớp hiện có: tạo/sửa/gán GV/đóng/hủy/mở lại không đổi hành vi ngoài phạm vi đã chốt.
- [ ] H2: toàn bộ test repository/service/controller xanh.
- [ ] Bàn giao MySQL: checklist mục 8 được chạy trên staging riêng, có log, trước khi xin phép migration.

---

## Kết luận cổng

**BLOCKED.**

Lý do: còn **1 BLOCKER** (F-BLK-01 — không thể hiện thực idempotency đúng đặc tả) và **7 MAJOR** (mã lỗi trùng, quyền áp curriculum, quyền đọc Subject, phá vỡ hợp đồng `PUT /classes/{id}`, thiếu tên hiển thị history, FE lệch hợp đồng, version curriculum-subject). Nếu bắt đầu code ngay, lập trình viên buộc phải tự chọn một trong các phương án trái tài liệu, tạo sai lệch không kiểm soát được.

Điều kiện mở cổng: chốt đủ 10 quyết định ở mục 9.1 và cập nhật tài liệu tương ứng (ngoài phạm vi review này). Sau đó chạy lại review tĩnh ngắn trên các mục đã sửa để xác nhận không phát sinh mâu thuẫn mới.

Báo cáo này **không** phê duyệt migration 51/52 và **không** thay thế xác minh MySQL staging.
