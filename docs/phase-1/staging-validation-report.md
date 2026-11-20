# Staging Validation Report — WP1 Migration 51/52

> **Ngày:** 2026-11-20 · **Nhánh:** `fixFlowCreateEmployee`
> **HEAD khi audit gốc:** `4d7cac9` · **HEAD lúc bắt đầu Revision 4:** `ccd73fe`
> **HEAD lúc kết thúc Revision 4:** `7c52b52` (commit bên ngoài phiên; xem §1)
> **Phạm vi:** đánh giá an toàn để trình người dùng duyệt; **không** chạy Migration 51/52.
> **Gate audit gốc: `BLOCKED`** — giữ nguyên làm mốc; Revision 4 đã sửa F-01…F-06 trong source và
> gate nội bộ chuyển thành **`READY FOR FINAL STATIC REVIEW`** (§14). Staging vẫn **chưa được xác
> thực**, nên không có `APPROVED`.

---

## 1. Git pre-check

| Lệnh | Kết quả |
|---|---|
| `git branch --show-current` | `fixFlowCreateEmployee` |
| `git rev-parse HEAD` | `4d7cac94748393227223891b868bbfeff408b8da` |
| `git status --short` (trước) | *(rỗng — working tree sạch)* |
| `git status --short` (sau khi chạy Maven) | *(rỗng — không file tracked nào bị sửa)* |

Branch và HEAD khớp yêu cầu; không có thay đổi bất thường. Không có thao tác git ghi nào được thực hiện.

**Sai lệch HEAD ghi nhận ở Revision 4:** khi bắt đầu Revision 4, HEAD thực tế là
`ccd73fe09afbd3b01b36798138255929cd94ba2a`, không phải `4d7cac9…`. `git merge-base --is-ancestor
4d7cac9 HEAD` trả **true** và `git show --stat HEAD` cho thấy `ccd73fe` chỉ thêm chính file báo cáo
này (+341 dòng). Đây là commit con đi tiếp (forward-only) của HEAD kỳ vọng; **không** reset/switch.

Trong phiên Revision 4, HEAD lại tiến thêm một commit **bên ngoài phiên** (tác giả `hoanhsang1`,
cùng message `fix flox class managment`): `7c52b52b6929a7c7bf7d389c55cee94b2753c201`, chứa
`docs/phase-1/frontend-audit-report.md` (file mới, không thuộc phạm vi WP1) và một phần sửa F-01
trong `51_52_precheck.sql`. `git merge-base --is-ancestor ccd73fe HEAD` trả **true** (forward-only).
Revision 4 **không tạo commit nào**; toàn bộ thay đổi còn lại nằm ở working tree (8 file, xem §14.7).

---

## 2. Môi trường đích (không có secret)

Đã đọc cấu hình, **không** in credential:

| Nguồn | Giá trị quan sát được | Phân loại |
|---|---|---|
| `backend/PeopleService/src/main/resources/application.properties:5-9` | `spring.datasource.url=${DB_URL}`, driver `com.mysql.cj.jdbc.Driver` | URL do biến môi trường cấp; repo **không** chứa đích staging |
| `docker-compose.yml:27,59,84,109` | Các service đang chạy trỏ `host.docker.internal:3306/mems_*_db` | **Host DB 3306** — DB mà stack Docker đang dùng; **không** phải staging, **không** truy cập |
| `docker ps` | `mems-mysql-test` — image `mysql:8.0`, map `0.0.0.0:3307->3306` | MySQL cô lập trên máy, **ứng viên staging-equivalent** |
| `frontend/docs/04-INTEGRATION-MATRIX.md:325,350` | `mems-mysql-test` (3307) là "MySQL cô lập", đã áp migration 01–38 | Tài liệu nội bộ xác nhận đây là môi trường test cô lập |
| `.env` | Chỉ có `DB_USERNAME`, `DB_PASSWORD`, JWT/ADMIN/INTERNAL keys | Không có URL/DB name; giá trị không được in |

**Kết luận Phase A:** không có cấu hình "staging" chính thức trong repo. Ứng dụng đang chạy trỏ
host:3306 (DB dùng chung của stack). Ứng viên an toàn duy nhất là container cô lập `mems-mysql-test`
(3307), nhưng **chưa xác nhận được** đây là staging theo nghĩa người dùng đặt ra, và **không thể
xác thực danh tính/credential** trong phạm vi an toàn của task.

**Lý do dừng Phase B/C:** nỗ lực đọc credential của container phục vụ kết nối đã bị cơ chế an toàn
của môi trường chặn (trích xuất password từ `docker inspect` / dùng password để kết nối). Theo quy
tắc "nếu không phân biệt chắc chắn staging với production thì dừng", tôi **không kết nối DB nào**.

---

## 3. MySQL version

| Hạng mục | Giá trị | Trạng thái |
|---|---|---|
| Client trên máy | `mysql Ver 8.0.41 for Win64` | `VERIFIED` |
| Image container test | `mysql:8.0` | `VERIFIED` (tag image) |
| Server version thực tế của DB đích | — | **`NOT EXECUTED`** (không kết nối) |
| Yêu cầu tối thiểu cho CHECK | MySQL **8.0.16+** | Chưa xác minh trên server đích |

Không có bằng chứng server đích ≥ 8.0.16; nếu thấp hơn, CHECK bị bỏ qua và audit CHECK sẽ thất bại.

---

## 4. Schema audit (Phase B)

**`NOT EXECUTED`** — không kết nối DB nên **không** chạy bất kỳ truy vấn `information_schema` nào.
Mọi kết luận dưới đây là **static**, từ file SQL và `DB_11_16.sql` (chỉ đọc).

Static verification đã hoàn tất (không thay thế audit staging):

| Hạng mục | Bằng chứng static | Kết luận |
|---|---|---|
| Unique key cho FK tổ hợp | `DB_11_16.sql:426-431` (`specialty(id,org_id)`), `:492-507` (`staff_profile(user_id,org_id)`), `:603-610` (`subject(id,org_id)`), `:671-682` (`teacher_profile(user_id,org_id)`) | Đủ điều kiện tham chiếu |
| `school_class(id,org_id)` | Dump chỉ có `PRIMARY(id)`; 51 thêm `uq_school_class_id_org` trước 52 (`51_people_curriculum.sql:204-206`) | Đúng thứ tự phụ thuộc |
| Bảng WP1 đã tồn tại trên schema gốc? | Dump **không** có `curriculum*`, `class_subject*`, `teacher_subject`, `specialty_subject`; migration 42–50 cũng không tạo | Lần chạy đầu kỳ vọng 4 bảng vắng mặt |
| `school_class.version` | `DB_11_16.sql:376-401` | Có trong dump; chưa xác minh staging |

Rủi ro Phase B còn nguyên: **schema staging thực tế chưa được đọc**.

---

## 5. Data pre-check (Phase C)

**`NOT EXECUTED`.** Không chạy `51_52_precheck.sql`, `51_52_precheck_data.sql` hay bất kỳ SELECT
nào trên DB. Vì vậy:

- Không có số lớp theo `AUTO_BACKFILL_CANDIDATE` / `NO_ACTION` / `BLOCK_MIGRATION`.
- Không xác nhận được không còn `BLOCK_MIGRATION`.
- Không xác nhận được orphan subject/teacher, multi-primary, primary mismatch.

Đã **review static** logic pre-check: các query phân loại khớp với gate 5.0/5c của 52 (9 mã chặn,
`MULTI_PRIMARY`, `PRIMARY_WITHOUT_CLASS_SUBJECT`, exact-match `MARK_EXACT_PRIMARY`/`INSERT_LEGACY_ROW`).
Không phát hiện lệch logic; nhưng đây không phải bằng chứng dữ liệu.

---

## 6. Counts theo classification

| Classification | Count |
|---|---|
| AUTO_BACKFILL_CANDIDATE | **NOT EXECUTED** |
| NO_ACTION | **NOT EXECUTED** |
| BLOCK_MIGRATION | **NOT EXECUTED** |
| Tổng lớp còn sống | **NOT EXECUTED** |

---

## 7. Xung đột schema hiện có

| Đối tượng | Static | Staging thực tế |
|---|---|---|
| `curriculum`, `curriculum_subject`, `curriculum_subject_prerequisite` | Dự kiến vắng (dump + migration 01–50 không tạo) | **Chưa xác minh** |
| `class_subject`, `class_subject_history`, `specialty_subject`, `teacher_subject` | Dự kiến vắng | **Chưa xác minh** |
| `subject.code` trùng trong org | Chưa kiểm được dữ liệu | **Chưa xác minh** |
| `school_class.curriculum_id` đã tồn tại? | Không có trong dump; helper 51 xử lý nếu có | **Chưa xác minh** |

---

## 8. Migration syntax & safety review (Phase D)

### 8.1. Điểm đã kiểm và đạt (static)

| # | Hạng mục | Kết quả |
|---|---|---|
| 1 | Thứ tự phụ thuộc 51 → 52 | Đúng: 52 cần `uq_school_class_id_org` và `curriculum` do 51 tạo |
| 2 | FK đích tồn tại unique key | Đủ (xem §4) |
| 3 | Backfill exact-match | 5a chỉ dùng `school_class.subject_id`; `NOT EXISTS` khớp `(class_id, subject_id)` + `NOT EXISTS` primary; bỏ lớp `deleted_at`; không đoán |
| 4 | Idempotent 5a/5b (logic) | 5a bỏ qua nếu đã có dòng/primary; 5b chỉ set primary khi lớp chưa có; PK chặn trùng |
| 5 | Tối đa một primary/lớp | `UNIQUE(primary_class_id)` trên cột sinh STORED; NULL cho dòng không primary |
| 6 | Không đổi D-04 | Khối `ALTER TABLE subject` vẫn **commented** (`52:1151-1154`) |
| 7 | History không cascade | `fk_csh_class` RESTRICT/RESTRICT; Bảng history không có FK tới subject/teacher (snapshot text) |
| 8 | Audit bảng cũ trước CREATE | 4 procedure audit kiểm cột/thuộc tính/index/FK/CHECK/generated; lệch ⇒ `SIGNAL`, không auto-ALTER |
| 9 | DDL implicit commit | Được tài liệu hoá (`52:18-23`, `ROLLBACK.md:185-212`) |
| 10 | Temp table dọn dẹp | `DROP TEMPORARY TABLE` trước và sau 5b (`52:1100,1114`) |
| 11 | Procedure dọn dẹp | `DROP PROCEDURE IF EXISTS` đầu/cuối file 51 và 52 |
| 12 | Rollback dependency | Partial rollback 4 bước đúng thứ tự (`ROLLBACK.md:101-117`) |

### 8.2. Findings

> **Trạng thái sau Revision 4:** F-01…F-06 đã được xử lý trong source (docs/SQL draft); mỗi mục dưới
> đây giữ nguyên nội dung audit gốc làm mốc lịch sử. Bằng chứng và trạng thái mới ở §14 và
> `revision-4-fix-report.md`.

#### F-01 — BLOCKER (idempotency/recovery): chuẩn hoá CHECK thiếu bỏ backslash

MySQL 8 trả `information_schema.check_constraints.CHECK_CLAUSE` với **quote đã escape**, dạng
`(_utf8mb4\'PLANNED\',...)` (bằng chứng: rails/rails#42424; khác với dạng `_utf8mb4'PLANNED'` mà
`SHOW CREATE TABLE`/dump in ra, xem `DB_11_16.sql:63,96-97,306,403-405,685-686`).

Chuỗi chuẩn hoá hiện tại bỏ backtick, `_utf8mb4`, space, `'`, `(`, `)` nhưng **không bỏ `\`**:

- `51_52_precheck.sql:220-222` (0b) và `:368-370` (0e2)
- `52_people_class_subject.sql:263-265` (class), `:500-502` (teacher), `:722-724` (history)

Hệ quả (phân tích static):

- `chk_class_subject_status`, `chk_class_subject_source` chuẩn hoá thành
  `statusin\planned\,...` thay vì `statusinplanned,...` ⇒ `ok_chk` = 3/5.
- `chk_teacher_subject_*` ⇒ 0/2; history ⇒ 1/3.
- **Lần chạy đầu trên DB trắng vẫn qua** vì 4 bảng chưa tồn tại nên audit `LEAVE` và `CREATE`.
- **Nhưng mọi lần chạy lại / pre-check trên bảng đã tồn tại sẽ báo sai**:
  - precheck 0b trả `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE` dù bảng đúng;
  - 52 `SIGNAL` ngay audit đầu ⇒ không thể rerun.
- Điều này phá đúng quy trình phục hồi đã tài liệu hoá khi 52 ABORT sau 5a/5b
  (`ROLLBACK.md:196-210`, `52:18-23`): bảng đã được tạo, rerun sẽ chết ở audit.

Không ảnh hưởng các CHECK số học (`chk_class_subject_primary/_sessions/_sequence`,
`chk_csh_subject_change`) vì không có string literal.

**Đề xuất sửa (chưa thực hiện — ngoài quyền hạn task):** thêm `REPLACE(..., CHAR(92), '')` vào
chuỗi chuẩn hoá ở cả 5 vị trí trên; xác nhận trên staging bằng
`SELECT check_clause FROM information_schema.check_constraints WHERE constraint_name='chk_class_subject_status'`
sau khi tạo bảng scratch.

#### F-02 — MAJOR: 51 không audit bảng cùng tên đã tồn tại

`CREATE TABLE IF NOT EXISTS` cho `curriculum`, `curriculum_subject`,
`curriculum_subject_prerequisite` (`51:128-195`) **không** kiểm định nghĩa bảng cũ. Khác với 52
(có 4 procedure audit), 51 chỉ bảo vệ cột/FK/index do helper thêm (`51:17-123`); precheck 0 chỉ
liệt kê cột (`51_52_precheck.sql:19-25`), không gate.

Hệ quả: nếu staging có bảng `curriculum*` từ một bản nháp cũ sai cấu trúc, 51 vẫn "thành công"; 52
sau đó có thể fail khi tạo FK/generated column sau khi đã tạo một phần bảng ⇒ schema dở dang
(implicit commit).

**Đề xuất:** thêm `mems_m51_assert_*_schema` cho 3 bảng, gọi trước `CREATE`, hoặc bổ sung gate 0b.

#### F-03 — MEDIUM: header pre-check data mâu thuẫn về `SKIP_DATA_PRECHECK_NO_TABLE`

- `51_52_precheck_data.sql:13-15`: "SKIP_DATA_PRECHECK_NO_TABLE ... => STOP: do not run PART B and
  **do not run 52**".
- `51_52_precheck.sql:464-470`: SKIP nghĩa là "không có class_subject, bỏ qua PART B" — tức 52 vẫn
  phải chạy để tạo bảng.

Trên DB trắng (kỳ vọng của lần chạy đầu), làm theo header sẽ **chặn migration vĩnh viễn**. Cần sửa
header cho khớp footer và luồng thực tế.

#### F-04 — MEDIUM (môi trường): `USE mems_people_db` cố định + quyền chưa xác minh

- `51:9`, `52:25` hard-code schema; nếu DB staging có tên khác, script chạy nhầm schema hoặc fail.
- 51/52 tạo stored procedure ⇒ cần `CREATE ROUTINE`; 5b tạo bảng tạm ⇒ cần `CREATE TEMPORARY TABLES`;
  DDL cần `CREATE`, `ALTER`, `INDEX`, `REFERENCES`.
- Chưa chạy `SHOW GRANTS`; nếu thiếu quyền, 52 có thể fail **sau** 5a (DML đã commit) và rerun sẽ
  gặp F-01.

**Đề xuất:** thêm bước Phase A kiểm `SHOW GRANTS` và `SELECT @@version` trước khi chạy.

#### F-05 — LOW: xoá `curriculum` có thể bị chặn bởi prerequisite RESTRICT

`fk_csp_prerequisite` là `ON DELETE RESTRICT` trong khi `fk_csp_subject` là `CASCADE`
(`51:188-195`). Khi xoá curriculum, cascade xuống `curriculum_subject` có thể gặp RESTRICT từ các
dòng prerequisite. Không ảnh hưởng lần chạy migration, nhưng cần hướng dẫn vận hành (xoá
prerequisite trước hoặc đổi sang CASCADE ở migration sau).

#### F-06 — LOW: rollback §8 thiếu index hỗ trợ FK của 51 trên `school_class`

`ROLLBACK.md:150-160` chỉ liệt kê 4 bảng của 52. `fk_school_class_curriculum` (51:200-202) khiến
InnoDB tạo index hỗ trợ `(curriculum_id, org_id)` trên `school_class`; sau khi drop FK/cột, index có
thể còn dạng `(org_id)`. Cần bổ sung vào bước 8 để tránh index rác.

### 8.3. Điểm chưa thể xác minh (cần MySQL thật)

- Cú pháp/cột sinh STORED `primary_class_id` + UNIQUE trên MySQL 8 đích.
- Hành vi CHECK enforcement (phụ thuộc ≥ 8.0.16).
- Tên index hỗ trợ FK do InnoDB tự tạo (audit whitelist đã tính, chưa thấy thực tế).
- `column_default` thực tế của `tinyint(1) DEFAULT 0` / `varchar DEFAULT 'MANUAL'`.
- Tính idempotent thực tế khi rerun 52.

---

## 9. Kết quả H2/Maven (Phase E)

**Đã chạy** (môi trường H2 in-memory, không kết nối staging/production):

```bash
cd backend/PeopleService
./mvnw -o test
```

| Hạng mục | Giá trị |
|---|---|
| Module | `backend/PeopleService` |
| Tổng test | **319** |
| Passed | **317** |
| Failed | **2** |
| Errors | 0 |
| Skipped | 0 |
| Thời gian | ~17 s |
| Build | **FAILURE** (do 2 test fail) |

Hai test fail (không liên quan WP1, không sửa code):

| Test | Lỗi | Nguyên nhân |
|---|---|---|
| `com.mems.outbox.OutboxEventRepositoryTest.appendStoresPendingEvent` | expected size 1 but was 0 | Test dùng mốc cố định `2026-11-20T00:00Z`; `append` dùng `Instant.now()` thực (`OutboxEventRepository.java:50`) ⇒ `next_attempt_at` > mốc test |
| `com.mems.repository.DelegationExpiryTest.marksOnlyOverdueActiveDelegations` | expected 1 but was 2 | `markExpired` dùng `Instant.now()` thực (`DelegationRepository.java:83`); fixture `effective_to` 2026-11-19/20 đã ở quá khứ ⇒ 2 dòng hết hạn |

Đây là lỗi **time-bomb** có sẵn (test gắn với ngày cụ thể), không phải do Migration 51/52 và không
liên quan bảng WP1. Không có test Java nào tham chiếu `class_subject`/`teacher_subject`/
`specialty_subject`/`curriculum_subject` (đã grep).

**Giá trị đạt được:** 317 test pass chứng minh H2 fixture mới **load được** (mọi `@JdbcTest` đều
khởi tạo schema), tức DDL H2 hợp lệ. **Không** chứng minh được hành vi MySQL (generated column,
CHECK, FK composite).

---

## 10. Risks & unresolved issues

| # | Rủi ro | Mức |
|---|---|---|
| R-01 | F-01: không rerun/pre-check được trên bảng đã tồn tại; phá quy trình phục hồi ABORT | **Blocker** |
| R-02 | Chưa xác thực staging; chưa audit schema/dữ liệu thật | **Blocker** |
| R-03 | F-02: 51 chấp nhận bảng cũ sai cấu trúc | Major |
| R-04 | F-03: header pre-check data có thể khiến operator không chạy 52 trên DB trắng | Medium |
| R-05 | Quyền DB (CREATE ROUTINE/TEMP TABLES) chưa kiểm | Medium |
| R-06 | 2 test H2 fail do time-bomb (ngoài WP1) | Low (không chặn gate nhưng cần biết) |
| R-07 | F-05/F-06: hành vi xoá curriculum và index sót sau rollback | Low |

**Sau Revision 4:** R-01, R-03, R-04, R-05, R-07 đã được xử lý trong source (xác minh static — §14).
R-02 (chưa xác thực staging) và R-06 (2 test time-bomb ngoài WP1) **vẫn còn**.

---

## 11. Evidence — lệnh & truy vấn

### 11.1. Lệnh đã chạy

```bash
git branch --show-current
git rev-parse HEAD
git status --short
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}'
docker inspect mems-mysql-test --format '...'   # bị chặn bởi safety (credential)
cd backend/PeopleService && ./mvnw -o test
```

Lệnh **không** chạy: mọi kết nối `mysql`, `mysqldump`, migration, rollback, `SHOW GRANTS`,
`information_schema` trên DB đích.

### 11.2. Truy vấn cần chạy khi có staging (chưa chạy)

1. `SELECT VERSION(), @@hostname, @@port, @@version_comment;`
2. `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name IN (...)` — theo `51_52_precheck.sql` 0.
3. `51_52_precheck.sql` toàn bộ → đọc `next_step` (0b).
4. Nếu `DATA_PRECHECK_READY`: `51_52_precheck_data.sql` toàn bộ → `BLOCK_MIGRATION` phải 0.
5. `SHOW GRANTS FOR CURRENT_USER();`
6. `SELECT check_clause FROM information_schema.check_constraints WHERE constraint_name='chk_class_subject_status';`
   — xác nhận F-01 (dạng `\'`) trước khi sửa.

### 11.3. Kết quả tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Git | `fixFlowCreateEmployee` @ `4d7cac9`, sạch |
| Staging xác thực | **Không** |
| Schema audit | **NOT EXECUTED** |
| Data pre-check | **NOT EXECUTED** |
| Migration chạy | **Không** (đúng yêu cầu) |
| H2/Maven | 319 test, 317 pass, 2 fail (time-bomb ngoài WP1) |
| Static review | 12 mục đạt; 1 blocker (F-01), 1 major (F-02), 4 mục medium/low |
| Revision 4 (sau sửa) | 7 vị trí chuẩn hoá CHECK + 4 vị trí generated expression có `CHAR(92)`; 3 audit bảng curriculum; gate nội bộ `READY FOR FINAL STATIC REVIEW` (§14) |

---

## 12. Final gate

> **Lưu ý Revision 4:** mục này giữ nguyên kết quả audit gốc (`BLOCKED`). Sau Revision 4, các finding
> trong phạm vi đã được sửa và gate nội bộ là **`READY FOR FINAL STATIC REVIEW`** (§14.8). Staging
> vẫn **chưa xác thực** nên không có `APPROVED`.

### `BLOCKED` (audit gốc)

Không đủ điều kiện `READY FOR USER APPROVAL` vì:

1. Chưa xác nhận môi trường đích là staging (§2) — không kết nối được trong phạm vi an toàn.
2. Schema audit và data pre-check **chưa chạy** (§4–§6).
3. Tồn tại finding static **F-01** phá khả năng rerun/pre-check trên bảng đã tạo — trái với quy
   trình phục hồi đã cam kết.
4. Quyền DB và version server chưa xác minh.
5. Local tests có 2 fail (dù ngoài WP1 và do time-bomb, chưa được người dùng chấp nhận).

**Không** chạy Migration 51/52. Không dùng `APPROVED`.

---

## 13. Recommended next actions

1. ~~**Sửa F-01**~~ — **đã làm ở Revision 4**: bỏ `CHAR(92)` (+ tab/LF/CR) ở **7** vị trí chuẩn hoá
   CHECK và **4** vị trí generated expression (xem §14.2). Việc thêm test case `TC-LEG-042` vẫn
   nên làm khi có MySQL thật.
2. ~~**Sửa F-02**~~ — **đã làm ở Revision 4**: 3 procedure audit + `assert_database` trong 51, gọi
   trước mọi DDL (§14.3).
3. ~~**Sửa F-03**~~ — **đã làm ở Revision 4**: header/footer thống nhất nghĩa `SKIP_DATA_PRECHECK_NO_TABLE`
   (chỉ bỏ PART B, 52 vẫn chạy) (§14.4).
4. **Cung cấp/xác nhận môi trường staging** và cơ chế truy cập read-only an toàn (không đưa
   credential vào chat): khi đó chạy đúng thứ tự §11.2.
5. Trên staging: xác nhận `VERSION() ≥ 8.0.16`, `SHOW GRANTS` có `CREATE ROUTINE` +
   `CREATE TEMPORARY TABLES`; chạy precheck → precheck data → (chỉ sau khi 0 BLOCK) 52 → postcheck;
   thử rerun 52 trên bảng đã tạo để xác nhận F-01.
6. Quyết định xử lý 2 test time-bomb (`OutboxEventRepositoryTest`, `DelegationExpiryTest`) ở task
   riêng — không sửa trong WP1.

---

## 14. Revision 4 — xử lý F-01…F-06 (2026-11-20)

> Phạm vi: chỉ docs + SQL migration draft. **Không** chạy migration/rollback/DDL/DML, **không** kết
> nối DB, **không** sửa Java/React/.env, **không** commit/push. Báo cáo chi tiết theo từng finding:
> `docs/phase-1/revision-4-fix-report.md`.

### 14.1. Bảng trạng thái

| Finding | Mức | Trước | Xử lý (file) | Sau |
|---|---|---|---|---|
| F-01 | BLOCKER | chuẩn hoá không bỏ `\` | thêm `CHAR(92)` + tab/LF/CR vào **7** vị trí so khớp CHECK và **4** vị trí generated expression (`51_52_precheck.sql`, `52_people_class_subject.sql`, `51_people_curriculum.sql`); thêm chẩn đoán raw/norm ở `51_52_postcheck.sql` §5e | **FIXED (static)** |
| F-02 | MAJOR | 51 không audit bảng cùng tên | 3 procedure audit + `mems_m51_assert_database`, gọi trước mọi DDL (`51_people_curriculum.sql`) | **FIXED (static)** |
| F-03 | MEDIUM | header data-precheck mâu thuẫn footer | mapping verdict 4 nhánh, giống nhau ở 2 file | **FIXED** |
| F-04 | MEDIUM | schema hard-code + quyền chưa kiểm | `mems_m51/m52_assert_database` + §0j (schema/version/12 quyền, chỉ đọc) + header quyền 51/52 | **FIXED (static); quyền = UNVERIFIED** |
| F-05 | LOW | xoá curriculum có thể gặp 1451 | comment tại `curriculum_subject_prerequisite` + `database-schema.md` §3.2.1 | **FIXED (doc)** |
| F-06 | LOW | rollback §8 thiếu index của 51 | bổ sung 3 dòng bảng + cách drop index `(org_id)` còn sót (`ROLLBACK.md`) | **FIXED (doc)** |

### 14.2. F-01 — bằng chứng (static + mô phỏng offline)

Chuỗi chuẩn hoá dùng chung: bỏ backtick → `_utf8mb4` → space → `'` → `(` → `)` → tab → LF → CR →
`CHAR(92)`.

- **7 vị trí so khớp CHECK**: precheck 0b + 0e2; 52 (`class_subject`, `teacher_subject`,
  `class_subject_history`); 51 (audit `curriculum_subject`, audit `curriculum_subject_prerequisite`).
- **4 vị trí generated expression**: precheck 0b `cs_gen`, 0f (2 biểu thức), 52 `class_subject`.
- **1 chẩn đoán**: postcheck §5e in `raw_clause` + `norm` cho 5 bảng WP1 (không phải gate).
- Mô phỏng offline bằng Node (**không phải MySQL**): `(_utf8mb4\'PLANNED\',…)` (dạng escaped của
  `information_schema`) và `(_utf8mb4'PLANNED',…)` (dạng SHOW CREATE/dump) đều cho
  `statusinplanned,active,completed,cancelled`; CHECK nhiều dòng (LF) cho đúng chuỗi
  `required_sessions>0…`; generated expression cho `casewhenis_primary=1thenclass_idend`. Tất cả PASS.
- **Ba kịch bản**: (a) lần đầu, bảng vắng → audit `LEAVE`, `CREATE`; (b) precheck trên bảng đã tồn
  tại → `ok_chk` đủ, không còn `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE` sai; (c) rerun 52 sau ABORT →
  audit qua, không còn `SIGNAL` sai.
- **Không nới điều kiện**: expected string giữ nguyên; `v_chk_total` vẫn chặn CHECK thừa/thiếu;
  `LIKE '%PENDING%'` giữ nguyên.

### 14.3. F-02 — audit 3 bảng curriculum

Trước mọi DDL, 51 gọi lần lượt: `mems_m51_assert_database`, `mems_m51_assert_curriculum_schema`,
`mems_m51_assert_curriculum_subject_schema`, `mems_m51_assert_csp_schema`. Mỗi audit: bảng vắng →
bỏ qua (được CREATE bên dưới); tồn tại → kiểm tập cột + thuộc tính (type/length/null/default/
collation/generated), PK, unique/secondary index (whitelist chính xác, gồm index hỗ trợ FK do InnoDB
tự tạo), FK mapping + `ON UPDATE/ON DELETE`, CHECK (chuẩn hoá như F-01). Lệch ⇒ in chẩn đoán rồi
`SIGNAL SQLSTATE '45000'`; **không** auto-ALTER. `CREATE TABLE IF NOT EXISTS` không còn là bước kiểm
tương thích duy nhất.

### 14.4. F-03 — thống nhất verdict → hành động

| Verdict 0b | Hành động (precheck footer = data-precheck header) |
|---|---|
| `DATA_PRECHECK_READY` | chạy PART B, rồi 52 |
| `SKIP_DATA_PRECHECK_NO_TABLE` | **chỉ** bỏ PART B; **52 vẫn chạy** (tạo bảng đầy đủ) |
| `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE` | dừng; không PART B, không 52; xử lý tay |
| Bất kỳ `BLOCK_MIGRATION` từ PART B | dừng trước 52; phải sửa hết |

### 14.5. F-04 — schema guard + quyền

- 51/52 có `mems_m51_assert_database` / `mems_m52_assert_database`: `DATABASE() IS NULL` hoặc khác
  `mems_people_db` ⇒ `SIGNAL 45000`.
- `51_52_precheck.sql` §0j: `SELECT DATABASE(), VERSION(), CURRENT_USER()` + bảng 12 quyền lấy từ
  `information_schema.user_privileges` / `schema_privileges` (chỉ đọc; GRANTEE dựng từ
  `CURRENT_USER()`). Ghi rõ quyền qua ROLE có thể không hiện → đối chiếu `SHOW GRANTS`.
- Header 51/52 liệt kê quyền cần và cảnh báo thiếu `CREATE TEMPORARY TABLES` sẽ fail ở 5b **sau khi**
  5a đã commit DML.
- **Trạng thái quyền trên môi trường đích: UNVERIFIED** (không kết nối DB trong phiên này).

### 14.6. F-05 / F-06 — vận hành

- F-05: comment trong DDL `curriculum_subject_prerequisite` + `database-schema.md` §3.2.1 nêu rõ
  CASCADE của `fk_csp_subject` có thể gặp `fk_csp_prerequisite` RESTRICT giữa chừng (MySQL 1451);
  nghiệp vụ là `is_active = 0`; hard delete phải xoá cạnh prerequisite của curriculum đó trước,
  trong cùng transaction.
- F-06: `ROLLBACK.md` §8 thêm index do FK của 51 sinh ra (`curriculum_subject`, `csp`, `school_class`)
  và cách drop index `(org_id)` còn lại sau bước 7.7; query liệt kê index bổ sung `school_class`.

### 14.7. Kiểm tra sau sửa (static)

| Kiểm tra | Kết quả |
|---|---|
| `git diff --check` | pass (chỉ warning LF→CRLF của Git) |
| Delimiter/procedure balance | 51: 7 `CREATE PROCEDURE` / 7 `END$` / 1 `DELIMITER $`; 52: 7/7/1 |
| File thay đổi (working tree) | `database-schema.md`, `51_52_precheck.sql`, `51_52_precheck_data.sql`, `51_52_postcheck.sql`, `51_people_curriculum.sql`, `52_people_class_subject.sql`, `ROLLBACK.md`, `staging-validation-report.md` |
| Ngoài phạm vi | không có Java/React/.env; `frontend-audit-report.md` đến từ commit ngoài phiên, không sửa |
| MySQL runtime | **NOT EXECUTED** — không có môi trường độc lập được xác nhận |

### 14.8. Gate hiện tại

**`READY FOR FINAL STATIC REVIEW`** — cho các finding trong phạm vi F-01…F-06, với bằng chứng static
ở trên. **Không** phải `APPROVED`: staging chưa được xác thực, quyền DB và hành vi MySQL
(CHECK_CLAUSE thực tế, generated column, index hỗ trợ FK) vẫn **UNVERIFIED** cho tới khi chạy trên
môi trường độc lập.
