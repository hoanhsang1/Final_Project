# Revision 4 Fix Report — WP1 Migration 51/52

> **Ngày:** 2026-11-20 · **Nhánh:** `fixFlowCreateEmployee`
> **HEAD đầu phiên:** `ccd73fe` (kỳ vọng ban đầu `4d7cac9`; forward-only, xem §8)
> **HEAD cuối phiên:** `7c52b52` (commit ngoài phiên của người dùng — xem §8)
> **Phạm vi:** chỉ docs + SQL migration draft. Không chạy migration/rollback/DDL/DML, không kết nối
> DB, không sửa Java/React/.env, không commit/push.
> **Gate:** `READY FOR FINAL STATIC REVIEW` (§9). Không `APPROVED`.

---

## 0. Tóm tắt

| Finding | Mức | Trước | Sau |
|---|---|---|---|
| F-01 | BLOCKER | Chuẩn hoá CHECK không bỏ `\` ⇒ audit sai khi rerun/precheck | **FIXED (static)** |
| F-02 | MAJOR | 51 chấp nhận bảng `curriculum*` cũ sai cấu trúc | **FIXED (static)** |
| F-03 | MEDIUM | Header data-precheck mâu thuẫn footer về `SKIP_DATA_PRECHECK_NO_TABLE` | **FIXED** |
| F-04 | MEDIUM | Schema hard-code; quyền chưa kiểm | **FIXED (static)**; quyền = **UNVERIFIED** |
| F-05 | LOW | Hard delete curriculum có thể gặp MySQL 1451 | **FIXED (doc)** |
| F-06 | LOW | Rollback §8 thiếu index hỗ trợ FK của 51 | **FIXED (doc)** |

---

## 1. F-01 — BLOCKER: chuẩn hoá `CHECK_CLAUSE` thiếu backslash

**Trạng thái trước:** BLOCKER. Trên MySQL 8.0.16+,
`information_schema.check_constraints.check_clause` trả literal đã escape (`(_utf8mb4\'MANUAL\',…)`),
trong khi `SHOW CREATE`/dump in `(_utf8mb4'MANUAL',…)`. Chuỗi chuẩn hoá bỏ backtick, `_utf8mb4`,
space, `'`, `(`, `)` nhưng **không** bỏ `\`, nên biểu thức chứa string literal chuẩn hoá sai
(`statusin\planned\,…`).

**Nguyên nhân:** giả định sai rằng `check_clause` luôn ở dạng hiển thị như `SHOW CREATE`.

**File/vị trí (toàn bộ vị trí có cùng logic):**

| File | Vị trí | Loại |
|---|---|---|
| `docs/phase-1/migrations/51_52_precheck.sql` | 0b (`cs_chk`) | so khớp CHECK |
| `docs/phase-1/migrations/51_52_precheck.sql` | 0e2 | so khớp CHECK |
| `docs/phase-1/migrations/52_people_class_subject.sql` | audit `class_subject` | so khớp CHECK |
| `docs/phase-1/migrations/52_people_class_subject.sql` | audit `teacher_subject` | so khớp CHECK |
| `docs/phase-1/migrations/52_people_class_subject.sql` | audit `class_subject_history` | so khớp CHECK |
| `docs/phase-1/migrations/51_people_curriculum.sql` | audit `curriculum_subject` | so khớp CHECK |
| `docs/phase-1/migrations/51_people_curriculum.sql` | audit `curriculum_subject_prerequisite` | so khớp CHECK |
| `docs/phase-1/migrations/51_52_precheck.sql` | 0b (`cs_gen`), 0f (2 biểu thức) | generated expression |
| `docs/phase-1/migrations/52_people_class_subject.sql` | audit `class_subject` (`v_gen`) | generated expression |
| `docs/phase-1/migrations/51_52_postcheck.sql` | §5e | chẩn đoán (mới, chỉ đọc) |

**Cách xử lý:** chuỗi chuẩn hoá dùng chung 10 bước: bỏ backtick → `_utf8mb4` → space → `'` →
`(` → `)` → tab → LF → CR → `CHAR(92)`. Áp dụng cho **7** vị trí so khớp CHECK và **4** vị trí
generated expression. Giữ nguyên mọi expected string, `v_chk_total`/`v_chk_ok` và điều kiện
`LIKE '%PENDING%'` — không nới điều kiện audit. Thêm postcheck §5e in `raw_clause` + `norm` để
operator xác nhận trên MySQL thật.

**Bằng chứng:**

- Mô phỏng offline (Node, **không phải MySQL runtime**):
  - `(_utf8mb4\'PLANNED\',_utf8mb4\'ACTIVE\',_utf8mb4\'COMPLETED\',_utf8mb4\'CANCELLED\')` →
    `statusinplanned,active,completed,cancelled`
  - `(_utf8mb4'PLANNED',…)` (không backslash) → cùng kết quả
  - CHECK nhiều dòng (`AND` xuống dòng bằng LF) → `required_sessions>0andsession_minutes>0andtheory_sessions>=0andpractice_sessions>=0`
  - generated ``case when `is_primary` = 1 then `class_id` end`` → `casewhenis_primary=1thenclass_idend`
  - Kết quả: **ALL PASS**.
- Phân tích 3 kịch bản:
  1. **Lần chạy đầu, bảng vắng:** audit `LEAVE` rồi `CREATE` — không đổi hành vi.
  2. **Precheck trên bảng đã tồn tại:** 0b/0e2 chuẩn hoá đúng ⇒ không còn
     `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE` sai.
  3. **Rerun 52 sau ABORT (sau 5a/5b):** audit 52 qua, không còn `SIGNAL` sai — khôi phục đúng quy
     trình phục hồi đã tài liệu hoá.

**Trạng thái sau:** **FIXED (static)**.

**Chưa xác minh:** hành vi thực tế của `check_clause` trên server đích. Khi có môi trường, chạy
postcheck §5e và kiểm `norm` của `chk_class_subject_status` khớp
`statusinplanned,active,completed,cancelled` dù raw có `\'` hay không.

---

## 2. F-02 — MAJOR: 51 không audit bảng `curriculum*` đã tồn tại

**Trạng thái trước:** MAJOR. `CREATE TABLE IF NOT EXISTS` được dùng cho 3 bảng `curriculum*` mà
không kiểm định nghĩa bảng cũ; một bảng từ draft cũ thiếu cột/sai khóa vẫn được "chấp nhận", rồi
52 có thể fail khi tạo FK `(curriculum_id, org_id)` sau khi đã tạo một phần schema (implicit commit).

**Nguyên nhân:** thiếu bước audit trước `CREATE`; 51 chỉ bảo vệ cột/FK/index do helper thêm.

**File/vị trí:** `docs/phase-1/migrations/51_people_curriculum.sql`
- Procedure mới: `mems_m51_assert_database`, `mems_m51_assert_curriculum_schema`,
  `mems_m51_assert_curriculum_subject_schema`, `mems_m51_assert_csp_schema`.
- Gọi tại mục `-- 0)` **trước** `-- 1) curriculum` (trước mọi DDL trên bảng).
- Drop các procedure mới ở cuối file.

**Cách xử lý:** mỗi audit hoạt động 3 trạng thái: bảng vắng → `LEAVE` (được `CREATE` bên dưới);
tồn tại + khớp Revision 3 → tiếp tục; tồn tại + lệch → in chẩn đoán (`SELECT` các counter) rồi
`SIGNAL SQLSTATE '45000'`; **không** auto-ALTER. Nội dung kiểm:

| Bảng | Cột | Index | FK | CHECK |
|---|---|---|---|---|
| `curriculum` | 14 cột + thuộc tính | 5 nhóm (PRIMARY, 2 UNIQUE, 1 UNIQUE name, 1 secondary), không index lạ | 0 | 0 |
| `curriculum_subject` | 12 cột + thuộc tính | 4 nhóm + whitelist index hỗ trợ FK `(curriculum_id, org_id)` | 2, map đầy đủ + `RESTRICT/CASCADE`, `RESTRICT/RESTRICT` | 2 biểu thức |
| `curriculum_subject_prerequisite` | 5 cột + thuộc tính | 3 nhóm + 2 index hỗ trợ FK composite | 2, map 3 cột + rule | 1 biểu thức |

Thuộc tính kiểm: `column_type`, nullability, default, độ dài, precision/scale, collation, cờ
generated. Index kiểm tên + thứ tự cột + UNIQUE + không prefix (`sub_part`).

**Bằng chứng:** delimiter balance 51 = 7 `CREATE PROCEDURE` / 7 `END$`; 4 `CALL` nằm trước
`CREATE TABLE`; whitelist index khớp DDL (đã đối chiếu từng index/ FK map).

**Trạng thái sau:** **FIXED (static)**.

**Chưa xác minh:** audit chưa chạy trên MySQL thật; `information_schema` có thể trả `column_type`
kèm display width (`smallint(6)`, `bigint(20)`) trên 8.0.16–8.0.18, khi đó audit sẽ **dừng an toàn**
(false-positive) chứ không bỏ sót. Đây là cùng giả định đã có trong audit 52; cần xác nhận
`SELECT @@version` + thử trên staging.

---

## 3. F-03 — MEDIUM: mâu thuẫn `SKIP_DATA_PRECHECK_NO_TABLE`

**Trạng thái trước:** header `51_52_precheck_data.sql` nói SKIP ⇒ "do not run 52"; footer
`51_52_precheck.sql` nói SKIP ⇒ chỉ bỏ PART B. Trên DB trắng, làm theo header sẽ chặn 52 vĩnh viễn.

**Nguyên nhân:** hai tài liệu được viết ở hai thời điểm, không đối chiếu.

**File/vị trí:** `docs/phase-1/migrations/51_52_precheck_data.sql` (header),
`docs/phase-1/migrations/51_52_precheck.sql` (footer).

**Cách xử lý:** thay cả hai bằng **cùng một bảng mapping 4 nhánh**:
`DATA_PRECHECK_READY` → chạy PART B rồi 52; `SKIP_DATA_PRECHECK_NO_TABLE` → **chỉ** bỏ PART B,
**52 vẫn chạy** (tạo bảng đầy đủ); `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE` → dừng, không PART B,
không 52; bất kỳ `BLOCK_MIGRATION` từ PART B → dừng trước 52, phải sửa hết.

**Bằng chứng:** hai khối văn bản trong 2 file hiện giống nhau về ngữ nghĩa (đã đọc lại sau sửa).

**Trạng thái sau:** **FIXED**.

**Chưa xác minh:** không cần runtime — đây là tài liệu hướng dẫn.

---

## 4. F-04 — MEDIUM: schema cố định + quyền chưa xác minh

**Trạng thái trước:** 51/52 hard-code `USE mems_people_db`; nếu sai schema, lỗi xuất hiện muộn/khó
hiểu; quyền (`CREATE ROUTINE`, `CREATE TEMPORARY TABLES`, `INDEX`, `REFERENCES`…) chưa được kiểm;
thiếu quyền có thể làm 52 fail **sau** khi 5a đã commit DML.

**Nguyên nhân:** không có guard schema và không có bước kiểm quyền trước khi chạy.

**File/vị trí:**
- `51_people_curriculum.sql`: `mems_m51_assert_database` (mới).
- `52_people_class_subject.sql`: `mems_m52_assert_database` (mới) + `CALL` ở mục `-- 0)` trước audit;
  header bổ sung mục PRIVILEGES (UNVERIFIED).
- `51_52_precheck.sql`: §0j (mới) — in `DATABASE()`, `VERSION()`, `CURRENT_USER()` và bảng 12 quyền
  từ `information_schema.user_privileges` / `schema_privileges` (chỉ đọc; GRANTEE dựng từ
  `CURRENT_USER()`; ghi rõ quyền qua ROLE có thể không hiển thị).

**Cách xử lý:** guard dừng ngay nếu `DATABASE()` NULL hoặc khác `mems_people_db`; §0j là chẩn đoán
(indicative), hướng dẫn đối chiếu `SHOW GRANTS FOR CURRENT_USER()`. Không thay đổi cấu hình, không
yêu cầu/không dùng credential.

**Bằng chứng:** procedure + `CALL` hiện diện (đã đọc), delimiter balance 52 = 7/7/1.

**Trạng thái sau:** **FIXED (static)**.

**Chưa xác minh:** **UNVERIFIED** — quyền thực tế và version server đích chưa kiểm (không kết nối DB).
Đặc biệt `CREATE TEMPORARY TABLES` (5b) và `CREATE/ALTER ROUTINE` chưa được chứng minh.

---

## 5. F-05 — LOW: xoá curriculum có thể gặp MySQL 1451

**Trạng thái trước:** `fk_csp_subject` CASCADE trong khi `fk_csp_prerequisite` RESTRICT; hard delete
`curriculum` có thể bị chặn giữa cascade vì InnoDB không bảo đảm thứ tự xoá cạnh prerequisite.

**Nguyên nhân:** hai FK có rule khác nhau trên cùng bảng nối; không có tài liệu vận hành.

**File/vị trí:** `docs/phase-1/migrations/51_people_curriculum.sql` (comment trong DDL
`curriculum_subject_prerequisite`); `docs/phase-1/database-schema.md` §3.2.1 (bullet mới).

**Cách xử lý:** ghi rõ nghiệp vụ dùng `is_active = 0` (BR-CUR-17); nếu buộc hard delete, xoá toàn bộ
`curriculum_subject_prerequisite` của curriculum đó **trước** `curriculum_subject`/`curriculum`
trong cùng transaction. Không đổi FK (giữ nguyên thiết kế D-07).

**Bằng chứng:** comment + bullet tài liệu đã có; không đổi DDL.

**Trạng thái sau:** **FIXED (doc)**.

**Chưa xác minh:** hành vi cascade thực tế trên MySQL (thứ tự và mã lỗi) — cần test trên staging.

---

## 6. F-06 — LOW: rollback §8 thiếu index hỗ trợ FK của 51

**Trạng thái trước:** `ROLLBACK.md` §8 chỉ liệt kê index do FK của 52 sinh ra; thiếu
`school_class (curriculum_id, org_id)` do `fk_school_class_curriculum` (51), và index của 3 bảng
curriculum; sau bước 7.7 index `school_class` có thể còn dạng `(org_id)`.

**Nguyên nhân:** §8 được viết cho phạm vi 52, chưa cập nhật khi 51 thêm cột/FK.

**File/vị trí:** `docs/phase-1/migrations/ROLLBACK.md` §8.

**Cách xử lý:** thêm 3 dòng vào bảng index (`curriculum_subject`, `curriculum_subject_prerequisite`,
`school_class`), ghi chú rõ index nào do InnoDB tạo và vì sao (không có left-prefix phù hợp); thêm
khối F-06 hướng dẫn drop `fk_school_class_curriculum` nếu còn index 1 cột `(org_id)` sau 7.7; mở
rộng query liệt kê index cho `school_class`.

**Bằng chứng:** bảng + query + khối SQL đã đọc lại; khớp thứ tự drop §7.

**Trạng thái sau:** **FIXED (doc)**.

**Chưa xác minh:** tên/việc InnoDB tự tạo index chỉ được xác nhận bằng `SHOW INDEX` trên MySQL thật.

---

## 7. Kiểm tra sau sửa

| Kiểm tra | Kết quả |
|---|---|
| `git diff --check` | pass (chỉ warning LF→CRLF của Git) |
| Delimiter/procedure balance | 51: 7 `CREATE PROCEDURE` / 7 `END$` / 1 `DELIMITER $`; 52: 7/7/1 |
| Toàn bộ vị trí chuẩn hoá CHECK | 7 vị trí so khớp + 4 generated + 1 chẩn đoán postcheck đều có `CHAR(92)` |
| Expected string vs DDL | đã đối chiếu 5 CHECK class_subject, 2 teacher, 3 history, 2 curriculum_subject, 1 csp |
| Mô phỏng chuẩn hoá | Node offline, escaped/unescaped/LF/generated: ALL PASS (không phải MySQL) |
| Phạm vi file | 8 file docs/SQL (xem §8); không có Java/React/.env |
| Migration/rollback/DDL/DML | **KHÔNG chạy** |
| MySQL runtime | **NOT EXECUTED** |

**Kiểm tra chưa thực hiện (và lý do):**

1. Chạy `51_52_precheck.sql`, `precheck_data`, 51, 52, postcheck trên MySQL thật — không có môi
   trường staging được xác nhận; luật an toàn của task cấm kết nối DB.
2. `SHOW GRANTS`, `SELECT @@version` — chưa kết nối.
3. Xác nhận dạng `check_clause` thực tế (`\'`) — chỉ mô phỏng offline.
4. Kiểm index hỗ trợ FK do InnoDB tạo (whitelist đã tính, chưa thấy thực tế).
5. `column_type` display width trên 8.0.16–8.0.18 (xem §2 "Chưa xác minh").
6. 2 test H2 time-bomb (`OutboxEventRepositoryTest`, `DelegationExpiryTest`) — ngoài WP1, không sửa.

---

## 8. Git & phạm vi thay đổi

| Hạng mục | Giá trị |
|---|---|
| Branch | `fixFlowCreateEmployee` |
| HEAD kỳ vọng (đề bài) | `4d7cac94748393227223891b868bbfeff408b8da` |
| HEAD lúc bắt đầu Revision 4 | `ccd73fe09afbd3b01b36798138255929cd94ba2a` (chỉ thêm report gốc; forward-only) |
| HEAD lúc kết thúc Revision 4 | `7c52b52b6929a7c7bf7d389c55cee94b2753c201` (commit ngoài phiên: thêm `frontend-audit-report.md` + một phần F-01 trong precheck) |
| Commit do Revision 4 tạo | **Không** |

File thay đổi trong working tree (so với `7c52b52`):

| File | Nội dung |
|---|---|
| `docs/phase-1/migrations/51_52_precheck.sql` | 0f + footer F-03; §0i/§0j F-04; header F-01 |
| `docs/phase-1/migrations/51_52_precheck_data.sql` | header F-03 |
| `docs/phase-1/migrations/51_52_postcheck.sql` | §5e chẩn đoán F-01 |
| `docs/phase-1/migrations/51_people_curriculum.sql` | assert procedures F-02/F-04; F-05 comment; header |
| `docs/phase-1/migrations/52_people_class_subject.sql` | F-01 (3 CHECK + generated expression); assert_database F-04; header quyền |
| `docs/phase-1/migrations/ROLLBACK.md` | F-06 |
| `docs/phase-1/database-schema.md` | F-02/F-04/F-05 |
| `docs/phase-1/staging-validation-report.md` | Revision 4 (§14) |

Không có thay đổi ngoài phạm vi. `frontend-audit-report.md` đến từ commit ngoài phiên, không sửa.

---

## 9. Gate

**`READY FOR FINAL STATIC REVIEW`** — các finding trong phạm vi F-01…F-06 đã được xử lý với bằng
chứng static (và mô phỏng offline cho F-01). **Không** `APPROVED`: staging chưa xác thực; quyền DB,
version server và hành vi MySQL vẫn **UNVERIFIED** cho tới khi chạy trên môi trường độc lập.
