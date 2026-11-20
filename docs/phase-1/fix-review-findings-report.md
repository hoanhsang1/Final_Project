# Fix Final Static Review Findings — WP1 Revision 3

> **Ngày:** 2026-11-20 · **Nhánh:** `fixFlowCreateEmployee` · **HEAD:** `f64cea1`
> **Phạm vi:** chỉ SQL draft trong `docs/phase-1/migrations/`, tài liệu `docs/phase-1/` và H2
> **test fixture**. Không sửa Java business logic, không sửa React, không chạy SQL/migration, không
> kết nối MySQL/H2, không chạy Maven, không commit/push/merge/reset, không deploy, không tạo
> migration 53.

## TRẠNG THÁI: `READY FOR FINAL STATIC REVIEW`

> **Không phải `APPROVED`.** P1/P2/P3 đã được sửa trong **logic SQL thực tế** và kiểm bằng phân
> tích static. Chưa chạy trên MySQL/H2, chưa chạy test, chưa xác minh runtime. Việc chuyển
> `APPROVED` thuộc về người dùng sau khi review và kiểm staging.

---

## A. Git state

| Hạng mục | Giá trị |
|---|---|
| Branch | `fixFlowCreateEmployee` |
| HEAD | `f64cea1` (`fix flox class managment`) |
| Commit trong lượt này | **Không** (working tree) |
| Push/merge/reset | **Không** |
| Staging area | Trống; mọi thay đổi là unstaged |
| File tracked bị sửa | 11 (liệt kê ở E.1) |
| File mới | `docs/phase-1/fix-review-findings-report.md` (báo cáo này), `docs/phase-1/fix-review-findings.diff` (full diff) |
| File ngoài phạm vi bị sửa | **Không**: `git status` chỉ có 11 file dự kiến; không có `.java` business logic, không có React, không có `.env`/`vercel.json`/CORS |
| Migration 53 | **Không tạo** |
| SQL/DB execution | **Không**: không chạy file `.sql`, không kết nối MySQL/H2, không chạy Maven |

Lệnh kiểm chứng:

```bash
git status --short
git diff --numstat
```

---

## B. Findings và trạng thái

| ID | Finding gốc | Trạng thái | File:line | Bằng chứng trong logic thực tế |
|---|---|---|---|---|
| P1 | Audit `class_subject` chỉ kiểm tên cột, không kiểm thuộc tính cột | **FIXED (static)** | `52_people_class_subject.sql:92-134`, `51_52_precheck.sql:60-104` | Spec 20 dòng so `column_type`, `is_nullable`, `column_default` (NULL-safe `<=>`), `character_maximum_length`, `numeric_precision`, `numeric_scale`, `collation_name`, `extra` (NONE vs STORED). Verdict 0b yêu cầu `cs_attr.bad = 0` (`:259-267`); audit 52 `SIGNAL` khi `v_attr_bad <> 0` (`:285-304`). |
| P1 | Audit `teacher_subject` không kiểm thuộc tính, DEFAULT `status`/`source` | **FIXED (static)** | `52_people_class_subject.sql:361-391` | Spec 10 cột; `status` DEFAULT `APPROVED`, `source` DEFAULT `MANUAL`, `created_at NOT NULL`, các cột còn lại nullable đúng DDL. `SIGNAL` tại `:519-541`. |
| P1 | Chưa xử lý cách MySQL biểu diễn DEFAULT | **FIXED (static, có giới hạn)** | `52:89-91`, `51_52_precheck.sql:56-59` | Ghi rõ MySQL 8 không phân biệt `DEFAULT NULL` với "không DEFAULT" (đều `COLUMN_DEFAULT IS NULL`); so sánh `<=>`; không cột NOT NULL nào dựa vào default ngầm. |
| P2 | Không audit `class_subject_history` đã tồn tại trước `CREATE TABLE IF NOT EXISTS` | **FIXED (static)** | `52_people_class_subject.sql:548-752`, gọi tại `:988` | Procedure `mems_m52_assert_history_schema`: 16 cột + thuộc tính, PK `(id)`, UNIQUE `(org_id,operation_id)`, 2 index phụ, FK `fk_csh_class` mapping đúng + `RESTRICT/RESTRICT` (**không cascade**), 3 CHECK chuẩn hoá. Bảng vắng ⇒ bỏ qua để CREATE; sai ⇒ `SIGNAL` (`:748-749`). |
| P2 | Không audit `specialty_subject` đã tồn tại | **FIXED (static)** | `52_people_class_subject.sql:758-922`, gọi tại `:989` | 5 cột + thuộc tính, PK `(specialty_id,subject_id)`, `idx_specialty_subject_org_subject`, 2 index hỗ trợ FK, 2 FK mapping đúng + `specialty CASCADE` / `subject RESTRICT`, không CHECK lạ. Sai ⇒ `SIGNAL` (`:918-919`). |
| P3 | Không kiểm `DELETE_RULE`/`UPDATE_RULE` của FK | **FIXED (static)** | `52:194-240` (class), `:445-510` (teacher), `:670-703` (history), `:859-895` (specialty); `51_52_precheck.sql:151-197`; `51_52_postcheck.sql:127-170` | Join `information_schema.referential_constraints`; expected: class `RESTRICT/CASCADE`, subject/curriculum/teacher/staff `RESTRICT/RESTRICT`, teacher-profile `RESTRICT/CASCADE`, history `RESTRICT/RESTRICT`, specialty `RESTRICT/CASCADE`. Lệch ⇒ `v_fk_rule_bad > 0` ⇒ `BLOCKED`/`SIGNAL`. |
| P3 | H2 fixture thiếu CHECK so với MySQL | **FIXED (static)** | `people-test-schema.sql:116`, `:200` | Thêm `chk_curriculum_subject_sequence CHECK(sequence_no > 0)` và `chk_class_subject_primary CHECK(is_primary IN (FALSE, TRUE))` (H2 `BOOLEAN`). |
| P3 | `uq_subject_org_code` khác MySQL nhưng chưa ghi rõ | **FIXED (documented, không đổi D-04)** | `people-test-schema.sql:78-89`; `database-schema.md:991` | Giữ UNIQUE ở H2 (đúng contract 409 và target D-04), ghi rõ MySQL migration 42 đang non-unique và D-04 vẫn là khối commented trong 52; không sửa D-04. |
| P3 | Helper migration 51 bỏ qua object trùng tên | **FIXED (static)** | `51_people_curriculum.sql:18-123`, calls `:198-206` | `mems_m51_add_col` so type/null/default; `mems_m51_add_fk` so mapping + update/delete rule; `mems_m51_add_unique` so unique/cột/thứ tự/prefix. Lệch ⇒ `SIGNAL 45000`, không tự drop/tạo lại; bảng đích thiếu ⇒ `SIGNAL`. |
| P3 | Runbook thiếu implicit commit / DML còn lại / index hỗ trợ FK | **FIXED (documented)** | `ROLLBACK.md:150-184`, `:185-222`; `51_52_precheck_data.sql:1-23`; `51_52_postcheck.sql:98-170` | §2 mô tả DDL implicit commit, 5a/5b có thể còn, quy trình rerun idempotent, không xoá dòng backfill khi chưa chứng minh nguồn gốc; bước 8 hướng dẫn kiểm index InnoDB còn sót và không drop khi còn FK dùng. |
| P3 | Thiếu test case cho các lỗi schema/action | **FIXED (documented)** | `test-cases.md:256-267` | TC-LEG-030…041: sai `DATA_TYPE`, `COLUMN_TYPE`, NULL/DEFAULT, collation, `DELETE_RULE`, `UPDATE_RULE`, history cascade, history thiếu cột, specialty sai schema, trùng tên index/FK, abort sau 5a/5b rồi rerun. |

**Không có finding nào được đánh dấu FIXED chỉ vì thêm chữ vào tài liệu**: mỗi dòng P1/P2/P3 SQL
đều dẫn tới biểu thức/`SIGNAL` cụ thể trong file migration hoặc precheck/postcheck.

---

## C. Schema contract được enforce

Hợp đồng dưới đây được dùng **đồng thời** bởi pre-check 0b và procedure audit trong 52 (cùng ngưỡng,
cùng cách chuẩn hoá). Bảng vắng mặt được phép `CREATE`; bảng tồn tại nhưng lệch ⇒ `SIGNAL`/`BLOCKED`.

### C.1. `class_subject` — 20 cột

| Cột | COLUMN_TYPE | NULL | DEFAULT | Ghi chú |
|---|---|---|---|---|
| `class_id`, `subject_id`, `org_id` | `char(36)` | NO | — | utf8mb4_unicode_ci |
| `curriculum_id`, `teacher_id`, `created_by`, `updated_by` | `char(36)` | YES | NULL | — |
| `source` | `varchar(20)` | NO | `MANUAL` | CHECK `LEGACY/CURRICULUM/MANUAL` |
| `status` | `varchar(20)` | NO | `PLANNED` | CHECK `PLANNED/ACTIVE/COMPLETED/CANCELLED` |
| `is_primary` | `tinyint(1)` | NO | `0` | precision 3, scale 0 |
| `primary_class_id` | `char(36)` | YES | NULL | `STORED GENERATED`, biểu thức `CASE WHEN is_primary = 1 THEN class_id END` |
| `sequence_no`, `required_sessions`, `planned_sessions`, `theory_sessions`, `practice_sessions`, `session_minutes` | `smallint` | YES | NULL | precision 5, scale 0 |
| `note` | `varchar(500)` | YES | NULL | — |
| `created_at` | `datetime(3)` | NO | — | — |
| `updated_at` | `datetime(3)` | YES | NULL | — |

Index: `PRIMARY (class_id,subject_id)`, `UNIQUE uq_class_subject_primary (primary_class_id)`,
`idx_class_subject_org_subject`, `idx_class_subject_teacher`, `idx_class_subject_curriculum`; cho
phép **đúng** index hỗ trợ FK non-unique `(class_id,org_id)` và `(subject_id,org_id)`.

FK: `fk_class_subject_class` → `school_class(id,org_id)` `RESTRICT/CASCADE`;
`fk_class_subject_subject` → `subject(id,org_id)` `RESTRICT/RESTRICT`;
`fk_class_subject_curriculum` → `curriculum(id,org_id)` `RESTRICT/RESTRICT`;
`fk_class_subject_teacher` → `staff_profile(user_id,org_id)` `RESTRICT/RESTRICT`.

CHECK: 5 constraint với biểu thức đã chuẩn hoá (status, source, is_primary, sessions, sequence).

### C.2. `teacher_subject` — 10 cột

`user_id`, `subject_id`, `org_id` `char(36) NOT NULL`; `status varchar(20) NOT NULL DEFAULT
'APPROVED'`; `source varchar(20) NOT NULL DEFAULT 'MANUAL'`; `approved_by`/`created_by` `char(36)
NULL`; `approved_at`/`updated_at` `datetime(3) NULL`; `created_at datetime(3) NOT NULL`. PK
`(user_id,subject_id)`; 2 index phụ; FK `teacher_profile` `RESTRICT/CASCADE`, `subject`
`RESTRICT/RESTRICT`; CHECK status chỉ `APPROVED/REVOKED` (PENDING bị chặn), source
`SPECIALTY/MANUAL`. Chấp nhận 2 index hỗ trợ FK `(user_id,org_id)`, `(subject_id,org_id)`.

### C.3. `class_subject_history` — 16 cột

Cột theo đúng DDL 52 (`id`, `org_id`, `class_id`, 5 cột `old_*`, `new_subject_id`,
`new_subject_code`, `new_subject_name`, `new_source`, `reason`, `operation_id`, `changed_by`,
`changed_at`) với kiểu/độ dài/NULL tương ứng. PK `(id)`; `UNIQUE uq_csh_operation
(org_id,operation_id)`; `idx_csh_class_time`, `idx_csh_new_subject`; chỉ cho phép thêm index hỗ trợ
FK `(class_id,org_id)`. FK `fk_csh_class` `RESTRICT/RESTRICT` — **mọi `ON DELETE CASCADE` bị
`SIGNAL`** để giữ quy tắc "lịch sử không bị xoá theo lớp". 3 CHECK (subject change, old source, new
source).

### C.4. `specialty_subject` — 5 cột

`specialty_id`, `subject_id`, `org_id` `char(36) NOT NULL`; `created_by char(36) NULL`;
`created_at datetime(3) NOT NULL`. PK `(specialty_id,subject_id)`;
`idx_specialty_subject_org_subject`; 2 index hỗ trợ FK. FK `specialty` `RESTRICT/CASCADE`, `subject`
`RESTRICT/RESTRICT`; **không** CHECK nào (CHECK lạ ⇒ ABORT).

### C.5. Giới hạn biểu diễn của `information_schema`

- `COLUMN_DEFAULT` của MySQL 8 trả `NULL` cho cả `DEFAULT NULL` lẫn "không có DEFAULT". Hai trạng
  thái này tương đương về mặt dữ liệu ở đây, và không cột `NOT NULL` nào trong bốn bảng dựa vào
  default ngầm, nên phép so `<=>` là đủ. Không hardcode biểu diễn khác (ví dụ `b'0'`).
- `COLLATION_NAME` là `NULL` với kiểu số/ngày; spec đặt `'NONE'` và kiểm `IS NULL`.
- `EXTRA` của cột sinh là `STORED GENERATED`; spec yêu cầu cả hai chuỗi con. Cột không sinh phải
  không chứa `GENERATED`.
- `TINYINT(1)` giữ display width trong `COLUMN_TYPE`; precision 3 / scale 0. `SMALLINT` precision 5
  / scale 0.

---

## D. Static validation và giới hạn

### D.1. Đã kiểm

| Kiểm tra | Cách làm | Kết quả |
|---|---|---|
| Cân bằng ngoặc (bỏ comment + string literal) | Script Node đọc 6 file SQL/fixture | `OK`: 51 = 111/111, 52 = 441/441, precheck = 165/165, precheck_data = 67/67, postcheck = 68/68, H2 = 375/375 |
| DDL ↔ audit cùng cột/kiểu/thứ tự | Parse `CREATE TABLE` của 52 và so spec | `class_subject` 20, `teacher_subject` 10, `history` 16, `specialty_subject` 5 — khớp tên, kiểu, thứ tự |
| Audit không tự sửa schema | `grep -n "ALTER TABLE"` trong 52 | Chỉ có khối D-04 **commented** (`:1153-1154`); không `ALTER` trong 4 procedure audit |
| Pre-check read-only | `grep -n "INSERT\|UPDATE\|DELETE\|ALTER\|DROP\|CREATE"` trên 2 file precheck | Chỉ khớp comment/tên cột; **không** có câu lệnh ghi |
| FK/action thống nhất 52 ↔ precheck ↔ postcheck | So 9 FK và expected rule ở 3 file | Khớp: class CASCADE, 3 FK còn lại RESTRICT; teacher CASCADE/RESTRICT; history RESTRICT/RESTRICT; specialty CASCADE/RESTRICT |
| Index group ↔ DDL | So tên/cột/thứ tự/unique ở audit và `CREATE TABLE` | Khớp 5 + 2 hỗ trợ (class), 3 + 2 (teacher), 4 + 1 (history), 2 + 2 (specialty) |
| Không DML ngoài 5a/5b | `grep` trong 52 | `INSERT/UPDATE` chỉ ở 5a/5b (`:1085`, `:1102-1112`); D-04 commented |
| Phạm vi file | `git status --short` | 11 tracked file + 2 file mới; không Java/React business logic; không migration 53 |

### D.2. Chưa kiểm (giới hạn trung thực)

- **Không** chạy `mysql`, **không** parse cú pháp bằng MySQL, **không** kết nối staging/H2.
- **Không** chạy Maven/test; các kỳ vọng hành vi (`SIGNAL`, `information_schema`) là phân tích theo
  tài liệu MySQL 8.0, chưa phải kết quả thực thi.
- Chưa xác minh `specialty` thật có `UNIQUE(id, org_id)`; tài liệu/dump trong repo ghi có
  (`database-schema.md:90`), nhưng chưa đọc `information_schema` live.
- Chưa chứng minh hai index hỗ trợ FK được InnoDB đặt tên/không đặt tên ra sao trên staging; audit
  chấp nhận theo **cặp cột + non-unique + không prefix**, không theo tên.

---

## E. Full diff

### E.1. Artifact

Full unified diff (không rút gọn) nằm tại:

- `docs/phase-1/fix-review-findings.diff`
- Sinh bằng: `git diff > docs/phase-1/fix-review-findings.diff`
- **1593 dòng**, SHA-256: `7dcd94f814e7b56fb704b766782c4fe4d252d258226d64a175c513d2470fbbfc`
- Bao gồm **toàn bộ hunk** của 11 file tracked bị sửa. Hai file mới (báo cáo này và file `.diff`)
  là untracked nên không nằm trong `git diff`; nội dung báo cáo chính là phần còn lại của deliverable.

`git diff --stat`:

```text
 backend/PeopleService/src/test/resources/people-test-schema.sql |  14 +-
 docs/phase-1/database-schema.md                                |  12 +-
 docs/phase-1/migrations/51_52_postcheck.sql                    |  70 +++
 docs/phase-1/migrations/51_52_precheck.sql                     | 124 ++++-
 docs/phase-1/migrations/51_52_precheck_data.sql                |  19 +-
 docs/phase-1/migrations/51_people_curriculum.sql               |  94 +++-
 docs/phase-1/migrations/52_people_class_subject.sql            | 604 +++++++++++++++++++--
 docs/phase-1/migrations/ROLLBACK.md                            |  72 ++-
 docs/phase-1/review-report.md                                  |  36 +-
 docs/phase-1/test-cases.md                                     |  14 +-
 docs/phase-1/wp1-readiness-report.md                           |  43 +-
 11 files changed, 1019 insertions(+), 90 deletions(-)
```

`git diff --numstat` (insertions/deletions):

```text
13   1   backend/PeopleService/src/test/resources/people-test-schema.sql
10   2   docs/phase-1/database-schema.md
70   0   docs/phase-1/migrations/51_52_postcheck.sql
107 17   docs/phase-1/migrations/51_52_precheck.sql
15   4   docs/phase-1/migrations/51_52_precheck_data.sql
85   9   docs/phase-1/migrations/51_people_curriculum.sql
567 37   docs/phase-1/migrations/52_people_class_subject.sql
68   4   docs/phase-1/migrations/ROLLBACK.md
37   6   docs/phase-1/review-report.md
13   1   docs/phase-1/test-cases.md
34   9   docs/phase-1/wp1-readiness-report.md
```

### E.2. Bản đồ hunk (mỗi hunk nằm trong artifact ở trên)

| File | Hunk / nội dung |
|---|---|
| `52_people_class_subject.sql` | Header abort/partial backfill (`:18-24`); 4 spec thuộc tính cột (class `:92-134`, teacher `:361-391`, history `:584-620`, specialty `:789-814`); index whitelist history/specialty; FK rule joins (4 chỗ); IF + diagnostic mở rộng (4 chỗ); 2 procedure mới (`:548`, `:758`); 4 `CALL` (`:986-989`); 2 `DROP PROCEDURE` (`:1158-1159`) |
| `51_52_precheck.sql` | Header 0b mở rộng; `cs_attr` (`:60-104`); `cs_fk` rule (`:151-197`); verdict (`:244-269`); 0h diagnostics (`:401-417`) |
| `51_52_precheck_data.sql` | Header mô tả gate đầy đủ (`:1-23`) |
| `51_people_curriculum.sql` | 3 helper viết lại (`:18-123`); calls (`:198-206`) |
| `51_52_postcheck.sql` | 5b số cột (`:98`), 5c PK/UNIQUE (`:108`), 5d referential action (`:127`) |
| `people-test-schema.sql` | Parities notes (`:78-93`), 2 CHECK (`:116`, `:200`) |
| `ROLLBACK.md` | Bước 8 index hỗ trợ FK (`:150`), §2 abort/rerun (`:185`), renumber |
| `database-schema.md` | §9.1 bảng H2 + note audit (`:983-1010`) |
| `test-cases.md` | TC-LEG-030…041 (`:256-267`), ma trận (`:294`) |
| `review-report.md` | Baseline/status + Lượt 4 (`:1-20`, `:127-160`) |
| `wp1-readiness-report.md` | Status, audit contract, H2/rollback/tests/conclusion |

---

## F. Rủi ro còn lại

1. **Chưa thực thi**: mọi kết luận là static. Cú pháp stored procedure (`DELIMITER $`, labeled block,
   `SIGNAL`, `PREPARE`) chưa được MySQL parse; rủi ro lỗi cú pháp còn cho tới lần chạy staging đầu.
2. **Biểu diễn `information_schema`**: audit dựa trên hành vi MySQL 8.0 đã biết (default literal
   rỗng `EXTRA`, `TINYINT(1)` precision 3, `DATETIME(3)` collation NULL). Nếu staging là phiên bản
   khác hoặc collation bảng khác `utf8mb4_unicode_ci`, audit sẽ **chặn** (an toàn nhưng cần xử lý).
3. **Index hỗ trợ FK**: nếu staging đã có sẵn index khác che phủ cặp cột FK, InnoDB không tạo thêm;
   audit vẫn pass vì yêu cầu đúng 5 nhóm + không index lạ. Ngược lại, index hỗ trợ có prefix hoặc
   UNIQUE sẽ bị chặn.
4. **`fk_csh_class` RESTRICT**: đúng thiết kế "history không cascade", nhưng nghĩa là xoá cứng
   `school_class` sẽ bị chặn khi đã có history — service phải xử lý 409 (đã có trong API contract),
   chưa kiểm runtime.
5. **H2 divergence**: `uq_subject_org_code` UNIQUE ở H2 trong khi MySQL staging còn non-unique cho
   tới khi D-04 chạy. Test H2 có thể pass trong khi staging chưa có ràng buộc; TC-LEG-001/DB staging
   phải chạy trước khi tin vào 409.
6. **Abort giữa chừng**: runbook đã mô tả DML 5a/5b còn lại sau `SIGNAL`, nhưng chưa diễn tập thật;
   `created_at` là căn cứ duy nhất để nhận diện dòng backfill nếu không có log.
7. **Helper 51**: nếu object trùng tên tồn tại nhưng đúng nghĩa, helper bỏ qua (idempotent). Nếu
   `p_default` truyền `NULL` cho cột `NOT NULL` có default ngầm, helper sẽ `SIGNAL` — hiện chỉ dùng
   cho `curriculum_id` nullable nên không ảnh hưởng.
8. **Audit theo tên constraint**: đổi tên FK/index dù cấu trúc đúng vẫn bị chặn. Đây là lựa chọn có
   chủ đích (Revision 3 cố định tên), không phải bug.

---

## G. Kết luận

- P1 (thuộc tính cột), P2 (history + specialty_subject), P3 (referential action, H2 parity, helper 51,
  runbook, test cases) đã được sửa **trong logic SQL thực tế**, có dẫn chứng file:line.
- D-01…D-15, API contract, permission matrix, quy tắc history, teacher-subject và backfill
  exact-match **không thay đổi**. Không sửa Java business logic/React. Không tạo migration 53.
- Chưa chạy SQL/DB/test; các rủi ro còn lại ghi ở F.

**Trạng thái: `READY FOR FINAL STATIC REVIEW`**
