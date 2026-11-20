# Phase 1 — Nghiệp vụ Quản lý Môn học (Subject)

> Tài liệu thiết kế nghiệp vụ. **Không phải** bằng chứng chức năng đã triển khai.
> Mọi kết luận "Đã có" bám vào source code tại HEAD `cdd03b8`; các phần "Đề xuất" chưa có trong code.
> Người đọc triển khai Backend: đọc kèm `docs/phase-1/database-schema.md`, `api-contract.md`,
> `validation-and-error-cases.md`, `test-cases.md` và `implementation-roadmap.md`.

---

## 0. Quy ước trạng thái

| Nhãn | Ý nghĩa |
|---|---|
| **Đã có** | Có trong code + schema tại HEAD, đã kiểm chứng bằng file cụ thể |
| **Một phần** | Có nhưng thiếu trường/rule/quyền, hoặc schema thật lệch schema test |
| **Chưa có** | Không tồn tại trong repo |
| **Đề xuất** | Ý kiến kỹ thuật của tài liệu, **chưa phải quyết định nghiệp vụ** |
| **NEEDS_USER_DECISION** | Nhãn lịch sử, **không còn dùng** — mọi `D-xx` đã chốt ở mục 3 |

Quy ước minh hoạ: tổ chức mẫu `11111111-1111-4111-8111-111111111111`; môn `Toán`
`99999999-9999-4999-8999-999999999001`; lớp `C001 / Lớp 10A`
`55555555-5555-4555-8555-555555555001`.

---

## 1. Phạm vi và nguồn sự thật

### 1.1. Trong phạm vi

- Vòng đời môn học: tạo, cập nhật, xem, danh sách, tìm kiếm/lọc, kích hoạt/ngừng hoạt động.
- Mã môn: bắt buộc hay không, duy nhất theo tổ chức hay không.
- Phạm vi dữ liệu theo tổ chức và cách ly giữa các tổ chức.
- Quyền quản lý môn học (dùng cơ chế RBAC hiện có, không tạo role mới).
- Ảnh hưởng của môn học tới Curriculum, Class–Subject và Teacher–Subject (đặc tả ở tài liệu riêng).

### 1.2. Ngoài phạm vi

- Xếp lịch tự động, thuật toán tối ưu (Phase 2).
- Thay đổi role hệ thống hoặc quyền mặc định đang chạy.
- Chạy migration trên database thật.

### 1.3. Nguồn sự thật đã kiểm chứng

| Thành phần | File |
|---|---|
| Controller | `backend/PeopleService/src/main/java/com/mems/controller/SubjectController.java` |
| Repository | `backend/PeopleService/src/main/java/com/mems/repository/SubjectRepository.java` |
| DTO | `backend/PeopleService/src/main/java/com/mems/dto/SubjectRequest.java`, `SubjectResponse.java`, `SubjectStatusRequest.java` |
| Bảng gốc | `DB_11_16.sql:603` (`CREATE TABLE subject`) |
| Migration bổ sung cột | `42_people_subject_management.sql` |
| Quyền | `backend/IdentityService/src/main/java/com/mems/service/PermissionCatalog.java` (dòng 75–77) |
| Lỗi | `backend/PeopleService/src/main/java/com/mems/exception/ErrorCode.java` (`SUBJECT_NOT_FOUND` 2218, `CONFLICT` 2215) |
| Schema test | `backend/PeopleService/src/test/resources/people-test-schema.sql` (dòng 78–84) |

---

## 2. Hiện trạng đối chiếu

| Chức năng | Trạng thái | Ghi chú đã kiểm chứng |
|---|---|---|
| Tạo môn | Đã có | `POST /subjects`, quyền OWNER hoặc `subject.manage` |
| Cập nhật môn | Đã có | `PUT /subjects/{id}`, không có optimistic version |
| Xem chi tiết | Đã có | `GET /subjects/{id}` |
| Danh sách | Đã có | `GET /subjects`, trả toàn bộ, không phân trang |
| Tìm theo tên | Đã có | `name_unaccented LIKE ?` |
| Lọc trạng thái | Một phần | Chỉ cờ `includeInactive`; không lọc riêng "ngừng hoạt động" |
| Kích hoạt/ngừng | Đã có | `PATCH /subjects/{id}/status` |
| Kiểm tra mã trùng | Một phần | Chỉ bắt `DuplicateKeyException`; migration 42 tạo **INDEX thường** `uq_subject_org_code`, không phải UNIQUE |
| Kiểm tra tên trùng | Đã có | UNIQUE `uq_subject_org_name(org_id,name_unaccented)` |
| Cách ly tổ chức | Đã có | Mọi truy vấn có `org_id=?` lấy từ JWT |
| Xoá môn | Chưa có | Không có DELETE; dùng ngừng hoạt động + FK RESTRICT |
| Phân trang/sắp xếp | Chưa có | Trả `List<SubjectResponse>` |
| Tìm theo mã | Chưa có | Chỉ tìm theo tên |
| API check-code | Chưa có | FE không thể kiểm mã trước khi lưu |
| Module guard | Chưa có | `SubjectController` không gọi `OrganizationModuleGuard` (Student/Class có) |
| Audit | Đã có | `PeopleAuditService.record` cho create/update/status |

### 2.1. Hợp đồng hiện tại (giữ nguyên nếu không có quyết định khác)

```
SubjectRequest   (code ≤ 50, optional; name required ≤ 200; description ≤ 500)
SubjectResponse  (id, code, name, description, active, createdAt, updatedAt)
```

- Success trả **raw DTO** (không bọc `ApiResponse`), theo `SubjectController`.
- Lỗi trả `ApiResponse` qua `GlobalExceptionHandler`: `{success:false, code:"SUBJECT_NOT_FOUND", message:"...", data:null}`.
- Gateway chỉ có route `/api/subjects/**` (StripPrefix=1); gọi `/subjects` trần sẽ 404.

---

## 3. Sổ quyết định (Decision Register)

> **Toàn bộ `D-01`…`D-15` đã được người dùng chốt và ghi ở trạng thái CONFIRMED.**
> Không còn mục nào `NEEDS_USER_DECISION`. Tài liệu không sửa catalog quyền, không tạo migration,
> không thay đổi source; người dùng tự triển khai theo các quyết định dưới đây.

| ID | Câu hỏi | Quyết định cuối (CONFIRMED) | Ảnh hưởng chính |
|---|---|---|---|
| D-01 | Một lớp học một môn hay nhiều môn? | Nhiều môn qua `class_subject`; giữ `school_class.subject_id` làm môn chính legacy | Thêm bảng, API lớp–môn; Schedule giữ mirror text ở Phase 1 |
| D-02 | Curriculum gắn theo lớp / khối / chương trình? | Curriculum là **template cấp tổ chức**, tái sử dụng; lớp tham chiếu **một** curriculum; **không có mô hình học kỳ** | Thêm `curriculum`, `curriculum_subject`, `class_subject`; `school_class.curriculum_id` |
| D-03 | Số buổi, thời lượng, giờ LT/TH khai báo ở đâu? | Bắt buộc ở `curriculum_subject`; `subject` có default tuỳ chọn; `class_subject` override trước khi xếp lịch. **Không** bắt buộc `theory + practice = required` | Thêm cột; validation |
| D-04 | Mã môn bắt buộc và duy nhất? | **Tuỳ chọn**; nếu có giá trị thì UNIQUE `(org_id, code)`; NULL legacy hợp lệ | Đổi index 42 thành UNIQUE sau pre-check; FE không bắt buộc |
| D-05 | Ai quản lý môn học? | **Giáo vụ (Academic Affairs)** quản lý môn toàn tổ chức qua quyền được cấp; `subject.view/manage` giữ ORGANIZATION | Không đổi scope; cấp qua chức danh/vị trí |
| D-06 | Chuyên môn giáo viên lưu theo Subject ID hay Specialty ID? | Cả hai: `specialty_subject` để gán hàng loạt; `teacher_subject` là **nguồn sự thật** theo Subject ID | Thêm 2 bảng; đổi `teachesSubject` |
| D-06a | Có quy trình duyệt chuyên môn không? | **KHÔNG duyệt ở Phase 1**: mọi dòng gán `APPROVED`; không có API approve/reject, không tạo `PENDING` | Cột `status` giữ cho Phase 2; bỏ endpoint duyệt |
| D-07 | Môn tiên quyết: một hay nhiều, chặn hay cảnh báo? | **Nhiều tiên quyết** qua bảng nối riêng `curriculum_subject_prerequisite`; Phase 1 **chỉ cảnh báo**; tự trỏ/trùng/chu trình bị chặn | Thêm bảng nối + 2 FK tổ hợp; API mảng `prerequisiteSubjectIds` |
| D-08 | Đổi curriculum/môn khi lớp đang học? | **`CHUA_BAT_DAU`**: đổi curriculum và danh sách môn trực tiếp. **`DANG_DIEN_RA`**: chỉ được đổi **môn chính**; bắt buộc ghi `class_subject_history` với snapshot **môn cũ/mới (ID + mã + tên), giáo viên cũ, nguồn cũ/mới (`old_source`/`new_source`), lý do, người thực hiện, thời điểm, `operation_id`**; **không** ghi đè curriculum hiện tại, **không** chép giáo viên cũ sang môn mới. **`DA_KET_THUC`/`DA_HUY`/`CLOSED`**: không dùng thao tác thường; sửa lịch sử cần quy trình riêng (ngoài Phase 1). | `class_subject_history`, API đổi môn chính, test |
| D-09 | Giáo viên theo từng môn hay một giáo viên chủ nhiệm? | **Chỉ fallback** sang `school_class.teacher_id` khi lớp **chưa có bản ghi `class_subject` tương ứng**. Nếu bản ghi đã tồn tại mà `teacher_id = NULL` → **không fallback**; hiểu là môn chưa phân công. Không kế thừa giáo viên khi đổi môn chính | Thêm cột; gán giáo viên theo môn |
| D-10 | Module guard cho môn/curriculum? | Dùng `STUDENT_MANAGEMENT` như Class | Sửa controller (người dùng code) |
| D-11 | Backfill dữ liệu cũ? | Chỉ backfill khớp **chính xác, không mập mờ**; bản ghi không khớp/bị mập mờ phải báo cáo để xử lý tay, **không đoán** | Script backfill + báo cáo |
| D-12 | Curriculum sửa tại chỗ hay tạo phiên bản? | Sửa tại chỗ + tăng `version`; lớp giữ snapshot; không bảng `curriculum_version` | Cột `version`, rule |
| D-13 | `GET /subjects` giữ mảng hay phân trang? | **Giữ mảng** `[SubjectResponse]` — FE khai báo `Subject[]` | Hợp đồng API, FE |
| D-14 | Quyền Curriculum? | Tạo **`curriculum.view`** và **`curriculum.manage`** riêng; ORGANIZATION scope; cấp cho Giáo vụ qua **chức danh (position-based)**, không tự cấp cho mọi nhân viên | Permission catalog, RBAC, API, test |
| D-15 | Đồng bộ `school_class.subject_id` legacy với `class_subject`? | Giữ cột. `class_subject.is_primary` đánh dấu môn chính. **DB chỉ bảo đảm tối đa một primary/lớp**; "tối thiểu một primary khi `school_class.subject_id != NULL`" do **transaction + application validation** bảo đảm. Đổi môn chính trong **một transaction**: ghi `class_subject_history` → cập nhật `school_class.subject_id` → `class_subject.is_primary` (tái dùng dòng đã có, không tạo trùng). API thường **không xoá** dòng primary/legacy hay history. Không chuyển giáo viên cũ sang môn mới. | `class_subject.is_primary`, `class_subject_history`, API, test |

### 3.1. D-01 — Lớp nhiều môn (CONFIRMED)

Một lớp có thể học **nhiều môn** qua `class_subject`. Giữ `school_class.subject_id` làm môn
chính legacy để tương thích ngược; khi lớp chưa có `class_subject`, API suy ra một dòng
`source=LEGACY`. Không xoá cột legacy.

### 3.2. D-02 — Curriculum là template cấp tổ chức (CONFIRMED)

`curriculum` là template tái sử dụng ở cấp tổ chức; một lớp tham chiếu **một** curriculum
(`school_class.curriculum_id` nullable). Khi áp dụng, chép `curriculum_subject` → `class_subject`
(snapshot). **Không có mô hình học kỳ**: không bảng `academic_term`, không cột `term_no`.

### 3.3. D-03 — Nơi khai báo số buổi/thời lượng (CONFIRMED)

- Bắt buộc khai báo ở `curriculum_subject`: `required_sessions`, `theory_sessions`,
  `practice_sessions`, `session_minutes`.
- `subject` chỉ có default **tuỳ chọn**.
- `class_subject` được override `planned_sessions`/`session_minutes` **trước khi** có buổi học.
- **Không** đặt `theory_sessions + practice_sessions = required_sessions` như quy tắc bắt buộc.
- Đơn vị "tiết" và 45 phút chỉ là ví dụ, không phải quy tắc cứng trong code.

### 3.4. D-04 — Mã môn tuỳ chọn + UNIQUE khi có giá trị (CONFIRMED)

- `code` **không bắt buộc**; bản ghi mới có thể không có mã.
- Nếu có giá trị: UNIQUE `(org_id, code)`; nhiều NULL trong cùng org hợp lệ.
- Hiện migration 42 tạo **INDEX thường**; phải pre-check trùng rồi `DROP INDEX` + `ADD UNIQUE`.
- API trả `SUBJECT_CODE_EXISTS` khi trùng; **FE không đánh dấu required**.
- Thêm `GET /subjects/check-code` là tiện ích, không thay pre-check phía server.

### 3.5. D-05 — Giáo vụ quản lý môn học (CONFIRMED)

Giáo vụ (Academic Affairs) quản lý môn toàn tổ chức thông qua quyền được cấp
(`subject.view`/`subject.manage`, ORGANIZATION scope), gắn vào **chức danh** của họ.
Không mở scope DEPARTMENT cho danh mục môn; không tách `subject.create/edit/delete` ở Phase 1.
Module guard `STUDENT_MANAGEMENT` áp theo D-10.

### 3.6. D-06 / D-06a — Chuyên môn giáo viên (CONFIRMED)

- Lưu **cả hai**: `specialty_subject` (ánh xạ danh mục để gán hàng loạt) và `teacher_subject`
  (nguồn sự thật khi kiểm tra dạy môn, theo Subject ID).
- `teacher_specialty` **giữ nguyên** cho lịch sử nhân sự.
- **Không có quy trình duyệt ở Phase 1:** mọi dòng gán `status='APPROVED'`, `source` là
  `SPECIALTY` hoặc `MANUAL`; thu hồi đặt `REVOKED` (không xoá dòng).
- **Không có** endpoint approve/reject, không tạo `PENDING`, không có quyền
  `teacher.expertise.approve` ở Phase 1. Cột `status` vẫn khai báo 3 giá trị để Phase 2 mở rộng.

### 3.7. D-07 — Nhiều tiên quyết, chỉ cảnh báo (CONFIRMED)

- Bảng nối riêng `curriculum_subject_prerequisite` với PK
  `(curriculum_id, subject_id, prerequisite_subject_id)`.
- Hai FK tổ hợp 3 cột cùng trỏ `curriculum_subject(curriculum_id, subject_id, org_id)` bảo đảm
  tiên quyết cùng curriculum và cùng org.
- Tự tiên quyết bị CHECK chặn; cạnh trùng bị PK chặn; chu trình dài bị service DFS chặn.
- Phase 1 **chỉ cảnh báo** khi môn tiên quyết chưa đạt; không chặn xếp lịch.
- API dùng mảng `prerequisiteSubjectIds` (0..n), không dùng cột đơn.

### 3.8. D-08 — Snapshot lịch sử khi lớp đang học (CONFIRMED)

`class_subject` là snapshot. Sửa curriculum **không** lan sang lớp đã có `class_subject`.

| Trạng thái lớp | Đổi curriculum | Thêm/bớt môn | Đổi **môn chính** |
|---|---|---|---|
| `CHUA_BAT_DAU` | Được (`PUT /classes/{id}/curriculum`) | Được | Được — ghi history |
| `DANG_DIEN_RA` | Không | Không | **Được** — chỉ đổi primary, ghi `class_subject_history` |
| `DA_KET_THUC` / `DA_HUY` / `CLOSED` | Không | Không | Không dùng thao tác thường; sửa lịch sử cần quy trình riêng (ngoài Phase 1) |

- **Lịch sử bắt buộc:** mỗi lần đổi môn chính khi lớp đã hoạt động phải ghi một dòng
  `class_subject_history` với snapshot **môn cũ/mới** (`old_subject_id/code/name`,
  `new_subject_id/code/name`), `old_teacher_id`, **`old_source`/`new_source`** (nguồn gốc
  `LEGACY`/`CURRICULUM`/`MANUAL`), `reason`, `operation_id`, `changed_by`, `changed_at`. Snapshot
  **không** join lại bảng `subject`/`staff_profile` để hiển thị (môn có thể đổi tên/ngừng, giáo
  viên có thể nghỉ).
- **Trường bắt buộc trên request đổi môn chính:** `subjectId`, `reason` (≤ 500 ký tự),
  `expectedVersion`, `operationId`. `changedBy` lấy từ JWT, **không** nhận từ body.
- **Idempotency:** cùng `operationId` + cùng payload chuẩn hoá → trả lại kết quả thành công cũ
  (không tạo history mới); cùng `operationId` nhưng payload khác → 409. `expectedVersion` sai →
  xung đột phiên bản (409). Transaction lỗi → không để lại history một phần.
- **Không ghi đè curriculum:** đổi môn chính **không** tự áp lại `curriculum_subject`; các dòng
  `class_subject` khác giữ nguyên.
- **Không chép giáo viên:** `old_teacher_id` chỉ lưu vào history; dòng môn mới có `teacher_id = NULL`
  để người dùng gán riêng.
- Lớp `DA_KET_THUC/DA_HUY/CLOSED` read-only (`CLASS_NOT_EDITABLE`).

### 3.9. D-09 — Giáo viên theo môn (CONFIRMED)

`class_subject.teacher_id` nullable và là **nguồn sự thật** khi bản ghi `class_subject` tồn tại.

- **Chỉ fallback** sang `school_class.teacher_id` khi lớp **chưa có bản ghi `class_subject`
  tương ứng** (lớp legacy; response suy một dòng `source=LEGACY`, không ghi DB).
- Nếu bản ghi `class_subject` **đã tồn tại** nhưng `teacher_id = NULL` → **không fallback**;
  trạng thái được hiểu là **môn chưa được phân công giáo viên**.
- Đổi môn chính **không** kế thừa giáo viên cũ sang môn mới.
- Gán giáo viên theo môn dùng cùng rule chuyên môn (D-06). Một môn/một lớp có tối đa một giáo
  viên ở Phase 1.

### 3.10. D-10 — Module guard (CONFIRMED)

`SubjectController` và controller curriculum gọi
`moduleGuard.requireModuleReadable/requireModule(orgId, "STUDENT_MANAGEMENT")` giống Class.
Tổ chức tắt module ⇒ 400 `MODULE_NOT_ENABLED`. Không tạo module mới.

### 3.11. D-11 — Backfill chính xác, không đoán (CONFIRMED)

1. `specialty_subject`: chỉ ghép khi `name_unaccented` khớp **duy nhất**; nếu một chuyên môn
   khớp >1 môn hoặc không khớp, ghi báo cáo để xử lý tay.
2. `teacher_subject`: sinh từ `teacher_specialty ⨝ specialty_subject` (chỉ các cặp đã xác định).
3. `class_subject`: từ `school_class.subject_id` với ID chính xác.
Không xoá cột/dữ liệu cũ; chạy idempotent; không chạy production trong tài liệu này.

### 3.12. D-12 — Sửa tại chỗ + version (CONFIRMED)

Curriculum sửa tại chỗ với optimistic `version`; lớp giữ snapshot. Không tạo bảng
`curriculum_version` ở Phase 1.

### 3.13. D-13 — Hợp đồng danh sách môn (CONFIRMED, giữ mảng)

- FE `frontend/src/features/academic/api.ts` khai báo `api.get<Subject[]>('/api/subjects')`.
- `SubjectController.list` trả `List<SubjectResponse>`.
- `GET /subjects` **không** nhận `page`/`size`, **không** trả `{items,total,...}`.
- Phân trang sau này là quyết định riêng (breaking change) kèm cập nhật FE.

### 3.14. D-14 — Quyền Curriculum riêng (CONFIRMED)

- Tạo **`curriculum.view`** (đọc) và **`curriculum.manage`** (ghi), scope **ORGANIZATION**,
  module `STUDENT_MANAGEMENT`.
- Cấp cho **Giáo vụ qua chức danh** (`position` + `position_permission`/bundle), không tự cấp
  cho toàn bộ nhân viên, không tự nâng thành OWNER/General Manager.
- OWNER/ORG_OWNER/SUPER_ADMIN nhận toàn catalog như cơ chế hiện có.
- Người dùng tự thêm mã vào `PermissionCatalog` + bundle khi triển khai; tài liệu **không** sửa catalog.
- Không trộn fallback `subject.view/manage` trong cùng hợp đồng.

### 3.15. D-15 — Đồng bộ môn chính legacy + lưu lịch sử (CONFIRMED)

1. **Giữ** `school_class.subject_id` để tương thích ngược; đây là bản sao của **môn chính**.
2. `class_subject.is_primary` đánh dấu môn chính. **DB chỉ bảo đảm tối đa một primary/lớp**
   (UNIQUE trên generated column `primary_class_id`). Việc **tối thiểu một primary khi
   `school_class.subject_id != NULL`** do **transaction + application validation** của luồng tạo
   lớp, đổi môn và backfill bảo đảm — UNIQUE **không** bảo đảm điều này.
3. **Bất biến môn chính phải được tài liệu hoá và kiểm thử:**
   1. `school_class.subject_id IS NOT NULL` → có **đúng một** dòng `class_subject.is_primary = 1`.
   2. `school_class.subject_id` **bằng** `subject_id` của dòng primary.
   3. `school_class.subject_id IS NULL` → **không** được tự tạo dòng primary.
   4. Một lớp **không** có nhiều hơn một primary.
   5. Thao tác tạo lớp, đổi môn chính và backfill đều phải giữ các bất biến trên.
4. **Đổi môn chính = một transaction duy nhất**, theo thứ tự:
   1. Khoá lớp (`SELECT … FOR UPDATE`), kiểm trạng thái và `expectedVersion` với
      `school_class.version`.
   2. Ghi `class_subject_history` (snapshot môn cũ/mới, giáo viên cũ, nguồn cũ/mới, actor, thời
      điểm, lý do, `operation_id`).
   3. Cập nhật `school_class.subject_id = newSubjectId`, tăng `version` lớp.
   4. Đồng bộ `class_subject`: nếu **môn mới đã có** trong danh sách môn của lớp → **tái dùng** dòng
      đó (đặt `is_primary = 1`); ngược lại tạo dòng mới (`source = MANUAL`, `planned_sessions`/
      `session_minutes` theo yêu cầu hoặc default của môn). Bỏ `is_primary` của dòng cũ.
5. **Không xoá dòng cũ:** dòng `class_subject` của môn cũ được giữ (không còn `is_primary`), không
   xoá history. API thường **không cho xoá** dòng primary hiện tại hoặc dòng `LEGACY` khớp
   `school_class.subject_id` (409 `CLASS_SUBJECT_LEGACY_PROTECTED`).
6. **Không chuyển giáo viên:** dòng môn mới có `teacher_id = NULL`; `old_teacher_id` chỉ nằm trong
   history. Giáo viên cũ **không** được tự gán cho môn mới.
7. **Fallback legacy:** nếu lớp chưa có dòng `class_subject` nào và `subject_id` khác NULL →
   `GET /classes/{id}/subjects` trả 1 dòng suy ra `source=LEGACY`, `isPrimary=true` (không ghi DB).
   Fallback `teacher_id = school_class.teacher_id` **chỉ** áp cho dòng suy ra này (D-09).
8. `PUT /classes/{id}` khi `subjectId` thay đổi **không được** vòng qua quy tắc trên: kể cả lớp
   legacy chưa có dòng `class_subject`, endpoint này phải gọi cùng luồng đổi môn chính (ghi history
   với `old_subject_*`/`old_source` lấy từ `school_class`, đồng bộ, atomic) thay vì chỉ set cột.
9. **Không xoá cứng lớp đã có history:** `DELETE /classes/{id}` trả 409 `CONFLICT` (BR-SUB-21),
   không để FK RESTRICT biến thành 500.

---

## 4. Nghiệp vụ chi tiết

Mỗi nghiệp vụ gồm: Actor · Điều kiện đầu vào · Luồng chính · Luồng thay thế · Thành công ·
Thất bại · Quyền.

### 4.1. BR-SUB-F01 — Tạo môn học

- **Actor:** OWNER hoặc người giữ `subject.manage` (ORGANIZATION scope).
- **Điều kiện đầu vào:** đã đăng nhập, JWT có `orgId`; module `STUDENT_MANAGEMENT` đang bật
  (D-10); `name` không rỗng; `code` **tuỳ chọn** (D-04); `description` ≤ 500.
- **Luồng chính:**
  1. Lấy `orgId` từ JWT (không nhận `orgId` từ body/query).
  2. Chuẩn hoá `name` (trim), tính `name_unaccented`.
  3. Nếu `code` có giá trị: kiểm trùng `(org_id, code)`; nếu `code` rỗng/NULL thì bỏ qua bước này.
  4. Kiểm trùng tên `(org_id, name_unaccented)` (đã có UNIQUE).
  5. Insert `subject` với `is_active = TRUE`, `created_by = userId`.
  6. Ghi audit `SUBJECT_CREATED` (đã có).
  7. Trả `201 Created`, `Location: /subjects/{id}`, body `SubjectResponse`.
- **Luồng thay thế:**
  - `code` rỗng → hợp lệ, lưu NULL (D-04); không trả `CODE_REQUIRED`.
  - Trùng mã (khi `code` có giá trị) → `409 SUBJECT_CODE_EXISTS`.
  - Trùng tên → `409 CONFLICT` ("Tên môn học đã tồn tại trong tổ chức").
- **Thành công:** bản ghi mới, `active=true`, audit có `actorUserId`.
- **Thất bại:** không tạo bản ghi, không audit thành công.
- **Quyền:** `hasRole('OWNER') or hasAuthority('subject.manage')`.

### 4.2. BR-SUB-F02 — Cập nhật môn học

- **Actor:** như 4.1.
- **Điều kiện đầu vào:** môn tồn tại trong tổ chức; `name` hợp lệ; nếu đổi `code` thì không
  trùng môn khác cùng tổ chức.
- **Luồng chính:**
  1. `require(id, orgId)` — không tồn tại → `404 SUBJECT_NOT_FOUND`.
  2. Validate như tạo.
  3. Update `name`, `name_unaccented`, `code`, `description`, `updated_by`, `updated_at`.
  4. Audit `SUBJECT_UPDATED` kèm `before/after`.
- **Luồng thay thế:** trùng mã/tên → `409 CONFLICT`; môn của tổ chức khác → `404`.
- **Ghi chú thiết kế:** đổi tên môn **không** được làm hỏng kiểm tra chuyên môn —
  đây là lý do bắt buộc chuyển sang ID (D-06). Nếu chưa chuyển, đổi tên sẽ làm
  `teachesSubject` sai âm thầm.
- **Quyền:** như 4.1.

### 4.3. BR-SUB-F03 — Xem chi tiết

- **Actor:** OWNER hoặc một trong các quyền đọc hiện tại: `subject.view`, `subject.manage`,
  `class.view`, `class.create`, `student.view`, `class.assign_teacher`, `class.teacher.reassign`.
- **Luồng:** `SELECT ... WHERE id=? AND org_id=?`; rỗng → `404 SUBJECT_NOT_FOUND`.
- **Thất bại:** ID tổ chức khác trả 404 (không lộ tồn tại).
- **Quyền:** chuỗi `READ` trong `SubjectController` (giữ nguyên).

### 4.4. BR-SUB-F04 — Danh sách, tìm kiếm, lọc

- **Actor:** như 4.3.
- **Tham số hiện tại:** `q` (tên), `includeInactive` (chỉ có hiệu lực với OWNER/`subject.manage`).
- **Hợp đồng đã chốt (D-13 = A):** trả **mảng** `[SubjectResponse]`, **không phân trang**,
  không nhận `page`/`size`.
- **Đề xuất bổ sung (không bắt buộc):** `isActive` (true/false), `q` tìm cả `name_unaccented`
  và `code`; `sort=name|code|createdAt`.
- **Sắp xếp hiện tại:** `is_active DESC, name ASC`.
- **Thất bại:** tham số sai kiểu → `400 VALIDATION_ERROR`.
- **Quyền:** `READ`.

### 4.5. BR-SUB-F05 — Kích hoạt / ngừng hoạt động

- **Actor:** OWNER hoặc `subject.manage`.
- **Điều kiện:** môn tồn tại trong tổ chức; `active` là boolean.
- **Luồng:** update `is_active`, `updated_by/at`; audit `SUBJECT_STATUS_CHANGED` kèm
  `classesUsingSubject = SubjectRepository.classUsage(id, orgId)`.
- **Ràng buộc nghiệp vụ:** ngừng hoạt động **không** xoá tham chiếu. Lớp đang dùng môn vẫn giữ
  `class_subject`/`subject_id`; không được chọn môn inactive cho lớp mới
  (`SubjectRepository.nullableActive` ném `SUBJECT_NOT_FOUND` — hiện dùng chung mã 404;
  đề xuất tách `SUBJECT_INACTIVE` 400/409 để FE hiển thị đúng).
- **Luồng thay thế:** ngừng môn đang được lớp `DANG_DIEN_RA` dùng → **cho phép**, chỉ cảnh báo
  qua `classesUsingSubject` (BR-SUB-09); không chặn (đã chốt, không còn phụ thuộc D-05).
- **Quyền:** như 4.1.

### 4.6. BR-SUB-F06 — Kiểm tra mã trùng (mới, đề xuất)

- **Actor:** người có quyền tạo/sửa môn.
- **API đề xuất:** `GET /subjects/check-code?code=TOAN&excludeId={id}`.
- **Kết quả:** `{ "code": "TOAN", "available": false, "existingId": "..." }`.
- **Không thay đổi dữ liệu**; chỉ đọc.
- **Quyền:** `subject.manage` (vì chỉ hữu ích cho người ghi).

### 4.7. BR-SUB-F07 — Cách ly tổ chức

- Mọi truy vấn đọc/ghi đều có `org_id = actor.orgId()`.
- Không nhận `orgId` từ client.
- FK `(subject_id, org_id)` bảo đảm lớp không thể trỏ môn khác tổ chức.
- Test bắt buộc: org A không đọc/sửa được môn org B (xem `test-cases.md` TC-SUB-013).

---

## 5. Business Rules

| Mã | Quy tắc | Trạng thái |
|---|---|---|
| BR-SUB-01 | `name` bắt buộc, trim, ≤ 200 ký tự | Đã có |
| BR-SUB-02 | Tên môn duy nhất theo `(org_id, name_unaccented)` | Đã có (DB) |
| BR-SUB-03 | Mã môn **tuỳ chọn**; khi có giá trị thì duy nhất theo `(org_id, code)`; nhiều bản ghi NULL được phép | CONFIRMED (D-04) |
| BR-SUB-04 | Không bắt buộc `code` với bản ghi mới; bản ghi cũ mã NULL vẫn hợp lệ | CONFIRMED (D-04) |
| BR-SUB-05 | Không xoá cứng môn; chỉ ngừng hoạt động | Đã có |
| BR-SUB-06 | Môn inactive không được chọn cho lớp mới/đổi môn | Đã có một phần (`nullableActive`) |
| BR-SUB-07 | Ngừng môn không làm mất tham chiếu của lớp | Đã có (FK RESTRICT) |
| BR-SUB-08 | Mọi thao tác chỉ trong tổ chức của JWT | Đã có |
| BR-SUB-09 | Ngừng môn đang dạy: cho phép nhưng trả `classesUsingSubject` để cảnh báo | Đã có (audit) — cần chốt UX |
| BR-SUB-10 | Mã môn không phân biệt hoa/thường khi kiểm trùng (đề xuất chuẩn hoá upper-case) | Đề xuất |
| BR-SUB-11 | Đổi tên môn không được làm sai kiểm tra chuyên môn (dùng ID) | Đề xuất (D-06) |
| BR-SUB-12 | Xoá mềm không áp dụng cho subject; không có DELETE API | Đã có |
| BR-SUB-13 | Người không có `subject.manage` chỉ đọc được môn active | Đã có (`includeInactive` bị hạ quyền) |
| BR-SUB-14 | Danh sách môn trả mảng, không phân trang ở Phase 1 (D-13 = A); nếu sau này phân trang là quyết định riêng kèm cập nhật FE | CONFIRMED |
| BR-SUB-15 | Audit mọi thao tác ghi (create/update/status) | Đã có |
| BR-SUB-16 | Đổi môn chính khi lớp `DANG_DIEN_RA` **được phép**, nhưng bắt buộc ghi `class_subject_history`; không đổi curriculum, không đổi danh sách môn khác (D-08) | CONFIRMED |
| BR-SUB-17 | `class_subject_history` là bảng chỉ ghi (append-only); API thường không sửa/xoá bản ghi history | CONFIRMED |
| BR-SUB-18 | `school_class.subject_id` luôn bằng `subject_id` của dòng `class_subject.is_primary = 1`; DB bảo đảm **tối đa** một primary/lớp, còn **tối thiểu** một primary khi `subject_id != NULL` do transaction + application validation (D-15) | CONFIRMED |
| BR-SUB-19 | Đổi môn chính **không** chép `teacher_id` sang môn mới; `old_teacher_id` chỉ lưu ở history (D-08/D-15) | CONFIRMED |
| BR-SUB-20 | Đổi môn chính + cập nhật `school_class` + ghi history nằm trong **một transaction**; lỗi bất kỳ bước nào rollback toàn bộ; `expectedVersion` phải khớp `school_class.version` (D-15) | CONFIRMED |
| BR-SUB-21 | Không xoá cứng lớp đã có `class_subject_history`; `DELETE /classes/{id}` trả 409 `CONFLICT`, không xoá/CASCADE lịch sử (D-08/D-15) | CONFIRMED |
| BR-SUB-22 | Request đổi môn chính bắt buộc `subjectId`, `reason` (≤ 500 ký tự), `expectedVersion`, `operationId`; `changedBy` lấy từ JWT (D-08) | CONFIRMED |
| BR-SUB-23 | Cùng `operationId` + payload chuẩn hoá giống → trả kết quả cũ, không sinh history mới; cùng `operationId` + payload khác → 409 (D-08) | CONFIRMED |
| BR-SUB-24 | `class_subject.teacher_id` là nguồn sự thật khi bản ghi tồn tại; fallback `school_class.teacher_id` **chỉ** khi chưa có bản ghi `class_subject` tương ứng (D-09) | CONFIRMED |

---

## 6. Ví dụ dữ liệu cụ thể

### 6.1. Tạo môn

Request:

```http
POST /api/subjects
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "code": "TOAN10",
  "name": "Toán 10",
  "description": "Toán lớp 10 – chương trình chuẩn"
}
```

Response `201`:

```json
{
  "id": "a1b2c3d4-0000-4000-8000-000000000001",
  "code": "TOAN10",
  "name": "Toán 10",
  "description": "Toán lớp 10 – chương trình chuẩn",
  "active": true,
  "createdAt": "2026-11-20T09:00:00Z",
  "updatedAt": null
}
```

### 6.2. Trùng mã (D-04 — UNIQUE khi có giá trị)

```json
{
  "success": false,
  "code": "SUBJECT_CODE_EXISTS",
  "message": "Mã môn học đã tồn tại trong tổ chức",
  "data": null
}
```

### 6.3. Ngừng hoạt động môn đang được dùng

Request: `PATCH /api/subjects/99999999-9999-4999-8999-999999999001/status`
`{ "active": false }`

Audit ghi `classesUsingSubject = 3` (ví dụ C001, C002, C003). Response trả môn với
`active=false`. Lớp vẫn giữ môn; màn hình lớp hiển thị cảnh báo "môn đã ngừng hoạt động".

---

## 7. Ảnh hưởng dữ liệu cũ

| Tình huống | Xử lý đề xuất |
|---|---|
| `subject.code` NULL | Được phép giữ NULL (UNIQUE cho phép nhiều NULL); FE hiển thị "—" |
| `subject.code` trùng (do index thường) | Script báo cáo nhóm trùng; người dùng quyết định đổi mã trước khi thêm UNIQUE |
| Tên môn trùng sau khi bỏ dấu | Đã bị chặn bởi `uq_subject_org_name`; không có dữ liệu trùng |
| Môn bị ngừng nhưng lớp đang dạy | Giữ nguyên; chỉ chặn chọn mới; cảnh báo qua `classesUsingSubject` |
| `school_class.subject_id` NULL | Không backfill vào `class_subject`; lớp không môn vẫn hợp lệ (legacy) |
| Lớp đã hoạt động trước khi có tính năng | **Không** tạo history hồi tố (không có dữ liệu nguồn). `class_subject_history` bắt đầu rỗng; lần đổi môn chính đầu tiên mới sinh bản ghi |
| Dòng `class_subject` hiện có | Migration 52 đặt `is_primary = 1` **chỉ** cho dòng khớp chính xác `school_class.subject_id`; lớp chưa có dòng nào thì **không** tự tạo. Bản ghi không khớp/mập mờ vào báo cáo manual review, không đoán |

---

## 8. Acceptance Criteria

- AC-SUB-01: Người có `subject.manage` tạo được môn; người chỉ có `subject.view` nhận 403.
- AC-SUB-02: Tạo trùng tên trong cùng tổ chức nhận 409 và không tạo bản ghi.
- AC-SUB-03: Tạo môn trùng mã (khi `code` có giá trị) nhận 409 `SUBJECT_CODE_EXISTS`; hai tổ chức
  khác nhau được trùng mã; nhiều bản ghi `code = NULL` trong cùng tổ chức vẫn hợp lệ (D-04).
- AC-SUB-04: Org A không đọc/sửa được môn của org B (404, không lộ dữ liệu).
- AC-SUB-05: Ngừng môn không làm hỏng lớp đang dùng; lớp vẫn trả `subjectId`/`subjectName`.
- AC-SUB-06: Người không có quyền ghi không thể xem môn inactive qua `includeInactive`.
- AC-SUB-07: Mọi thao tác ghi tạo audit với `orgId`, `actorUserId`, `targetId`.
- AC-SUB-08: `GET /subjects` trả mảng `[SubjectResponse]` đúng như FE hiện tại mong đợi (D-13 = A);
  không có `page`/`size`/`total` ở Phase 1.
- AC-SUB-09: Lớp `DANG_DIEN_RA` đổi môn chính thành công, sinh **đúng một** dòng
  `class_subject_history` với đủ snapshot cũ/mới, `old_teacher_id`, `old_source`, `new_source`,
  `reason`, `operation_id`, `changed_by`, `changed_at`.
- AC-SUB-10: Sau khi đổi môn chính, `school_class.subject_id` = môn mới và đúng **một** dòng
  `class_subject.is_primary = 1`; các dòng môn khác không đổi.
- AC-SUB-15: Request thiếu `reason`/`expectedVersion`/`operationId` hoặc `reason` > 500 ký tự nhận
  `400`; `expectedVersion` cũ nhận `409` xung đột phiên bản; không tạo history.
- AC-SUB-16: Retry cùng `operationId` + cùng payload trả kết quả cũ và **không** sinh history thứ
  hai; cùng `operationId` + payload khác trả `409`.
- AC-SUB-17: Lớp `subject_id = NULL` không có dòng `class_subject.is_primary = 1`; lớp có
  `subject_id != NULL` luôn có đúng một primary và khớp `subject_id`.
- AC-SUB-11: Giáo viên của môn cũ **không** xuất hiện trên dòng môn mới (`teacher_id = NULL`);
  `old_teacher_id` chỉ có trong history.
- AC-SUB-12: Lỗi ở bất kỳ bước nào (history / `school_class` / `class_subject`) rollback toàn bộ,
  không để lại history "mồ côi" hay lớp trỏ môn mới mà `class_subject` chưa đồng bộ.
- AC-SUB-13: Lớp `DA_KET_THUC`/`DA_HUY`/`CLOSED` gọi đổi môn chính nhận 409 `CLASS_NOT_EDITABLE`;
  không tạo history.
- AC-SUB-14: API thường không xoá được dòng primary hiện tại và không sửa/xoá history
  (`CLASS_SUBJECT_LEGACY_PROTECTED` / `FORBIDDEN`).

---

## 9. Quyết định đã chốt & câu hỏi kỹ thuật còn lại

`D-01`…`D-15` **đã chốt** (mục 3). Không còn mục nào cần người dùng quyết định nghiệp vụ ở Phase 1.
Các câu hỏi dưới đây chỉ là chi tiết kỹ thuật, không thay đổi quyết định:

1. Mã môn có phân biệt hoa/thường? Có chuẩn hoá upper-case khi lưu?
2. Có cần trường `gradeLevel` (khối) trên môn, hay khối chỉ nằm ở curriculum?
3. Môn có cần `credits`/`weight` (tín chỉ/trọng số) không?
4. Có cần API xoá cứng cho môn chưa từng dùng (không có lớp/session) không?
5. Có cần xuất Excel/import môn hàng loạt không (ngoài phạm vi Phase 1)?

**Đã chốt (kỹ thuật, không mở):** `operation_id` (UUID do client sinh) là **bắt buộc** trên request
đổi môn chính và lưu **vĩnh viễn** ở `class_subject_history` với UNIQUE `(org_id, operation_id)`
(xem `database-schema.md`). History cũng giữ vĩnh viễn ở Phase 1 — không có job dọn, vì dọn
`operation_id` sẽ phá idempotency của retry cũ.
