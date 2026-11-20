# Final WP1 — Resolution Report

> **Đầu vào:** `docs/phase-1/final-wp1-review-report.md` (1 BLOCKER, 7 MAJOR, 10 MEDIUM, 6 LOW).
> **Phạm vi lượt này:** chỉ cập nhật **tài liệu thiết kế**, **migration SQL draft**, **H2 test schema**
> và viết báo cáo. **Không** viết Java, **không** sửa React, **không** chạy migration, **không** kết
> nối DB, **không** sửa `.env`, **không** deploy, **không** commit/push/merge.
> **Gate cuối tài liệu:** đúng **một** trong hai — `READY FOR BACKEND IMPLEMENTATION` hoặc `BLOCKED`.

---

## 1. Trạng thái Git trước/sau

| Mốc | Giá trị |
|---|---|
| Branch | `fixFlowCreateEmployee` |
| HEAD ghi trong review report (baseline) | `be2b049` |
| HEAD hiện tại | `a3a4fac` (2026-11-20 16:18 +07, tác giả `hoanhsang1`) |
| Commit trong phiên này | **Không có** — agent không chạy `git commit`/`push`/`merge` |
| Thay đổi Frontend | Đã nằm trong commit `a3a4fac`; **không** bị sửa, reset, stash hay ghi đè trong lượt này |

**Thay đổi chưa commit tại thời điểm báo cáo** (chỉ tài liệu, sweep nhất quán cuối):

```
 M docs/phase-1/api-contract.md
 M docs/phase-1/database-schema.md
 M docs/phase-1/erd.md
 M docs/phase-1/implementation-roadmap.md
 M docs/phase-1/subject-business-requirements.md
 M docs/phase-1/validation-and-error-cases.md
?? docs/phase-1/final-wp1-resolution-report.md   (file báo cáo này, mới tạo)
```

`git diff --check -- docs/` → exit 0 (không có whitespace error). Các cảnh báo LF→CRLF là cấu hình
`core.autocrlf` của Windows, không phải lỗi nội dung.

---

## 2. Danh sách file đã thay đổi

### 2.1. Tài liệu thiết kế

| File | Nội dung thay đổi chính |
|---|---|
| `docs/phase-1/api-contract.md` | §1.1 gateway thực tế + WP1.6; §1.2 ngoại lệ phân trang 0-based; §2.2/§3.3 `active`; §3.8/§3.9 `expectedVersion`; §4.3–§4.6 mã lỗi 404/409 + `CLASS_NOT_EDITABLE`; §4.7 `PUT /classes/{id}` qua luồng history; §4.8 fingerprint + snapshot tên + `PRIMARY_REASON_TOO_LONG`; §4.9 0-based + tên snapshot; §7/§8/§9 đồng bộ |
| `docs/phase-1/validation-and-error-cases.md` | Bảng mã lỗi 3018/3054; `CLASS_NOT_EDITABLE` thay `CLASS_SUBJECT_LOCKED`; ma trận E-13/E-35/E-44…E-47; race fingerprint §6.3; AC-VAL-18/21…25; `ApiResponse` overload (F-MED-06); bỏ HEAD hash cứng |
| `docs/phase-1/role-permission-matrix.md` | F-MAJ-03 (không kế thừa quyền đọc Subject); F-MAJ-02 (áp curriculum cần cả `class.edit` + `curriculum.view`); AC-RBAC-12/13/14 |
| `docs/phase-1/curriculum-business-design.md` | F02/F03 `expectedVersion`; F04 `CLASS_NOT_EDITABLE`; F06 snapshot + fingerprint; BR-CUR-28/29/30; AC-CUR-06/13…16 |
| `docs/phase-1/subject-business-requirements.md` | D-15 bước 4.2 thêm `old_teacher_name`/`changed_by_name`/`request_fingerprint`; §3.16 bảng findings đã giải; bỏ `isActive`; ghi rõ sessions `NULL` khi không gửi |
| `docs/phase-1/database-schema.md` | Revision 5 history 19 cột; ghi chú SHA-256; dòng parity H2 `uq_subject_org_code` (D-04 active ở 52 step 7) |
| `docs/phase-1/erd.md` | `request_fingerprint`, tên snapshot; tên index thật `uq_csh_operation`, `idx_csh_class_time`, `idx_csh_new_subject` |
| `docs/phase-1/test-cases.md` | TC-CLS-027/031/035/041/044/049/050/051; TC-CUR-016/026/027; TC-RBAC-016/017; ma trận §10; ánh xạ §12 |
| `docs/phase-1/implementation-roadmap.md` | WP1.6 Gateway; WP2 item 5/7/8 (F-LOW-03/04, F-MAJ-03); WP3 backfill; WP4 `expectedVersion`; §5/§7/§8/§9 |
| `docs/phase-1/frontend-ui-plan.md` | Banner F-MAJ-06; thay toàn bộ từ vựng cũ; `PRIMARY_REASON_TOO_LONG`; I-01 đã chốt |
| `docs/phase-1/final-wp1-review-report.md` | Báo cáo đầu vào (giữ nguyên lịch sử) |

### 2.2. Migration draft

| File | Nội dung |
|---|---|
| `docs/phase-1/migrations/52_people_class_subject.sql` | DDL history 19 cột (`old_teacher_name`, `request_fingerprint CHAR(64) NOT NULL`, `changed_by_name`); audit đúng tập 19 cột + thuộc tính; **step 7 D-04 chủ động** thay index bằng UNIQUE `(org_id, code)` sau self-check trùng |
| `docs/phase-1/migrations/51_52_precheck.sql` | §0h đếm cột bảng phụ; §0h.1 liệt kê cột Revision-5 còn thiếu |
| `docs/phase-1/migrations/51_52_postcheck.sql` | §5b đúng 19 cột; §5b.1 nullability 3 cột mới; §5b.2 D-04 UNIQUE đúng cột |

### 2.3. H2 test schema

| File | Nội dung |
|---|---|
| `backend/PeopleService/src/test/resources/people-test-schema.sql` | 3 cột Revision-5 (`request_fingerprint VARCHAR(64)`, ghi rõ lệch CHAR(64) của MySQL); note D-04; note `primary_class_id` là cột thường + bất biến "tối thiểu một primary" do service bảo đảm |

Không có file Java, React, `.env`, cấu hình gateway hay production nào bị sửa.

---

## 3. Ánh xạ Finding → Quyết định → File

| Finding | Quyết định đã áp | File/vị trí chứng minh | Trạng thái |
|---|---|---|---|
| **F-BLK-01** idempotency không khả thi | `request_fingerprint CHAR(64) NOT NULL`; SHA-256 UTF-8 lowercase hex; payload 4 trường thứ tự cố định; NFC, không trim, null cố định, số chuẩn; cùng `operationId` + cùng fingerprint → kết quả cũ; khác → 409 `CLASS_SUBJECT_OPERATION_CONFLICT` (2240); ghi trong cùng transaction | `database-schema.md:358-368`; `erd.md:115-116,181`; `migrations/52:616-653,1176-1209`; `51_52_precheck.sql:433-446`; `51_52_postcheck.sql:98-118`; `people-test-schema.sql:208-218`; `api-contract.md §4.8` (641-658); `validation-and-error-cases.md §6.3`; `test-cases.md` TC-CLS-049/050/051 | **RESOLVED** |
| **F-MAJ-01** `REASON_TOO_LONG` trùng tên | Giữ `REASON_TOO_LONG (3018, ≤1000)` cho kết thúc/huỷ lớp; thêm **`PRIMARY_REASON_TOO_LONG (3054)`** cho `reason` > 500 ở đổi môn chính. Không tạo enum trùng tên | `validation-and-error-cases.md:179,219,275`; `api-contract.md:561,632,848`; `curriculum-business-design.md:384`; `database-schema.md:408-409`; `test-cases.md` TC-CLS-027; `frontend-ui-plan.md:664` | **RESOLVED** |
| **F-MAJ-02** quyền áp curriculum mâu thuẫn | Áp curriculum yêu cầu **đồng thời** `class.edit` + `curriculum.view` (scope ORGANIZATION) | `role-permission-matrix.md §4.4` + matrix; `api-contract.md §4.3`; `curriculum-business-design.md`; `validation-and-error-cases.md §3.4`; TC-RBAC-017 | **RESOLVED** |
| **F-MAJ-03** đọc Subject quá rộng | `GET /subjects`: OWNER hoặc `subject.view`/`subject.manage` ORGANIZATION; **không** kế thừa từ `class.view`/`class.create`/`student.view`/`class.assign_teacher`/`class.teacher.reassign`; ghi rõ là thay đổi hành vi | `role-permission-matrix.md:110,294`; `api-contract.md:78,909`; `implementation-roadmap.md` WP2 item 7; TC-RBAC-016 | **RESOLVED (thiết kế)** |
| **F-MAJ-04** `PUT /classes/{id}` phá hợp đồng | Giữ endpoint; `subjectId` không đổi → hành vi cũ; đổi → chạy **cùng luồng §4.8**, bắt buộc `reason` + `operationId`, `version` hiện có **là** `expectedVersion`, lệch → 409 `DATA_CHANGED (2212)`; nhánh thường vẫn `STATUS_CHANGED (2207)`; không có đường ghi vòng qua history | `api-contract.md §4.7` (515-541); `test-cases.md` TC-CLS-035/044; `validation-and-error-cases.md` | **RESOLVED (thiết kế)** |
| **F-MAJ-05** thiếu tên hiển thị | Snapshot `old_teacher_name`, `changed_by_name` (nullable, không FK, không join sống); thêm vào response §4.8/§4.9 | `database-schema.md:358-368,386-398`; `migrations/52:1185,1195`; `erd.md:115-116`; `api-contract.md §4.8` step 3 + response; TC-CLS-050 | **RESOLVED** |
| **F-MAJ-06** FE WIP lệch từ vựng | Chuẩn backend một tên/khái niệm: `ACTIVE`, `theorySessions`, `practiceSessions`, `sequenceNo`, `required`, `note`, `active`, `programCode`; banner handoff cho FE | `frontend-ui-plan.md:8-10`; `validation-and-error-cases.md:95-99`; `api-contract.md` §2/§3; DB `program_code` ↔ API `programCode` | **RESOLVED (tài liệu)** — FE WIP là việc của chủ dự án |
| **F-MAJ-07** version curriculum-subject | `expectedVersion` **bắt buộc** cho thêm/sửa/xoá dòng curriculum-subject; khoá `curriculum.version`; cùng transaction; lệch → 409 `DATA_CHANGED`; **không** thêm cột version cho bảng con | `api-contract.md:347-361`; `curriculum-business-design.md` F02/F03 + BR-CUR-29/30; `validation-and-error-cases.md` E-46/47; TC-CUR-026/027; `implementation-roadmap.md` WP4 | **RESOLVED (thiết kế)** |
| **F-MED-01** gateway thiếu `/api/curricula` | §1.1 mô tả đúng route hiện có; route mới thuộc **WP1.6**, không chặn gate | `api-contract.md:18-27`; `implementation-roadmap.md:107-119` | **RESOLVED (tài liệu)** — code gateway là việc WP1.6 |
| **F-MED-02** not-found trả 400 | `CURRICULUM_NOT_FOUND`/`SUBJECT_NOT_FOUND`/`TEACHER_NOT_FOUND` → **404** ở §4.3/§4.4/§4.5 | `api-contract.md:463,481,502,635` | **RESOLVED** |
| **F-MED-03** `SUBJECT_MISMATCH` 400 | Chốt **409** | `api-contract.md:479-480,500`; `validation-and-error-cases.md` | **RESOLVED** |
| **F-MED-04** `CLASS_SUBJECT_LOCKED` không tồn tại | Bỏ hẳn; điều kiện khoá dùng `CLASS_NOT_EDITABLE (2205)` | `validation-and-error-cases.md:200,253,369`; `curriculum-business-design.md:329,557`; `frontend-ui-plan.md:584`; 2 chỗ còn lại trong `api-contract.md` là ghi chú "không dùng" | **RESOLVED** |
| **F-MED-05** D-04 còn comment | Migration 52 **step 7** bật UNIQUE `(org_id, code)` có self-check trùng + idempotent index replace; postcheck §5b.2; H2 giữ UNIQUE; schema doc cập nhật đúng | `migrations/52:19,1211-1263`; `51_52_postcheck.sql:120-133`; `database-schema.md:1040`; `people-test-schema.sql:78-84` | **RESOLVED (draft)** — chưa chạy |
| **F-MED-06** tài liệu sai `ApiResponse` | Xác nhận `ApiResponse.java` **đã có** overload 3 tham số; sửa tài liệu | `validation-and-error-cases.md:301-303`; `ApiResponse.java:23,27` | **RESOLVED** |
| **F-MED-07** thiếu module guard | Ghi thành việc WP2/§4.3 (`STUDENT_MANAGEMENT` cho Subject + Curriculum) | `api-contract.md:193,384,568`; `implementation-roadmap.md` §8 | **RESOLVED (kế hoạch)** — code ở WP2 |
| **F-MED-08** `TEACHER_ASSIGNMENT` không có trong Identity | Đánh dấu **UNVERIFIED**, không phụ thuộc ở gate | `implementation-roadmap.md:360-361` | **RESOLVED (trung thực trạng thái)** |
| **F-MED-09** lệch chuẩn phân trang | Ghi rõ: curriculum 1-based, history 0-based (endpoint mới) | `api-contract.md:35,663`; `frontend-ui-plan.md:735`; TC/UI plan | **RESOLVED** |
| **F-MED-10** H2 không có generated column | Ghi rõ giới hạn; "tối thiểu một primary" do transaction + validation service; test H2 assert qua service | `people-test-schema.sql:176-183`; `database-schema.md:1037,1047`; `subject-business-requirements.md §3.15` | **RESOLVED** |
| **F-LOW-01** HEAD sai | Bỏ hash cứng khỏi tài liệu validation; không còn tuyên bố "HEAD = …" | `validation-and-error-cases.md:3-6,226` | **RESOLVED** |
| **F-LOW-02** mô tả gateway thiếu route | Liệt kê đúng route PeopleService hiện có | `api-contract.md:19-23` | **RESOLVED** |
| **F-LOW-03** `ACTIVE_REQUIRED` không có mã | Thành việc WP2: đổi key hoặc thêm mã + handler; test lại | `implementation-roadmap.md` WP2 item 8 | **RESOLVED (kế hoạch)** |
| **F-LOW-04** nhận diện trùng theo tên constraint | WP2: pre-check chủ động + map theo tên index, fallback `CONFLICT` chung | `implementation-roadmap.md` WP2 item 2/5 | **RESOLVED (kế hoạch)** |
| **F-LOW-05** backfill teacher_subject | Đã có thiết kế backfill + đối soát; WP3 item 7 | `teacher-subject-design.md §4`; `implementation-roadmap.md:161` | **RESOLVED (kế hoạch)** |
| **F-LOW-06** tên index ERD lệch | ERD dùng đúng tên `uq_csh_operation`, `idx_csh_class_time`, `idx_csh_new_subject` | `erd.md:181`; `database-schema.md:372-373` | **RESOLVED** |

---

## 4. Các mục đã giải quyết

1. **BLOCKER F-BLK-01** — Idempotency giờ khả thi: có cột lưu fingerprint, quy tắc chuẩn hoá rõ ràng,
   so khớp trước khi mở transaction, rollback toàn bộ khi lỗi. Đã đồng bộ ở 6 nơi: schema doc, ERD,
   migration 52 (DDL + audit), precheck, postcheck, H2, API contract, validation, test case.
2. **7/7 MAJOR** — mọi mâu thuẫn hợp đồng/quyền/version đã được chốt thành một luật duy nhất và
   phản ánh trong tài liệu + test case.
3. **10/10 MEDIUM** — sửa mã HTTP, bỏ mã lỗi không tồn tại, bật D-04 trong draft, sửa tài liệu
   `ApiResponse`, ghi rõ giới hạn H2, ghi rõ phạm vi gateway/WP1.6.
4. **6 LOW** — 3 mục sửa trực tiếp trong tài liệu (HEAD, gateway, tên index), 3 mục chuyển thành
   đầu việc WP2/WP3 có tiêu chí kiểm.
5. **Một tên một khái niệm** — không còn `isRequired`, `theoryHours`, `practiceHours`, `majorCode`,
   `IN_PROGRESS` (ngoài câu ghi chú "không dùng") trong tài liệu thiết kế.
6. **Không bịa default** — khi tạo dòng `class_subject` mới mà client không gửi
   `plannedSessions`/`sessionMinutes`, hai cột để `NULL` (đúng cột nullable); không tự đặt giá trị
   "mặc định của môn" vì `subject` không có cột đó.

---

## 5. Các mục chưa giải quyết / cần chủ dự án quyết định

Không còn BLOCKER/MAJOR trong thiết kế. Các việc dưới đây là **triển khai** hoặc **hành động của
chủ dự án**, không phải lỗ hổng tài liệu:

| # | Việc | Vì sao chưa làm | Ghi chú |
|---|---|---|---|
| U-01 | Cập nhật FE WIP theo F-MAJ-06 (`ACTIVE`, `theorySessions`, `practiceSessions`, `required`, `note`, `active`, `programCode`, bỏ `IN_PROGRESS`) | Lượt này bị cấm sửa React | Tài liệu đã có banner handoff; FE WIP đang nằm trong commit `a3a4fac` |
| U-02 | Thêm route gateway `/api/curricula/**` (+ route lớp–môn mới nếu thiếu) | Thuộc WP1.6; cấm sửa cấu hình | `implementation-roadmap.md` WP1.6 |
| U-03 | Thêm `ErrorCode` 2240 `CLASS_SUBJECT_OPERATION_CONFLICT`, 3054 `PRIMARY_REASON_TOO_LONG` | Không viết Java | Số 2222–2240/3043–3054 đã đối chiếu trống |
| U-04 | Sửa `ACTIVE_REQUIRED` / map `DuplicateKeyException` | Không viết Java | WP2 item 5, 8 |
| U-05 | Áp module guard `STUDENT_MANAGEMENT` cho Subject/Curriculum | Không viết Java | WP2 |
| U-06 | Đổi `@PreAuthorize` đọc Subject (F-MAJ-03) | Không viết Java | Thay đổi hành vi, cần test hồi quy |
| U-07 | Thêm `expectedVersion` cho curriculum-subject + dùng `version` lớp làm `expectedVersion` ở `PUT /classes/{id}` | Không viết Java | WP4/WP5 |
| U-08 | Chạy migration 51/52 trên MySQL staging | Cấm chạy migration/kết nối DB | Xem §6 |
| U-09 | Xác minh module `TEACHER_ASSIGNMENT` có trong Identity hay không | Ngoài phạm vi tài liệu; cần đọc/đối chiếu catalog runtime | Đang **UNVERIFIED**, không chặn gate |
| U-10 | Các báo cáo lịch sử (`review-report.md`, `wp0-readiness-report.md`, `wp1-readiness-report.md`, `staging-validation-report.md`, `fix-review-findings-report.md`) vẫn mô tả D-04 "commented" | Là ảnh chụp tại thời điểm cũ, không phải tài liệu thiết kế hiện hành | Báo cáo này và `database-schema.md` là nguồn hiện hành |
| U-11 | `PUT /subjects/{id}` vẫn chưa có optimistic lock | Được ghi rõ là **tuỳ chọn**, ngoài phạm vi Phase 1 | Không mâu thuẫn F-MAJ-07 (chỉ curriculum-subject) |

---

## 6. Các mục chưa kiểm chứng trên MySQL

Tất cả đều **UNVERIFIED** vì lượt này không kết nối DB:

1. Migration 51/52 chạy được trên MySQL 8.0.16+ thật (DDL ngầm commit; procedure/`SIGNAL`; `DELIMITER`).
2. `primary_class_id` generated STORED + UNIQUE tạo đúng và chặn 2 primary (chỉ H2 mô phỏng bằng cột
   thường do service set).
3. Bất biến "**tối thiểu một** primary khi `school_class.subject_id IS NOT NULL`" — DB không bảo đảm;
   phải nghiệm thu bằng test transaction/service (TC-CLS-047/048) trên staging.
4. D-04: precheck trùng mã = 0 **trước** khi apply; sau apply postcheck xác nhận UNIQUE
   `(org_id, code)` và nhiều `NULL` vẫn hợp lệ.
5. Bảng 16 cột Revision-3 cũ (nếu tồn tại) **không** tự nâng cấp — phải xử lý tay; 52 sẽ ABORT nếu
   lệch tập 19 cột.
6. Hành vi CHECK trên MySQL (so với H2 `BOOLEAN`), collation `utf8mb4_unicode_ci`, và việc index phụ
   có mặt đúng như audit `information_schema`.
7. Quyền DB của tài khoản chạy migration (DDL + `CREATE PROCEDURE`) — precheck chỉ đọc, không chứng
   minh quyền ghi.

---

## 7. Kết quả kiểm tra tĩnh

| Kiểm tra | Lệnh/Phương pháp | Kết quả |
|---|---|---|
| Whitespace/lỗi diff | `git diff --check -- docs/` | **PASS** (exit 0) |
| Từ vựng cũ `isRequired`/`theoryHours`/`practiceHours`/`majorCode` | `grep -rn` trên `docs/phase-1` | **PASS** — 0 dòng ngoài câu ghi chú "không dùng" |
| `IN_PROGRESS` dùng làm trạng thái môn | `grep -rn` | **PASS** — chỉ còn 2 câu "không dùng `IN_PROGRESS`" |
| `CLASS_SUBJECT_LOCKED` còn dùng như mã lỗi | `grep -rn` | **PASS** — 0 chỗ dùng; chỉ còn ghi chú loại trừ |
| History đúng 19 cột | `52:616-623`, `52:1176-1196`, `postcheck:98-106`, `precheck:420-431` | **PASS** (khớp nhau) |
| Cột Revision-5 tồn tại + nullability | `postcheck:108-118`; `precheck:433-446`; H2 `:208-218` | **PASS** |
| `request_fingerprint` NOT NULL, CHAR(64) | `database-schema.md:368`; `52:1193`; H2 `VARCHAR(64)` ghi rõ lệch | **PASS** |
| D-04 thực sự bật trong draft | `52:19` + `52:1211-1263` không còn khối comment; `postcheck:120-133` | **PASS (draft)** |
| `uq_subject_org_code` mô tả đúng | `database-schema.md:1040` đã sửa | **PASS** |
| Gateway mô tả đúng route hiện có | đối chiếu `application.yml` (`Path=` × 27) | **PASS** |
| `ApiResponse.failure` 2/3 tham số | `ApiResponse.java:23,27` | **PASS** |
| `expectedVersion` có mặt trong contract/validation/test | `api-contract.md` §3.8/§3.9/§4.8; TC-CUR-026/027; TC-CLS-031 | **PASS** |
| Mã lỗi mới không trùng | `ErrorCode` dùng đến 2221/3042 → 2240/3054 trống | **PASS (tĩnh)** |
| Ánh xạ finding → test | `test-cases.md §12` (F-MAJ-01/04/07, F-MED…) | **PASS** |

**Giới hạn của kiểm tra tĩnh:** không chứng minh được SQL chạy đúng, không chứng minh được hành vi
runtime, không thay thế test H2/IT trên MySQL staging.

---

## 8. Lộ trình backend còn lại

| WP | Nội dung | Phụ thuộc |
|---|---|---|
| WP1 | Migration 51/52 (schema + backfill class_subject/history), precheck/postcheck | MySQL staging độc lập |
| WP1.6 | Gateway route `/api/curricula/**` + route lớp–môn mới | Không chặn WP1 |
| WP2 | Subject: code optional, 409 trùng mã, module guard, `GET /subjects` theo `subject.*` (F-MAJ-03), `ACTIVE_REQUIRED`, map constraint (F-LOW-03/04) | WP1 |
| WP3 | Teacher–Subject theo ID, API gán môn, backfill + đối soát | WP1 |
| WP4 | Curriculum CRUD + nhiều tiên quyết + `expectedVersion` cho bảng con (F-MAJ-07) | WP1 |
| WP5 | Class–Subject: snapshot, áp curriculum (cả 2 quyền), primary invariant, đổi môn chính + history + fingerprint (F-BLK-01/F-MAJ-04/05), `DELETE` lớp có history → 409 | WP1, WP4 |
| WP6 | Integration/E2E qua gateway, module `TEACHER_ASSIGNMENT` (UNVERIFIED) | WP1.6 |

Thứ tự file/class chi tiết giữ nguyên trong `implementation-roadmap.md` §3–§8.

---

## 9. Trạng thái cuối

| Hạng mục | Kết quả |
|---|---|
| BLOCKER còn mở trong thiết kế | **0** |
| MAJOR còn mở trong thiết kế | **0** |
| MEDIUM còn mở trong thiết kế | **0** (3 mục chuyển thành đầu việc triển khai có mã WP) |
| LOW còn mở trong thiết kế | **0** (3 mục chuyển thành đầu việc triển khai) |
| Java/Frontend/env/DB bị sửa | **Không** |
| Migration đã chạy | **Không** |
| Commit/push/merge | **Không** (bởi agent trong phiên này) |
| Thay đổi chưa commit | 6 file tài liệu sửa + 1 file báo cáo mới (mục 1) |

**Gate:**

```
READY FOR BACKEND IMPLEMENTATION
```

> **Lưu ý bắt buộc:** gate này **không** đồng nghĩa `MIGRATION APPROVED`. Migration 51/52 vẫn cần
> precheck trên MySQL staging, xử lý tay bảng 16 cột (nếu có), rồi apply và postcheck. Mọi mục ở §6
> còn **UNVERIFIED** cho tới khi chạy thật.

**Bàn giao:** theo yêu cầu, agent **dừng tại đây** — không viết Java, không sửa Frontend, không chạy
migration, không commit/push, không tự triển khai WP1.
