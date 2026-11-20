# Phase 1 — Database Schema & Migration Draft

> Tài liệu thiết kế. **Không chạy** bất kỳ câu SQL nào từ tài liệu này trên database thật.
> Toàn bộ DDL dưới đây là **draft** để người dùng tự đưa vào migration.
> **Trạng thái quyết định:** `D-01`…`D-15` đã được người dùng chốt (xem sổ quyết định trong
> `subject-business-requirements.md`). `D-13` = giữ mảng, không ảnh hưởng schema.
> **Chưa có migration nào được tạo hoặc chạy.** Database: MySQL 8, charset `utf8mb4`,
> collation `utf8mb4_unicode_ci`, engine InnoDB.

---

## 1. Quy ước

| Quy ước | Giá trị |
|---|---|
| Khoá chính | `char(36)` UUID (giống bảng hiện có) |
| Thời gian | `datetime(3)` |
| Cờ boolean | `tinyint(1)` |
| Phạm vi tổ chức | Mọi bảng có `org_id char(36) NOT NULL`; FK tổ hợp gồm `org_id` |
| Xoá | Môn/curriculum dùng `is_active`, không xoá cứng; join table dùng CASCADE/RESTRICT hợp lý |
| Tên index | `uq_` cho unique, `idx_` cho index thường, `fk_` cho FK (theo phong cách repo) |
| Migration | Đặt số tiếp theo sau `50_schedule_inbox_impact.sql`: `51_people_curriculum.sql`, `52_people_class_subject.sql` |

---

## 2. Bảng hiện có cần thay đổi

### 2.1. `subject` (People DB)

Hiện có (`DB_11_16.sql:603` + migration 42):
`id, org_id, name, name_unaccented, is_active, created_by, created_at, code, description,
updated_by, updated_at`.

Cột default bổ sung — **tuỳ chọn** (D-03 đã chốt: nguồn chính là `curriculum_subject`):

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `default_session_minutes` | smallint | YES | Độ dài buổi mặc định; có thể bỏ nếu chỉ khai ở curriculum |
| `default_theory_sessions` | smallint | YES | Số buổi LT mặc định |
| `default_practice_sessions` | smallint | YES | Số buổi TH mặc định |

**Mã môn (D-04 = CONFIRMED):**

- `code` **không bắt buộc**; bản ghi cũ giữ `NULL` hợp lệ.
- Nếu có giá trị, mã **duy nhất theo tổ chức** — nhưng migration 42 hiện chỉ tạo
  `ADD INDEX uq_subject_org_code (org_id, code)` (index thường, **không unique**).
- Phải chạy pre-check trùng (§6.1) trước khi đổi thành UNIQUE:
  `ALTER TABLE subject DROP INDEX uq_subject_org_code, ADD UNIQUE KEY uq_subject_org_code (org_id, code);`
- MySQL cho phép nhiều `NULL` trong UNIQUE ⇒ bản ghi chưa có mã vẫn hợp lệ.
- **Không** thêm `NOT NULL`; **không** đổi form FE thành bắt buộc.
- Collation `utf8mb4_unicode_ci` khiến UNIQUE so sánh không phân biệt hoa/thường — hành vi này
  giữ nguyên, không chuẩn hoá thêm nếu người dùng chưa yêu cầu.

### 2.2. `school_class` (People DB)

Thêm:

| Cột | Kiểu | Null | Ghi chú |
|---|---|---|---|
| `curriculum_id` | char(36) | YES | FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE RESTRICT |

**Bắt buộc thêm unique trước khi tạo FK tổ hợp từ `class_subject`:**

```sql
ALTER TABLE school_class
  ADD UNIQUE KEY uq_school_class_id_org (id, org_id);
```

Lý do: `school_class` hiện chỉ có `PRIMARY KEY (id)` và `uq_school_class_org_code (org_id, class_code)`,
**không** có index `(id, org_id)`. MySQL yêu cầu cột được tham chiếu phải là tiền tố trái của một
index; `PRIMARY KEY (id)` không thỏa cặp `(id, org_id)`.

- Unique này **không thể fail** vì `id` đã là PK (duy nhất toàn bảng) ⇒ `(id, org_id)` luôn duy nhất.
  Tuy vậy vẫn kiểm tồn tại index trước khi tạo (idempotent).
- Không cần pre-check dữ liệu trùng cho index này (khác với UNIQUE `subject.code`).
- Xem bảng đối chiếu index ở mục 2.3 để biết bảng nào đã có sẵn cặp `(id, org_id)`.

- Không xoá `subject_id`.
- **Đồng bộ môn chính (D-15):** `subject_id` là bản sao của dòng `class_subject.is_primary = 1`.
  Mọi thay đổi phải đi qua luồng đổi môn chính (history → `subject_id` → `class_subject`) trong
  **một transaction**; không `UPDATE school_class SET subject_id` trực tiếp ở nơi khác.
- Không đổi `academic_year` ở Phase 1.
- Không thêm `department_id` (ngoài phạm vi; xem Stage 0 risk).

### 2.3. Đối chiếu index `(id, org_id)` cho mọi bảng được FK tổ hợp tham chiếu

| Bảng | Có UNIQUE `(id, org_id)`? | Bằng chứng | Hành động |
|---|---|---|---|
| `subject` | Có | `DB_11_16.sql`: `UNIQUE uq_subject_id_org (id, org_id)` | Không cần |
| `specialty` | Có | `UNIQUE uq_specialty_id_org (id, org_id)` | Không cần |
| `teacher_profile` | Có | `UNIQUE uq_teacher_profile_user_org (user_id, org_id)` | Không cần |
| `staff_profile` | Có | `UNIQUE uq_staff_profile_user_org (user_id, org_id)` | Không cần |
| `curriculum` | Có (bảng mới) | `uq_curriculum_id_org (id, org_id)` | Tạo trong migration 51 |
| `school_class` | **Không** | Chỉ `PK (id)` + `uq_school_class_org_code` | **Thêm `uq_school_class_id_org`** trong migration 51 |

> Nguyên tắc: không giả định bảng đã có index phù hợp. Mỗi FK tổ hợp `(x_id, org_id)` chỉ hợp lệ khi
> bảng đích có UNIQUE/index bắt đầu bằng đúng cặp đó. Bảng nào thiếu thì phải thêm **trước** khi tạo FK.

---

## 3. Bảng mới

### 3.1. `curriculum`

Mục đích: template chương trình đào tạo cấp tổ chức.

```sql
CREATE TABLE IF NOT EXISTS curriculum (
  id              char(36)     NOT NULL,
  org_id          char(36)     NOT NULL,
  code            varchar(50)  NOT NULL,
  name            varchar(200) NOT NULL,
  name_unaccented varchar(200) NOT NULL,
  description     varchar(1000) DEFAULT NULL,
  grade_level     varchar(50)  DEFAULT NULL,
  program_code    varchar(50)  DEFAULT NULL,
  is_active       tinyint(1)   NOT NULL DEFAULT 1,
  version         bigint       NOT NULL DEFAULT 0,
  created_by      char(36)     DEFAULT NULL,
  created_at      datetime(3)  NOT NULL,
  updated_by      char(36)     DEFAULT NULL,
  updated_at      datetime(3)  DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_curriculum_id_org (id, org_id),
  UNIQUE KEY uq_curriculum_org_code (org_id, code),
  UNIQUE KEY uq_curriculum_org_name (org_id, name_unaccented),
  KEY idx_curriculum_org_active (org_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- D-02 đã chốt: curriculum là **template tái sử dụng cấp tổ chức**, lớp tham chiếu **một**
  curriculum; **không có mô hình học kỳ**. `grade_level`, `program_code` chỉ là metadata mô tả
  tuỳ chọn (không phải bảng học kỳ/khối bắt buộc).
- `version`: optimistic lock khi sửa tại chỗ (D-12).
- Xoá: không có DELETE; dùng `is_active=0`. Nếu cần xoá cứng, chỉ khi không còn
  `class_subject`/`school_class` tham chiếu (FK RESTRICT sẽ chặn).

### 3.2. `curriculum_subject`

Mục đích: định nghĩa môn + thứ tự + số buổi + giờ LT/TH trong một curriculum.
**Không có cột học kỳ/kỳ** (D-02: không mô hình học kỳ ở Phase 1).

```sql
CREATE TABLE IF NOT EXISTS curriculum_subject (
  curriculum_id     char(36) NOT NULL,
  subject_id        char(36) NOT NULL,
  org_id            char(36) NOT NULL,
  sequence_no       smallint NOT NULL,
  required_sessions smallint NOT NULL,
  theory_sessions   smallint NOT NULL DEFAULT 0,
  practice_sessions smallint NOT NULL DEFAULT 0,
  session_minutes   smallint NOT NULL,
  is_required       tinyint(1) NOT NULL DEFAULT 1,
  note              varchar(500) DEFAULT NULL,
  created_at        datetime(3) NOT NULL,
  updated_at        datetime(3) DEFAULT NULL,
  PRIMARY KEY (curriculum_id, subject_id),
  UNIQUE KEY uq_curriculum_subject_sequence (curriculum_id, sequence_no),
  UNIQUE KEY uq_curriculum_subject_org (curriculum_id, subject_id, org_id),
  KEY idx_curriculum_subject_subject (subject_id, org_id),
  CONSTRAINT fk_curriculum_subject_curriculum
    FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_curriculum_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_curriculum_subject_sessions CHECK (
    required_sessions > 0 AND session_minutes > 0
    AND theory_sessions >= 0 AND practice_sessions >= 0),
  CONSTRAINT chk_curriculum_subject_sequence CHECK (sequence_no > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- `uq_curriculum_subject_org (curriculum_id, subject_id, org_id)` **bắt buộc** để bảng nối tiên quyết
  tham chiếu được cặp `(curriculum_id, subject_id, org_id)` (MySQL yêu cầu index tiền tố trái).
  Unique này không thể fail vì `(curriculum_id, subject_id)` đã là PK.
- D-03 đã chốt: số buổi/thời lượng/LT/TH khai báo **tại đây**. `subject` chỉ có default tuỳ chọn;
  `class_subject` được override trước khi xếp lịch.
- `required_sessions = theory_sessions + practice_sessions`: **chưa phải quyết định nghiệp vụ**.
  Phase 1 **không** bắt buộc tổng này; nếu người dùng muốn bật, thêm rule + test riêng
  (xem `THEORY_PRACTICE_MISMATCH` là tuỳ chọn kỹ thuật).
- **Đổi thứ tự môn:** vì `uq_curriculum_subject_sequence` là UNIQUE, hoán đổi `sequence_no`
  cần cập nhật 2 bước (giá trị tạm) hoặc xoá-rồi-thêm trong transaction. Ghi rõ trong service.

### 3.2.1. `curriculum_subject_prerequisite` (D-07 — nhiều tiên quyết)

Mục đích: mỗi môn trong curriculum có **0..n** môn tiên quyết. Dùng **bảng nối**, không dùng
cột `prerequisite_subject_id` đơn lẻ.

```sql
CREATE TABLE IF NOT EXISTS curriculum_subject_prerequisite (
  curriculum_id           char(36) NOT NULL,
  subject_id              char(36) NOT NULL,
  prerequisite_subject_id char(36) NOT NULL,
  org_id                  char(36) NOT NULL,
  created_at              datetime(3) NOT NULL,
  PRIMARY KEY (curriculum_id, subject_id, prerequisite_subject_id),
  KEY idx_csp_prereq (org_id, prerequisite_subject_id),
  KEY idx_csp_subject (org_id, subject_id),
  CONSTRAINT fk_csp_subject
    FOREIGN KEY (curriculum_id, subject_id, org_id)
    REFERENCES curriculum_subject (curriculum_id, subject_id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_csp_prerequisite
    FOREIGN KEY (curriculum_id, prerequisite_subject_id, org_id)
    REFERENCES curriculum_subject (curriculum_id, subject_id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_csp_not_self CHECK (subject_id <> prerequisite_subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Bảo đảm toàn vẹn:**

| Yêu cầu | Cơ chế |
|---|---|
| Tiên quyết cùng curriculum | Cả hai FK dùng chung `curriculum_id` và trỏ `curriculum_subject(curriculum_id, subject_id, org_id)` |
| Tiên quyết cùng tổ chức | `org_id` nằm trong cả hai FK tổ hợp; `curriculum_subject` đã có FK `(curriculum_id, org_id)` |
| Không tự tiên quyết | CHECK `subject_id <> prerequisite_subject_id` + kiểm service trả `SUBJECT_PREREQUISITE_CYCLE` (`path:[A,A]`) |
| Không trùng quan hệ | PK `(curriculum_id, subject_id, prerequisite_subject_id)` |
| Không trùng cặp đảo chiều (A là tiên quyết của B và ngược lại) | Service DFS phát hiện chu trình 2 cạnh |
| Không có chu trình dài (A→B→C→A) | Service DFS trên toàn bộ cạnh của `curriculum_id` (DB không kiểm được) |

**Ngữ nghĩa nghiệp vụ Phase 1 (D-07):**

- Quan hệ tiên quyết là **dữ liệu mô tả**, dùng để cảnh báo; Phase 1 **không chặn** việc gán
  lớp/giáo viên vì chưa hoàn thành môn tiên quyết (chặn cứng thuộc Phase 2 khi xếp lịch).
- Tuy vậy, **định nghĩa chu trình bị chặn** (400 `SUBJECT_PREREQUISITE_CYCLE`) vì dữ liệu vô nghĩa;
  đây là kiểm tra cấu trúc, không phải chặn nghiệp vụ học tập.
- Tự tiên quyết bị chặn ở cả DB (CHECK) và service.
- Thêm/sửa danh sách tiên quyết dùng **replace toàn bộ** (PUT) hoặc thêm/bớt từng cạnh; mọi cạnh
  phải trỏ môn **đã có** trong cùng curriculum. Tiên quyết trỏ ra ngoài → 404
  `CURRICULUM_SUBJECT_NOT_FOUND`.
- **Xoá môn khỏi template:** FK `fk_csp_subject` CASCADE xoá các cạnh mà môn đó là **dependent**;
  FK `fk_csp_prerequisite` RESTRICT chặn xoá nếu môn đó đang là tiên quyết của môn khác → service
  phải gỡ các cạnh đó trước hoặc trả 409 `CONFLICT`.
- **Không dùng `ON DELETE SET NULL`** cho FK tổ hợp: sẽ set cả `org_id` = NULL (vi phạm NOT NULL)
  và không biểu diễn đúng việc gỡ quan hệ.
- Khi clone curriculum, phải **map lại** các cạnh tiên quyết sang môn tương ứng của bản clone;
  không copy `curriculum_id` cũ.
- **Thứ tự thêm:** FK kiểm ngay khi insert ⇒ phải insert `curriculum_subject` của cả hai môn trước,
  rồi mới insert cạnh tiên quyết (trong cùng transaction).

### 3.3. `class_subject`

Mục đích: snapshot môn thực tế của lớp, giáo viên theo môn, số buổi kế hoạch.

```sql
CREATE TABLE IF NOT EXISTS class_subject (
  class_id          char(36) NOT NULL,
  subject_id        char(36) NOT NULL,
  org_id            char(36) NOT NULL,
  curriculum_id     char(36) DEFAULT NULL,
  source            varchar(20) NOT NULL DEFAULT 'MANUAL',
  sequence_no       smallint DEFAULT NULL,
  teacher_id        char(36) DEFAULT NULL,
  is_primary        tinyint(1) NOT NULL DEFAULT 0,
  primary_class_id  char(36) GENERATED ALWAYS AS
                      (CASE WHEN is_primary = 1 THEN class_id END) STORED,
  required_sessions smallint DEFAULT NULL,
  planned_sessions  smallint DEFAULT NULL,
  theory_sessions   smallint DEFAULT NULL,
  practice_sessions smallint DEFAULT NULL,
  session_minutes   smallint DEFAULT NULL,
  status            varchar(20) NOT NULL DEFAULT 'PLANNED',
  note              varchar(500) DEFAULT NULL,
  created_by        char(36) DEFAULT NULL,
  created_at        datetime(3) NOT NULL,
  updated_by        char(36) DEFAULT NULL,
  updated_at        datetime(3) DEFAULT NULL,
  PRIMARY KEY (class_id, subject_id),
  UNIQUE KEY uq_class_subject_primary (primary_class_id),
  KEY idx_class_subject_org_subject (org_id, subject_id),
  KEY idx_class_subject_teacher (teacher_id, org_id),
  KEY idx_class_subject_curriculum (curriculum_id, org_id),
  CONSTRAINT fk_class_subject_class
    FOREIGN KEY (class_id, org_id) REFERENCES school_class (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_class_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT fk_class_subject_curriculum
    FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT fk_class_subject_teacher
    FOREIGN KEY (teacher_id, org_id) REFERENCES staff_profile (user_id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_class_subject_status
    CHECK (status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')),
  CONSTRAINT chk_class_subject_source
    CHECK (source IN ('LEGACY','CURRICULUM','MANUAL')),
  CONSTRAINT chk_class_subject_primary CHECK (is_primary IN (0,1)),
  CONSTRAINT chk_class_subject_sessions CHECK (
    (planned_sessions IS NULL OR planned_sessions >= 0)
    AND (required_sessions IS NULL OR required_sessions > 0)
    AND (session_minutes IS NULL OR session_minutes > 0)),
  CONSTRAINT chk_class_subject_sequence CHECK (
    sequence_no IS NULL OR sequence_no > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Một môn chính/lớp (D-15) — vì sao dùng cột sinh:**

- MySQL không có partial unique index (`WHERE is_primary = 1`). Cột sinh
  `primary_class_id = CASE WHEN is_primary = 1 THEN class_id END` cho ra `NULL` với mọi dòng không
  primary; MySQL cho phép nhiều `NULL` trong UNIQUE ⇒ UNIQUE trên cột này **đúng bằng** ràng buộc
  "tối đa một dòng primary mỗi lớp".
- Cột sinh là **STORED** để index được; không update trực tiếp.
- **Không** dùng UNIQUE `(class_id, is_primary)` vì sẽ chỉ cho một dòng `is_primary = 0` mỗi lớp.
- Bất biến "`school_class.subject_id` = môn primary" **không ép được bằng FK** (bảng vòng);
  service bảo đảm trong cùng transaction + kiểm tra định kỳ ở mục 6.3.
- **UNIQUE trên `primary_class_id` chỉ bảo đảm tối đa một primary/lớp.** Nó **không** bảo đảm
  "tối thiểu một primary khi `school_class.subject_id != NULL`" và cũng không bảo đảm primary khớp
  `subject_id`; hai điều này do transaction + application validation (tạo lớp, đổi môn, backfill).
- H2 (test) không hỗ trợ cú pháp `STORED`; `people-test-schema.sql` khai báo cột thường
  `primary_class_id char(36)` + UNIQUE và test service tự cập nhật cột này cùng `is_primary`
  (xem mục 9.1).

Ghi chú thiết kế:

- **`class_subject → school_class` là FK tổ hợp `(class_id, org_id)`**, không phải `(class_id)`.
  Điều này bảo đảm một dòng `class_subject` không thể trỏ lớp khác tổ chức. Điều kiện tiên quyết:
  `school_class` phải có `uq_school_class_id_org (id, org_id)` (mục 2.2) — hiện **chưa có**, phải
  thêm trong migration 51 trước khi tạo bảng `class_subject` (migration 52).
- `sequence_no` snapshot thứ tự môn từ `curriculum_subject.sequence_no`; `MANUAL`/`LEGACY` để NULL.
- `required_sessions`/`session_minutes` snapshot từ curriculum, cho phép NULL với legacy.
- Lưu ý FK tổ hợp với cột nullable:
  - `(curriculum_id, org_id)`: khi `curriculum_id` NULL, MySQL **không kiểm** FK (một cột null
    là đủ để bỏ kiểm). NULL = không có curriculum.
  - `(teacher_id, org_id)`: tương tự; NULL = chưa gán giáo viên.
  - **Không dùng ON DELETE SET NULL** cho FK tổ hợp: MySQL sẽ cố set cả `org_id` = NULL và vi phạm
    NOT NULL. Vì vậy dùng RESTRICT và xử lý nghiệp vụ ở service (ngừng curriculum thay vì xoá).
- Legacy (D-15): dòng môn chính là dòng có `is_primary = 1`, đồng bộ với `school_class.subject_id`.
  Không xoá cứng dòng primary qua API lớp–môn; đổi môn chính phải đi qua luồng ghi history
  (xem mục 3.3.1 và `subject-business-requirements.md` 3.15).

### 3.3.1. `class_subject_history` (D-08/D-15)

Mục đích: lưu vết **mọi lần đổi môn chính**, kể cả khi lớp đã `DANG_DIEN_RA`. Bảng append-only;
snapshot môn/giáo viên **không** phụ thuộc dữ liệu hiện tại của `subject`/`staff_profile`.

```sql
CREATE TABLE IF NOT EXISTS class_subject_history (
  id              char(36) NOT NULL,
  org_id          char(36) NOT NULL,
  class_id        char(36) NOT NULL,
  old_subject_id  char(36) DEFAULT NULL,
  old_subject_code varchar(50) DEFAULT NULL,
  old_subject_name varchar(200) DEFAULT NULL,
  old_teacher_id  char(36) DEFAULT NULL,
  old_source      varchar(20) DEFAULT NULL,
  new_subject_id  char(36) NOT NULL,
  new_subject_code varchar(50) DEFAULT NULL,
  new_subject_name varchar(200) NOT NULL,
  new_source      varchar(20) NOT NULL,
  reason          varchar(500) NOT NULL,
  operation_id    varchar(64) NOT NULL,
  changed_by      char(36) NOT NULL,
  changed_at      datetime(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_csh_operation (org_id, operation_id),
  KEY idx_csh_class_time (org_id, class_id, changed_at),
  KEY idx_csh_new_subject (org_id, new_subject_id),
  CONSTRAINT fk_csh_class
    FOREIGN KEY (class_id, org_id) REFERENCES school_class (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_csh_subject_change CHECK (
    old_subject_id IS NULL OR old_subject_id <> new_subject_id),
  CONSTRAINT chk_csh_old_source CHECK (
    old_source IS NULL OR old_source IN ('LEGACY','CURRICULUM','MANUAL')),
  CONSTRAINT chk_csh_new_source CHECK (
    new_source IN ('LEGACY','CURRICULUM','MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Ghi chú: `old_subject_code`, `old_subject_name`, `new_subject_code`, `new_subject_name`,
`old_teacher_id`, `old_source`, `new_source` là **snapshot** tại thời điểm đổi — môn đổi tên/ngừng
hoặc giáo viên nghỉ vẫn hiển thị đúng lịch sử. `new_subject_name`, `new_source`, `reason`,
`operation_id` NOT NULL vì đổi môn chính bắt buộc có môn mới, có nguồn và có lý do/khóa idempotency.
`old_subject_*`/`old_source` NULL chỉ khi lớp chưa có môn chính. UNIQUE `(org_id, operation_id)` là
idempotency thật sự (không còn NULL): cùng khóa + cùng payload trả kết quả cũ, payload khác → 409.
`reason` ≤ 500 ký tự do kiểu `varchar(500)` + validation `REASON_TOO_LONG`.

**Hệ quả với `DELETE /classes/{id}` (đã có trong source, `class.delete`):** FK
`fk_csh_class … ON DELETE RESTRICT` khiến xoá cứng một lớp **đã có lịch sử đổi môn** bị DB từ chối.
Service phải kiểm trước và trả **409 `CONFLICT`** (message: lớp có lịch sử môn, dùng kết thúc/huỷ),
**không** để rơi vào lỗi FK (500). **Không** được CASCADE history để xoá được lớp — D-08/D-15 cấm
xoá lịch sử qua API thường.

### 3.4. `specialty_subject`

Mục đích: ánh xạ chuyên môn ↔ môn để gán hàng loạt/backfill.

```sql
CREATE TABLE IF NOT EXISTS specialty_subject (
  specialty_id char(36) NOT NULL,
  subject_id   char(36) NOT NULL,
  org_id       char(36) NOT NULL,
  created_by   char(36) DEFAULT NULL,
  created_at   datetime(3) NOT NULL,
  PRIMARY KEY (specialty_id, subject_id),
  KEY idx_specialty_subject_org_subject (org_id, subject_id),
  CONSTRAINT fk_specialty_subject_specialty
    FOREIGN KEY (specialty_id, org_id) REFERENCES specialty (id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_specialty_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.5. `teacher_subject`

Mục đích: nguồn sự thật "giáo viên dạy được môn nào", thay so khớp tên.

```sql
CREATE TABLE IF NOT EXISTS teacher_subject (
  user_id     char(36) NOT NULL,
  subject_id  char(36) NOT NULL,
  org_id      char(36) NOT NULL,
  status      varchar(20) NOT NULL DEFAULT 'APPROVED',
  source      varchar(20) NOT NULL DEFAULT 'MANUAL',
  approved_by char(36) DEFAULT NULL,
  approved_at datetime(3) DEFAULT NULL,
  created_by  char(36) DEFAULT NULL,
  created_at  datetime(3) NOT NULL,
  updated_at  datetime(3) DEFAULT NULL,
  PRIMARY KEY (user_id, subject_id),
  KEY idx_teacher_subject_org_subject_status (org_id, subject_id, status),
  KEY idx_teacher_subject_org_user (org_id, user_id),
  CONSTRAINT fk_teacher_subject_teacher
    FOREIGN KEY (user_id, org_id) REFERENCES teacher_profile (user_id, org_id) ON DELETE CASCADE,
  CONSTRAINT fk_teacher_subject_subject
    FOREIGN KEY (subject_id, org_id) REFERENCES subject (id, org_id) ON DELETE RESTRICT,
  CONSTRAINT chk_teacher_subject_status CHECK (status IN ('PENDING','APPROVED','REVOKED')),
  CONSTRAINT chk_teacher_subject_source CHECK (source IN ('SPECIALTY','MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- **D-06a = CONFIRMED (không duyệt ở Phase 1):** mọi dòng do API tạo/sinh từ chuyên môn ghi
  `status='APPROVED'`; không có nhánh `PENDING`, không có API approve/reject.
  `approved_by`/`approved_at` để NULL.
- Không xoá dòng khi thu hồi; đặt `REVOKED` (vẫn giữ lịch sử chuyên môn).
- CHECK vẫn khai báo 3 giá trị `PENDING/APPROVED/REVOKED` để tương thích dữ liệu tương lai; `PENDING`
  **không được dùng** ở Phase 1. Mọi thay đổi quy trình duyệt là quyết định Phase 2.

---

## 4. Migration draft (không chạy)

> Các file migration hiện có nằm ở thư mục gốc repo (ví dụ `42_people_subject_management.sql`).
> Đề xuất chia 2 file để dễ rollback từng phần.

### 4.1. `51_people_curriculum.sql` (draft)

> Bản đầy đủ (idempotent, MySQL 8) ở `docs/phase-1/migrations/51_people_curriculum.sql`. Pre-check
> ở `migrations/51_52_precheck.sql`, post-check ở `migrations/51_52_postcheck.sql`, rollback ở
> `migrations/ROLLBACK.md`. File đặt ngoài thư mục migration gốc để tránh bị áp dụng nhầm; người
> dùng review rồi copy sang `NN_people_*.sql` khi chạy staging.

```sql
-- Additive, idempotent. KHÔNG xoá cột/dữ liệu.
USE mems_people_db;

DELIMITER $

DROP PROCEDURE IF EXISTS mems_m51_add_col$
CREATE PROCEDURE mems_m51_add_col(IN p_table VARCHAR(64), IN p_col VARCHAR(64),
                                  IN p_ddl VARCHAR(500))
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = p_table)
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = DATABASE() AND table_name = p_table
                       AND column_name = p_col) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_col, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DROP PROCEDURE IF EXISTS mems_m51_add_fk$
CREATE PROCEDURE mems_m51_add_fk(IN p_table VARCHAR(64), IN p_fk VARCHAR(64),
                                 IN p_ddl VARCHAR(500))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND constraint_name = p_fk AND constraint_type = 'FOREIGN KEY') THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_fk, '` ', p_ddl);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DROP PROCEDURE IF EXISTS mems_m51_add_unique$
CREATE PROCEDURE mems_m51_add_unique(IN p_table VARCHAR(64), IN p_index VARCHAR(64),
                                     IN p_cols VARCHAR(255))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = p_table
                   AND index_name = p_index) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD UNIQUE KEY `', p_index,
                      '` (', p_cols, ')');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END$

DELIMITER ;

-- 1) curriculum (bảng mới) — dùng CREATE TABLE IF NOT EXISTS như mục 3.1
-- 2) curriculum_subject (bảng mới) — mục 3.2 (kèm UNIQUE (curriculum_id, subject_id, org_id))
-- 3) curriculum_subject_prerequisite (bảng mới) — mục 3.2.1, tạo SAU curriculum_subject
-- 4) school_class.curriculum_id
CALL mems_m51_add_col('school_class', 'curriculum_id', 'CHAR(36) DEFAULT NULL');
CALL mems_m51_add_fk('school_class', 'fk_school_class_curriculum',
  'FOREIGN KEY (curriculum_id, org_id) REFERENCES curriculum (id, org_id) ON DELETE RESTRICT');
-- 5) index bắt buộc cho FK tổ hợp (class_id, org_id) ở migration 52.
--    Không thể fail vì id đã là PK; vẫn kiểm tồn tại để idempotent.
CALL mems_m51_add_unique('school_class', 'uq_school_class_id_org', 'id, org_id');

DROP PROCEDURE IF EXISTS mems_m51_add_col;
DROP PROCEDURE IF EXISTS mems_m51_add_fk;
DROP PROCEDURE IF EXISTS mems_m51_add_unique;
```

> **Thứ tự bắt buộc:** migration 51 phải chạy xong (tạo `uq_school_class_id_org`) **trước** migration 52,
> vì `class_subject` tạo FK `(class_id, org_id) → school_class(id, org_id)`.

### 4.2. `52_people_class_subject.sql` (draft)

Nội dung (bản đầy đủ ở `docs/phase-1/migrations/52_people_class_subject.sql`):

```sql
USE mems_people_db;
-- 0) Helper procedures: mems_m52_add_col, mems_m52_add_unique,
--    mems_m52_assert_no_duplicate_primary (SIGNAL 45000) — information_schema-guarded.
-- 1) specialty_subject (mục 3.4)
-- 2) teacher_subject (mục 3.5)
-- 3) class_subject (mục 3.3) — gồm is_primary + primary_class_id GENERATED STORED
-- 4) Bù cột is_primary / primary_class_id nếu bảng đã tồn tại từ bản nháp cũ
-- 5) backfill exact-match (mục 5.3): 5a tạo dòng LEGACY khi lớp có subject_id mà
--    chưa có dòng khớp + chưa có primary; 5b set is_primary qua bảng tạm (tránh
--    MySQL 1093); 5c CALL assert_no_duplicate_primary → dừng nếu >1 primary/lớp
-- 6) CALL mems_m52_add_unique('class_subject','uq_class_subject_primary','primary_class_id')
--    — UNIQUE chỉ bảo đảm TỐI ĐA một primary; tối thiểu do transaction/app
-- 7) class_subject_history (mục 3.3.1) — tạo SAU class_subject
-- 8) D-04 (đã chốt): code optional + UNIQUE khi có giá trị, khối COMMENTED:
--    ALTER TABLE subject DROP INDEX uq_subject_org_code,
--      ADD UNIQUE KEY uq_subject_org_code (org_id, code);
--    Chỉ chạy sau khi mục 6.1 báo 0 nhóm trùng. KHÔNG thêm NOT NULL.
```

**Pre-check bắt buộc trước khi chạy 52** (chi tiết SQL ở mục 6):

1. Trùng `subject.code` trong cùng org (mục 6.1) — trước khi đổi UNIQUE.
2. `class_subject` đã tồn tại hay chưa; nếu có, có cột `is_primary`/`primary_class_id` chưa.
3. Trùng khóa `(class_id, subject_id)` (nếu bảng đã có từ bản nháp cũ).
4. `school_class.subject_id` **không** có dòng `class_subject` khớp chính xác.
5. Nhiều dòng `class_subject` có thể bị đánh `is_primary` cho cùng một lớp (mập mờ) → báo cáo.
6. `class_subject.org_id` lệch `school_class.org_id` / `subject.org_id`.
7. Index/constraint `uq_class_subject_primary`, `uq_csh_operation`, FK đã tồn tại chưa.
8. `school_class` đã có `uq_school_class_id_org` chưa (do migration 51 tạo).
9. `class_subject.subject_id` không tồn tại trong `subject` cùng org (FK sẽ fail).
10. `school_class.subject_id` không tồn tại trong `subject` cùng org (backfill LEGACY sẽ fail FK).

**Thứ tự trong 52:** tạo `class_subject` **không** kèm UNIQUE primary → backfill exact-match khi
bảng đang rỗng/khớp → thêm `uq_class_subject_primary` và `class_subject_history`. Nếu backfill phát
hiện hàng mập mờ, **dừng** và xuất báo cáo manual review, không đoán.

### 4.3. Migration 53 — không tạo trong Revision 3

Repo hiện tại **chưa có** migration 51/52 nào (đã kiểm tra thư mục gốc: file gần nhất là
`50_schedule_inbox_impact.sql`), nên **không có bằng chứng** một bản 52 cũ đã chạy ở môi trường nào
cần nâng cấp. Vì vậy Revision 3 **không** tạo migration 53. Chỉ tạo 53 khi có xác minh (query
`information_schema` trên môi trường thật) rằng 52 phiên bản cũ đã áp dụng; khi đó **không sửa file
52 đã chạy** mà viết 53 bù phần thiếu.

> DDL đầy đủ của từng bảng nằm ở mục 3. Không đặt `NOT NULL` cho `subject.code` trong cùng
> migration với UNIQUE.

---

## 5. Backfill draft

### 5.1. `specialty_subject`

```sql
INSERT INTO specialty_subject(specialty_id, subject_id, org_id, created_at)
SELECT s.id, sub.id, s.org_id, NOW(3)
FROM specialty s
JOIN subject sub
  ON sub.org_id = s.org_id
 AND sub.name_unaccented = s.name_unaccented
WHERE NOT EXISTS (
  SELECT 1 FROM specialty_subject x
  WHERE x.specialty_id = s.id AND x.subject_id = sub.id);
```

### 5.2. `teacher_subject`

```sql
INSERT INTO teacher_subject(user_id, subject_id, org_id, status, source, created_at)
SELECT ts.user_id, ss.subject_id, ts.org_id, 'APPROVED', 'SPECIALTY', NOW(3)
FROM teacher_specialty ts
JOIN specialty_subject ss
  ON ss.specialty_id = ts.specialty_id AND ss.org_id = ts.org_id
WHERE NOT EXISTS (
  SELECT 1 FROM teacher_subject x
  WHERE x.user_id = ts.user_id AND x.subject_id = ss.subject_id);
```

**D-11 — chỉ backfill khớp chính xác, không đoán:**

- `specialty_subject` join theo `name_unaccented` là khớp **chính xác duy nhất** trong phạm vi org vì
  `subject` có UNIQUE `(org_id, name_unaccented)`. Nếu truy vấn trả >1 dòng (dữ liệu bất thường,
  schema lệch), **bỏ qua cặp đó** và ghi vào báo cáo, không chọn đại.
- `teacher_subject` chỉ sinh từ `specialty_subject` đã đối soát ở bước 1; không tự suy từ tên giáo viên.
- `class_subject` legacy map theo `class_id` + `subject_id` — khớp ID chính xác, không mơ hồ.
- Mọi bản ghi không map được phải xuất báo cáo để người dùng xử lý tay; **không tự tạo** môn/chuyên
  môn mới và **không** tự gán môn gần đúng.

### 5.3. `class_subject` (legacy)

```sql
INSERT INTO class_subject(class_id, subject_id, org_id, source, teacher_id, is_primary, status, created_at)
SELECT c.id, c.subject_id, c.org_id, 'LEGACY', c.teacher_id, 1, 'PLANNED', NOW(3)
FROM school_class c
WHERE c.subject_id IS NOT NULL
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_subject x
    WHERE x.class_id = c.id AND x.subject_id = c.subject_id);
```

- Không backfill `required_sessions`/`session_minutes` (không có nguồn); để NULL.
- `is_primary = 1` cho dòng khớp `school_class.subject_id`; `primary_class_id` là cột sinh nên
  **không** liệt kê trong INSERT.
- Nếu lớp đã có sẵn dòng `class_subject` khớp môn chính (do dữ liệu nhập trước), không set primary
  trong câu INSERT trên; phải chạy `UPDATE` ở mục 6.3b (idempotent) để bảo đảm đúng một primary.
- Lớp đã kết thúc vẫn backfill để giữ lịch sử; `status` có thể đặt `COMPLETED` nếu
  `c.status='DA_KET_THUC'` (tuỳ chọn, cần chốt).
- **Không** tạo `class_subject_history` hồi tố: không có dữ liệu nguồn (không biết actor/thời điểm).

---

## 6. Kiểm tra trước/sau migration

### 6.0. Pre-check bắt buộc trước migration 51/52

Chạy **trên staging**, ghi lại kết quả. Bất kỳ truy vấn nào trả dòng đều phải vào **báo cáo manual
review**; migration **không** tự sửa/đoán.

```sql
-- a) class_subject / class_subject_history đã tồn tại? cột đã có chưa?
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name IN ('class_subject','class_subject_history')
ORDER BY table_name, ordinal_position;

-- b) trùng khóa (class_id, subject_id) nếu bảng class_subject đã tồn tại
SELECT class_id, subject_id, COUNT(*) AS n
FROM class_subject GROUP BY class_id, subject_id HAVING COUNT(*) > 1;

-- c) lớp có subject_id nhưng KHÔNG có dòng class_subject khớp chính xác (ứng viên backfill)
SELECT c.id AS class_id, c.org_id, c.subject_id
FROM school_class c
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM class_subject cs
    WHERE cs.class_id = c.id AND cs.subject_id = c.subject_id);

-- d) lớp có subject_id nhưng KHÔNG dòng nào khớp; hoặc đã có >1 dòng is_primary (bản nháp cũ)
SELECT c.id AS class_id, c.subject_id,
       COALESCE(SUM(cs.subject_id = c.subject_id), 0) AS exact_match_rows,
       COALESCE(SUM(cs.is_primary = 1), 0)            AS primary_rows
FROM school_class c
LEFT JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id
WHERE c.subject_id IS NOT NULL AND c.deleted_at IS NULL
GROUP BY c.id, c.subject_id
HAVING exact_match_rows = 0 OR primary_rows > 1;

-- e) org lệch giữa class_subject và school_class / subject
SELECT cs.class_id, cs.subject_id, cs.org_id AS cs_org, c.org_id AS class_org
FROM class_subject cs JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id;

SELECT cs.class_id, cs.subject_id, cs.org_id AS cs_org, s.org_id AS subject_org
FROM class_subject cs JOIN subject s ON s.id = cs.subject_id
WHERE s.org_id <> cs.org_id;

-- f) index/constraint đã tồn tại (idempotency của migration)
SELECT table_name, index_name FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN ('uq_school_class_id_org','uq_class_subject_primary','uq_csh_operation');

SELECT table_name, constraint_name FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND constraint_name IN ('fk_class_subject_class','fk_csh_class','chk_class_subject_primary');
```

Kỳ vọng trước khi chạy 52: (b)=0; (c) là danh sách backfill hợp lệ **chỉ khi** khớp ID chính xác;
(d) phải được xem xét tay nếu >0 (không có nghĩa là mập mờ — có thể là nhiều môn, nhưng phải xác
nhận dòng nào khớp `subject_id`); (e)=0; (f) cho biết migration đã chạy một phần.

### 6.1. Trùng mã môn (trước khi thêm UNIQUE)

```sql
SELECT org_id, code, COUNT(*) AS n
FROM subject
WHERE code IS NOT NULL
GROUP BY org_id, code
HAVING COUNT(*) > 1;
```

Kỳ vọng: 0 dòng. Nếu có, người dùng quyết định đổi mã/ghép bản ghi trước khi chạy UNIQUE.

### 6.2. Môn không ánh xạ được chuyên môn

```sql
SELECT s.id, s.name
FROM subject s
WHERE s.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM specialty_subject ss WHERE ss.subject_id = s.id);
```

Báo cáo để người dùng bổ sung ánh xạ; không tự tạo.

### 6.3. Đếm sau migration

```sql
SELECT 'curriculum' AS t, COUNT(*) FROM curriculum
UNION ALL SELECT 'curriculum_subject', COUNT(*) FROM curriculum_subject
UNION ALL SELECT 'class_subject', COUNT(*) FROM class_subject
UNION ALL SELECT 'class_subject_history', COUNT(*) FROM class_subject_history
UNION ALL SELECT 'specialty_subject', COUNT(*) FROM specialty_subject
UNION ALL SELECT 'teacher_subject', COUNT(*) FROM teacher_subject;
```

Đối chiếu: `class_subject` ≥ số lớp có `subject_id`; `teacher_subject` ≥ số cặp
`teacher_specialty ⨝ specialty_subject`; `class_subject_history` = 0 ngay sau migration (không
backfill hồi tố).

### 6.3a. Bất biến môn chính (phải bằng 0)

```sql
-- Lớp có >1 dòng primary (UNIQUE chặn sau migration; kiểm trước khi thêm UNIQUE)
SELECT class_id, COUNT(*) AS n
FROM class_subject
WHERE is_primary = 1
GROUP BY class_id
HAVING COUNT(*) > 1;

-- Lớp có class_subject nhưng không có dòng primary
SELECT c.id
FROM school_class c
JOIN class_subject cs ON cs.class_id = c.id AND cs.org_id = c.org_id
WHERE c.deleted_at IS NULL
GROUP BY c.id
HAVING SUM(cs.is_primary = 1) = 0;

-- Lớp có primary lệch với school_class.subject_id
SELECT c.id, c.subject_id, cs.subject_id AS primary_subject
FROM school_class c
JOIN class_subject cs
  ON cs.class_id = c.id AND cs.org_id = c.org_id AND cs.is_primary = 1
WHERE c.subject_id IS NULL OR c.subject_id <> cs.subject_id;
```

Trước migration, hai truy vấn đầu có thể trả dòng (bảng cũ chưa có `is_primary`); sau bước backfill
và trước khi thêm `uq_class_subject_primary` phải xử lý tay. Truy vấn "primary lệch" phải **luôn**
bằng 0 sau mỗi lần đổi môn chính. **UNIQUE `uq_class_subject_primary` chỉ chặn trường hợp >1
primary**; câu "lớp có `class_subject` nhưng không có primary" **không** bị DB chặn — đây là lý do
phải chạy truy vấn này định kỳ và bảo đảm bằng transaction/app validation.

### 6.3b. Sửa dữ liệu primary (idempotent, chỉ khi cần)

```sql
-- Đặt primary cho dòng khớp môn chính, nếu lớp chưa có primary
UPDATE class_subject cs
JOIN school_class c ON c.id = cs.class_id AND c.org_id = cs.org_id
SET cs.is_primary = 1
WHERE c.subject_id = cs.subject_id
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT class_id FROM class_subject WHERE is_primary = 1) p
    WHERE p.class_id = cs.class_id);
```

> MySQL không cho UPDATE bảng đang đọc trong subquery cùng bảng; nếu cần chạy trên MySQL, dùng bảng
> tạm hoặc chạy theo từng lớp. Script này chỉ để người dùng xử lý staging, không chạy tự động.

### 6.4. Kiểm tra org chéo (phải bằng 0)

Sau khi có FK tổ hợp, các truy vấn dưới đây phải trả 0; nếu khác 0 nghĩa là dữ liệu vi phạm
trước khi FK được tạo hoặc FK chưa đúng.

```sql
SELECT COUNT(*) FROM class_subject cs
JOIN school_class c ON c.id = cs.class_id
WHERE c.org_id <> cs.org_id;

SELECT COUNT(*) FROM curriculum_subject cs
JOIN curriculum c ON c.id = cs.curriculum_id
WHERE c.org_id <> cs.org_id;

SELECT COUNT(*) FROM class_subject_history h
JOIN school_class c ON c.id = h.class_id
WHERE c.org_id <> h.org_id;

SELECT COUNT(*) FROM class_subject_history h
LEFT JOIN subject s ON s.id = h.new_subject_id AND s.org_id = h.org_id
WHERE s.id IS NULL;

SELECT COUNT(*) FROM teacher_subject ts
JOIN staff_profile sp ON sp.user_id = ts.user_id
WHERE sp.org_id <> ts.org_id;

SELECT COUNT(*) FROM specialty_subject ss
JOIN specialty s ON s.id = ss.specialty_id
WHERE s.org_id <> ss.org_id;
```

> Truy vấn `class_subject_history` → `subject` kiểm rằng `new_subject_id` **vẫn** cùng org với lớp.
> Vì snapshot không có FK tới `subject` (cố ý), service phải kiểm org khi ghi; truy vấn này phát
> hiện dữ liệu sai lọt vào.

### 6.5. Kiểm tra tiên quyết trước khi tạo bảng nối

```sql
-- Tự tiên quyết (CHECK chặn; phải rỗng)
SELECT * FROM curriculum_subject_prerequisite
WHERE subject_id = prerequisite_subject_id;

-- Tiên quyết ngoài curriculum (FK chặn; phải rỗng)
SELECT p.*
FROM curriculum_subject_prerequisite p
LEFT JOIN curriculum_subject cs
  ON cs.curriculum_id = p.curriculum_id
 AND cs.subject_id = p.prerequisite_subject_id
WHERE cs.subject_id IS NULL;

-- Quan hệ trùng (PK chặn; kiểm dữ liệu nhập tay)
SELECT curriculum_id, subject_id, prerequisite_subject_id, COUNT(*) AS n
FROM curriculum_subject_prerequisite
GROUP BY curriculum_id, subject_id, prerequisite_subject_id
HAVING COUNT(*) > 1;
```

Kỳ vọng: 0 dòng cho cả ba truy vấn. Bảng mới ở Phase 1 nên thực tế rỗng.
**Chu trình (A→B→C→A) không kiểm được bằng một câu SQL di động** — service dùng DFS trên các cạnh
`(subject_id, prerequisite_subject_id)` của cùng `curriculum_id`; test bằng TC-CUR-009/021.

---

## 7. Rollback / bù trừ

| Thay đổi | Rollback an toàn |
|---|---|
| Thêm bảng mới | `DROP TABLE` chỉ khi chưa dùng; tốt nhất giữ bảng và tắt tính năng |
| `school_class.curriculum_id` | `ALTER TABLE school_class DROP FOREIGN KEY ...; DROP COLUMN` (mất liên kết, không mất dữ liệu lớp) |
| `uq_school_class_id_org` | `DROP INDEX uq_school_class_id_org` — chỉ làm **sau** khi đã drop FK `class_subject` |
| Bảng nối tiên quyết | `DROP TABLE curriculum_subject_prerequisite` (chỉ khi chưa dùng); drop trước `curriculum_subject` |
| `class_subject_history` | **Giữ bảng là an toàn nhất.** Nếu buộc phải bỏ: export toàn bộ history ra file lưu trữ trước, drop FK `fk_csh_class` rồi `DROP TABLE`; **không** âm thầm xoá lịch sử |
| `class_subject.is_primary`/`primary_class_id` | `DROP INDEX uq_class_subject_primary; ALTER TABLE ... DROP COLUMN primary_class_id, DROP COLUMN is_primary` — chỉ sau khi đã bỏ mọi code đọc hai cột này; mất thông tin "môn nào là primary" (có thể suy lại từ `school_class.subject_id` khi rollback) |
| Unique code | `DROP INDEX ... , ADD INDEX` (trở về index thường) — không mất dữ liệu |
| Backfill | Không cần rollback nếu bảng mới; nếu muốn, `DELETE` **chỉ** dòng do backfill tạo (`source='LEGACY'` và không có history tham chiếu). Dòng `class_subject` do người dùng tạo (`MANUAL`/`CURRICULUM`) **không** xoá |

**Dữ liệu có thể mất khi rollback:**

- `class_subject_history`: nếu drop bảng mà chưa export → mất toàn bộ audit đổi môn (không thể tái
  tạo chính xác actor/thời điểm/lý do). Đây là tổn thất không thể phục hồi.
- `class_subject.is_primary`: mất dấu primary, nhưng có thể suy lại từ `school_class.subject_id`
  nếu dữ liệu còn nhất quán.
- Backfill `class_subject`: xoá `source='LEGACY'` sẽ mất snapshot môn legacy đã tạo.

**Điều kiện an toàn để rollback:** không còn request đổi môn chính đang chạy; đã export history;
đã xác nhận `school_class.subject_id` vẫn khớp dòng primary trước khi drop cột; đã drop FK/index
theo đúng thứ tự ngược.

**Khi nào forward-fix thay vì rollback:** nếu migration đã chạy và **đã phát sinh history** hoặc
đã có dữ liệu `class_subject` mới, rollback sẽ mất audit/dữ liệu nghiệp vụ. Khi đó viết migration
bổ sung (forward-fix) để sửa constraint/backfill sai, **không** drop bảng/cột.

Không có thao tác nào xoá cột `subject_id`, `teacher_specialty` hay dữ liệu lớp.
Thứ tự rollback phải ngược với thứ tự tạo: drop FK trước, drop index sau.

---

## 8. Hiệu năng và index

- `class_subject` tra theo lớp (`class_id` là prefix PK) và theo môn (`idx_class_subject_org_subject`).
- `teacher_subject` tra assignable theo `(org_id, subject_id, status)` — đúng truy vấn gợi ý.
- `curriculum_subject` nhỏ (vài chục dòng/curriculum); PK đủ nhanh.
- Danh sách môn Phase 1 trả toàn bộ (D-13 = A); **không** thêm index phân trang lúc này.
  Nếu sau này đổi hợp đồng sang phân trang, index `(org_id, is_active, name)` là ứng viên.
- Không thêm index thừa trên `name_unaccented` vì đã có unique.

---

## 9. Rủi ro schema

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Thêm UNIQUE code fail do dữ liệu trùng | Cao | D-04 đã chốt UNIQUE; vẫn phải chạy 6.1 và xử lý tay trước khi ALTER |
| FK tổ hợp `(class_id, org_id)` fail vì `school_class` chưa có index | **Cao** | Migration 51 thêm `uq_school_class_id_org` **trước** migration 52; index không thể fail vì `id` là PK |
| FK tổ hợp + `SET NULL` làm fail | Trung bình | Dùng RESTRICT (đã thiết kế) |
| `curriculum_subject.org_id` lệch curriculum | Thấp | FK tổ hợp + UNIQUE `(curriculum_id, subject_id, org_id)` + service kiểm |
| Tiên quyết trỏ môn ngoài curriculum | Thấp | FK tổ hợp trên bảng nối tới `curriculum_subject(curriculum_id, subject_id, org_id)` |
| Xoá môn đang là tiên quyết bị chặn | Thấp | Service gỡ các cạnh `curriculum_subject_prerequisite` liên quan trước; báo 409 nếu chưa gỡ |
| Bảng nối tiên quyết trùng cạnh | Thấp | PK 3 cột + service dedup/validate |
| Backfill `class_subject` trùng khi chạy lại | Thấp | `NOT EXISTS` + PK |
| Hai dòng primary cùng lớp | **Cao** | UNIQUE `(primary_class_id)`; service khoá lớp và tắt primary cũ trong cùng transaction |
| History ghi nhưng cập nhật `school_class` fail | Trung bình | Một transaction; insert history **trước** để lỗi cập nhật rollback cả history |
| `school_class.subject_id` lệch primary | Trung bình | Kiểm 6.3a sau migration và định kỳ; mọi thay đổi đi qua đúng một luồng service |
| H2 test schema khác MySQL | Trung bình | Test schema phải khai báo cùng constraint; chạy test H2 + kiểm MySQL staging |
| Xoá cứng curriculum đang được lớp dùng | Trung bình | FK RESTRICT + chỉ dùng `is_active` |

### 9.1. H2 test schema (`people-test-schema.sql`) — điểm lệch cần xử lý

| Điểm | MySQL | H2 (test) | Cách xử lý |
|---|---|---|---|
| Cột sinh | `GENERATED ALWAYS AS (...) STORED` | H2 2.x hỗ trợ `GENERATED ALWAYS AS (...)` nhưng **không** có `STORED` | Khai báo cột thường `primary_class_id char(36)`; service set = `class_id` khi `is_primary=1`, `NULL` khi ngược lại. UNIQUE vẫn giữ |
| CHECK constraint | MySQL 8.0.16+ enforce | H2 enforce | Giữ nguyên |
| `ON DELETE RESTRICT` trên FK `class_subject_history` | Hỗ trợ | Hỗ trợ | Giữ nguyên |
| `UNIQUE (org_id, operation_id)` với NULL | Cho phép nhiều NULL | Cho phép nhiều NULL | Giữ nguyên; Revision 3 đặt hai cột NOT NULL nên NULL không còn là đường hợp lệ |
| `ALTER TABLE … AFTER` | Hỗ trợ | Không hỗ trợ | Không dùng `AFTER` trong draft 51/52; đặt cột ở cuối `ALTER TABLE` |
| Composite FK cần index tiền tố trái | Bắt buộc | Bắt buộc | Test schema phải thêm `UNIQUE(id, org_id)` trên `school_class` |
| Kiểu `is_primary` | `tinyint(1)` | `BOOLEAN` | Test map `true`/`false`, không so `1`/`0` trực tiếp |
| Bất biến "tối thiểu một primary" | Transaction + app | Transaction + app | H2 **không** kiểm được; nghiệm thu trên MySQL staging (TC-CLS-047/048) |

> Hệ quả: **DB H2 chỉ kiểm được "tối đa một primary"** khi cột `primary_class_id` được service cập
> nhật đúng; H2 **không** mô phỏng generated column và **không** chứng minh được MySQL generated
> column. Test H2 phải kiểm service trả 409 khi cố tạo primary thứ hai **và** phải có kiểm thủ công
> trên MySQL staging (xem `test-cases.md` TC-CLS-048, TC-LEG-018/019). Tài liệu này **không** tuyên
> bố schema đã được xác minh chỉ dựa trên H2.

---

## 10. Việc người dùng cần làm (không thuộc tài liệu này)

> Trạng thái: `D-01`…`D-15` **đã chốt** (xem sổ quyết định `subject-business-requirements.md`).
> Tài liệu này chỉ mô tả thiết kế; **chưa có migration nào được chạy** trên bất kỳ database nào.
> Draft 51/52 nằm trong `docs/phase-1/migrations/` — chưa được xác minh trên MySQL.

1. Tạo file migration thật (đề xuất 51/52) từ draft; **51 trước 52**. Migration 51 gồm
   `curriculum`, `curriculum_subject` (kèm `uq_curriculum_subject_org`), `curriculum_subject_prerequisite`,
   `school_class.curriculum_id`, `uq_school_class_id_org`. Migration 52 gồm `class_subject`
   (kèm `is_primary`, `primary_class_id`, `uq_class_subject_primary`), `class_subject_history`,
   `teacher_subject`, `specialty_subject`, backfill exact-match. **Không** tạo migration 53 nếu
   chưa có bằng chứng một bản 52 cũ đã chạy (mục 4.3).
2. Cập nhật schema test H2 tương ứng để test phản ánh đúng MySQL (composite FK, UNIQUE 3 cột,
   UNIQUE primary; lưu ý khác biệt cột sinh ở mục 9.1). H2 **không** thay thế kiểm MySQL staging.
3. Chạy pre-check 6.0 (tồn tại bảng/cột/index, trùng khóa, lớp thiếu primary, org lệch), 6.1
   (trùng mã môn), 6.3a (bất biến primary) và 6.5 (cạnh tiên quyết) trên **staging**, không
   production.
4. Chỉ chạy production theo quy trình riêng của bạn, có backup và rollback đã kiểm (§7).
5. Viết code entity/repository/service/controller theo `implementation-roadmap.md` (người dùng tự viết).
   Luồng đổi môn chính **phải** là một `@Transactional` duy nhất (history → `school_class` →
   `class_subject`) — xem `api-contract.md` §4.8.
