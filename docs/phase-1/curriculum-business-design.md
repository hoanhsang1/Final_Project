# Phase 1 — Thiết kế Chương trình đào tạo (Curriculum) và Lớp–Môn

> Tài liệu thiết kế. **Chưa có** bảng `curriculum`, `curriculum_subject`,
> `curriculum_subject_prerequisite`, `class_subject` trong source.
> **Trạng thái quyết định:** `D-01`…`D-15` **đã được người dùng chốt**; xem sổ quyết định trong
> `subject-business-requirements.md`. Tài liệu này chỉ mô tả thiết kế — không thay đổi source code
> và **không chạy migration**.
> Người dùng trực tiếp viết code Backend.

---

## 1. Mục tiêu và phạm vi

Thiết kế mô hình để trả lời rõ:

1. Một chương trình đào tạo gồm những môn nào.
2. Thứ tự các môn trong chương trình biểu diễn thế nào.
3. Số buổi, số giờ lý thuyết/thực hành, thời lượng buổi khai báo ở đâu.
4. Môn tiên quyết (nhiều môn) biểu diễn thế nào.
5. Một lớp có thể học nhiều môn không.
6. Được thay đổi chương trình/môn khi lớp đang học không.
7. Dữ liệu lịch sử (buổi đã xếp, lớp đã kết thúc) được bảo vệ ra sao.

Ngoài phạm vi: sinh lịch tự động, phân bổ giáo viên theo tiết, mô hình năm học/học kỳ dạng bảng
(không thuộc Phase 1), học phí, điểm danh.

> **Không có mô hình học kỳ.** Chương trình dùng `sequence_no` để sắp thứ tự môn. Không có
> `term_no`, không có bảng `academic_term` (D-02).

---

## 2. Hiện trạng liên quan (đã kiểm chứng)

| Thành phần | Hiện trạng |
|---|---|
| Môn của lớp | `school_class.subject_id` nullable, FK RESTRICT → `subject(id, org_id)`; tối đa 1 môn/lớp |
| Năm học | `school_class.academic_year varchar(50)` tự do, không phải bảng |
| Thứ tự môn trong chương trình | **Chưa có** (chưa có curriculum) |
| Số buổi/giờ lý thuyết–thực hành | **Chưa có** (không ở `subject`, không ở lớp) |
| Môn tiên quyết | **Chưa có** |
| Nhiều môn/lớp | **Chưa có** |
| Schedule mirror | `class.subject` dạng text, `max_size`; không có `subject_id` |

Nguồn: `DB_11_16.sql:376` (`school_class`), `SchoolClassService.create/update`,
`backend/ScheduleService/src/test/resources/schedule-test-schema.sql`.

---

## 3. Mô hình đề xuất

### 3.1. Tổng quan

```
organization
  └── curriculum (template cấp tổ chức, tái sử dụng)
        ├── curriculum_subject (môn + thứ tự + số buổi + giờ LT/TH + thời lượng)
        └── curriculum_subject_prerequisite (cạnh tiên quyết nhiều–nhiều)
school_class
  ├── curriculum_id (nullable, tham chiếu template đã áp dụng)
  ├── subject_id (legacy, môn chính)
  └── class_subject (snapshot môn thực tế của lớp + giáo viên theo môn)
```

Nguyên tắc:

- **Template ≠ bản ghi của lớp.** `curriculum_subject` là định nghĩa; `class_subject` là bản
  sao tại thời điểm áp dụng, được phép chỉnh `planned_sessions` trước khi xếp lịch.
- **Không sửa lịch sử:** sửa curriculum không làm đổi `class_subject` của lớp đã áp dụng.
- **Legacy không bị phá:** lớp cũ không có curriculum vẫn đọc/ghi được như hiện tại
  (`school_class.subject_id` được bảo toàn, D-15).

### 3.2. `curriculum`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | char(36) | PK |
| `org_id` | char(36) | NOT NULL |
| `code` | varchar(50) | NOT NULL; UNIQUE `(org_id, code)` |
| `name` | varchar(200) | NOT NULL |
| `name_unaccented` | varchar(200) | NOT NULL; UNIQUE `(org_id, name_unaccented)` |
| `description` | varchar(1000) | NULL |
| `grade_level` | varchar(50) | NULL — khối/niên khoá; **metadata mô tả tuỳ chọn**, không phải khoá nghiệp vụ |
| `program_code` | varchar(50) | NULL — mã ngành/chương trình; metadata mô tả tuỳ chọn |
| `is_active` | tinyint(1) | NOT NULL DEFAULT 1 |
| `version` | bigint | NOT NULL DEFAULT 0 — optimistic lock, sửa tại chỗ (D-12) |
| `created_by` | char(36) | NULL |
| `created_at` | datetime(3) | NOT NULL |
| `updated_by` | char(36) | NULL |
| `updated_at` | datetime(3) | NULL |

Unique: `uq_curriculum_id_org(id, org_id)`, `uq_curriculum_org_code(org_id, code)`,
`uq_curriculum_org_name(org_id, name_unaccented)`.
Index: `idx_curriculum_org_active(org_id, is_active)`.

Curriculum là **template cấp tổ chức**; một lớp tham chiếu tối đa một curriculum (D-02).
Không có phiên bản chương trình riêng — sửa tại chỗ và tăng `version`; lớp đã áp dụng giữ
snapshot trong `class_subject` (D-12).

### 3.3. `curriculum_subject`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `curriculum_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 |
| `org_id` | char(36) | NOT NULL |
| `sequence_no` | smallint | NOT NULL — thứ tự môn trong chương trình; UNIQUE `(curriculum_id, sequence_no)` |
| `required_sessions` | smallint | NOT NULL — tổng số buổi/tiết yêu cầu |
| `theory_sessions` | smallint | NOT NULL DEFAULT 0 |
| `practice_sessions` | smallint | NOT NULL DEFAULT 0 |
| `session_minutes` | smallint | NOT NULL — độ dài 1 buổi (phút) |
| `is_required` | tinyint(1) | NOT NULL DEFAULT 1 — bắt buộc/tự chọn |
| `note` | varchar(500) | NULL |
| `created_at` | datetime(3) | NOT NULL |
| `updated_at` | datetime(3) | NULL |

PK `(curriculum_id, subject_id)`.
UNIQUE `(curriculum_id, sequence_no)` và **`(curriculum_id, subject_id, org_id)`** (bắt buộc để
bảng nối tiên quyết tham chiếu được bằng FK tổ hợp).
FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE CASCADE.
FK `(subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
CHECK: `required_sessions > 0`, `session_minutes > 0`, `theory_sessions >= 0`,
`practice_sessions >= 0`, `sequence_no > 0`.

**Vị trí khai báo số buổi/giờ (D-03):**

- `curriculum_subject` là nơi **bắt buộc** khai báo `required_sessions`, `theory_sessions`,
  `practice_sessions`, `session_minutes`.
- `subject` (danh mục) chỉ có default **tuỳ chọn**; `class_subject` được override **trước khi**
  có buổi học.
- D-03 **không bắt buộc** `theory_sessions + practice_sessions = required_sessions`; vì vậy **không**
  đặt ràng buộc tổng này ở DB hay service như một quy tắc nghiệp vụ bắt buộc.
- Đơn vị "tiết" và độ dài buổi mặc định (ví dụ 45 phút) là **ví dụ**, không phải quy tắc cứng.

### 3.3.1. `curriculum_subject_prerequisite`

Bảng nối cho quan hệ nhiều–nhiều "môn X cần học trước các môn Y, Z..." (D-07 — nhiều tiên quyết).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `curriculum_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 — môn đang xét |
| `prerequisite_subject_id` | char(36) | PK phần 3 — môn phải học trước |
| `org_id` | char(36) | NOT NULL |
| `created_at` | datetime(3) | NOT NULL |

PK `(curriculum_id, subject_id, prerequisite_subject_id)` — chặn cạnh trùng.
Index `idx_csp_prereq(org_id, prerequisite_subject_id)`, `idx_csp_subject(org_id, subject_id)`.

FK **tổ hợp** `(curriculum_id, subject_id, org_id) → curriculum_subject(curriculum_id, subject_id, org_id)`
ON DELETE CASCADE — xoá môn khỏi curriculum xoá các cạnh của nó.
FK **tổ hợp** `(curriculum_id, prerequisite_subject_id, org_id) → curriculum_subject(curriculum_id, subject_id, org_id)`
ON DELETE RESTRICT — không xoá môn đang là tiên quyết của môn khác.
CHECK `subject_id <> prerequisite_subject_id`.

**Tính toàn vẹn (đã kiểm chứng thiết kế):**

| Ràng buộc | Cơ chế |
|---|---|
| Tiên quyết cùng curriculum | `curriculum_id` nằm trong cả hai FK tổ hợp |
| Tiên quyết cùng org | `org_id` nằm trong cả hai FK tổ hợp |
| Không tự tiên quyết | CHECK `subject_id <> prerequisite_subject_id` |
| Không trùng cạnh | PK 3 cột |
| Không chu trình (A→B→A, A→B→C→A) | Service DFS trên đồ thị cạnh của `curriculum_id` trước khi ghi; DB không thể chặn chu trình dài bằng CHECK |
| Môn tiên quyết phải tồn tại trong curriculum | FK tổ hợp tới `curriculum_subject` |

**Nghiệp vụ Phase 1:**

- Chỉ **cảnh báo** khi môn tiên quyết chưa đạt; **không chặn** xếp lịch (D-07).
- Định nghĩa không hợp lệ (tự trỏ, trùng cạnh, chu trình, trỏ môn ngoài curriculum) bị chặn
  **trước khi ghi** — đây là lỗi dữ liệu, không phải cảnh báo.
- Xoá môn khỏi curriculum: service phải gỡ các cạnh liên quan trước; nếu chưa gỡ, FK RESTRICT
  chặn và trả 409.
- Clone curriculum: map cả `subject_id` và `prerequisite_subject_id` sang bản clone.
- API nhận/trả **mảng** `prerequisiteSubjectIds` (0..n), không phải một cột đơn.

### 3.4. `class_subject`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `class_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 |
| `org_id` | char(36) | NOT NULL |
| `curriculum_id` | char(36) | NULL — curriculum đã áp dụng khi tạo dòng |
| `source` | varchar(20) | NOT NULL — `LEGACY` / `CURRICULUM` / `MANUAL` |
| `sequence_no` | smallint | NULL — snapshot thứ tự từ `curriculum_subject`; `MANUAL`/`LEGACY` để NULL |
| `teacher_id` | char(36) | NULL — giáo viên môn này (D-09) |
| `is_primary` | tinyint(1) | NOT NULL DEFAULT 0 — môn chính; đúng một dòng/lớp (D-15) |
| `primary_class_id` | char(36) GENERATED | `CASE WHEN is_primary THEN class_id END` STORED; UNIQUE để ép một primary/lớp |
| `required_sessions` | smallint | NULL — snapshot từ curriculum |
| `planned_sessions` | smallint | NULL — override trước khi xếp lịch |
| `theory_sessions` | smallint | NULL |
| `practice_sessions` | smallint | NULL |
| `session_minutes` | smallint | NULL |
| `status` | varchar(20) | NOT NULL DEFAULT `PLANNED` |
| `note` | varchar(500) | NULL |
| `created_by` | char(36) | NULL |
| `created_at` | datetime(3) | NOT NULL |
| `updated_by` | char(36) | NULL |
| `updated_at` | datetime(3) | NULL |

PK `(class_id, subject_id)`; UNIQUE `(primary_class_id)` (MySQL cho phép nhiều NULL ⇒ nhiều dòng
không primary, tối đa một dòng primary/lớp).
FK **tổ hợp** `(class_id, org_id) → school_class(id, org_id)` ON DELETE CASCADE.
FK `(subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
FK `(teacher_id, org_id) → staff_profile(user_id, org_id)` ON DELETE RESTRICT (đồng bộ với `school_class.teacher_id`; service kiểm thêm `teacher_profile`).
FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE RESTRICT (không dùng SET NULL vì FK tổ hợp sẽ set cả `org_id`).
CHECK `status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')`, `source IN ('LEGACY','CURRICULUM','MANUAL')`, `sequence_no IS NULL OR sequence_no > 0`, `is_primary IN (0,1)`.
Index: `idx_class_subject_org_subject(org_id, subject_id)`, `idx_class_subject_teacher(teacher_id, org_id)`, `idx_class_subject_curriculum(curriculum_id, org_id)`.
UNIQUE `uq_class_subject_primary(primary_class_id)`.

> Bất biến "`school_class.subject_id` = môn primary" không thể ép bằng FK (vì `class_subject`
> tham chiếu ngược `school_class`); service bảo đảm trong cùng transaction (D-15). Kiểm tra đồng bộ
> định kỳ ở `database-schema.md` §6.

> FK tổ hợp `(class_id, org_id)` yêu cầu `school_class` có `uq_school_class_id_org (id, org_id)`.
> Index này **chưa có trong DB hiện tại**; migration 51 phải thêm trước migration 52 (xem
> `database-schema.md` mục 2.2).

### 3.5. Thay đổi trên `school_class`

| Cột mới | Kiểu | Ghi chú |
|---|---|---|
| `curriculum_id` | char(36) NULL | FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE RESTRICT |

- **Không** xoá `subject_id`; giữ làm môn chính legacy (D-01, D-15). Đây là bản sao của dòng
  `class_subject` có `is_primary = 1`; đổi môn chính phải đi qua luồng ghi history (D-15), không
  đặt cột trực tiếp.
- **Không** đổi `academic_year` ở Phase 1; không thêm `academic_term_id` (không có mô hình học kỳ).

### 3.6. `class_subject_history` (mới — D-08/D-15)

Bảng **append-only** ghi lại mỗi lần đổi môn chính của lớp, kể cả khi lớp đã `DANG_DIEN_RA`.
Snapshot môn cũ/mới **không** phụ thuộc bảng `subject` hiện tại.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | char(36) | PK |
| `org_id` | char(36) | NOT NULL |
| `class_id` | char(36) | NOT NULL |
| `old_subject_id` | char(36) | NULL (lớp chưa có môn) |
| `old_subject_code` | varchar(50) | NULL — snapshot |
| `old_subject_name` | varchar(200) | NULL — snapshot |
| `old_teacher_id` | char(36) | NULL — giáo viên của môn cũ tại thời điểm đổi |
| `new_subject_id` | char(36) | NOT NULL |
| `new_subject_code` | varchar(50) | NULL — snapshot |
| `new_subject_name` | varchar(200) | NOT NULL — snapshot |
| `reason` | varchar(500) | NULL |
| `operation_id` | varchar(64) | NULL — idempotency (UNIQUE `(org_id, operation_id)`) |
| `changed_by` | char(36) | NOT NULL — user thực hiện |
| `changed_at` | datetime(3) | NOT NULL |

FK `(class_id, org_id) → school_class(id, org_id)` ON DELETE RESTRICT (không xoá lớp còn history).
Snapshot môn **không** có FK tới `subject`: FK sẽ chặn đổi tên/ngừng môn và làm mất lịch sử.
Index `(org_id, class_id, changed_at)`. `changed_at` là **thời điểm hiệu lực** của môn chính mới
(áp ngay, không hẹn giờ ở Phase 1); không có `effective_from/effective_to`.

> Không có API sửa/xoá history ở Phase 1. `DELETE /classes/{id}` có sẵn trong source
> (`class.delete`) **phải** kiểm history trước: lớp đã có history → 409 `CONFLICT`; nếu bỏ qua,
> FK RESTRICT ném lỗi và API trả 500. Không CASCADE/xoá history để xoá lớp.

---

## 4. Nghiệp vụ chi tiết

### 4.1. BR-CUR-F01 — Tạo curriculum

- **Actor:** OWNER hoặc người có `curriculum.manage` (ORGANIZATION scope, D-14). Giáo vụ được
  cấp qua chức danh (position-based), không tự động cho mọi nhân viên.
- **Điều kiện:** `code` + `name` hợp lệ; `code` duy nhất trong tổ chức; module
  `STUDENT_MANAGEMENT` đang bật (D-10).
- **Luồng chính:**
  1. `orgId` từ JWT.
  2. Kiểm `(org_id, code)` và `(org_id, name_unaccented)`.
  3. Insert `curriculum` với `is_active=true`, `version=0`.
  4. Audit `CURRICULUM_CREATED`.
- **Thay thế:** trùng → 409 `CURRICULUM_CODE_EXISTS` / `CONFLICT`.
- **Quyền:** `curriculum.manage`.

### 4.2. BR-CUR-F02 — Thêm môn vào curriculum

- **Actor:** người có `curriculum.manage`.
- **Điều kiện:**
  - Curriculum tồn tại, đang active.
  - Subject tồn tại, **active**, cùng tổ chức.
  - Chưa có cặp `(curriculum_id, subject_id)`.
  - `sequence_no` chưa dùng.
  - `required_sessions`, `session_minutes` > 0.
  - `prerequisiteSubjectIds` (mảng, có thể rỗng): mọi phần tử là môn khác **đã có trong cùng
    curriculum**, không tự trỏ, không trùng lặp, **không tạo chu trình**.
- **Luồng chính:** insert `curriculum_subject`; insert các cạnh `curriculum_subject_prerequisite`;
  audit `CURRICULUM_SUBJECT_ADDED`; tăng `curriculum.version`.
- **Thay thế:** trùng môn → 409 `CURRICULUM_SUBJECT_DUPLICATE`; trùng thứ tự → 409
  `CURRICULUM_SEQUENCE_DUPLICATE`; tiên quyết ngoài curriculum → 404
  `CURRICULUM_SUBJECT_NOT_FOUND`; tiên quyết trùng/ quá nhiều → 400
  `PREREQUISITE_DUPLICATE` / `PREREQUISITE_IDS_TOO_MANY`; chu trình → 400
  `SUBJECT_PREREQUISITE_CYCLE` (kèm `path`).
- **Quyền:** `curriculum.manage`.

### 4.3. BR-CUR-F03 — Sửa/Xoá môn trong curriculum

- Sửa: cập nhật các cột định nghĩa và **thay toàn bộ** tập tiên quyết nếu `prerequisiteSubjectIds`
  được gửi; không đổi `subject_id` (muốn đổi thì xoá + thêm).
- Xoá môn: gỡ các cạnh tiên quyết liên quan trước (nếu còn môn khác phụ thuộc, trả 409 để người
  dùng xác nhận/gỡ) rồi xoá dòng.
- Lớp đã áp dụng không bị đổi vì đã snapshot (D-08).
- Audit `CURRICULUM_SUBJECT_UPDATED/REMOVED`.

### 4.4. BR-CUR-F04 — Áp dụng curriculum cho lớp

- **Actor:** người có `class.edit` và `curriculum.view` (đọc chương trình để áp).
- **Điều kiện:**
  - Lớp tồn tại, không `DA_KET_THUC/DA_HUY/CLOSED`.
  - Curriculum tồn tại, active, cùng org.
  - Nếu lớp đã có `class_subject` nguồn `CURRICULUM`: yêu cầu `confirmReplace=true` và chỉ
    khi lớp `CHUA_BAT_DAU`.
- **Luồng chính:**
  1. Kiểm điều kiện.
  2. Với mỗi `curriculum_subject`, upsert `class_subject` (`source=CURRICULUM`,
     `curriculum_id`, snapshot sessions/minutes, `status=PLANNED`).
  3. Xoá các `class_subject` nguồn `CURRICULUM` không còn trong curriculum (nếu thay thế).
  4. Cập nhật `school_class.curriculum_id`, tăng `version` lớp.
  5. Audit `CLASS_CURRICULUM_APPLIED`.
- **Không làm:** không đụng dòng `source=LEGACY`/`MANUAL` trừ khi người dùng chọn thay thế
  (`keepManualSubjects=false`).
- **Thay thế:** lớp đã bắt đầu → 409 `CLASS_SUBJECT_LOCKED`; curriculum inactive → 400
  `CURRICULUM_INACTIVE`; version lệch → 409 `DATA_CHANGED`.

### 4.5. BR-CUR-F05 — Gán/bỏ môn thủ công cho lớp

- Cho phép thêm môn ngoài curriculum (`source=MANUAL`) khi lớp `CHUA_BAT_DAU`.
- Bắt buộc nhập `planned_sessions` và `session_minutes` (không có default từ curriculum).
- Xoá môn: chỉ khi lớp `CHUA_BAT_DAU`. Không cho xoá dòng `is_primary = 1` hiện tại hoặc dòng
  `LEGACY` khớp `school_class.subject_id` (409 `CLASS_SUBJECT_LEGACY_PROTECTED`, D-15).
- Phase 1 **không gọi sang Schedule**.

### 4.6. BR-CUR-F06 — Đổi môn chính khi lớp đang học (D-08/D-15)

**Snapshot & phạm vi:**

- `class_subject` đã tạo **không** bị sửa khi curriculum thay đổi.
- Lớp `DANG_DIEN_RA`: **không** áp curriculum mới, **không** thêm/bớt môn; **chỉ** được đổi
  **môn chính** qua `PUT /classes/{id}/subjects/primary` (hoặc `PUT /classes/{id}` có `subjectId`).
- Lớp `DA_KET_THUC/DA_HUY/CLOSED`: read-only; sửa lịch sử cần quy trình riêng (ngoài Phase 1).

**Luồng đổi môn chính (một transaction):**

1. Khoá lớp `SELECT … FOR UPDATE`; kiểm `org_id`, trạng thái ∈ {`CHUA_BAT_DAU`,`DANG_DIEN_RA`},
   `expectedVersion` nếu client gửi.
2. Kiểm môn mới tồn tại, **active**, cùng org.
3. Xác định dòng primary hiện tại (hoặc suy ra từ `school_class.subject_id` nếu lớp chưa có dòng).
4. Insert `class_subject_history` (snapshot cũ/mới + `old_teacher_id` + actor + lý do).
5. Cập nhật `school_class.subject_id = newSubjectId`, `version = version + 1`.
6. Đồng bộ `class_subject`:
   - Nếu `(class_id, newSubjectId)` đã tồn tại → **tái dùng** dòng đó: `is_primary = 1`; **không**
     tạo trùng, **không** ghi đè `teacher_id`/sessions hiện có.
   - Ngược lại → insert dòng mới `source='MANUAL'`, `is_primary=1`, `teacher_id=NULL`,
     `planned_sessions`/`session_minutes` lấy từ request hoặc default của `subject`.
   - Bỏ `is_primary` của dòng cũ; **không** xoá dòng cũ.
7. Audit `CLASS_PRIMARY_SUBJECT_CHANGED`.

**Không làm:** không áp lại curriculum, không đổi các môn khác, không chép `teacher_id` cũ sang
môn mới, không xoá history.

**Thất bại:** trạng thái không cho phép → 409 `CLASS_NOT_EDITABLE`; môn inactive → 400
`SUBJECT_INACTIVE`; trùng dòng primary (đua) → 409 `CLASS_SUBJECT_OPERATION_CONFLICT`; version lệch
→ 409 `DATA_CHANGED`.

Điều chỉnh sâu hơn giữa kỳ (đổi nhiều môn, hoàn tác) là tính năng tương lai, ngoài Phase 1.

### 4.7. Tóm tắt điều kiện từng luồng

| Luồng | Actor | Điều kiện đầu vào | Thành công | Thất bại |
|---|---|---|---|---|
| F01 Tạo curriculum | OWNER / `curriculum.manage` | code+name hợp lệ, chưa trùng, module bật | 201, `is_active=true`, `version=0`, audit | 409 trùng; 400 DTO; 403 |
| F02 Thêm môn | `curriculum.manage` | curriculum active, subject active/org, chưa trùng, sequence trống, tiên quyết hợp lệ | 201, version tăng, audit | 404/409/400 tương ứng |
| F03 Sửa/xoá môn template | `curriculum.manage` | curriculum tồn tại, version khớp | 200/204, version tăng, audit | 404, 409 `DATA_CHANGED` |
| F04 Áp curriculum | `class.edit` + `curriculum.view` | lớp `CHUA_BAT_DAU`, curriculum active/org, version khớp | 200, tạo/cập nhật `class_subject`, version lớp tăng | 409 `CLASS_SUBJECT_LOCKED`/`DATA_CHANGED`; 400 |
| F05 Gán/bỏ môn thủ công | `class.edit` | lớp `CHUA_BAT_DAU`, subject active | 201/200, `source=MANUAL` | 409 trùng/không editable; 400 |
| F06 Đổi môn chính khi đang học | `class.edit` | lớp `CHUA_BAT_DAU`/`DANG_DIEN_RA`, subject active/org, version khớp | 200, history + `school_class.subject_id` + primary đồng bộ, version tăng | 409 `CLASS_NOT_EDITABLE`/`DATA_CHANGED`; 400 `SUBJECT_INACTIVE` |
| F07 Áp curriculum khi đang học | — | **không cho** (snapshot) | — | 409 `CLASS_SUBJECT_LOCKED` |

---

## 5. Business Rules

| Mã | Quy tắc |
|---|---|
| BR-CUR-01 | `curriculum.code` duy nhất theo tổ chức |
| BR-CUR-02 | `curriculum.name` duy nhất theo tổ chức (so không dấu) |
| BR-CUR-03 | Chỉ thêm môn **active** vào curriculum |
| BR-CUR-04 | Không trùng `(curriculum_id, subject_id)` |
| BR-CUR-05 | `sequence_no` duy nhất trong curriculum |
| BR-CUR-06 | `required_sessions > 0`, `session_minutes > 0` |
| BR-CUR-07 | Quan hệ LT/TH với tổng số buổi là **quy tắc kỹ thuật tuỳ chọn**; D-03 **không bắt buộc** `theory + practice = required`, nên không đặt CHECK cứng |
| BR-CUR-08 | Mỗi môn có **0..n tiên quyết** lưu ở `curriculum_subject_prerequisite`; tiên quyết phải là môn khác **trong cùng curriculum**, không tự trỏ, không trùng cạnh, không tạo chu trình |
| BR-CUR-09 | Curriculum inactive không áp dụng được cho lớp mới |
| BR-CUR-10 | Áp dụng curriculum chỉ khi lớp `CHUA_BAT_DAU` |
| BR-CUR-11 | `class_subject` là snapshot; sửa curriculum không lan sang lớp |
| BR-CUR-12 | Lớp không có curriculum vẫn hợp lệ (legacy) |
| BR-CUR-13 | Dòng `class_subject` của môn cũ không bị tự động xoá khi áp curriculum hoặc đổi môn chính; dòng `is_primary` hiện tại không xoá trực tiếp được (D-15) |
| BR-CUR-14 | Khi lớp chưa có `class_subject`, `school_class.subject_id` được coi là môn chính và API trả một dòng suy ra `source=LEGACY` |
| BR-CUR-15 | Một môn/lớp có tối đa một giáo viên ở Phase 1 (D-09) |
| BR-CUR-16 | Giáo viên môn phải có chuyên môn theo ID (D-06) |
| BR-CUR-17 | Xoá curriculum: chỉ khi không còn lớp tham chiếu; thực tế dùng `is_active=0` (FK RESTRICT) |
| BR-CUR-18 | Mọi thao tác ghi đều audit và tăng `version` tương ứng |
| BR-CUR-19 | **Không có mô hình học kỳ**: không `term_no`, không bảng `academic_term` ở Phase 1 (D-02) |
| BR-CUR-20 | `planned_sessions` không được âm; nếu có buổi đã xếp, không cho giảm dưới số đã dùng (Phase 2) |
| BR-CUR-21 | Tiên quyết chỉ **cảnh báo** khi chưa đạt ở Phase 1; không chặn xếp lịch (D-07) |
| BR-CUR-22 | Mỗi lớp có tối đa **một** dòng `class_subject.is_primary = 1`; ép bằng UNIQUE trên cột sinh `primary_class_id` |
| BR-CUR-23 | Đổi môn chính ghi `class_subject_history` trước rồi mới cập nhật `school_class`/`class_subject`; lỗi bất kỳ bước nào rollback toàn bộ |
| BR-CUR-24 | Đổi môn chính **không** chuyển giáo viên cũ; dòng môn mới `teacher_id = NULL` |
| BR-CUR-25 | Nếu môn mới đã có trong `class_subject` của lớp, tái dùng dòng đó (chỉ đặt `is_primary=1`), không tạo dòng thứ hai |
| BR-CUR-26 | Không xoá cứng lớp đã có `class_subject_history`; `DELETE /classes/{id}` trả 409 `CONFLICT`, không CASCADE/xoá lịch sử (D-08/D-15) |

---

## 6. Ví dụ dữ liệu

### 6.1. Curriculum

| id | org_id | code | name | grade_level | is_active | version |
|---|---|---|---|---|---|---|
| `c0000000-0000-4000-8000-000000000001` | `1111…1111` | `CT-K10-2026` | Chương trình Khối 10 – 2026 | `K10` | 1 | 0 |

### 6.2. Curriculum subjects

| curriculum_id | subject_id | sequence | required | theory | practice | minutes |
|---|---|---|---|---|---|---|
| `c000…0001` | `9999…9001` (Toán) | 1 | 60 | 45 | 15 | 45 |
| `c000…0001` | `9999…9002` (Vật lý) | 2 | 45 | 30 | 15 | 45 |
| `c000…0001` | `9999…9003` (Tin học) | 3 | 30 | 0 | 30 | 90 |

### 6.2.1. Curriculum subject prerequisites

| curriculum_id | subject_id | prerequisite_subject_id |
|---|---|---|
| `c000…0001` | `9999…9002` (Vật lý) | `9999…9001` (Toán) |
| `c000…0001` | `9999…9003` (Tin học) | `9999…9001` (Toán) |
| `c000…0001` | `9999…9003` (Tin học) | `9999…9002` (Vật lý) |

> Tin học có **hai** tiên quyết (Toán và Vật lý) — minh hoạ D-07 nhiều tiên quyết.
> Các con số chỉ là **ví dụ**; đơn vị "tiết" và độ dài buổi **chưa được chốt** (D-03).

### 6.3. Áp dụng cho lớp C001

`class_subject` sau khi áp dụng:

| class_id | subject_id | source | curriculum_id | required | planned | teacher_id | status | is_primary |
|---|---|---|---|---|---|---|---|---|
| `5555…5001` | `9999…9001` | CURRICULUM | `c000…0001` | 60 | 60 | `2222…0005` | PLANNED | 1 |
| `5555…5001` | `9999…9002` | CURRICULUM | `c000…0001` | 45 | 45 | `2222…0006` | PLANNED | 0 |
| `5555…5001` | `9999…9003` | CURRICULUM | `c000…0001` | 30 | 30 | NULL | PLANNED | 0 |

`school_class.curriculum_id = c000…0001`; `school_class.subject_id` vẫn là `9999…9001`
(legacy, môn chính = dòng có `is_primary = 1`).

### 6.4. Lớp legacy chưa có `class_subject`

API `GET /classes/{id}/subjects` trả một dòng tổng hợp:

```json
{
  "classId": "5555…5001",
  "curriculumId": null,
  "subjects": [
    {
      "subjectId": "9999…9001",
      "subjectName": "Toán",
      "source": "LEGACY",
      "requiredSessions": null,
      "plannedSessions": null,
      "sessionMinutes": null,
      "teacherId": "2222…0005",
      "isPrimary": true,
      "status": "PLANNED"
    }
  ]
}
```

### 6.5. Đổi môn chính khi lớp `DANG_DIEN_RA` (D-08/D-15)

Trước: lớp C002 primary = Toán (`9999…9001`, GV `2222…0005`). Yêu cầu đổi sang Vật lý
(`9999…9002`, lớp đã có dòng Vật lý với `teacher_id = NULL`).

`PUT /api/classes/5555…5002/subjects/primary`

```json
{ "subjectId": "9999…9002", "reason": "Điều chỉnh chuyên môn giữa kỳ", "expectedVersion": 4 }
```

Sau (một transaction):

- `class_subject_history`: `old_subject_id=…9001`, `old_subject_code=TOAN10`,
  `old_subject_name=Toán 10`, `old_teacher_id=2222…0005`, `new_subject_id=…9002`,
  `new_subject_code=LY10`, `new_subject_name=Vật lý 10`, `changed_by`, `changed_at`, `reason`.
- `school_class.subject_id = …9002`, `version = 5`.
- Dòng `(C002, …9002)` **tái dùng** (đã có), `is_primary = 1`, `teacher_id` **vẫn NULL**.
- Dòng `(C002, …9001)` giữ nguyên, `is_primary = 0`, `teacher_id = 2222…0005` (không xoá).
- Các môn khác của lớp không đổi; `curriculum_id` không đổi.

---

## 7. Ảnh hưởng dữ liệu cũ

1. `school_class.subject_id` NULL: không tạo `class_subject`; API trả danh sách rỗng.
2. `school_class.subject_id` có giá trị: backfill `class_subject` nguồn `LEGACY` (D-11) khi
   khớp **chính xác, không mập mờ**; bản ghi không khớp được báo cáo để xử lý tay, không đoán.
3. Lớp đã kết thúc: backfill vẫn giữ snapshot lịch sử; không đổi trạng thái.
4. Môn bị ngừng: `class_subject` cũ vẫn giữ FK; không cho thêm mới.
5. Schedule mirror `class.subject` (text): Phase 1 **không** sửa Schedule; khi Phase 2 làm
   xếp lịch sẽ dùng `subjectId`.

---

## 8. Acceptance Criteria

- AC-CUR-01: Tạo curriculum + thêm 3 môn thành công; trùng code/môn/thứ tự bị chặn đúng mã lỗi.
- AC-CUR-02: Không thêm được môn inactive hoặc môn org khác.
- AC-CUR-03: Tiên quyết tạo chu trình bị chặn (`SUBJECT_PREREQUISITE_CYCLE`); tự tiên quyết và
  cạnh trùng bị chặn.
- AC-CUR-03a: Một môn có thể có **nhiều tiên quyết**; lưu đủ các cạnh trong
  `curriculum_subject_prerequisite` và trả lại đúng mảng `prerequisiteSubjectIds`.
- AC-CUR-03b: Tiên quyết trỏ môn **không thuộc curriculum** (hoặc khác org) bị chặn 404
  `CURRICULUM_SUBJECT_NOT_FOUND`, không ghi cạnh.
- AC-CUR-04: Áp curriculum cho lớp `CHUA_BAT_DAU` tạo đúng các dòng `class_subject` snapshot.
- AC-CUR-05: Sửa curriculum sau khi áp dụng **không** đổi `class_subject` của lớp.
- AC-CUR-06: Áp curriculum cho lớp `DANG_DIEN_RA` bị chặn 409 `CLASS_SUBJECT_LOCKED`; **nhưng**
  đổi môn chính trên lớp đó vẫn thành công (F06).
- AC-CUR-07: Lớp legacy có `subject_id` vẫn trả danh sách môn qua API mới (`source=LEGACY`,
  `isPrimary=true`).
- AC-CUR-08: Xoá môn khỏi lớp chỉ thành công khi lớp `CHUA_BAT_DAU`; dòng `is_primary = 1` hiện tại
  không xoá trực tiếp (409 `CLASS_SUBJECT_LEGACY_PROTECTED`).
- AC-CUR-09: Mọi thao tác ghi có audit + version tăng.
- AC-CUR-10: Schema không có cột/bảng học kỳ; API không có trường `termNo`.
- AC-CUR-11: Đổi môn chính sinh đúng một dòng `class_subject_history`; `school_class.subject_id`
  và dòng `is_primary` cùng cập nhật trong một transaction.
- AC-CUR-12: Đổi môn chính không chép giáo viên cũ; dòng môn mới `teacher_id = NULL`.

---

## 9. Quyết định đã chốt và câu hỏi kỹ thuật

**Đã chốt (xem `subject-business-requirements.md`):** D-01, D-02, D-03, D-07, D-08, D-09, D-10,
D-11, D-12, D-14, D-15.

Câu hỏi kỹ thuật còn lại (không phải quyết định nghiệp vụ):

1. `required_sessions` hiểu là số **buổi** hay số **tiết**? Cần chốt đơn vị khi viết validation
   message; hiện chỉ ràng buộc > 0.
2. Khi áp curriculum thay thế, `keepManualSubjects` mặc định `true` — có cần đổi theo nghiệp vụ
   từng trường không?
3. Clone curriculum (`POST /curricula/{id}/clone`) có cần ở Phase 1 không? Nếu có, phải map lại
   toàn bộ cạnh tiên quyết.
4. `operation_id` trong `class_subject_history`: client sinh hay server sinh khi thiếu? Đề xuất:
   server sinh nếu body không có; client gửi khi muốn retry-safe.
5. Có cần API đọc history phân trang (`GET /classes/{id}/subject-history`) hay chỉ hiển thị trong
   chi tiết lớp? Đề xuất: có, phân trang `page/size`. 
