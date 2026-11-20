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
| **NEEDS_USER_DECISION** | Cần người dùng chốt trước khi code; không được tự giả định |

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

Các quyết định dưới đây **chưa được chốt**. Tài liệu trình bày phương án, ưu/nhược và
"Đề xuất" để người dùng chọn; không phương án nào được mặc định là đã chốt.

| ID | Câu hỏi | Đề xuất | Ảnh hưởng chính |
|---|---|---|---|
| D-01 | Một lớp học một môn hay nhiều môn? | Nhiều môn qua `class_subject`, giữ `school_class.subject_id` làm môn chính legacy | Thêm bảng, đổi API lớp, ảnh hưởng Schedule |
| D-02 | Curriculum gắn theo lớp / khối / chương trình? Một lớp có một hay nhiều curriculum? | Curriculum cấp tổ chức (template), lớp tham chiếu 1 curriculum, chép sang `class_subject` khi phân bổ | Thêm `curriculum`, `class_subject`; lớp thêm cột `curriculum_id` |
| D-03 | Số buổi, thời lượng, giờ lý thuyết/thực hành khai báo ở đâu? | Bắt buộc ở `curriculum_subject`; `subject` có default tuỳ chọn; `class_subject` được override trước khi xếp lịch | Thêm cột; validation |
| D-04 | Mã môn bắt buộc và duy nhất theo tổ chức? | Bắt buộc với bản ghi mới; UNIQUE `(org_id, code)`, cho phép NULL legacy | Đổi index 42, validation, backfill |
| D-05 | Ai quản lý môn học? | Giữ ORGANIZATION-only (`subject.manage`), không mở phòng ban | Không đổi catalog; thêm module guard |
| D-06 | Chuyên môn giáo viên theo Subject ID, Specialty ID hay cả hai; có duyệt? | Cả hai: `specialty_subject` để gán hàng loạt, `teacher_subject` là nguồn sự thật; có trạng thái duyệt | Thêm 2 bảng; đổi `teachesSubject` |
| D-07 | Môn tiên quyết: một hay nhiều, chặn hay cảnh báo? | Một tiên quyết/môn trong curriculum; Phase 1 chỉ cảnh báo | Thêm cột; rule |
| D-08 | Đổi curriculum/môn khi lớp đang học xử lý thế nào? | Snapshot: không sửa `class_subject` đã tạo; chỉ áp dụng lại khi lớp `CHUA_BAT_DAU` | Rule + API |
| D-09 | Giáo viên theo từng môn hay một giáo viên chủ nhiệm? | `class_subject.teacher_id` tuỳ chọn; fallback `school_class.teacher_id` | Thêm cột; gán giáo viên theo môn |
| D-10 | Module guard cho môn/curriculum? | Dùng `STUDENT_MANAGEMENT` như Class | Sửa controller (người dùng code) |
| D-11 | Có đồng ý backfill dữ liệu cũ theo tên một lần? | Có, chạy draft có kiểm đếm, không chạy production trong tài liệu này | Script backfill |
| D-12 | Curriculum sửa tại chỗ hay tạo phiên bản? | Sửa tại chỗ + `version`; lớp giữ snapshot | Cột `version`, rule |
| D-13 | `GET /subjects` giữ mảng hay chuyển phân trang? | Chuyển `{items,total,page,size}` nếu FE cập nhật cùng đợt; nếu không, giữ mảng | Hợp đồng API, FE |

### 3.1. D-01 — Một lớp một môn hay nhiều môn

**Hiện trạng:** `school_class.subject_id` (nullable, FK RESTRICT) ⇒ tối đa một môn/lớp.
Schedule mirror giữ `class.subject` dạng text. Không có `class_subject`.

| Phương án | Ưu | Nhược | Ảnh hưởng dữ liệu/API |
|---|---|---|---|
| A. Giữ một môn/lớp | Không đổi schema/API; ít rủi ro | Không đáp ứng chương trình nhiều môn; mỗi môn phải tách lớp | Không đổi |
| B. Nhiều môn qua `class_subject`, bỏ `subject_id` | Mô hình đúng, sạch | Phá vỡ API/DTO hiện tại, Schedule mirror, dữ liệu cũ | Migration nặng, breaking change |
| C. Nhiều môn qua `class_subject`, **giữ** `subject_id` làm môn chính legacy | Tương thích ngược, rollout từng bước | Hai nguồn dữ liệu tạm thời, cần rule đồng bộ | Thêm bảng; API cũ vẫn chạy |

**Đề xuất:** C. Khi lớp chưa có `class_subject`, coi `school_class.subject_id` là một dòng
`class_subject` nguồn `LEGACY` (tính toán, không nhất thiết ghi ngay). Không xoá cột.

**NEEDS_USER_DECISION (D-01).**

### 3.2. D-02 — Curriculum gắn vào đâu

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Curriculum gắn trực tiếp lớp (1–1) | Đơn giản | Không tái sử dụng; mỗi lớp một bản sao |
| B. Curriculum theo khối/ngành, lớp tham chiếu | Tái sử dụng, chuẩn học vụ | Cần quy ước khối/ngành |
| C. Template cấp tổ chức + snapshot vào lớp | Tái sử dụng + lịch sử ổn định | Thêm bảng, thêm bước áp dụng |

**Đề xuất:** C. `curriculum` cấp tổ chức; `school_class.curriculum_id` nullable;
khi phân bổ, chép `curriculum_subject` → `class_subject` (snapshot). Lớp legacy không có
curriculum vẫn chạy.

**NEEDS_USER_DECISION (D-02).**

### 3.3. D-03 — Khai báo số buổi/thời lượng/giờ lý thuyết–thực hành

Ba vị trí khả dĩ:

| Vị trí | Ưu | Nhược |
|---|---|---|
| `subject` (toàn cục) | Nhập một lần | Cùng môn ở chương trình khác nhau cần số buổi khác |
| `curriculum_subject` | Đúng ngữ cảnh chương trình | Phải tạo curriculum trước |
| `class_subject` (override) | Linh hoạt cho lớp | Dễ lệch chuẩn nếu không kiểm soát |

**Đề xuất:** `curriculum_subject` là **bắt buộc** (`required_sessions`, `theory_sessions`,
`practice_sessions`, `session_minutes`); `subject` có default tuỳ chọn; `class_subject`
được override `planned_sessions`/`session_minutes` **trước khi** có buổi học.

Đơn vị "tiết" và độ dài mặc định (ví dụ 45 phút) **chưa có trong code** — cần chốt.
Không tự áp 45 phút thành quy tắc cứng.

**NEEDS_USER_DECISION (D-03).**

### 3.4. D-04 — Mã môn bắt buộc & duy nhất

Hiện tại: `code` optional; migration 42 tạo `ADD INDEX uq_subject_org_code` (không UNIQUE);
schema test lại khai báo `CONSTRAINT uq_subject_org_code UNIQUE(org_id, code)`.

| Phương án | Ưu | Nhược | Rủi ro dữ liệu |
|---|---|---|---|
| A. Giữ optional + không unique | Không đổi gì | Không định danh được môn; trùng mã | Thấp |
| B. Optional + UNIQUE khi có giá trị | MySQL cho phép nhiều NULL; an toàn legacy | Vẫn có môn không mã | Cần dọn mã trùng trước khi thêm UNIQUE |
| C. Bắt buộc + UNIQUE | Chuẩn dữ liệu | Phải backfill và xử lý bản ghi thiếu mã | Cao nếu dữ liệu cũ bẩn |

**Đề xuất:** B trước (UNIQUE, cho NULL), sau đó C cho tổ chức mới hoặc khi đã backfill đủ.
API create/update trả `CONFLICT`/mã lỗi mới `SUBJECT_CODE_EXISTS` khi trùng; thêm
`GET /subjects/check-code`.

**NEEDS_USER_DECISION (D-04).**

### 3.5. D-05 — Ai quản lý môn học

Hiện tại `subject.view/manage` là **ORGANIZATION-only**, module `STUDENT_MANAGEMENT`;
OWNER/ORG_OWNER/SUPER_ADMIN nhận toàn bộ; bundle `ACADEMIC_MANAGEMENT` chứa cả hai.

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Giữ ORGANIZATION-only | Khớp code hiện tại; dữ liệu danh mục dùng chung | Trưởng phòng đào tạo không tự tạo môn |
| B. Cho phép DEPARTMENT scope | Phòng đào tạo chủ động | Mỗi phòng tạo danh mục riêng → trùng lặp, khó thống nhất |
| C. ORGANIZATION-only + uỷ quyền (delegation) | Linh hoạt có kiểm soát | Cần quy trình uỷ quyền |

**Đề xuất:** A (+ C nếu cần). Không đổi `PermissionCatalog`.
Quyền `subject.manage` vẫn là quyền ghi duy nhất; không tách `subject.create/edit/delete`
ở Phase 1 (tránh đổi vai trò).

**NEEDS_USER_DECISION (D-05).**

### 3.6. D-06 — Chuyên môn giáo viên

Xem chi tiết `teacher-subject-design.md`. Tóm tắt:

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Chỉ Specialty (như hiện tại, so tên) | Không đổi schema | Phụ thuộc tên; không phân biệt 2 môn cùng chuyên môn |
| B. Chỉ `teacher_subject` (Subject ID) | Chính xác, không phụ thuộc tên | Nhập liệu thủ công từng môn |
| C. `specialty_subject` + `teacher_subject` | Gán hàng loạt theo chuyên môn, vẫn chính xác theo ID | Thêm 2 bảng, cần đồng bộ |

**Đề xuất:** C. `teacher_subject` là nguồn sự thật khi kiểm tra dạy môn; `specialty_subject`
hỗ trợ gán hàng loạt/backfill. Có trạng thái `PENDING/APPROVED/REVOKED` nếu tổ chức bật duyệt.

**NEEDS_USER_DECISION (D-06).**

### 3.7. D-07 — Môn tiên quyết

| Phương án | Ưu | Nhược |
|---|---|---|
| A. Không hỗ trợ | Đơn giản | Không mô tả được chương trình thực tế |
| B. Một tiên quyết/môn, chỉ cảnh báo | Đủ phổ biến, ít rủi ro | Không chặn xếp lịch sai |
| C. Nhiều tiên quyết, chặn cứng | Chặt chẽ | Phức tạp, cần bảng nối + kiểm chu trình |

**Đề xuất:** B ở Phase 1 (`curriculum_subject.prerequisite_subject_id`), cảnh báo; Phase 2
mới quyết định chặn khi xếp lịch.

**NEEDS_USER_DECISION (D-07).**

### 3.8. D-08 — Thay đổi khi lớp đang học

**Đề xuất:** `class_subject` là snapshot. Sửa curriculum **không** lan sang lớp đã có
`class_subject`. Chỉ được thêm/bớt/đổi môn khi lớp `CHUA_BAT_DAU` (hoặc theo một quyết định
riêng cho `DANG_DIEN_RA`). Lớp `DA_KET_THUC/DA_HUY/CLOSED` read-only như hiện tại
(`CLASS_NOT_EDITABLE`).

**NEEDS_USER_DECISION (D-08).**

### 3.9. D-09 — Giáo viên theo môn

**Đề xuất:** `class_subject.teacher_id` nullable. Lớp một môn legacy dùng
`school_class.teacher_id`. Gán giáo viên theo môn dùng cùng rule chuyên môn (D-06).
Một môn/một lớp có một giáo viên ở Phase 1 (co-teaching để sau).

**NEEDS_USER_DECISION (D-09).**

### 3.10. D-10 — Module guard

**Đề xuất:** `SubjectController` và controller curriculum gọi
`moduleGuard.requireModuleReadable/requireModule(orgId, "STUDENT_MANAGEMENT")` giống Class,
để tổ chức tắt module thì không dùng được. Không tạo module mới.

**NEEDS_USER_DECISION (D-10).**

### 3.11. D-11 — Backfill dữ liệu cũ

**Đề xuất:** chạy một lần, có script đếm trước/sau:
1. `specialty_subject` từ `specialty.name_unaccented = subject.name_unaccented`.
2. `teacher_subject` từ `teacher_specialty ⨝ specialty_subject`.
3. `class_subject` từ `school_class.subject_id IS NOT NULL`.
Không xoá cột/dữ liệu cũ. Không chạy trên production trong tài liệu này.

**NEEDS_USER_DECISION (D-11).**

### 3.12. D-12 — Versioning curriculum

**Đề xuất:** sửa tại chỗ với optimistic `version`; lớp giữ snapshot. Không tạo bảng
`curriculum_version` ở Phase 1. Nếu cần lịch sử đầy đủ, đó là quyết định riêng.

**NEEDS_USER_DECISION (D-12).**

### 3.13. D-13 — Hợp đồng danh sách môn

| Phương án | Hợp đồng | Ưu | Nhược |
|---|---|---|---|
| A. Giữ mảng | `GET /subjects` → `[SubjectResponse]` | Không phá FE | Không có tổng số |
| B. Phân trang | `{items,total,page,size}` | Nhất quán `/classes` | Breaking change FE |
| C. Endpoint phụ | `GET /subjects/page` | Không phá | Trùng chức năng |

**Đề xuất:** B nếu FE cập nhật cùng đợt; nếu không, A + lọc `isActive`.
Chi tiết: `api-contract.md` mục 1.4.

**NEEDS_USER_DECISION (D-13).**

---

## 4. Nghiệp vụ chi tiết

Mỗi nghiệp vụ gồm: Actor · Điều kiện đầu vào · Luồng chính · Luồng thay thế · Thành công ·
Thất bại · Quyền.

### 4.1. BR-SUB-F01 — Tạo môn học

- **Actor:** OWNER hoặc người giữ `subject.manage` (ORGANIZATION scope).
- **Điều kiện đầu vào:** đã đăng nhập, JWT có `orgId`; module `STUDENT_MANAGEMENT` đang bật
  (nếu áp D-10); `name` không rỗng; `code` theo D-04; `description` ≤ 500.
- **Luồng chính:**
  1. Lấy `orgId` từ JWT (không nhận `orgId` từ body/query).
  2. Chuẩn hoá `name` (trim), tính `name_unaccented`.
  3. Nếu D-04 = bắt buộc: kiểm `code` không rỗng; kiểm trùng `(org_id, code)`.
  4. Kiểm trùng tên `(org_id, name_unaccented)` (đã có UNIQUE).
  5. Insert `subject` với `is_active = TRUE`, `created_by = userId`.
  6. Ghi audit `SUBJECT_CREATED` (đã có).
  7. Trả `201 Created`, `Location: /subjects/{id}`, body `SubjectResponse`.
- **Luồng thay thế:**
  - Thiếu `code` khi D-04 = bắt buộc → `400 CODE_REQUIRED`.
  - Trùng mã → `409 SUBJECT_CODE_EXISTS` (mã mới đề xuất) hoặc `409 CONFLICT` (nếu không thêm mã).
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
- **Đề xuất bổ sung:** `page`, `size` (mặc định 0/20, tối đa 100), `isActive` (true/false/all),
  `q` tìm cả `name_unaccented` và `code`; `sort=name|code|createdAt`.
- **Sắp xếp hiện tại:** `is_active DESC, name ASC`.
- **Thất bại:** `size` ngoài khoảng → `400 VALIDATION_ERROR`.
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
- **Luồng thay thế:** ngừng môn đang được lớp `DANG_DIEN_RA` dùng → cho phép nhưng cảnh báo
  qua `classesUsingSubject` (cần chốt D-05/BR-SUB-09).
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
| BR-SUB-03 | Mã môn duy nhất theo `(org_id, code)` khi có giá trị | Đề xuất (D-04) |
| BR-SUB-04 | Mã môn bắt buộc với bản ghi mới | NEEDS_USER_DECISION (D-04) |
| BR-SUB-05 | Không xoá cứng môn; chỉ ngừng hoạt động | Đã có |
| BR-SUB-06 | Môn inactive không được chọn cho lớp mới/đổi môn | Đã có một phần (`nullableActive`) |
| BR-SUB-07 | Ngừng môn không làm mất tham chiếu của lớp | Đã có (FK RESTRICT) |
| BR-SUB-08 | Mọi thao tác chỉ trong tổ chức của JWT | Đã có |
| BR-SUB-09 | Ngừng môn đang dạy: cho phép nhưng trả `classesUsingSubject` để cảnh báo | Đã có (audit) — cần chốt UX |
| BR-SUB-10 | Mã môn không phân biệt hoa/thường khi kiểm trùng (đề xuất chuẩn hoá upper-case) | Đề xuất |
| BR-SUB-11 | Đổi tên môn không được làm sai kiểm tra chuyên môn (dùng ID) | Đề xuất (D-06) |
| BR-SUB-12 | Xoá mềm không áp dụng cho subject; không có DELETE API | Đã có |
| BR-SUB-13 | Người không có `subject.manage` chỉ đọc được môn active | Đã có (`includeInactive` bị hạ quyền) |
| BR-SUB-14 | Phân trang mặc định 20, tối đa 100 | Đề xuất |
| BR-SUB-15 | Audit mọi thao tác ghi (create/update/status) | Đã có |

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

### 6.2. Trùng mã (D-04 = UNIQUE)

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

---

## 8. Acceptance Criteria

- AC-SUB-01: Người có `subject.manage` tạo được môn; người chỉ có `subject.view` nhận 403.
- AC-SUB-02: Tạo trùng tên trong cùng tổ chức nhận 409 và không tạo bản ghi.
- AC-SUB-03: Nếu D-04 = UNIQUE, tạo trùng mã nhận 409; hai tổ chức khác nhau được trùng mã.
- AC-SUB-04: Org A không đọc/sửa được môn của org B (404, không lộ dữ liệu).
- AC-SUB-05: Ngừng môn không làm hỏng lớp đang dùng; lớp vẫn trả `subjectId`/`subjectName`.
- AC-SUB-06: Người không có quyền ghi không thể xem môn inactive qua `includeInactive`.
- AC-SUB-07: Mọi thao tác ghi tạo audit với `orgId`, `actorUserId`, `targetId`.
- AC-SUB-08: Danh sách phân trang (nếu áp dụng) không trả quá `size` và báo đúng `total`.

---

## 9. Câu hỏi mở

1. D-01 → D-12 (mục 3) cần chốt.
2. Mã môn có phân biệt hoa/thường? Có chuẩn hoá upper-case khi lưu?
3. Có cần trường `gradeLevel` (khối) trên môn, hay khối chỉ nằm ở curriculum?
4. Môn có cần `credits`/`weight` (tín chỉ/trọng số) không?
5. Có cần API xoá cứng cho môn chưa từng dùng (không có lớp/session) không?
6. Có cần xuất Excel/import môn hàng loạt không (ngoài phạm vi Phase 1)?
7. Khi ngừng môn đang được lớp `DANG_DIEN_RA` dùng: chặn hay chỉ cảnh báo?
