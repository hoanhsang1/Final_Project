# Phase 1 — Review Report (Revision 3: D-08 / D-09 / D-15)

> **Ngày:** 2026-11-20 · **Branch:** `fixFlowCreateEmployee` · **Baseline source:** `bfa9b53`
> **Phạm vi:** chỉ tài liệu trong `docs/phase-1/` + SQL migration **draft** trong
> `docs/phase-1/migrations/` + H2 test schema. Không sửa source Java/React, không chạy SQL, không
> kết nối database, không đổi cấu hình/deploy, không commit/push/merge.

## TRẠNG THÁI: `READY FOR USER REVIEW` — Revision 3

> **Không phải `APPROVED`.** Bộ tài liệu và migration draft đã đồng bộ nội bộ, nhưng **chưa được
> người dùng duyệt** và **chưa có migration nào được chạy** trên bất kỳ database nào.

Lưu ý trung thực:

- Đây là **tài liệu thiết kế + migration draft**, **không** phải kết quả triển khai.
- **Chưa** chạy migration nào; **chưa** kết nối MySQL/H2; **chưa** có test nào được thực thi.
- Schema **chưa** được xác minh trên MySQL; H2 chỉ là fixture test và **không** chứng minh hành vi
  MySQL (cột sinh, UNIQUE, FK tổ hợp).
- Báo cáo WP1 riêng: `docs/phase-1/wp1-readiness-report.md`.

---

## 1. Tổng quan Revision 3

### 1.1. Vì sao có Revision 3

Revision 2 đã chốt D-08/D-15 nhưng còn ba điểm chưa đủ chặt, người dùng yêu cầu siết lại:

1. **D-08** chưa liệt kê đầy đủ snapshot lịch sử: thiếu `old_source`/`new_source`, thiếu
   `operation_id`, thiếu ràng buộc `reason` bắt buộc ≤500 ký tự.
2. **D-09** (fallback giáo viên) mới chỉ nói "không fallback khi lớp đã có `class_subject`", chưa
   nói rõ **fallback theo từng bản ghi** (dòng `class_subject` có `teacher_id = NULL` **không**
   fallback, nghĩa là chưa phân công).
3. **D-15** từng bị diễn giải là "UNIQUE bảo đảm đúng một primary" — sai. DB chỉ bảo đảm **tối đa
   một**; **tối thiểu một** do transaction + kiểm tra ứng dụng.

Đồng thời chuẩn hoá: `expectedVersion` **bắt buộc** trên mọi thao tác đổi môn chính; `operationId`
**bắt buộc** và lưu vĩnh viễn; backfill chỉ khớp **chính xác** (`exact match`), dòng không khớp đi
báo cáo rà soát tay; **không** tạo migration 53 khi không có bằng chứng.

### 1.2. Tài liệu / file đã cập nhật

| # | File | Vai trò |
|---|---|---|
| 1 | `subject-business-requirements.md` | Sổ quyết định D-01…D-15; D-08/D-09/D-15 viết lại; §3.8 request bắt buộc + idempotency; §3.9 fallback theo bản ghi; §3.15 năm bất biến primary; BR-SUB-18/20/22/23/24; AC-SUB-09/10/15/16/17 |
| 2 | `curriculum-business-design.md` | `is_primary`/`primary_class_id` "tối đa"; `class_subject_history` thêm `old_source`/`new_source`, `reason`/`operation_id` NOT NULL; §4.6 `expectedVersion` bắt buộc; BR-CUR-22/27/28 |
| 3 | `database-schema.md` | DDL history đầy đủ + CHECK source; ghi chú UNIQUE chỉ "tối đa"; §4 migration 51/52, không có 53; §6.0 pre-check; §7 rollback có mất dữ liệu; §9.1 H2 parity |
| 4 | `erd.md` | Ghi chú "tối đa một primary"; D-09 theo bản ghi |
| 5 | `api-contract.md` | §4.7 `PUT /classes/{id}` bắt buộc field khi đổi môn; §4.8 field bắt buộc + idempotency; §4.9 response có source/operationId; bảng mã lỗi |
| 6 | `validation-and-error-cases.md` | E-40…E-43; bảng optimistic locking `expectedVersion` bắt buộc; AC-VAL-17…20 |
| 7 | `teacher-subject-design.md` | BR-TCH-18 fallback theo bản ghi |
| 8 | `test-cases.md` | TC-CLS-039…048, TC-LEG-016…024, ma trận cập nhật |
| 9 | `implementation-roadmap.md` | WP1 (52 tên chuẩn, không 53), WP5 (idempotency + `expectedVersion` + source) |
| 10 | `backend/PeopleService/src/test/resources/people-test-schema.sql` | Fixture H2: `curriculum*`, `class_subject`, `class_subject_history`, `teacher_subject`, `specialty_subject`, `school_class.curriculum_id` |
| 11 | `docs/phase-1/migrations/51_people_curriculum.sql` | **Draft** — KHÔNG chạy |
| 12 | `docs/phase-1/migrations/52_people_class_subject.sql` | **Draft** — KHÔNG chạy |
| 13 | `docs/phase-1/migrations/51_52_precheck.sql` | Truy vấn chỉ đọc |
| 14 | `docs/phase-1/migrations/51_52_postcheck.sql` | Truy vấn chỉ đọc |
| 15 | `docs/phase-1/migrations/ROLLBACK.md` | Kế hoạch rollback có điều kiện |
| 16 | `review-report.md` | Báo cáo này (Revision 3) |
| 17 | `wp1-readiness-report.md` | Báo cáo sẵn sàng WP1 (READY FOR USER REVIEW) |
| 18 | `wp0-readiness-report.md` | Gỡ/điều kiện hoá migration 53; D-09/invariant theo Revision 3 |

### 1.3. Kết quả kiểm chéo

| Hạng mục | Trạng thái |
|---|---|
| Quyết định nghiệp vụ | 15/15 `CONFIRMED` (D-08, D-09, D-15 bản Revision 3) |
| Tài liệu nói "UNIQUE bảo đảm **đúng một** primary" | 0 (chỉ còn "tối đa một") |
| Tài liệu nói `expectedVersion`/`operationId` tuỳ chọn | 0 |
| Tài liệu mô tả migration 53 như bắt buộc | 0 (chỉ còn điều kiện có bằng chứng) |
| Tài liệu nói fallback `teacher_id` khi dòng `class_subject` tồn tại | 0 |
| Source Java/React bị thay đổi | 0 |
| SQL đã chạy / DB đã kết nối | 0 |
| Test đã chạy | 0 |

### 1.4. Lượt rà soát kỹ thuật bổ sung (2026-11-20)

Sau khi Viết lại Revision 3, rà thêm các điểm còn thiếu (vẫn **không** chạy SQL/Java/React):

1. **Pre-check/post-check:** thêm phần B phân loại từng lớp `AUTO_BACKFILL_CANDIDATE` /
   `MANUAL_REVIEW` / `BLOCK_MIGRATION` / `NO_ACTION` kèm `reason_code`; post-check mục 7 xác nhận
   backfill idempotent, không tạo primary sai, không trùng khóa.
2. **Draft 52:** thêm `mems_m52_assert_backfill_safe` (subject mồ côi/org lệch) chạy trước 5a;
   xác nhận 5a/5b không trùng khóa, không ghi đè primary, không tạo primary khi `subject_id NULL`.
3. **Rollback:** viết lại `ROLLBACK.md` thành 7 bước cố định + bảng tên FK/index đối chiếu draft thật.
4. **Optimistic locking:** xác minh `school_class.version` trong dump MySQL/H2, repository
   `version = version + 1 ... AND version = ?`, request `@NotNull` — xem `wp1-readiness-report.md` §3.1.
5. **Test:** thêm TC-LEG-021…024; sửa lại nội dung TC-LEG-020 (UNIQUE primary, không phải opId).
6. **Phạm vi backfill:** 5a/5b chỉ tác động lớp `deleted_at IS NULL` (khớp phần B); post-check 7c/7d/7e
   cũng lọc tương ứng để không báo nhầm dữ liệu lớp đã xoá mềm.

---

## 2. Nội dung D-08 / D-09 / D-15 bản Revision 3

### 2.1. D-08 — Preserve Historical Academic Snapshots

1. Lớp `CHUA_BAT_DAU` đổi **curriculum và danh sách môn** trực tiếp.
2. Lớp `DANG_DIEN_RA` **chỉ** đổi **môn chính**, bắt buộc ghi `class_subject_history`.
3. Mỗi bản ghi lịch sử giữ: `old_subject_id/code/name`, `new_subject_id/code/name`,
   `old_teacher_id`, `old_source`, `new_source`, `reason` (bắt buộc, ≤500), `changed_by` (từ JWT),
   `changed_at`, `operation_id`.
4. Đổi môn chính **không** ghi đè curriculum và **không** đổi các môn khác.
5. Giáo viên cũ **không** được tự gán cho môn mới.
6. `DA_KET_THUC`/`DA_HUY`/`CLOSED` **không** dùng thao tác thường; cần quy trình riêng (ngoài Phase 1).

### 2.2. D-09 — Teacher Fallback Rule

- **Chỉ fallback** sang `school_class.teacher_id` khi lớp **chưa có bản ghi `class_subject` tương
  ứng** (lớp legacy thuần).
- Nếu bản ghi `class_subject` **đã tồn tại** mà `teacher_id = NULL` → **không fallback**; nghĩa là
  môn đó **chưa được phân công** giáo viên.
- Khi đổi môn chính: dòng môn mới (nếu tạo) có `teacher_id = NULL`; **không** kế thừa giáo viên cũ.

### 2.3. D-15 — Legacy Subject Synchronization

1. Giữ `school_class.subject_id` để tương thích ngược.
2. Đồng bộ với dòng `class_subject.is_primary = 1`.
3. Đổi môn chính là **một transaction**: khoá lớp → ghi history → cập nhật `school_class.subject_id`
   + version → đồng bộ `class_subject` (tái dùng dòng nếu đã có, tắt primary cũ) → audit.
4. API thường **không** xoá dòng primary/history (409 `CLASS_SUBJECT_LEGACY_PROTECTED`).
5. Môn mới đã có trong lớp → **tái dùng** dòng, không tạo trùng `(class_id, subject_id)`.
6. **DB bảo đảm tối đa một primary**; **tối thiểu một** (khi `subject_id ≠ NULL`) do transaction +
   kiểm tra ứng dụng.

### 2.4. Năm bất biến primary (phải giữ ở mọi đường ghi)

| # | Bất biến | Cơ chế |
|---|---|---|
| 1 | `school_class.subject_id NOT NULL` → có **đúng một** dòng primary | transaction + app validation |
| 2 | `school_class.subject_id` = `subject_id` của dòng primary | transaction + app validation |
| 3 | `school_class.subject_id IS NULL` → **không** có dòng primary | transaction + app validation |
| 4 | Không bao giờ có **> 1** primary/lớp | UNIQUE `uq_class_subject_primary` (MySQL) |
| 5 | Create / change / backfill đều duy trì 1–4 | service + migration assert |

---

## 3. Thay đổi Database

### 3.1. Bảng mới `class_subject_history`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | char(36) | PK |
| `org_id` | char(36) | NOT NULL; FK tổ hợp với `class_id` |
| `class_id` | char(36) | NOT NULL |
| `old_subject_id` | char(36) NULL | NULL khi lớp chưa có môn chính |
| `old_subject_code` | varchar(50) NULL | snapshot |
| `old_subject_name` | varchar(200) NULL | snapshot |
| `old_teacher_id` | char(36) NULL | snapshot, **không** FK |
| `old_source` | varchar(20) NULL | `LEGACY`/`CURRICULUM`/`MANUAL`, CHECK |
| `new_subject_id` | char(36) | NOT NULL |
| `new_subject_code` | varchar(50) NULL | snapshot |
| `new_subject_name` | varchar(200) | NOT NULL snapshot |
| `new_source` | varchar(20) | NOT NULL, CHECK |
| `reason` | varchar(500) | **NOT NULL**, CHECK độ dài ở service (400 `REASON_TOO_LONG`) |
| `operation_id` | varchar(64) | **NOT NULL**, UNIQUE `(org_id, operation_id)` |
| `changed_by` | char(36) | NOT NULL, lấy từ JWT |
| `changed_at` | datetime(3) | NOT NULL |

- FK `(class_id, org_id) → school_class(id, org_id)` **ON DELETE RESTRICT** → không xoá lớp còn history.
- **Không** có FK tới `subject`/`staff_profile` cho cột snapshot: môn đổi tên/ngừng, giáo viên nghỉ
  vẫn hiển thị đúng lịch sử.
- CHECK `old_subject_id <> new_subject_id`.
- Index `(org_id, class_id, changed_at)`, `(org_id, new_subject_id)`.
- Append-only; Phase 1 không có API sửa/xoá.
- **Không** backfill hồi tố (không có dữ liệu nguồn về actor/thời điểm).

### 3.2. `class_subject` thêm cột

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `is_primary` | tinyint(1) NOT NULL DEFAULT 0 | CHECK `IN (0,1)` |
| `primary_class_id` | char(36) GENERATED ALWAYS AS `CASE WHEN is_primary = 1 THEN class_id END` STORED | |

- UNIQUE `uq_class_subject_primary (primary_class_id)` ⇒ **tối đa một** primary/lớp. Nhiều NULL
  được phép (MySQL coi NULL khác nhau trong UNIQUE).
- **Không** dùng `source` để nhận diện primary.
- PK `(class_id, subject_id)` **giữ nguyên**; `source ∈ {LEGACY, CURRICULUM, MANUAL}` chỉ là
  provenance.
- Không thêm UNIQUE `(class_id, is_primary)` (sẽ chặn mọi dòng không primary).

### 3.3. Bảng hiện có khác

| Đối tượng | Thay đổi |
|---|---|
| `school_class.subject_id` | **Giữ**, là bản sao của dòng primary; mọi thay đổi đi qua một service |
| `school_class.version` | **Đã có** (`BIGINT NOT NULL DEFAULT 0`, H2 schema dòng 113) → dùng làm `expectedVersion`, **không** cần đổi schema |
| `subject.code` | Giữ quyết định D-04: UNIQUE `(org_id, code)` sau pre-check |
| `school_class` | `curriculum_id` + `uq_school_class_id_org` (bắt buộc trước FK tổ hợp) |

### 3.4. Migration impact (draft, chưa chạy)

| Migration | Nội dung | Trạng thái |
|---|---|---|
| **51** | `curriculum`, `curriculum_subject`, `curriculum_subject_prerequisite`, `school_class.curriculum_id`, `uq_school_class_id_org` | Draft |
| **52** | `specialty_subject`, `teacher_subject`, `class_subject` (+`is_primary`, cột sinh, UNIQUE, CHECK, FK), **`class_subject_history`**, backfill exact-match, assert không >1 primary | Draft |
| **53** | **Không tạo.** Chỉ tạo khi có bằng chứng một môi trường đã áp một bản 52 cũ cần nâng cấp | Không tồn tại |

- Repo hiện tại: migration cao nhất là **50**; không có file 51/52/53 nào trước Revision 3.
- `UPDATE` đánh dấu primary chạy **trước** khi thêm UNIQUE; migration 52 gọi
  `mems_m52_assert_no_duplicate_primary` trước `CALL mems_m52_add_unique(...)`.
- Backfill chỉ áp cho lớp có **đúng một** dòng legacy khớp chính xác `school_class.subject_id`;
  lớp 0 khớp hoặc >1 ứng viên → **không** đoán, ghi vào báo cáo rà soát tay.

### 3.5. Khác biệt H2 (fixture test)

| Điểm | MySQL | H2 (fixture) | Hệ quả |
|---|---|---|---|
| Cột sinh | `GENERATED … STORED` | Không hỗ trợ `STORED` → cột thường `primary_class_id` | Service phải tự set; test H2 **không** chứng minh DB tự sinh |
| `is_primary` | `tinyint(1)` | `BOOLEAN` | Tương đương logic |
| Bất biến tối thiểu | transaction + app | chỉ transaction + app | H2 **không** chứng minh bất biến #1/#2/#3 |
| FK tổ hợp | cần index `(id, org_id)` trên bảng cha | cần `UNIQUE(id, org_id)` khai báo tường minh | Đã thêm vào fixture |
| `ALTER TABLE … AFTER` | hỗ trợ | không dùng trong migration draft | Draft tránh phụ thuộc vị trí cột |

---

## 4. Thay đổi API

### 4.1. `PUT /api/classes/{id}/subjects/primary` (mới)

Body **bắt buộc**: `subjectId`, `reason` (≤500), `expectedVersion`, `operationId`.
Tuỳ chọn: `plannedSessions`/`sessionMinutes` (chỉ khi phải tạo dòng mới).
`changedBy` **không** nhận từ body — lấy từ JWT.

- Quyền: `class.edit`; module `STUDENT_MANAGEMENT`.
- Trạng thái cho phép: `CHUA_BAT_DAU`, `DANG_DIEN_RA`; còn lại 409 `CLASS_NOT_EDITABLE` (không ghi
  history).
- Transaction: khoá lớp → tra `operationId` (idempotency) → ghi history → `school_class.subject_id`
  + version → `class_subject` (tái dùng dòng; tắt primary cũ; không xoá) → audit.
- Idempotency: cùng `operationId` + cùng payload chuẩn hoá → trả lại kết quả cũ (cùng `historyId`);
  cùng `operationId` + payload khác → 409 `CLASS_SUBJECT_OPERATION_CONFLICT`.
- Response: `classId`, `primarySubjectId`, `version`, `historyId`, `history{…, oldSource, newSource,
  operationId}`, `teacherAssigned=false`.
- Lỗi: 400 `VALIDATION_ERROR` (thiếu field), 400 `REASON_TOO_LONG`, 400 `SUBJECT_INACTIVE`;
  404 `CLASS_NOT_FOUND`/`SUBJECT_NOT_FOUND`; 409 `CLASS_NOT_EDITABLE` / `DATA_CHANGED` /
  `CLASS_SUBJECT_OPERATION_CONFLICT`; 403; 400 `MODULE_NOT_ENABLED`.

### 4.2. `GET /api/classes/{id}/subject-history` (mới)

- Quyền: `class.view`; phân trang `page`/`size`; sắp `changed_at DESC`.
- Trả snapshot thuần, không join `subject`/`staff_profile`.
- Không có endpoint sửa/xoá (404/405).

### 4.3. `PUT /api/classes/{id}` (hiện có)

- `subjectId` **không đổi** → hành vi cũ; `version` vẫn **bắt buộc** như hiện tại
  (`SchoolClassUpdateRequest` `@NotNull VERSION_REQUIRED`), không đổi hợp đồng.
- `subjectId` **đổi** → **bắt buộc** `reason`, `operationId`, `version` (= `expectedVersion`);
  thiếu → 400 `VALIDATION_ERROR`; lệch version → 409 (hiện `PUT /classes/{id}` trả
  `STATUS_CHANGED` 2207; endpoint mới đề xuất `DATA_CHANGED` 2212 — xem `wp1-readiness-report.md`
  §3.1, cần chốt khi code); cùng `operationId` payload khác → 409.
- Service **không** được `repository.save()` thẳng với `subjectId` mới; phải gọi
  `PrimarySubjectChangeService`.
- Response `ClassResponse` **không đổi** (không phá FE).
- Đây là thay đổi hành vi: FE đang đổi `subjectId` mà không gửi đủ field sẽ nhận 400.

### 4.4. `GET /api/classes/{id}/subjects` (hiện có)

- Thêm `isPrimary` (field mới, không phá).
- Lớp **chưa có** `class_subject` → 1 dòng suy từ `school_class.subject_id`,
  `source=LEGACY`, `isPrimary=true`, `teacherId` từ `school_class.teacher_id`.
- Lớp **đã có** `class_subject` → không trả thêm dòng suy; **không** fallback `teacher_id` cho
  dòng có `teacher_id = NULL` (D-09).

### 4.5. `DELETE /api/classes/{id}` (hiện có)

- Lớp **chưa có** history → `204` như hiện tại.
- Lớp **đã có** history → **409 `CONFLICT`** (message: lớp có lịch sử đổi môn); không xoá/CASCADE.
- Service kiểm trước để **không** rơi 500 do FK `RESTRICT`.

---

## 5. Thay đổi quyền

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| `class.edit` | Dùng lại | Đổi môn chính + áp curriculum + gán môn; ORGANIZATION |
| `class.view` | Dùng lại | Xem danh sách môn + lịch sử đổi môn |
| `curriculum.view/manage` | Giữ D-14 | Không liên quan đổi môn chính |
| `employee.edit` | Giữ | Gán chuyên môn |
| Quyền mới cho đổi môn chính | **Không tạo** | Không thêm ID quyền mới |
| Quyền sửa/xoá history | **Không tồn tại** | Không có API tương ứng |

Ghi chú: `class.edit` là ORGANIZATION-only → trưởng phòng DEPARTMENT không đổi môn chính trừ khi
họ còn giữ chức danh ORGANIZATION. Tài liệu ghi rõ, không tự mở scope.

---

## 6. Ảnh hưởng tương thích

| Điểm | Ảnh hưởng |
|---|---|
| `PUT /classes/{id}` (FE đang dùng) | Khi **không** đổi `subjectId`: không đổi. Khi **đổi** `subjectId`: nay bắt buộc `reason`/`operationId`/`version` → 400 nếu thiếu. Cần phối hợp FE |
| `DELETE /classes/{id}` | Lớp có history → 409 thay vì xoá cứng; lớp chưa có → 204 |
| `GET /classes/{id}/subjects` | Thêm `isPrimary`; FE cũ bỏ qua |
| `ensureEditable` hiện tại | Đã chặn `DA_KET_THUC/DA_HUY/CLOSED` — khớp D-08; chỉ cần thêm nhánh xử lý primary |
| Audit log | Thêm `CLASS_PRIMARY_SUBJECT_CHANGED`; event cũ không đổi |
| Schedule PeopleClient | Không đổi; Phase 1 không phát event đổi môn chính |
| Gateway | Route `/api/classes/**` đã có → 2 endpoint mới dùng route hiện tại |

---

## 7. Kiểm thử đã bổ sung (chưa thực thi)

### 7.1. Nhóm đổi môn chính/history

| ID | Nội dung |
|---|---|
| TC-CLS-021…036 | Đổi trước/khi đang học, từ chối trạng thái kết thúc, snapshot, `old_teacher_id`, không chuyển GV, tái dùng dòng, rollback, version, đồng thời, org, không có API sửa history, `PUT /classes/{id}` không bypass, lớp legacy lần đầu |
| TC-CLS-037/038 | `DELETE /classes/{id}` có/không history |
| TC-CLS-039 | Lưu `old_source`/`new_source` |
| TC-CLS-040 | `subject_id NULL` → không primary |
| TC-CLS-041 | Thiếu `subjectId`/`reason`/`expectedVersion`/`operationId` → 400 |
| TC-CLS-042 | Cùng `operationId` + payload khác → 409 |
| TC-CLS-043 | Cùng `operationId` + cùng payload → cùng `historyId` |
| TC-CLS-044 | `PUT /classes/{id}` đổi môn thiếu field → 400 |
| TC-CLS-045 | Retry sau request lỗi → một history duy nhất |
| TC-CLS-046 | D-09 fallback theo bản ghi |
| TC-CLS-047 | Rollback khi cập nhật `class_subject` fail |
| TC-CLS-048 | `school_class.subject_id` = `subject_id` dòng primary |
| TC-RBAC-014/015 | Quyền đổi môn chính / xem history |

### 7.2. Legacy & migration

| ID | Nội dung |
|---|---|
| TC-LEG-001…015 | Pre-check, backfill idempotent, FK/UNIQUE/CHECK như `database-schema.md` |
| TC-LEG-016 | Backfill exact-match tạo primary đúng |
| TC-LEG-017 | Lớp không khớp/mơ hồ → báo cáo rà soát, không tự đoán |
| TC-LEG-018 | MySQL: cột sinh + UNIQUE chặn primary thứ hai |
| TC-LEG-019 | Khác biệt H2: bất biến tối thiểu **không** kiểm được trên H2 |
| TC-LEG-020 | UNIQUE `(primary_class_id)` chặn primary thứ hai (không bảo đảm tối thiểu) |
| TC-LEG-021 | Pre-check phân loại đủ 6 trường hợp (AUTO/MANUAL/BLOCK/NO_ACTION) |
| TC-LEG-022 | Backfill chạy lại idempotent (không trùng, không đổi primary) |
| TC-LEG-023 | Không tạo primary khi `subject_id NULL`, không ghi đè primary mâu thuẫn |
| TC-LEG-024 | Partial rollback đúng dependency index → cột sinh → `is_primary` |

### 7.3. Ánh xạ 24 kịch bản yêu cầu

| # | Kịch bản | Test |
|---|---|---|
| 1 | Đổi trước khi bắt đầu | TC-CLS-021 |
| 2 | Đổi khi đang diễn ra | TC-CLS-022 |
| 3 | Từ chối kết thúc/huỷ/đóng | TC-CLS-023 |
| 4 | Giữ mã/tên môn cũ | TC-CLS-026 |
| 5 | Giữ giáo viên cũ | TC-CLS-027 |
| 5b | Giữ `old_source`/`new_source` | TC-CLS-039 |
| 6 | Không kế thừa giáo viên | TC-CLS-028 |
| 7 | Tái dùng dòng đã có | TC-CLS-029 |
| 8 | Đúng một primary | TC-CLS-029/032/048, TC-LEG-018 |
| 9 | `subject_id` = primary | TC-CLS-048 |
| 10 | `subject_id NULL` → không primary | TC-CLS-040 |
| 11 | Rollback khi ghi history lỗi | TC-CLS-030 |
| 12 | Rollback khi cập nhật `class_subject` lỗi | TC-CLS-047 |
| 13 | Cách ly org | TC-CLS-033 |
| 14 | Xung đột đồng thời | TC-CLS-032 |
| 15 | Cùng `operationId` cùng payload | TC-CLS-043 |
| 16 | Cùng `operationId` khác payload | TC-CLS-042 |
| 17 | Retry sau lỗi | TC-CLS-045 |
| 18 | `PUT /classes/{id}` không bypass | TC-CLS-035 |
| 19 | `DELETE` có history → 409 | TC-CLS-037 |
| 20 | Backfill exact-match | TC-LEG-016 |
| 21 | Backfill không khớp → báo cáo | TC-LEG-017 |
| 22 | Fallback giáo viên D-09 | TC-CLS-046 |
| 23 | Hành vi cột sinh MySQL | TC-LEG-018 |
| 24 | Giới hạn parity H2 | TC-LEG-019 |

**Chưa có test nào được chạy.** Không tuyên bố pass.

---

## 8. Rủi ro kỹ thuật còn lại

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Hai đường ghi (`PUT /classes/{id}` vs `PUT .../subjects/primary`) lệch nhau | **Cao** | Bắt buộc dùng chung `PrimarySubjectChangeService`; TC-CLS-035 |
| Tài liệu/code hiểu sai UNIQUE là "đúng một primary" | **Cao** | Ghi rõ "tối đa"; kiểm app; TC-CLS-047/048 |
| Cột sinh khác MySQL vs H2 | Trung bình | Cột thường trong fixture; xác minh staging TC-LEG-018/019 |
| Backfill gặp dòng không khớp/mơ hồ | Trung bình | Exact-match only; báo cáo rà soát tay; không đoán |
| `school_class.subject_id` bị ghi trực tiếp ở chỗ khác | **Cao** | Rà mọi chỗ gán `subjectId`; chỉ service được set |
| `DELETE /classes/{id}` rơi 500 do FK | Trung bình | Kiểm history trước; TC-CLS-037 |
| FE cũ đổi `subjectId` không gửi field mới → 400 | Trung bình | Ghi rõ trong API contract; phối hợp FE trước khi WP5 |
| History phình to | Thấp | Append-only, index `(org_id, class_id, changed_at)` |
| Rollback migration làm mất history | **Cao** | `ROLLBACK.md`: nêu rõ mất dữ liệu, điều kiện an toàn, ưu tiên forward-fix |
| Migration 51/52 chưa chạy | Cao | Người dùng chạy staging, backup trước, pre/post-check |

---

## 9. Thứ tự triển khai (tóm tắt)

```text
WP0 baseline → WP1 migration 51/52 + test schema (không có 53)
             → WP2 Subject (song song được)
             → WP3 Teacher–Subject
             → WP4 Curriculum
             → WP5 Class–Subject + PrimarySubjectChangeService (history + idempotency)
             → WP6 Internal API/outbox hook (khi cần)
             → WP7 Test + E2E
             → WP8 Handoff FE
```

---

## 10. Quyết định kỹ thuật đã chốt

| # | Vấn đề | Chốt |
|---|---|---|
| 1 | Nơi lưu history | Bảng riêng `class_subject_history` |
| 2 | Đánh dấu primary | `class_subject.is_primary` |
| 3 | `source` | Giữ `LEGACY`/`CURRICULUM`/`MANUAL`, chỉ provenance |
| 4 | UNIQUE primary | Cột sinh + UNIQUE (MySQL) |
| 5 | Bất biến primary | DB: tối đa một; app + transaction: tối thiểu một khi `subject_id ≠ NULL` |
| 6 | Snapshot source | Lưu `old_source`, `new_source` |
| 7 | `operationId` | **Bắt buộc**, lưu vĩnh viễn |
| 8 | `expectedVersion` | **Bắt buộc** ở mọi thao tác đổi môn chính |
| 9 | `reason` | **Bắt buộc**, ≤500 ký tự |
| 10 | `changedBy` | Từ JWT, không nhận từ request |
| 11 | Idempotency | Cùng opId + cùng payload → kết quả cũ; cùng opId + khác payload → 409 |
| 12 | `plannedSessions` | Giữ thiết kế hiện tại, không thêm default mới |
| 13 | Outbox | Không có ở Phase 1 |
| 14 | Xoá lớp có history | HTTP 409, không xoá cứng |
| 15 | Migration 53 | Chỉ khi có bằng chứng môi trường đã áp bản 52 cũ |

**Không còn câu hỏi nghiệp vụ mở.** Các câu hỏi kỹ thuật còn lại (nếu có) nằm trong
`wp1-readiness-report.md` §10 và không chặn WP1.

---

## 11. Xác nhận phạm vi

Trong toàn bộ Revision 3:

- **Không** sửa logic nghiệp vụ Java nào; **không** sửa React.
- **Không** chạy SQL, **không** chạy migration, **không** kết nối production/staging DB.
- **Không** deploy/restart service; **không** sửa `.env`, CORS, `vercel.json`, backend URL.
- **Không** commit, push, merge, reset, force-push.
- **Không** sửa module không liên quan.
- **Không** tuyên bố test pass (chưa chạy test nào).
- **Không** tuyên bố schema đã xác minh (chỉ H2 fixture).
- **Không** tuyên bố migration đã áp dụng.
- Chỉ tạo **SQL draft** + cập nhật H2 fixture + tài liệu; người dùng tự chạy migration trên staging.

---

## 12. Điều kiện chuyển sang `APPROVED`

Trạng thái hiện tại là `READY FOR USER REVIEW`. Chỉ chuyển `APPROVED` khi người dùng đã:

1. Duyệt D-08/D-09/D-15 tại `subject-business-requirements.md` (nguồn sự thật).
2. Duyệt DDL + backfill trong `database-schema.md` §3 và migration draft 51/52.
3. Duyệt hợp đồng API §4.7–4.9 (`api-contract.md`), đặc biệt việc **bắt buộc** `reason`/
   `operationId`/`expectedVersion` trên `PUT /classes/{id}` khi đổi `subjectId`.
4. Chấp nhận rằng H2 **không** chứng minh hành vi MySQL và cần xác minh staging.
5. Quyết định thời điểm chạy migration 51/52 trên staging (ngoài phạm vi tài liệu này).

Nếu một `D-xx` thay đổi, phải cập nhật đồng thời:
`subject-business-requirements.md` → `curriculum-business-design.md` + `database-schema.md` +
`erd.md` → `api-contract.md` + `validation-and-error-cases.md` →
`teacher-subject-design.md` + `role-permission-matrix.md` →
`test-cases.md` + `implementation-roadmap.md` + `wp0-readiness-report.md` +
`wp1-readiness-report.md` + báo cáo này.
