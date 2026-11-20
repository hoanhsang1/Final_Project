# WP0 — Implementation Readiness Audit (Phase 1)

> **Ngày audit:** 2026-11-20 · **Branch:** `fixFlowCreateEmployee` · **HEAD:** `bfa9b53` · **Baseline source đã chốt:** `cdd03b8`
> **Đầu vào:** `docs/phase-1/review-report.md` (`READY FOR USER REVIEW — Revision 3`), `docs/phase-1/implementation-roadmap.md`
> **Tính chất:** READ-ONLY. Không sửa source Java/React, không chạy SQL, không kết nối DB,
> không commit/push/merge/đổi branch.
> **Đầu ra:** file này (báo cáo audit WP0).
> **Cập nhật:** 2026-11-20 — Revision 2 (D-08/D-15) và Revision 3 (D-08/D-09/D-15) — xem khối
> "Cập nhật sau Revision 3" ở §1.

## 0. Quy ước trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| `VERIFIED` | Đã xác nhận bằng bằng chứng thực tế trong source/config/DDL kèm đường dẫn + dòng. |
| `NOT VERIFIED` | Không đủ bằng chứng hoặc không có quyền truy cập; nêu rõ bằng chứng còn thiếu. |
| `CONFLICT` | Source thực tế mâu thuẫn với tài liệu đã duyệt hoặc với một nguồn đã xác minh khác; nêu cả hai phía và quyết định cần chốt. |
| `RESOLVED` | Từng là mâu thuẫn/chặn nhưng đã được người dùng chốt bằng quyết định mới; giữ lại dòng để truy vết. |

Mỗi phát hiện có mã `F-xx`; bảng tổng hợp đầy đủ ở **§14**.

---

## 1. Tóm tắt điều hành

**Kết luận:** bộ tài liệu Phase 1 đang **`READY FOR USER REVIEW` (Revision 3)** — chưa `APPROVED`;
source đang đứng đúng baseline `cdd03b8`; **toàn bộ tính năng Phase 1 chưa được triển khai** (đúng kỳ
vọng — WP0 không triển khai). Có thể bắt đầu WP1 sau khi người dùng chốt các điểm ở §11, trong đó
quan trọng nhất là **truy cập DB để pre-check mã môn trùng** (BLK-01).

> **Cập nhật sau Revision 2 (2026-11-20):** câu hỏi cũ "chặn hay cho đổi môn chính của lớp
> `DANG_DIEN_RA`" (BLK-04/F-11) **đã được người dùng chốt**: được phép đổi, nhưng phải đi qua luồng
> ghi lịch sử `class_subject_history` + đồng bộ `school_class.subject_id` trong **một transaction**
> (D-08/D-15). F-11 vì vậy **không còn là `CONFLICT`** — hành vi hiện tại của `SchoolClassService`
> (cho sửa) trở thành điểm xuất phát đúng, chỉ thiếu phần lịch sử/đồng bộ sẽ làm ở WP5.
>
> **Cập nhật sau Revision 3 (2026-11-20):** siết thêm ba điểm so với Revision 2 và điều chỉnh các
> dòng audit liên quan trong file này:
> 1. **D-08** — history lưu thêm `old_source`/`new_source`; `reason` và `operation_id` **bắt buộc**
>    (NOT NULL, `reason` ≤500); `changed_by` lấy từ JWT.
> 2. **D-09** — fallback `school_class.teacher_id` **theo từng bản ghi**: chỉ khi lớp chưa có dòng
>    `class_subject` tương ứng; dòng tồn tại với `teacher_id = NULL` là **chưa phân công**.
> 3. **D-15** — DB chỉ bảo đảm **tối đa một** primary; **tối thiểu một** (khi `subject_id ≠ NULL`) do
>    transaction + kiểm tra ứng dụng. Không tài liệu nào được nói UNIQUE tự đảm bảo đúng một.
> 4. `expectedVersion` **bắt buộc** trên mọi thao tác đổi môn chính (`school_class.version` đã tồn
>    tại nên không cần đổi schema).
> 5. **Không tạo migration 53** trừ khi có bằng chứng môi trường đã áp một bản 52 cũ; repo hiện tại
>    dừng ở migration 50.
> 6. WP1 đã có **draft** migration 51/52 + pre/post-check + rollback + H2 fixture cập nhật (xem
>    `docs/phase-1/migrations/` và `wp1-readiness-report.md`). Các draft **chưa được chạy**.

| Hạng mục | Kết quả | Trạng thái |
|---|---|---|
| Baseline source khớp `cdd03b8` | Không có file ngoài `docs/` khác baseline | `VERIFIED` |
| Thay đổi trong working tree | Tài liệu `docs/phase-1/` + draft `docs/phase-1/migrations/` + H2 fixture (Revision 3); không có source Java/React | `VERIFIED` |
| Subject hiện tại | Trả mảng, `code` tuỳ chọn — khớp D-13/D-04 | `VERIFIED` |
| Subject thiếu module guard, check-code, usage; lỗi trùng mã là `CONFLICT` | Lệch hợp đồng đã duyệt | `CONFLICT` |
| Curriculum / class_subject / teacher_subject / specialty_subject | Không tồn tại trong source Java | `VERIFIED` (chưa triển khai) |
| Quyền `curriculum.view/manage` | Chưa có trong catalog | `VERIFIED` (chưa triển khai) |
| Migration 51/52 | Chỉ có **draft** trong `docs/phase-1/migrations/`; chưa có file ở gốc repo, chưa chạy. Migration 42 chỉ tạo INDEX thường cho `subject.code` | `VERIFIED` |
| Migration 53 | **Không tạo** — repo dừng ở 50, không có bằng chứng đã áp bản 52 cũ | `VERIFIED` |
| Lớp `DANG_DIEN_RA` đổi được môn chính | Hành vi nay **đúng** chủ ý D-08/D-15; thiếu luồng lịch sử/đồng bộ (WP5) | `VERIFIED` (hiện trạng) |
| `class_subject_history` / `is_primary` trong source/DDL gốc | Chưa tồn tại trong source Java/migration gốc; đã có trong draft 52 và H2 fixture | `VERIFIED` (chưa triển khai) |
| Schema/dữ liệu DB thật | Không có quyền truy cập trong WP0; dump `DB_11_16.sql` cũ hơn migration 31/42 | `NOT VERIFIED` |
| H2 fixture vs MySQL | Fixture Revision 3 đã có bảng/cột Phase 1; `uq_subject_org_code` vẫn UNIQUE trên H2 trong khi MySQL còn INDEX tới khi 52 chạy; H2 không có cột sinh và không chứng minh được bất biến tối thiểu | `CONFLICT` (chờ MySQL staging) |
| Gateway route `/api/curricula/**` | Chưa có | `VERIFIED` (chưa triển khai) |
| Schedule / Facility | Schedule chỉ nhận `subjectName`; Facility không phụ thuộc môn | `VERIFIED` |

**Sẵn sàng cho WP1:** có điều kiện. 2 điều kiện bắt buộc: (1) chạy pre-check mã môn trùng trên DB
staging; (2) xác nhận trạng thái module `STUDENT_MANAGEMENT` trước khi bật guard cho Subject.
Điều kiện thứ 3 trước đây (chốt xử lý đổi môn chính của lớp đã bắt đầu) **đã được giải quyết** bởi
Revision 2/3 của D-08/D-15; phần còn lại chỉ là chi tiết kỹ thuật ghi ở `review-report.md` §10.
Draft WP1 đã xong nhưng **chờ người dùng review** (`wp1-readiness-report.md`), **chưa chạy**.

---

## 2. Git baseline & working tree

**Lệnh đã chạy (read-only):** `git branch --show-current`, `git rev-parse --short HEAD`,
`git merge-base --is-ancestor cdd03b8 HEAD`, `git status --porcelain`,
`git diff --name-only cdd03b8 HEAD -- . ':(exclude)docs'`, `git diff --name-only` (working tree).

| Kiểm tra | Kết quả | Trạng thái |
|---|---|---|
| Branch hiện tại | `fixFlowCreateEmployee` | `VERIFIED` |
| HEAD (tại lúc audit Revision 2) | `1224cf2` | `VERIFIED` |
| HEAD hiện tại (Revision 3) | `bfa9b53` | `VERIFIED` |
| `cdd03b8` là tổ tiên của HEAD | có | `VERIFIED` |
| Source Java/React ngoài `docs/` khác baseline | **0 file** (chỉ H2 fixture `people-test-schema.sql` được sửa ở Revision 3) | `VERIFIED` |
| Thay đổi chưa commit trong working tree | 12 file `docs/phase-1/*.md` (sửa) + `docs/phase-1/migrations/` (untracked) + `docs/phase-1/wp1-readiness-report.md` (untracked) + 1 H2 fixture | `VERIFIED` |
| Thay đổi source Java/React trong working tree | Không có | `VERIFIED` |
| Commit/push/merge/đổi branch trong WP0/Revision 3 | Không thực hiện | `VERIFIED` |

**Ghi chú:** ở thời điểm audit WP0 (Revision 2) working tree chỉ có 10 tài liệu + `review-report.md`;
Revision 3 bổ sung thêm draft migration, báo cáo WP1 và cập nhật H2 fixture. WP0 **không** chỉnh sửa
source; các thay đổi H2 fixture/draft migration thuộc phạm vi cho phép của Revision 3 (chưa chạy).

**Ý nghĩa baseline:** mọi kết luận "chưa triển khai" bên dưới là trạng thái tại `cdd03b8`, không phải
do thay đổi cục bộ.

---

## 3. Trạng thái Backend thực tế

### 3.1. IdentityService

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Catalog quyền | `service/PermissionCatalog.java:76-77` có `subject.view`, `subject.manage` (`orgOnly`, module `STUDENT_MANAGEMENT`); **không có** `curriculum.*` | Thiếu quyền Phase 1 | `VERIFIED` |
| Bundle `ACADEMIC_MANAGEMENT` | `PermissionCatalog.java:118-124` chứa `subject.view/manage`, chưa có `curriculum.*` | Cần bổ sung theo D-14 | `VERIFIED` |
| Tự seed catalog | `config/IdentityDataInitializer.java:42` upsert `ENTRIES`; `:52` cấp cho `OWNER`,`ORG_OWNER`,`SUPER_ADMIN`; `:75-82` dựng lại `permission_bundle_item` | Thêm entry vào catalog là đủ để seed khi khởi động | `VERIFIED` |
| Module state | `PeopleService/client/IdentityClient.java:86,105` đọc `activeModules`/`moduleStatus` từ Identity | Nguồn trạng thái module nằm ở Identity, không phải DB People | `VERIFIED` |

### 3.2. PeopleService — Subject

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| `GET /subjects` trả mảng | `controller/SubjectController.java:37-42` trả `List<SubjectResponse>`, không `page/size` | Khớp D-13 | `VERIFIED` |
| `code` tuỳ chọn | `dto/SubjectRequest.java:7-9` chỉ `@Size(max=50)`, không `@NotBlank`; `repository/SubjectRepository.java:72,88` ghi `trimToNull(code)` | Khớp D-04 ở mức hiện tại | `VERIFIED` |
| Trùng mã | `SubjectRepository.java:119-125` trả `ErrorCode.CONFLICT` (2215) cho cả mã và tên | Lệch hợp đồng `409 SUBJECT_CODE_EXISTS` | `CONFLICT` |
| Module guard | Không có `OrganizationModuleGuard` trong `SubjectController` (grep rỗng) | Lệch D-10 | `CONFLICT` |
| `GET /subjects/check-code` | Không tồn tại trong controller | Chưa triển khai | `VERIFIED` |
| `GET /subjects/{id}/usage` | Không tồn tại; chỉ có `classUsage()` nội bộ dùng cho audit (`SubjectRepository.java:105`, controller `:82-84`) | Chưa triển khai | `VERIFIED` |
| Service layer | Không có `SubjectService`; controller gọi thẳng repository | Không phải vấn đề, chỉ là hiện trạng | `VERIFIED` |
| READ expression | `SubjectController.java:21-23` cho phép `subject.view/manage` **hoặc** `class.view`,`class.create`,`student.view`,`class.assign_teacher`,`class.teacher.reassign` | Khớp ghi chú READ hiện tại trong `api-contract.md:72` | `VERIFIED` |

### 3.3. PeopleService — Lớp học

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Module guard | `service/SchoolClassService.java:71,81,91,101,122,148,170,229,239,252` gọi `requireModule/requireModuleReadable` | Mẫu chuẩn để áp cho Subject/Curriculum | `VERIFIED` |
| Môn của lớp | `SchoolClassService.java:128-135` chỉ nhận **một** `subjectId` qua `nullableActive(...)` | Chưa có nhiều môn | `VERIFIED` |
| Khả năng sửa lớp | `SchoolClassService.java:281-286` chỉ chặn `DA_KET_THUC`,`DA_HUY`,`CLOSED`; lớp `DANG_DIEN_RA` vẫn sửa được, kể cả `subject_id` | **Khớp D-08/D-15**: `DANG_DIEN_RA` được đổi môn chính; WP5 phải bọc thêm luồng lịch sử + đồng bộ atomic (F-11) | `VERIFIED` (hiện trạng) |
| API lớp | `controller/SchoolClassController.java` có đủ CRUD + workflow hiện có; **không có** endpoint `/{id}/subjects`, `/{id}/curriculum` | Chưa triển khai | `VERIFIED` |
| Response lớp | `dto/SchoolClassResponse.java` có `subjectId`,`subjectName`,`version`; **không có** `curriculumId` | Field additive sẽ thêm ở WP5 | `VERIFIED` |
| `GET /classes/{id}/students`, `/me` | `SchoolClassController.java:69,169` tồn tại | Không đổi | `VERIFIED` |

### 3.4. PeopleService — Giáo viên / chuyên môn

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Kiểm tra dạy đúng môn | `repository/TeacherRepository.java:74-84` so **tên** `specialty.name_unaccented = subject.name_unaccented` | Chưa dùng `teacher_subject` (D-06) | `VERIFIED` (hiện trạng) |
| Mismatch khi gán lớp | `TeacherRepository.java:278` `subjectMismatch(...)` cũng dựa vào chuyên môn | Cùng giới hạn như trên | `VERIFIED` |
| `GET /teachers/assignable` | `controller/TeacherController.java:41-47` chỉ `page,size,q` | Thiếu `subjectId` (WP3) | `VERIFIED` |
| API môn của giáo viên | Không có `/teachers/{staffId}/subjects` | Chưa triển khai | `VERIFIED` |
| Version | `TeacherRepository.requireTeacher` đọc `staff_profile.version` | Khớp quyết định H-02 | `VERIFIED` |
| Specialty | `controller/SpecialtyController.java` chỉ GET list + POST create | Thiếu quản lý ánh xạ môn | `VERIFIED` |

### 3.5. PeopleService — hạ tầng

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Internal API | `controller/InternalScheduleLookupController.java:28,38` chỉ có `/internal/classes/{classId}` và `/internal/students/{studentId}/classes` | WP6 sẽ mở rộng | `VERIFIED` |
| Internal auth | `security/InternalApiFilter` + `SecurityConfig` permit `/internal/**` qua `X-Internal-Api-Key` | Dùng lại được cho WP6 | `VERIFIED` |
| Outbox | Tồn tại và đang dùng cho `CLASS_TEACHER_CHANGED` trong `SchoolClassService.assignTeacher` | WP6 hook khả thi | `VERIFIED` |
| Mã lỗi | `exception/ErrorCode.java:80` `CONFLICT(2215)`, `:84` `SUBJECT_NOT_FOUND(2218)`, `:85` `SUBJECT_MISMATCH(2219)`, `:89` `CLASS_APPROVER_NOT_ALLOWED(2221)`, `:137` `PHONE_REQUIRED(3042)`; mã lớn nhất 2221 / 3042 | Dải 2222+ và 3043+ còn trống, đúng như tài liệu | `VERIFIED` |
| Kiểm mã quyền khi gán chức danh | `service/PositionService.java:128-135` đối chiếu catalog qua Identity, ném `UNKNOWN_PERMISSION` | Phải thêm catalog **trước** khi gán quyền | `VERIFIED` |

### 3.6. ScheduleService / FacilityService / APIGateway

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Schedule đọc lớp | `ScheduleService/client/PeopleClient.java:23-24,31,42` gọi 2 internal endpoint với `X-Internal-Api-Key` | Đúng hướng | `VERIFIED` |
| Dữ liệu lớp Schedule nhận | `client/ClassInfo.java` chỉ có `subjectName` (không `subjectId`, không danh sách môn) | Phase 2 cần WP6; Phase 1 không đổi | `VERIFIED` |
| Mirror lớp | `service/ScheduleService.java:300-309` lưu `subject` dạng tên vào bảng `class` nội bộ | Rủi ro lệch tên khi đổi tên môn; không thuộc Phase 1 | `VERIFIED` |
| Facility phụ thuộc môn | Chỉ có match chữ `subject|curriculum|class_subject` trong comment/không có logic | Không ảnh hưởng Phase 1 | `VERIFIED` |
| Gateway route | `APIGateway/src/main/resources/application.yml:118-128` có `/api/subjects/**`, `/api/classes/**`; **không có** `/api/curricula/**` | Thiếu route (WP4/§13) | `VERIFIED` |

---

## 4. Trạng thái Frontend thực tế

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Client môn | `frontend/src/features/academic/api.ts` — `subjectsApi.list(): Promise<Subject[]>`, `byId/create/update/setActive` | Khớp API hiện tại (mảng, `code` tuỳ chọn) | `VERIFIED` |
| Kiểu dữ liệu | `frontend/src/features/academic/types.ts` — `Subject.code: string \| null`; `SubjectInput.code?` | Khớp D-04/D-13 | `VERIFIED` |
| Trang môn | `pages/subjects-page.tsx:144-147` — `canView`, `canManage`, `canWriteModule(session,'STUDENT_MANAGEMENT')`, `moduleState(...)`; dialog nói mã không bắt buộc | Khớp hiện trạng + sẵn sàng cho D-10 | `VERIFIED` |
| Quyền FE | `lib/permissions.ts:47-48` chỉ có `subjectView/subjectManage`; **không có** `curriculum.*` | Thiếu mã quyền mới | `VERIFIED` |
| Nav/prefix | `lib/nav.ts:130` `ACADEMIC_PREFIXES` chứa `'subject.'` nhưng **không** `'curriculum.'`; entry môn tại `:354` | Cần bổ sung khi làm FE curriculum | `VERIFIED` |
| Route môn | `app/app.tsx` route `/dao-tao/mon-hoc` có `PermissionGuard anyOf={subject.view, subject.manage}` | Đúng hiện trạng | `VERIFIED` |
| Client curriculum / lớp–môn / giáo viên–môn | Không tồn tại trong `features/academic/api.ts` | Chưa triển khai | `VERIFIED` |
| FE có phân nhánh theo mã lỗi trùng môn | Không có `SUBJECT_CODE_EXISTS`/`subjectCode` trong `frontend/src` | Đổi mã lỗi backend không phá FE | `VERIFIED` |
| `teachersApi.assignable` | Chỉ gửi `page,size,q` | Không gửi `subjectId` nên extension additive an toàn | `VERIFIED` |

---

## 5. Trạng thái database & migration thực tế

### 5.1. Migration trong repo

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Danh sách migration gốc | `28_…` → `50_schedule_inbox_impact.sql` | Không có `51_*`, `52_*` | `VERIFIED` |
| Migration 42 | `42_people_subject_management.sql:47` thêm cột `code/description/updated_*`; `:48` `CALL mems_m42_add_index('subject','uq_subject_org_code','org_id,code')` | Tạo **INDEX thường**, không UNIQUE | `VERIFIED` |
| Backfill quyền môn | `42_…sql:58-96` gán `subject.view/manage` cho chức danh ORGANIZATION và chèn bundle | Hiện trạng quyền môn | `VERIFIED` |
| Pattern idempotent | `42_…sql:6-52` dùng procedure kiểm tồn tại trước khi `ALTER` | Mẫu để viết 51/52 | `VERIFIED` |

### 5.2. Schema/dữ liệu thật

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Dump `DB_11_16.sql` | `school_class` không có UNIQUE `(id,org_id)`; `subject` **không có cột `code`**; `school_class` thiếu `cancel_state` | Dump cũ hơn migration 31/42 → không đại diện schema hiện tại | `VERIFIED` (nội dung dump) |
| Schema live (migration 31,42 đã chạy chưa; index thật; FK thật) | Không có quyền đọc DB trong WP0 | Cần người dùng xác nhận trên staging | `NOT VERIFIED` |
| Dữ liệu `subject.code` trùng theo `(org_id,code)` | Không có quyền đọc dữ liệu | Bắt buộc pre-check trước `ADD UNIQUE` (D-04) | `NOT VERIFIED` |
| Trạng thái module `STUDENT_MANAGEMENT` theo tổ chức | Không có quyền đọc Identity DB | Cần trước khi bật module guard (D-10) | `NOT VERIFIED` |

### 5.3. H2 test schema

| Hạng mục | Bằng chứng | Kết luận | Trạng thái |
|---|---|---|---|
| Unique mã môn | `people-test-schema.sql` `CONSTRAINT uq_subject_org_code UNIQUE(org_id,code)` | H2 **chặt hơn** MySQL hiện tại (INDEX) → chỉ đồng bộ sau khi 52 chạy | `CONFLICT` |
| Bảng lớp | Fixture Revision 3 đã thêm `curriculum_id`, `UNIQUE(id, org_id)`, FK `(curriculum_id, org_id)`; vẫn không có CHECK trạng thái | Đủ cho FK tổ hợp; CHECK vẫn lệch MySQL 8 | `VERIFIED` (đã cập nhật, còn lệch CHECK) |
| Bảng mới Phase 1 | Fixture đã có `curriculum*`, `class_subject`, `class_subject_history`, `teacher_subject`, `specialty_subject` | WP1 fixture xong (draft) | `VERIFIED` (draft) |
| Cột sinh / bất biến primary | `class_subject.primary_class_id` là cột **thường** + UNIQUE; không có `STORED` | H2 **không** chứng minh ràng buộc DB tối đa-một hay bất biến tối thiểu | `NOT VERIFIED` (chờ MySQL) |
| Nhiều NULL trong UNIQUE | Chưa có bằng chứng chạy test trên MySQL staging | Cần test TC-SUB-020 thật | `NOT VERIFIED` |

---

## 6. Thay đổi quyền cần thực hiện

| Mã quyền | Trạng thái hiện tại | Cần làm | Nơi sửa | Trạng thái |
|---|---|---|---|---|
| `curriculum.view` | Không có trong catalog | Thêm `orgOnly(...)` module `STUDENT_MANAGEMENT` | `IdentityService/service/PermissionCatalog.java` (ENTRIES) | `VERIFIED` (thiếu) |
| `curriculum.manage` | Không có | Thêm tương tự; gán qua chức danh Giáo vụ | như trên + dữ liệu vị trí | `VERIFIED` (thiếu) |
| Bundle `ACADEMIC_MANAGEMENT` | Không có curriculum | Bổ sung 2 mã theo `role-permission-matrix.md:81` | `PermissionCatalog.BUNDLES` | `VERIFIED` (thiếu) |
| `subject.view/manage` | Đã có, ORGANIZATION | Giữ nguyên (D-05) | — | `VERIFIED` |
| `class.edit` | Đã có, **`orgOnly`** (`PermissionCatalog.java:67`) | Dùng cho đổi môn chính; **không** cấp cho chức danh DEPARTMENT | — | `VERIFIED` |
| `class.view` | Đã có, `orgAndDept` (`PermissionCatalog.java:65`) | Dùng để đọc lịch sử môn chính | — | `VERIFIED` |

**Không có quyền mới cho D-08/D-15:** đổi môn chính dùng `class.edit`, đọc lịch sử dùng `class.view`
(xem `role-permission-matrix.md` §4.8). Bảng này xác nhận `class.edit` là ORGANIZATION-only nên chức
danh DEPARTMENT không thể thực hiện thao tác này dù được gán.

**Cơ chế seed:** `IdentityDataInitializer` (`@Order(0)`) tự upsert catalog và cấp cho
`OWNER/ORG_OWNER/SUPER_ADMIN`; bundle items được dựng lại mỗi lần khởi động
(`IdentityDataInitializer.java:42-82`). Vì vậy **chỉ cần sửa catalog Java**, không cần migration dữ liệu quyền.

**Ràng buộc thứ tự:** `PositionService.java:128-135` từ chối mã quyền không có trong catalog
(`UNKNOWN_PERMISSION`). Phải deploy catalog mới **trước** khi gán `curriculum.*` cho chức danh.

**Rủi ro cần chốt:** thêm `curriculum.*` vào bundle `ACADEMIC_MANAGEMENT` sẽ tự cấp cho **mọi chức danh
đang giữ bundle đó**. Cần xác nhận danh sách chức danh đang giữ `ACADEMIC_MANAGEMENT` (dữ liệu Identity —
`NOT VERIFIED`) để không cấp ngoài ý muốn D-14.

**Module guard:** theo D-10, Subject và Curriculum phải gọi `OrganizationModuleGuard`. Hiện Subject
không có (`CONFLICT` F-08). Trạng thái module đọc từ Identity qua `IdentityClient` — cần kiểm tổ chức
đang bật `STUDENT_MANAGEMENT` trước khi bật guard, nếu không API môn hiện tại sẽ bị 403 hàng loạt.

---

## 7. Hợp đồng API hiện tại & rủi ro tương thích FE

### 7.1. Subject

| Endpoint | Hiện tại | Hợp đồng đã duyệt | Chênh lệch | Rủi ro FE | Trạng thái |
|---|---|---|---|---|---|
| `GET /subjects` | Mảng, `q`/`includeInactive`; inactive chỉ hiện với OWNER/`subject.manage` | Mảng, không phân trang (D-13) | Không | Không | `VERIFIED` |
| `POST/PUT /subjects` | `code` tuỳ chọn; trùng mã → `409 CONFLICT` (2215) | `409 SUBJECT_CODE_EXISTS` | Mã lỗi khác chuỗi | Thấp — FE không đọc code | `CONFLICT` |
| `PATCH /subjects/{id}/status` | Có, audit kèm `classesUsingSubject` | Giữ | Không | Không | `VERIFIED` |
| `GET /subjects/check-code` | Không có | Bắt buộc (WP2) | Thiếu | Không (FE chưa gọi) | `VERIFIED` (thiếu) |
| `GET /subjects/{id}/usage` | Không có | Bắt buộc (WP2) | Thiếu | Không | `VERIFIED` (thiếu) |
| Module guard | Không | Bắt buộc (D-10) | Thiếu | **Có** nếu bật khi module tắt | `CONFLICT` |

### 7.2. Lớp / Giáo viên / Curriculum

| Endpoint | Hiện tại | Hợp đồng | Trạng thái |
|---|---|---|---|
| `GET/PUT /teachers/assignable` | `page,size,q` | Thêm `subjectId` | `VERIFIED` (thiếu) |
| `/teachers/{staffId}/subjects` | Không có | 4 endpoint CRUD | `VERIFIED` (thiếu) |
| `/classes/{id}/subjects` | Không có | Đọc snapshot + suy LEGACY | `VERIFIED` (thiếu) |
| `PUT /classes/{id}/curriculum` | Không có | Áp curriculum cho lớp `CHUA_BAT_DAU` | `VERIFIED` (thiếu) |
| `/curricula/**` | Không có (Gateway cũng chưa route) | CRUD curriculum | `VERIFIED` (thiếu) |
| `PUT /classes/{id}` | Cho đổi `subjectId` cả khi `DANG_DIEN_RA` | D-08/D-15: được đổi nhưng **phải uỷ thác** sang `PrimarySubjectChangeService` (history + đồng bộ + `version`, bắt buộc `reason`/`operationId`) | `VERIFIED` (còn thiếu luồng lịch sử) |
| `PUT /classes/{id}/subjects/primary` | Không có | Endpoint mới cho đổi môn chính có lịch sử | `VERIFIED` (thiếu) |
| `GET /classes/{id}/subject-history` | Không có | Đọc lịch sử (snapshot) | `VERIFIED` (thiếu) |

**Tương thích FE hiện tại:** toàn bộ thay đổi Phase 1 là **additive** (endpoint mới, field mới,
mã lỗi mới). FE hiện tại không gọi các endpoint mới và không phân nhánh theo mã lỗi môn, nên không
có rủi ro phá vỡ — trừ khi bật module guard khi module đang tắt (xem §6).

---

## 8. Phụ thuộc liên service

| Service nguồn | Service đích | Thông tin cần | API nội bộ hiện có | Cần API mới? | Chặn Phase 1? | Trạng thái |
|---|---|---|---|---|---|---|
| People | Identity | Catalog quyền & bundle để validate chức danh | `IdentityClient.permissions()/permissionBundles()` (`IdentityClient.java:60,73`) | Không (thêm entry vào catalog là đủ) | Không | `VERIFIED` |
| People | Identity | Trạng thái module `STUDENT_MANAGEMENT` | `IdentityClient.activeModules/moduleStatus` (`:86,105`) | Không | Không (nhưng phải kiểm dữ liệu) | `VERIFIED` |
| People | Identity | Tạo/tắt tài khoản học sinh | `IdentityClient.createStudentAccount/...` | Không | Không | `VERIFIED` |
| Schedule | People | Thông tin lớp để mirror | `GET /internal/classes/{classId}` (`PeopleClient.java:31`) | Phase 2: thêm môn của lớp (`/internal/classes/{id}/subjects`) | Không (Phase 1) | `VERIFIED` |
| Schedule | People | Lớp của học sinh | `GET /internal/students/{studentId}/classes` | Không | Không | `VERIFIED` |
| Facility | — | Không phụ thuộc môn/curriculum | — | Không | Không | `VERIFIED` |
| Gateway | People | Định tuyến FE | Có `/api/subjects`, `/api/classes`, `/api/teachers`, `/api/specialties` | Có: `/api/curricula/**` | Không chặn backend; chặn FE tích hợp | `VERIFIED` |

**Kết luận:** Phase 1 **không** cần Schedule/Facility thay đổi. Chỉ People + Identity + Gateway.

---

## 9. Rủi ro tương thích H2 / MySQL 8

| # | Khác biệt | H2 hiện tại | MySQL thật | Hệ quả test | Trạng thái |
|---|---|---|---|---|---|
| 1 | Unique mã môn | `UNIQUE(org_id,code)` (`people-test-schema.sql:84`) | INDEX thường (migration 42:48) | Test trùng mã **pass trên H2, fail trên MySQL** cho tới migration 52 | `CONFLICT` |
| 2 | Unique `(id,org_id)` của lớp | Không có | Dump cũng không có; migration 51 sẽ thêm | Test FK tổ hợp trên H2 không chứng minh được MySQL | `VERIFIED` |
| 3 | CHECK trạng thái lớp | Không có | Dump có CHECK `status`, `close_state` | H2 cho phép dữ liệu MySQL sẽ từ chối | `VERIFIED` |
| 4 | FK tổ hợp `(..., org_id)` | H2 `MODE=MySQL` hỗ trợ composite FK khi có UNIQUE đích | InnoDB yêu cầu index tiền tố trái | H2 pass không đảm bảo MySQL pass nếu thiếu index | `NOT VERIFIED` (chưa chạy) |
| 5 | Nhiều NULL trong UNIQUE `(org_id,code)` | Chưa có test thực tế | MySQL cho phép nhiều NULL | Phải chạy TC-SUB-020 trên MySQL staging | `NOT VERIFIED` |
| 6 | `ON DELETE` trên FK tổ hợp | Không khai báo trong H2 | Không được dùng `SET NULL` | Nếu viết sai, H2 có thể vẫn nhận | `NOT VERIFIED` |
| 7 | Tên constraint | H2 dùng đúng `uq_subject_org_code` | MySQL có thể khác nếu migration 42 chưa chạy | `duplicateSubject()` map theo tên constraint có thể rơi vào nhánh "tên trùng" | `NOT VERIFIED` (schema live) |
| 8 | Cột sinh `primary_class_id … STORED` (D-15) | H2 `MODE=MySQL` không hỗ trợ → cột thường + service set | MySQL 8 hỗ trợ; UNIQUE trên cột sinh chặn 2 primary/lớp | Test H2 xanh **không** chứng minh ràng buộc "tối đa một primary" hay bất biến tối thiểu | `NOT VERIFIED` (chờ MySQL staging) |

**Kết luận:** H2 chỉ dùng để chạy nhanh logic; **không** đủ chứng minh migration/FK/CHECK. Bắt buộc
kiểm DDL + hành vi trên MySQL staging (TC-LEG-008 và nhóm TC-SUB).

---

## 10. Điều kiện tiên quyết của migration

### 10.1. Trước khi tạo migration

| # | Điều kiện | Cách kiểm | Trạng thái |
|---|---|---|---|
| 1 | Migration 42 đã chạy (có cột `subject.code`, index `uq_subject_org_code`) | `SHOW COLUMNS/SHOW INDEX` trên staging | `NOT VERIFIED` |
| 2 | Không có mã môn trùng `(org_id, code)` với `code IS NOT NULL` | `GROUP BY org_id, code HAVING COUNT(*)>1` | `NOT VERIFIED` |
| 3 | `school_class` chưa có UNIQUE `(id,org_id)` | `SHOW INDEX FROM school_class` | `NOT VERIFIED` |
| 4 | Không có bảng `curriculum*`, `class_subject`, `teacher_subject`, `specialty_subject` | `SHOW TABLES LIKE` | `NOT VERIFIED` |
| 5 | Staging MySQL 8 riêng, có backup | Người dùng xác nhận | `NOT VERIFIED` |

### 10.2. Thứ tự DDL bắt buộc

**Migration 51** (`51_people_curriculum.sql` — draft trong `docs/phase-1/migrations/`):
1. `curriculum` — PK `id`, UNIQUE `(id,org_id)`, `(org_id,code)`, `(org_id,name_unaccented)`, cột `version`.
2. `curriculum_subject` — PK `(curriculum_id, subject_id)`; UNIQUE `(curriculum_id, sequence_no)`;
   **UNIQUE `(curriculum_id, subject_id, org_id)`** (đích FK tổ hợp); FK `(curriculum_id,org_id)`,
   `(subject_id,org_id)`.
3. `curriculum_subject_prerequisite` — PK 3 cột; 2 FK tổ hợp 3 cột trỏ `curriculum_subject`;
   CHECK `subject_id <> prerequisite_subject_id`.
4. `school_class.curriculum_id` (nullable) + FK `(curriculum_id,org_id)`.
5. **`uq_school_class_id_org (id, org_id)`** — bắt buộc trước 52.

**Migration 52** (`52_people_class_subject.sql` — draft trong `docs/phase-1/migrations/`):
1. `specialty_subject` (PK `(specialty_id,subject_id)`, FK tổ hợp).
2. `teacher_subject` (PK `(user_id,subject_id)`, `status DEFAULT 'APPROVED'`, CHECK 3 giá trị).
3. `class_subject` (PK `(class_id,subject_id)`; FK `(class_id,org_id)`, `(subject_id,org_id)`,
   `(teacher_id,org_id)`; `source ∈ LEGACY/CURRICULUM/MANUAL`;
   **`is_primary tinyint(1) NOT NULL DEFAULT 0`**, cột sinh `primary_class_id STORED` +
   `UNIQUE uq_class_subject_primary (primary_class_id)` → DB bảo đảm **tối đa** một primary/lớp;
   **tối thiểu** do transaction + app).
4. **`class_subject_history`** — snapshot môn cũ/mới (`id/code/name`), `old_teacher_id`,
   `old_source`/`new_source`, `reason NOT NULL` (≤500), `operation_id NOT NULL`,
   `changed_by`, `changed_at`; `UNIQUE (org_id, operation_id)` chống ghi trùng khi retry;
   FK `(class_id,org_id)` RESTRICT; snapshot **không** FK tới `subject`/`staff_profile`.
5. Backfill **exact-match**: chỉ tạo dòng `LEGACY` khi lớp có `subject_id`, chưa có dòng khớp, và
   chưa có primary; sau đó `is_primary = 1` cho dòng khớp chính xác nếu chưa có primary.
   Lớp 0 khớp / >1 primary / primary lệch / subject–giáo viên–lớp mồ côi → `BLOCK_MIGRATION`,
   phải **sửa dữ liệu** trước 52 (không còn nhánh “ghi nhận rà soát tay”).
6. `CALL mems_m52_assert_no_duplicate_primary` trước khi thêm UNIQUE.
7. Chuyển `uq_subject_org_code` từ INDEX → **UNIQUE** — chỉ sau pre-check §10.1 mục 2
   (khối hiện đang comment trong draft, chờ kết quả pre-check).

**Migration 53:** **không tạo.** Chỉ tạo khi có bằng chứng một môi trường đã áp một bản 52 cũ
(chưa có `is_primary`/history) và cần nâng cấp tại chỗ; repo hiện tại dừng ở migration 50 nên mọi
môi trường chưa có 52 chỉ cần chạy 51 → 52.

**H2:** H2 không hỗ trợ generated column `STORED`; fixture dùng cột `primary_class_id` thường +
UNIQUE và service phải tự set cùng `is_primary`. Fixture **không** chứng minh được bất biến tối
thiểu (bảng có primary khi `subject_id ≠ NULL`) — phải kiểm trên MySQL staging (xem
`database-schema.md` §9.1).

### 10.3. Điểm dễ lỗi trên MySQL

| Lỗi | Nguyên nhân | Phòng tránh | Trạng thái |
|---|---|---|---|
| `errno 1215/1822` | FK thiếu index/UNIQUE đích | Tạo `uq_school_class_id_org` và triple UNIQUE trong 51 | `VERIFIED` (thiết kế) |
| `errno 1061` | Tên index trùng khi chạy lại | Dùng pattern procedure của migration 42 | `VERIFIED` |
| `errno 1062` | `ADD UNIQUE` khi còn dữ liệu trùng | Pre-check + dọn tay trước | `NOT VERIFIED` (dữ liệu) |
| FK xoá nhầm `org_id` | `ON DELETE SET NULL` trên FK tổ hợp | Chỉ dùng `RESTRICT`/`CASCADE` hợp lý | `VERIFIED` (thiết kế) |
| Rollback | Không theo thứ tự ngược | Drop bảng mới trước (history trước `class_subject`), cột/index sau | `VERIFIED` (thiết kế) |
| Backfill `is_primary` bị UNIQUE chặn | Dữ liệu cũ có >1 dòng khớp `school_class.subject_id` | Chỉ exact-match; assert `mems_m52_assert_no_duplicate_primary`; dòng mơ hồ vào báo cáo tay | `NOT VERIFIED` (dữ liệu) |
| Generated column trong `INSERT ... SELECT` | Liệt kê cột sinh vào INSERT gây lỗi 3105 | Không liệt kê `primary_class_id` trong danh sách cột | `VERIFIED` (thiết kế) |
| Hiểu sai UNIQUE = "đúng một primary" | UNIQUE trên cột NULL-able chỉ chặn **>1**, không bảo đảm **≥1** | Document + transaction/app giữ `subject_id ↔ primary`; TC-CLS-047 | `VERIFIED` (thiết kế) |

---

## 11. Vấn đề chặn (blocking) và quyết định cần chốt

| ID | Vấn đề | Ảnh hưởng | Đề xuất xử lý | Cần người dùng quyết? | Trạng thái |
|---|---|---|---|---|---|
| BLK-01 | Không có quyền đọc DB staging trong WP0 → chưa biết mã môn trùng, schema live, module state | Không thể xác nhận `ADD UNIQUE` an toàn | Người dùng chạy pre-check §10.1 và gửi kết quả | Có (quyền truy cập) | `NOT VERIFIED` |
| BLK-02 | Migration 51/52 chưa tồn tại ở gốc repo | WP1 chưa thể chạy | Draft đã có trong `docs/phase-1/migrations/`; người dùng review rồi chạy staging | Không (đúng kế hoạch) | `READY FOR USER REVIEW` |
| BLK-03 | H2 khác MySQL (unique, CHECK, FK, generated column) | Test H2 xanh không đủ bằng chứng | Fixture đã cập nhật; vẫn phải chạy MySQL staging | Không | `CONFLICT` |
| BLK-04 | `PUT /classes/{id}` cho đổi môn chính khi lớp `DANG_DIEN_RA` | Trước Revision 2: phá snapshot D-08 | **ĐÃ CHỐT (Revision 2/3):** cho phép, nhưng phải đi qua `class_subject_history` + đồng bộ `school_class.subject_id` + `class_subject.is_primary` trong **một transaction**, không chuyển giáo viên, không xoá lịch sử; `PUT /classes/{id}` bắt buộc `reason`/`operationId`/`version` và uỷ thác cùng luồng | Không (đã quyết) | `RESOLVED` |
| BLK-09 | Idempotency/retry đổi môn chính | Gọi lại có thể sinh 2 dòng lịch sử | `operation_id` bắt buộc + UNIQUE `(org_id, operation_id)`; cùng payload → kết quả cũ, khác payload → 409 | Không (đã ghi hợp đồng) | `VERIFIED` (thiết kế) |
| BLK-05 | Bật module guard cho Subject có thể 403 hàng loạt | Ảnh hưởng tổ chức đang tắt module | Kiểm module state trước; bật cùng lúc với WP2 sau xác nhận | Có (dữ liệu) | `NOT VERIFIED` |
| BLK-06 | `curriculum.*` chưa có trong catalog → gán chức danh bị `UNKNOWN_PERMISSION` | Chặn cấu hình quyền | Deploy catalog trước, rồi gán | Không (thứ tự) | `VERIFIED` |
| BLK-07 | Gateway thiếu `/api/curricula/**` | FE không gọi được curriculum qua gateway | Thêm route khi làm WP4/Stage 2 | Không | `VERIFIED` |
| BLK-08 | Bundle `ACADEMIC_MANAGEMENT` đang được gán cho những chức danh nào | Thêm curriculum vào bundle có thể cấp ngoài ý muốn | Người dùng xác nhận danh sách chức danh | Có | `NOT VERIFIED` |

**Không có vấn đề chặn nào ngăn việc soạn migration 51** (không phụ thuộc dữ liệu). Điều kiện chặn
chỉ áp cho bước cuối của 52 (chuyển UNIQUE) và cho việc bật module guard.

---

## 12. Thứ tự triển khai đề xuất

```text
WP0 (xong) → chạy pre-check BLK-01 (BLK-04 đã chốt ở Revision 2/3)
WP1  Review draft migration 51 → 52 (không có 53) + H2 fixture + pre/post-check + rollback,
     người dùng chạy staging
WP2  Subject: module guard, check-code, usage, SUBJECT_CODE_EXISTS, SUBJECT_INACTIVE
     (có thể chạy song song WP1 sau khi có cột/index; guard chỉ bật sau BLK-05)
WP3  Teacher–Subject: catalog ánh xạ chuyên môn, API, đổi teachesSubject/subjectMismatch, assignable?subjectId
WP4  Curriculum: catalog quyền mới (BLK-06) → CRUD + tiên quyết + version + Gateway route
WP5  Class–Subject: snapshot, áp curriculum, giáo viên theo môn, bảo vệ dòng primary/LEGACY,
     PrimarySubjectChangeService (history + is_primary + atomic sync + idempotency)
WP6  Internal API/outbox hook (chỉ khi chuẩn bị Phase 2)
WP7  Test + E2E trên MySQL staging; báo cáo trung thực phần chưa kiểm được
WP8  Handoff FE + cập nhật docs nếu quyết định đổi
```

**Cổng kiểm soát giữa các bước:**

| Cổng | Điều kiện qua cổng |
|---|---|
| Trước WP1 | BLK-01 có kết quả |
| Trước WP2 | WP1 chạy 2 lần idempotent trên staging; H2 schema đồng bộ |
| Trước WP4 | Catalog quyền đã deploy; BLK-08 xác nhận; Gateway route đã thêm |
| Trước WP5 | WP3 + WP4 test xanh; luồng đổi môn chính đã có thiết kế chốt trong `api-contract.md` §4.8 |
| Trước WP8 | E2E qua gateway; không regression Subject/Lớp hiện có |

---

## 13. Danh sách file cần thay đổi ở các giai đoạn sau

> Phân công theo quy tắc dự án: **AI** phụ thuộc thiết kế DB/migration, React Frontend, tài liệu hợp đồng;
> **người dùng** viết toàn bộ Java Spring Boot (Entity/DTO/Repository/Service/Controller/validation/
> authorization/business rules). AI có thể soạn spec/diff đề xuất và review, không tự sửa Java.

| # | File | Hành động | Giai đoạn | Người thực hiện |
|---|---|---|---|---|
| 1 | `51_people_curriculum.sql` (gốc repo) | Tạo mới — draft đã có ở `docs/phase-1/migrations/` | WP1 | AI soạn draft, người dùng review/chạy |
| 2 | `52_people_class_subject.sql` (gốc repo) | Tạo mới — gồm `class_subject.is_primary`, cột sinh `primary_class_id` + UNIQUE, `class_subject_history`, backfill exact-match | WP1 | AI soạn draft, người dùng review/chạy |
| 2a | `53_people_class_subject_history.sql` | **Không tạo** trừ khi có bằng chứng môi trường đã áp bản 52 cũ | WP1 (chỉ khi có bằng chứng) | — |
| 3 | `backend/PeopleService/src/test/resources/people-test-schema.sql` | Đã cập nhật (bảng mới; `is_primary` thường + history; ghi chú parity) | WP1 | AI soạn, người dùng review |
| 4 | `backend/IdentityService/.../service/PermissionCatalog.java` | Thêm `curriculum.view/manage` + bundle | WP4 (có thể sớm hơn) | Người dùng |
| 5 | `backend/PeopleService/.../exception/ErrorCode.java` | Thêm mã 2222+/3043+ | WP2–WP5 | Người dùng |
| 6 | `backend/PeopleService/.../dto/SubjectRequest.java` | Giữ `code` tuỳ chọn; bổ sung message nếu cần | WP2 | Người dùng |
| 7 | `backend/PeopleService/.../repository/SubjectRepository.java` | Check-code, usage, map `SUBJECT_CODE_EXISTS` | WP2 | Người dùng |
| 8 | `backend/PeopleService/.../controller/SubjectController.java` | Module guard + 2 endpoint mới | WP2 | Người dùng |
| 9 | `backend/PeopleService/.../service/SchoolClassService.java` | `PUT /classes/{id}` uỷ thác `PrimarySubjectChangeService` khi `subjectId` đổi; logic class-subject | WP5 | Người dùng |
| 10 | `backend/PeopleService/.../controller/SchoolClassController.java` | 7 endpoint lớp–môn (gồm `subjects/primary` và `subject-history`) | WP5 | Người dùng |
| 11 | `backend/PeopleService/.../dto/SchoolClassResponse.java` | Thêm `curriculumId` | WP5 | Người dùng |
| 12 | `backend/PeopleService/.../repository/TeacherRepository.java` | `teachesSubject`/`subjectMismatch` theo bảng mới; `assignable(subjectId)` | WP3 | Người dùng |
| 13 | `backend/PeopleService/.../service/TeacherService.java` | Đồng bộ `teacher_subject` khi đổi chuyên môn | WP3 | Người dùng |
| 14 | `backend/PeopleService/.../controller/TeacherController.java` | 4 endpoint môn giáo viên + `subjectId` | WP3 | Người dùng |
| 15 | `backend/PeopleService/.../controller/SpecialtyController.java` + repository/service | Ánh xạ `specialty_subject` | WP3 | Người dùng |
| 16 | `backend/PeopleService/.../controller/CurriculumController.java` | Tạo mới | WP4 | Người dùng |
| 17 | `backend/PeopleService/.../service/CurriculumService.java` | Tạo mới | WP4 | Người dùng |
| 18 | `backend/PeopleService/.../repository/CurriculumRepository.java` | Tạo mới | WP4 | Người dùng |
| 19 | `backend/PeopleService/.../repository/CurriculumSubjectPrerequisiteRepository.java` | Tạo mới | WP4 | Người dùng |
| 20 | `backend/PeopleService/.../dto/Curriculum*.java` | Tạo mới | WP4 | Người dùng |
| 21 | `backend/PeopleService/.../repository/ClassSubjectRepository.java` | Tạo mới | WP5 | Người dùng |
| 22 | `backend/PeopleService/.../dto/ClassSubject*.java` | Tạo mới (thêm `isPrimary`) | WP5 | Người dùng |
| 22a | `backend/PeopleService/.../repository/ClassSubjectHistoryRepository.java` | Tạo mới (D-08/D-15) | WP5 | Người dùng |
| 22b | `backend/PeopleService/.../service/PrimarySubjectChangeService.java` | Tạo mới — một `@Transactional` dùng chung cho cả 2 đường ghi | WP5 | Người dùng |
| 22c | `backend/PeopleService/.../dto/PrimarySubjectChange*.java` | Tạo mới (request/response/history item) | WP5 | Người dùng |
| 23 | `backend/PeopleService/.../repository/TeacherSubjectRepository.java` | Tạo mới | WP3 | Người dùng |
| 24 | `backend/PeopleService/.../dto/TeacherSubject*.java` | Tạo mới | WP3 | Người dùng |
| 25 | `backend/PeopleService/.../controller/InternalScheduleLookupController.java` | Thêm endpoint nội bộ | WP6 | Người dùng |
| 26 | `backend/APIGateway/src/main/resources/application.yml` | Thêm route `/api/curricula/**` | WP4 | AI đề xuất diff, người dùng áp dụng |
| 27 | `frontend/src/features/academic/api.ts` | Client curriculum/lớp–môn/giáo viên–môn | Stage 2 | AI |
| 28 | `frontend/src/features/academic/types.ts` | Kiểu mới | Stage 2 | AI |
| 29 | `frontend/src/lib/permissions.ts` | Thêm `curriculumView/Manage` | Stage 2 | AI |
| 30 | `frontend/src/lib/nav.ts` | Prefix `curriculum.` + menu | Stage 2 | AI |
| 31 | `frontend/src/app/app.tsx` | Route curriculum + guard | Stage 2 | AI |
| 32 | `frontend/src/features/academic/pages/*` (curriculum, lớp–môn) | Trang mới | Stage 2 | AI |
| 33 | `docs/phase-1/*` | Đã cập nhật theo D-08/D-09/D-15 Revision 3 (2026-11-20); cập nhật tiếp nếu quyết định đổi | Xong (Revision 3, chờ duyệt) | AI |

**Không cần sửa:** ScheduleService, FacilityService (trừ khi chuẩn bị Phase 2), các bảng/cột legacy
(`school_class.subject_id`, `teacher_specialty`).

---

## 14. Trạng thái xác minh cho từng phát hiện

| ID | Phát hiện | Trạng thái | Bằng chứng | Bằng chứng còn thiếu |
|---|---|---|---|---|
| F-01 | Branch/HEAD/baseline đúng, `cdd03b8` là tổ tiên | `VERIFIED` | §2 | — |
| F-02 | Source ngoài `docs/` khớp baseline, không sửa cục bộ | `VERIFIED` | `git diff` loại docs = 0 | — |
| F-03 | Working tree chỉ có tài liệu Phase 1 + `review-report.md` | `VERIFIED` | `git status --porcelain` | — |
| F-04 | `GET /subjects` trả mảng, không phân trang (D-13) | `VERIFIED` | `SubjectController.java:37-42` | — |
| F-05 | `code` tuỳ chọn, trim về NULL (D-04) | `VERIFIED` | `SubjectRequest.java:7`; `SubjectRepository.java:72,88` | — |
| F-06 | Không có check-code/usage | `VERIFIED` | `SubjectController.java` (không có mapping) | — |
| F-07 | Trùng mã trả `CONFLICT` thay vì `SUBJECT_CODE_EXISTS` | `CONFLICT` | `SubjectRepository.java:119-125` vs `api-contract.md` §5.1 | Quyết định: WP2 sửa source hay đổi hợp đồng (đề xuất: sửa source) |
| F-08 | Subject không có module guard (D-10) | `CONFLICT` | grep `OrganizationModuleGuard` trong controller = rỗng | Quyết định thời điểm bật + dữ liệu module (BLK-05) |
| F-09 | READ expression rộng như tài liệu ghi chú | `VERIFIED` | `SubjectController.java:21-23`; `api-contract.md:72` | — |
| F-10 | Không có curriculum/class_subject/class_subject_history/teacher_subject/specialty_subject | `VERIFIED` | grep `curriculum`, `class_subject_history`, `is_primary` trong `backend` = 0 | — |
| F-11 | Lớp `DANG_DIEN_RA` vẫn đổi được môn chính | `VERIFIED` (hiện trạng, khớp D-08/D-15) | `SchoolClassService.java:128-135,281-286` vs `api-contract.md` §4.8 | Nghiệm thu đầy đủ ở WP5 (TC-CLS-021…048) |
| F-12 | Lớp học đã có module guard đầy đủ | `VERIFIED` | `SchoolClassService.java:71-252` | — |
| F-13 | Kiểm tra môn giáo viên dựa trên tên chuyên môn | `VERIFIED` (hiện trạng) | `TeacherRepository.java:74-84,278` | Đối soát dữ liệu backfill (WP3) |
| F-14 | `assignable` thiếu `subjectId` | `VERIFIED` | `TeacherController.java:41-47` | — |
| F-15 | Internal API chỉ 2 endpoint; `ClassInfo` không có `subjectId` | `VERIFIED` | `InternalScheduleLookupController.java:28,38`; `ClassInfo.java` | — |
| F-16 | Schedule mirror tên môn, không đổi ở Phase 1 | `VERIFIED` | `ScheduleService.java:300-309` | — |
| F-17 | Facility không phụ thuộc môn | `VERIFIED` | grep trong `FacilityService` | — |
| F-18 | Gateway thiếu route curriculum | `VERIFIED` | `application.yml:118-128` | — |
| F-19 | Dải mã lỗi còn chỗ (2222–2240, 3043–3054) | `VERIFIED` | `ErrorCode.java:80-89,137` | — |
| F-20 | Outbox sẵn cho WP6 | `VERIFIED` | `SchoolClassService.assignTeacher` publish event | — |
| F-21 | Catalog thiếu `curriculum.*` | `VERIFIED` | `PermissionCatalog.java:76-77,118-124` | — |
| F-22 | Catalog tự seed khi khởi động | `VERIFIED` | `IdentityDataInitializer.java:42-82` | — |
| F-23 | Gán mã quyền lạ bị `UNKNOWN_PERMISSION` | `VERIFIED` | `PositionService.java:128-135` | — |
| F-24 | Bundle `ACADEMIC_MANAGEMENT` sẽ tự cấp curriculum nếu thêm | `VERIFIED` | `role-permission-matrix.md:81,179` | Danh sách chức danh đang giữ bundle (BLK-08) |
| F-25 | Chưa có migration 51/52 ở gốc repo | `VERIFIED` | danh sách file gốc repo | Draft đã có trong `docs/phase-1/migrations/`, chưa chạy |
| F-26 | Migration 42 tạo INDEX thường cho `subject.code` | `VERIFIED` | `42_…sql:48` | — |
| F-27 | Dump schema cũ hơn migration 31/42 | `VERIFIED` | `DB_11_16.sql` (thiếu `code`, `cancel_state`) | — |
| F-28 | Schema/dữ liệu live | `NOT VERIFIED` | — | Quyền đọc DB staging |
| F-29 | H2 UNIQUE mã môn ≠ MySQL INDEX | `CONFLICT` | `people-test-schema.sql:84` vs `42_…sql:48` | Chốt: sửa H2 theo MySQL sau 52 (đề xuất) |
| F-30 | H2 thiếu UNIQUE `(id,org_id)`, CHECK, FK | `VERIFIED` | `people-test-schema.sql:108-118` | — |
| F-31 | Hành vi NULL trong UNIQUE trên MySQL | `NOT VERIFIED` | — | Chạy TC-SUB-020 staging |
| F-32 | H2 thiếu bảng Phase 1 | `VERIFIED` | `people-test-schema.sql` | — |
| F-33 | FE Subject khớp API hiện tại | `VERIFIED` | `academic/api.ts`, `types.ts` | — |
| F-34 | FE chưa có curriculum/lớp–môn/giáo viên–môn | `VERIFIED` | grep `frontend/src` | — |
| F-35 | FE thiếu mã quyền + prefix curriculum | `VERIFIED` | `permissions.ts:47-48`; `nav.ts:130` | — |
| F-36 | FE không phân nhánh theo mã lỗi môn | `VERIFIED` | grep = 0 | — |
| F-37 | Trang môn dùng module state cho read-only | `VERIFIED` | `subjects-page.tsx:144-147` | — |
| F-38 | `class.edit` là `orgOnly`, `class.view` là `orgAndDept` | `VERIFIED` | `PermissionCatalog.java:65,67` | — |
| F-39 | Không có `PUT /classes/{id}/subjects/primary`, `GET /classes/{id}/subject-history` | `VERIFIED` (chưa triển khai) | `SchoolClassController.java` (không có mapping) | WP5 |
| F-40 | Không có bảng/cột `class_subject_history`, `class_subject.is_primary` trong source Java/migration gốc | `VERIFIED` (chưa triển khai) | grep `backend` = 0; draft 52 + fixture đã có | WP1 người dùng chạy 52 |
| F-41 | Chưa có mã lỗi cho thao tác môn chính (`CLASS_SUBJECT_OPERATION_CONFLICT` 2240, `REASON_TOO_LONG` 3054) | `VERIFIED` (chưa triển khai) | `ErrorCode.java` dừng ở 2221/3042 | Người dùng thêm ở WP5 |
| F-42 | `school_class.version` đã tồn tại → dùng được `expectedVersion` | `VERIFIED` | `people-test-schema.sql` dòng `version BIGINT NOT NULL DEFAULT 0`; `SchoolClassRepository` tăng version khi update | — |

---

## 15. Xác nhận phạm vi WP0

- Chỉ tạo **một** file: `docs/phase-1/wp0-readiness-report.md`.
- Không sửa file Java/React, không sửa migration, không sửa cấu hình.
- Không kết nối/ghi DB, không chạy SQL thay đổi dữ liệu/schema.
- Không commit/push/merge/đổi branch.
- Không bắt đầu WP1, không triển khai Frontend, không làm Phase 2.

**Cập nhật 2026-11-20 (sau Revision 2 của D-08/D-15):** chỉ sửa các dòng mô tả trong chính file này
(§1, §3.3, §6, §7.2, §9, §10.2, §10.3, §11, §12, §13, §14). Không chạm source Java/React, không
tạo/chạy migration, không kết nối DB, không đổi cấu hình, không commit/push.

**Cập nhật 2026-11-20 (Revision 3):** cập nhật §1, §2, §5.3, §9, §10.2, §10.3, §11, §12, §13, §14
để khớp D-08/D-09/D-15 Revision 3 và các draft WP1 (`docs/phase-1/migrations/`). Không chạy SQL,
không kết nối database, không sửa logic nghiệp vụ Java/React, không commit/push. Các draft migration
và H2 fixture **chưa được xác minh trên MySQL**; trạng thái tổng thể là `READY FOR USER REVIEW`.

**Trạng thái:** WP0 hoàn tất phần audit. **Dừng chờ người dùng review và phê duyệt** trước khi
chuyển sang WP1.
