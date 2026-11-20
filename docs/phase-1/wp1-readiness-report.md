# WP1 Readiness Report — Phase 1 Revision 3 + Lượt 4

> **Trạng thái: `READY FOR FINAL STATIC REVIEW` — KHÔNG phải `APPROVED`.**
> Báo cáo này mô tả công việc tài liệu/schema draft cho WP1. Finding P1/P2/P3 của Final Static
> Review đã sửa trong logic SQL thực tế (chi tiết: `fix-review-findings-report.md`) và **đã được
> xác minh static trên commit đã push `67d7641`**. Không có migration nào được chạy, không có
> Java/React nào bị sửa, không kết nối DB production/staging, không test nào được thực thi ngày
> 2026-11-20. Nhánh: `fixFlowCreateEmployee`, HEAD `67d7641` (**đã push** — không phải working tree).
> Bước kế tiếp sau review này: `READY FOR STAGING VALIDATION`.
>
> Bốn giới hạn **chưa xác minh** (xem §12): (1) chưa chạy migration trên MySQL staging;
> (2) chưa chạy test H2/Maven; (3) schema staging thực tế chưa được xác nhận; (4) hành vi runtime
> chưa được kiểm chứng.

### 0.1. Lịch sử review (đồng bộ theo GitHub HEAD)

| Mốc | Commit | Nội dung |
|---|---|---|
| Final Static Review (baseline) | `f64cea1` (working tree) | Báo cáo `BLOCKED` với P1/P2/P3: thiếu audit thuộc tính cột, thiếu audit bảng history/specialty, thiếu kiểm `UPDATE_RULE`/`DELETE_RULE`, H2 lệch CHECK, helper 51 chưa chặn định nghĩa trùng tên |
| Revision 4 (fix) | `67d7641` (đã push) | P1/P2/P3 sửa trong SQL thực tế: precheck 0b + 4 procedure audit 52 kiểm đủ 20/10/16/5 cột; kiểm FK mapping + referential action; H2 thêm 2 CHECK; helper 51 chặn lệch định nghĩa |
| Final Static Review (xác minh) | `67d7641` (đã push) | Xác minh lại trên commit đã push: **cả 3 finding P1/P2/P3 PASS**, không phát sinh finding static mới. Không đánh giá runtime/DB |
| Đồng bộ báo cáo | `67d7641` | Chỉ cập nhật `fix-review-findings-report.md` + file này để phản ánh HEAD đã push; không commit/push/migration |

---

## 1. Files changed

### 1.1. Tài liệu Phase 1 (`docs/phase-1/`)

| File | Thay đổi chính |
|---|---|
| `subject-business-requirements.md` | D-08 (history có `old_source`/`new_source`, `reason`/`operationId` bắt buộc), D-09 (fallback theo từng bản ghi), D-15 (bất biến primary, DB chỉ bảo đảm tối đa), BR-SUB-22…24, AC-SUB-15…17 |
| `curriculum-business-design.md` | DDL `class_subject`/history cập nhật, F06 yêu cầu `expectedVersion`/`operationId`, BR-CUR-27/28, ví dụ 6.5 có `operationId` + source |
| `database-schema.md` | DDL history (`old_source`, `new_source`, NOT NULL), pre-check 6.0, rollback mở rộng, bỏ migration 53, H2 parity |
| `erd.md` | Ghi chú primary "tối đa bởi DB / tối thiểu bởi app", D-09 theo bản ghi |
| `api-contract.md` | §4.7/§4.8 required fields, idempotency, `oldSource`/`newSource`, lỗi 400/409, §4.9 response |
| `role-permission-matrix.md` | Giữ nguyên quyền; không thêm mã mới (đã đúng từ Revision 2) |
| `teacher-subject-design.md` | BR-TCH-18 theo D-09 tinh chỉnh |
| `validation-and-error-cases.md` | E-40…E-43, AC-VAL-17…20, `expectedVersion` bắt buộc |
| `test-cases.md` | TC-CLS-039…048, TC-LEG-016…026, ma trận AC |
| `implementation-roadmap.md` | WP1 dùng 51/52 (không 53), WP5 `operationId`/`expectedVersion`, test range 001…048 |
| `review-report.md` | Revision 3 + Lượt 4, trạng thái `READY FOR FINAL STATIC REVIEW` |
| `wp0-readiness-report.md` | Ghi chú Revision 3 + bỏ migration 53 không bằng chứng |
| `wp1-readiness-report.md` | File này |

### 1.2. Migration drafts (mới, **chưa chạy**)

- `docs/phase-1/migrations/51_people_curriculum.sql`
- `docs/phase-1/migrations/52_people_class_subject.sql`
- `docs/phase-1/migrations/51_52_precheck.sql` (schema — an toàn khi chưa có `class_subject`)
- `docs/phase-1/migrations/51_52_precheck_data.sql` (data — chỉ chạy khi `DATA_PRECHECK_READY`)
- `docs/phase-1/migrations/51_52_postcheck.sql`
- `docs/phase-1/migrations/ROLLBACK.md`

### 1.3. H2 test schema

- `backend/PeopleService/src/test/resources/people-test-schema.sql`: thêm `curriculum`,
  `curriculum_subject`, `curriculum_subject_prerequisite`, `class_subject`, `class_subject_history`,
  `specialty_subject`, `teacher_subject`; `school_class.curriculum_id` + `UNIQUE(id, org_id)`.
  **Chưa chạy test H2.**

---

## 2. D-08 / D-09 / D-15 — wording cuối

### D-08 — Snapshot lịch sử

- `CHUA_BAT_DAU`: đổi curriculum và danh sách môn trực tiếp.
- `DANG_DIEN_RA`: **chỉ** đổi môn chính; **bắt buộc** ghi `class_subject_history` với snapshot môn
  cũ/mới (ID, mã, tên), `old_teacher_id`, `old_source`, `new_source`, `reason`, `operation_id`,
  `changed_by`, `changed_at`; **không** ghi đè curriculum, **không** chép giáo viên cũ.
- `DA_KET_THUC`/`DA_HUY`/`CLOSED`: không dùng thao tác thường; sửa lịch sử cần quy trình riêng.

### D-09 — Fallback giáo viên

- **Chỉ fallback** `school_class.teacher_id` khi lớp **chưa có bản ghi `class_subject` tương ứng**.
- Bản ghi tồn tại nhưng `teacher_id = NULL` → **không fallback**; nghĩa là chưa phân công.
- Đổi môn chính không kế thừa giáo viên cũ.

### D-15 — Đồng bộ legacy

- Giữ `school_class.subject_id`; `class_subject.is_primary` đánh dấu môn chính.
- **DB chỉ bảo đảm tối đa một primary/lớp** (UNIQUE trên generated column).
- "Tối thiểu một primary khi `school_class.subject_id != NULL`" do **transaction + application
  validation**; UNIQUE không bảo đảm.
- Đổi môn chính atomic: history → `school_class.subject_id` → `class_subject.is_primary`; tái dùng
  dòng đã có; không tạo trùng `(class_id, subject_id)`; API thường không xoá primary/history.

---

## 3. Database schema changes

| Bảng/cột | Thay đổi |
|---|---|
| `curriculum` | Bảng mới, template cấp tổ chức, `version` |
| `curriculum_subject` | Bảng mới, số buổi/thời lượng bắt buộc |
| `curriculum_subject_prerequisite` | Bảng nối 0..n tiên quyết |
| `school_class` | `curriculum_id`; `UNIQUE(id, org_id)` |
| `class_subject` | Bảng mới; `is_primary`; generated `primary_class_id`; UNIQUE; CHECK; composite FKs |
| `class_subject_history` | Bảng mới; `old_source`, `new_source`, `reason`/`operation_id` NOT NULL; UNIQUE `(org_id, operation_id)`; FK RESTRICT |
| `specialty_subject`, `teacher_subject` | Bảng mới theo D-06 |

Năm bất biến primary (tài liệu hoá + test):

1. `school_class.subject_id != NULL` → có **đúng một** dòng primary.
2. `school_class.subject_id` = `class_subject.subject_id` của dòng `is_primary = 1`.
3. `subject_id IS NULL` → không tạo primary.
4. Không quá một primary/lớp.
5. Tạo lớp/đổi môn/backfill giữ các bất biến trên.

**Audit schema (Lượt 4):** pre-check 0b và procedure audit trong 52 là **cùng một hợp đồng** cho
`class_subject` (20 cột) / `teacher_subject` (10 cột): tên cột, `DATA_TYPE`, `COLUMN_TYPE`, độ dài/
độ chính xác, NULL, DEFAULT, collation, `EXTRA` (generated STORED); PK; index + whitelist index hỗ
trợ FK; mapping FK + `UPDATE_RULE`/`DELETE_RULE`; CHECK đã chuẩn hoá. `class_subject_history` (16
cột) và `specialty_subject` (5 cột) được audit đầy đủ trước `CREATE TABLE IF NOT EXISTS`. Lệch ⇒
`SIGNAL 45000`/`BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE`; **không** tự `ALTER`.

### 3.1. Xác minh optimistic locking (`school_class.version`)

Đọc source tại HEAD `67d7641` (xác minh ban đầu tại `bfa9b53`; không file Java nào bị sửa) +
dump `DB_11_16.sql` + H2 fixture (chỉ đọc, không sửa Java/DB):

| Hạng mục | Bằng chứng | Kết luận |
|---|---|---|
| `version` tồn tại trong schema MySQL | `DB_11_16.sql:376-401` (`version bigint NOT NULL DEFAULT '0'`) | `VERIFIED` trên dump trong repo; **chưa chạy** `information_schema` trên DB thật |
| Không có migration nào tạo/đổi cột | `grep CREATE TABLE school_class` trên các file `[0-9]*.sql`: 0 kết quả; cột đến từ dump gốc | `VERIFIED` (repo) |
| Entity | People Service **không dùng JPA**; `SchoolClassResponse` (record) có `long version`, map `rs.getLong("version")` (`SchoolClassRepository.java:48`) | `VERIFIED` — không có `@Version` |
| Update có điều kiện + tăng version | `SchoolClassRepository.update` (`:289-303`): `SET ..., version = version + 1 ... WHERE id=? AND org_id=? AND deleted_at IS NULL AND version=?`; `assignTeacher` (`:306-313`) tương tự | `VERIFIED` |
| Service xử lý 0 dòng | `SchoolClassService.update` (`:130-138`) ném `STATUS_CHANGED` (2207, 409); `assignTeacher` (`:195-197`) ném `DATA_CHANGED` (2212, 409) | `VERIFIED` — **khác mã** giữa hai luồng hiện có |
| Request bắt buộc version | `SchoolClassUpdateRequest.version`: `@NotNull(VERSION_REQUIRED)` + `@PositiveOrZero` (`:17-18`) | `VERIFIED` — version **đã bắt buộc**, không phải tuỳ chọn |
| H2 vs MySQL | H2 `version BIGINT NOT NULL DEFAULT 0` (`people-test-schema.sql:147`); MySQL cùng kiểu/default | `VERIFIED` (cùng kiểu); khác biệt `datetime(3)` vs `TIMESTAMP` không ảnh hưởng locking |

**Chưa xác minh được:** DB staging/production thực tế có đúng dump `DB_11_16.sql` hay không (không
được kết nối DB trong task này). Nếu staging lệch dump, `expectedVersion` vẫn dùng được nhưng phải
chạy `SHOW COLUMNS FROM school_class LIKE 'version'` trước khi triển khai.

**Hệ quả thiết kế (không sửa Java ở task này):**

- `PUT /classes/{id}` hiện trả **2207 `STATUS_CHANGED`** khi version lệch. Endpoint mới
  `PUT .../subjects/primary` trong thiết kế dùng **2212 `DATA_CHANGED`**. WP5 phải chọn: giữ
  `STATUS_CHANGED` cho toàn bộ luồng lớp (khuyến nghị, không đổi hành vi cũ) hoặc ghi rõ lý do đổi —
  không tự ý đổi mã lỗi của endpoint hiện có.
- Không cần thêm cột/trigger; `version` đã tồn tại và repository đã tăng đúng.



| File | Trạng thái | Nội dung |
|---|---|---|
| 51 | Draft, **chưa chạy** | `curriculum*`, `school_class.curriculum_id`, `uq_school_class_id_org` |
| 52 | Draft, **chưa chạy** | `specialty_subject`, `teacher_subject`, `class_subject`, `is_primary`, generated column, UNIQUE, history, exact-match backfill |
| 53 | **Không tạo** | Repo không có 51/52 cũ; không có bằng chứng cần nâng cấp. Chỉ tạo khi xác minh `information_schema` trên môi trường thật |

**MySQL 8 generated column:** DDL dùng cú pháp chuẩn
`GENERATED ALWAYS AS (CASE WHEN is_primary = 1 THEN class_id END) STORED` + UNIQUE. Cú pháp này
**chưa được chạy thử** trong task; phải kiểm trên MySQL staging. H2 dùng cột thường (ghi rõ ở §8).

---

## 5. Pre-check queries

Pre-check tách hai file để **không truy vấn bảng chưa tồn tại**:

**`migrations/51_52_precheck.sql` (PART A — schema, luôn chạy được):**

1. Bảng/cột đã tồn tại (migration chạy một phần?).
2. Verdict `next_step`: `DATA_PRECHECK_READY` / `SKIP_DATA_PRECHECK_NO_TABLE` /
   `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE`.
3. Checklist 20 cột bắt buộc (không thiếu/không thừa), PK `(class_id, subject_id)`, 5 nhóm index
   (PRIMARY + 4) đúng cột/thứ tự/UNIQUE và không prefix — chỉ cho phép thêm 2 index hỗ trợ FK do
   InnoDB tự tạo `(class_id, org_id)`/`(subject_id, org_id)`, mọi index lạ ⇒ BLOCKED; 4 FK đúng
   cột nguồn→bảng.cột đích; 5 CHECK đúng biểu thức; cột sinh `primary_class_id` STORED đúng biểu
   thức (present = 0 → thiếu/sai).
4. `teacher_subject` CHECK status chứa `PENDING` hay không (bảng cũ → 52 ABORT).
5. `subject.code` trùng trong org.
6. Index/constraint 51/52 đã có.
7. Lớp đã kết thúc/huỷ còn `subject_id`.
8. `school_class.subject_id` không tồn tại trong `subject` cùng org.
9. `school_class.teacher_id` không tồn tại trong `staff_profile` cùng org (C3).

**`migrations/51_52_precheck_data.sql` (PART B — data, chỉ khi `DATA_PRECHECK_READY`):**

10. Trùng khóa `(class_id, subject_id)`; org lệch; `class_subject` mồ côi subject/lớp/giáo viên.
11. **Phân loại từng lớp** (`AUTO_BACKFILL_CANDIDATE` / `BLOCK_MIGRATION` / `NO_ACTION` kèm
    `reason_code`).
12. Tổng hợp số lớp theo nhãn.
13. Danh sách `BLOCK_MIGRATION` (9 mã) + gate đếm 9 điều kiện.

Kết quả pre-check **chưa được chạy**; mọi dòng trả về phải được đưa vào báo cáo và **sửa dữ liệu**
trước 52 (không có “ghi nhận suông”).

---

## 6. Backfill strategy & unresolved rows

**Chiến lược (D-11):**

1. Chỉ dùng `school_class.subject_id` — khớp **ID chính xác**.
2. Tạo dòng `class_subject` `source='LEGACY'`, `is_primary=1` khi lớp chưa có dòng khớp và chưa có
   primary.
3. Đánh `is_primary=1` cho dòng đã có nếu khớp chính xác và lớp chưa có primary.
4. Không backfill `class_subject_history` hồi tố (không có actor/thời điểm/lý do nguồn).
5. Không suy đoán khi dữ liệu mập mờ.

**Phân loại dữ liệu (pre-check phần B):**

| Nhãn | `reason_code` | Hành động |
|---|---|---|
| `AUTO_BACKFILL_CANDIDATE` | `INSERT_LEGACY_ROW` / `MARK_EXACT_PRIMARY` | Backfill tự động 5a/5b |
| `BLOCK_MIGRATION` | 9 mã: `CS_ORPHAN_SUBJECT`, `CS_ORG_MISMATCH`, `CS_ORPHAN_CLASS`, `CS_ORPHAN_TEACHER`, `CLASS_ORPHAN_SUBJECT`, `CLASS_ORPHAN_TEACHER`, `MULTI_PRIMARY`, `PRIMARY_SUBJECT_MISMATCH`, `PRIMARY_WITHOUT_CLASS_SUBJECT` | Dừng; **sửa dữ liệu** trước 52 — không “ghi nhận suông” |
| `NO_ACTION` | `PRIMARY_OK` / `NO_SUBJECT` | Không làm gì |

`MANUAL_REVIEW` **đã bỏ**: mọi xung đột primary đều chặn migration (`BLOCK_MIGRATION`), vì bất biến
primary phải giữ được ngay sau 52 — không có trạng thái “chờ duyệt”.

**Bảo đảm của draft 52:**

- 5a có `NOT EXISTS` dòng khớp **và** `NOT EXISTS` primary → không tạo trùng `(class_id, subject_id)`,
  không ghi đè primary mâu thuẫn, không tạo primary khi `subject_id IS NULL`.
- 5b dùng bảng tạm `tmp_m52_has_primary` (tránh MySQL 1093), chỉ set primary cho lớp chưa có.
- 5a/5b **chỉ** tác động lớp `deleted_at IS NULL` (khớp pre-check phần B). Lớp đã xoá mềm không bị
  sửa; nếu có luồng khôi phục lớp phải kiểm primary riêng (ngoài phạm vi migration này).
- 5.0 `mems_m52_assert_backfill_safe` dừng khi còn: subject mồ côi/org lệch, `class_subject` mồ côi
  lớp/giáo viên, `school_class.subject_id`/`teacher_id` mồ côi, primary lệch `subject_id`, primary
  khi `subject_id IS NULL`; 5c `mems_m52_assert_no_duplicate_primary` dừng khi >1 primary/lớp.
- Với bảng `class_subject`/`teacher_subject` **đã tồn tại** từ bản nháp cũ: 52 chạy audit schema —
  `class_subject` đúng 20 cột, PK, 5 nhóm index, 4 FK đúng đích, 5 CHECK đúng biểu thức, cột sinh
  STORED; `teacher_subject` đúng 10 cột, PK, 3 nhóm index, 2 FK đúng đích, 2 CHECK (status chỉ
  `APPROVED/REVOKED`) — và `SIGNAL` ABORT nếu không khớp Revision 3. **Không** tự `ADD COLUMN` để
  “nâng cấp”, **không** sửa migration đã áp dụng.

**Unresolved rows (phải xử lý tay trước 52):**

- Lớp có `subject_id` nhưng không có dòng `class_subject` nào và không thể tạo do ràng buộc khác.
- Lớp đã có >1 dòng `is_primary=1` (từ bản nháp cũ) → migration **dừng** (SIGNAL) trước khi thêm UNIQUE.
- `class_subject` trỏ môn/lớp/giáo viên khác org hoặc không tồn tại.
- `class_subject.subject_id`, `school_class.subject_id` hoặc `school_class.teacher_id` không tồn tại
  trong bảng đích cùng org.
- Primary lệch `school_class.subject_id`, hoặc `subject_id IS NULL` mà có primary → `BLOCK_MIGRATION`
  (không còn `MANUAL_REVIEW`).

Các trường hợp trên **chưa có dữ liệu thực tế** để kiểm; báo cáo này không khẳng định đã xử lý.

---

## 7. API contract changes

| Endpoint | Thay đổi |
|---|---|
| `PUT /api/classes/{id}/subjects/primary` | `subjectId`, `reason` (≤500), `expectedVersion`, `operationId` **bắt buộc**; `changedBy` từ JWT; idempotency same/different payload; 409 conflict |
| `GET /api/classes/{id}/subjects` | `isPrimary`; legacy chỉ suy dòng khi chưa có `class_subject`; D-09 fallback |
| `GET /api/classes/{id}/subject-history` | Trả thêm `oldSource`, `newSource`, `operationId` |
| `PUT /api/classes/{id}` | Khi đổi `subjectId` phải có `reason`, `operationId`, `version` (`expectedVersion`) và đi qua cùng luồng history |
| `DELETE /api/classes/{id}` | Có history → 409 `CONFLICT`, không 500 do FK; không history → giữ 204 hiện tại |

Không thêm permission ID mới; dùng `class.edit`/`class.view` hiện có.

---

## 8. H2 / MySQL differences

| Điểm | MySQL 8 | H2 test | Hệ quả |
|---|---|---|---|
| `primary_class_id` | STORED generated column | Cột thường | Service phải tự set `class_id`/NULL; H2 không chứng minh generated column |
| UNIQUE primary | Chặn >1 primary | Chặn >1 nếu service set đúng | Không chứng minh "tối thiểu một primary" |
| `is_primary` | `tinyint(1)` | `BOOLEAN` | Test map true/false |
| `ALTER TABLE … AFTER` | Hỗ trợ | Không | Draft không dùng `AFTER` |
| Composite FK | Cần index tiền tố trái | Cần tương tự | H2 schema thêm `UNIQUE(id, org_id)` |
| CHECK constraint | Revision 3 đầy đủ | Thiếu `chk_class_subject_primary` + `chk_curriculum_subject_sequence` trước Lượt 4 | Đã bổ sung; `is_primary IN (0,1)` viết H2 là `IN (FALSE, TRUE)` |
| `uq_subject_org_code` | Non-unique (migration 42); D-04 commented đổi UNIQUE | UNIQUE | Lệch **có chủ đích**: giữ UNIQUE để test contract 409 (`SubjectRepository` bắt `DuplicateKeyException`) và đúng D-04 target; **không** sửa D-04; MySQL staging phải kiểm D-04 riêng |
| Index phụ 51/52 | Đầy đủ, audit qua `information_schema` | Lược bỏ phần lớn | H2 không chứng minh index; audit MySQL là nguồn xác nhận. Pre-check 0b/52 audit kiểm cả thuộc tính cột + `UPDATE_RULE`/`DELETE_RULE` |

**Không** tuyên bố schema đã được xác minh chỉ dựa trên H2. Không có test H2 nào được chạy.

---

## 9. Rollback risks

Kế hoạch đầy đủ ở `migrations/ROLLBACK.md` (7 bước: quiesce → export history → export
`class_subject` + bảng liên quan → xác minh → drop FK → drop index/cột sinh → drop bảng con → cha).

- `class_subject_history`: mất vĩnh viễn nếu drop mà chưa export (không tái tạo được actor/thời gian/lý do).
- `class_subject`: mất snapshot môn/giáo viên/số buổi của lớp.
- `is_primary`: mất dấu primary; có thể suy lại từ `subject_id` nếu dữ liệu nhất quán.
- Backfill `LEGACY`: xoá sẽ mất dòng môn legacy đã tạo.
- Partial rollback phải drop **ngược dependency** (4 bước): `uq_class_subject_primary` → `DROP CHECK
  chk_class_subject_primary` → `primary_class_id` → `is_primary`; đảo thứ tự sẽ bị MySQL từ chối.
  Partial rollback chỉ áp dụng cho bảng do draft này tạo (52 không nâng cấp bảng cũ).
- Nếu đã phát sinh history/dữ liệu mới → **forward-fix**, không rollback.
- **ABORT giữa chừng:** MySQL DDL implicit commit; 52 không bọc transaction nên khi `SIGNAL` sau
  5a/5b, DDL và DML đã chạy **vẫn tồn tại**. Không xoá dòng backfill khi chưa chứng minh nguồn gốc;
  sửa dữ liệu gốc rồi chạy lại pre-check → pre-check data → 52 → post-check. 5a/5b idempotent
  (PK + `NOT EXISTS` + chỉ set primary khi lớp chưa có).
- **Index hỗ trợ FK còn sót:** InnoDB tự tạo index non-unique (2 cho `class_subject`, 2 cho
  `teacher_subject`, 1 cho history, 2 cho `specialty_subject`); không tự mất khi drop FK. Chỉ drop
  sau khi `information_schema` xác nhận không FK nào còn dùng; **không** drop khi partial rollback
  còn giữ FK.
- Chi tiết + tên FK/index: `migrations/ROLLBACK.md` (§2 abort/rerun, bước 8 index hỗ trợ FK).

---

## 10. Unresolved technical decisions

1. **MySQL generated column** chưa được kiểm thực tế trên MySQL 8 staging.
2. **`expectedVersion`:** `school_class.version` **tồn tại** trong dump MySQL (`DB_11_16.sql:391`) và
   H2 schema; repository tăng version đúng. `SchoolClassUpdateRequest.version` **đã bắt buộc**
   (`@NotNull VERSION_REQUIRED`). Việc còn lại chỉ là đảm bảo endpoint mới đổi môn chính trả 409
   thống nhất — hiện `PUT /classes/{id}` trả `STATUS_CHANGED` (2207), thiết kế mới đề xuất
   `DATA_CHANGED` (2212); xem §3.1. Không thay bằng timestamp.
3. Mã lỗi mới 2240/3054 cần người dùng xác nhận thêm vào enum (đề xuất, chưa sửa code).
4. `GET /classes/{id}/subject-history` có cần lọc thời gian/actor không (Phase 1 đang phân trang).
5. `plannedSessions`/`sessionMinutes` khi tạo dòng mới giữ thiết kế hiện tại; không đặt default mới.
6. Outbox: không triển khai ở Phase 1 (giữ nguyên quyết định).
7. **Dữ liệu staging** chưa được kiểm: chưa chạy pre-check/post-check; chưa xác minh dump
   `DB_11_16.sql` khớp DB thật.

---

## 11. Tests added vs executed

**Đã bổ sung (thiết kế, chưa viết code test):**

- TC-CLS-039…048: source snapshot, NULL subject, required fields, same/different `operationId`,
  retry sau thất bại, D-09 fallback, rollback cập nhật `class_subject`, `subject_id` = primary.
- TC-LEG-016…020: backfill exact-match, báo cáo mập mờ, MySQL generated column, H2 parity,
  UNIQUE chặn >1 primary.
- TC-LEG-021…024: phân loại pre-check đủ trường hợp (3 nhãn + 9 mã chặn), backfill chạy lại
  idempotent, backfill không ghi đè/không tạo primary khi `subject_id NULL`, rollback đúng dependency.
- TC-LEG-025: `school_class.teacher_id` mồ côi → `BLOCK_MIGRATION` + 5.0 `SIGNAL`, không set NULL.
- TC-LEG-026: bảng `class_subject` cũ thiếu cấu trúc → schema assert `SIGNAL`, không `ADD COLUMN`;
  `teacher_subject` cũ còn `PENDING` → 52 ABORT.
- TC-LEG-030…041 (Lượt 4): sai `DATA_TYPE`/`COLUMN_TYPE`/NULL/DEFAULT/collation; sai `DELETE_RULE`/
  `UPDATE_RULE`; history cascade hoặc thiếu cột snapshot; `specialty_subject` sai schema; index/FK
  trùng tên nhưng sai định nghĩa (helper 51); ABORT sau 5a/5b rồi chạy lại.
- E-40…E-43, AC-VAL-17…20.

**Đã thực thi: KHÔNG.** Không chạy Maven, không chạy H2, không chạy migration, không gọi API. Mọi
tuyên bố "pass" trong tài liệu là **kỳ vọng thiết kế**, không phải kết quả test.

---

## 12. Xác nhận phạm vi

- **Không** sửa Java Backend business logic.
- **Không** sửa React source.
- **Không** chạy SQL, migration, rollback.
- **Không** kết nối production/staging DB.
- **Không** deploy/restart service.
- **Không** sửa `.env`, CORS, `vercel.json`, backend URL.
- **Không** commit/push/merge/reset/force-push trong lượt đồng bộ báo cáo này. Commit `67d7641`
  đã được push từ lượt trước; lượt này chỉ sửa tài liệu.
- Chỉ tạo file draft SQL trong `docs/phase-1/migrations/` và cập nhật tài liệu + H2 test schema.
- Schema **chưa được xác minh** trên MySQL; migration **chưa được áp dụng**.

**Bốn giới hạn chưa xác minh (không được suy diễn là đã sẵn sàng staging):**

1. **Chưa chạy migration** 51/52 trên MySQL staging — mọi kết luận schema chỉ là static.
2. **Chưa chạy test H2/Maven** — fixture H2 và logic Java mới chỉ được đọc/thiết kế.
3. **Schema staging thực tế chưa xác nhận** — chưa đối chiếu `information_schema` với
   `DB_11_16.sql`.
4. **Hành vi runtime chưa kiểm chứng** — backfill, generated column, abort/rerun chỉ là kỳ vọng
   thiết kế.

**Kết luận:** finding P1/P2/P3 đã sửa trong logic SQL thực tế, kiểm static trên commit đã push
`67d7641`. Trạng thái `READY FOR FINAL STATIC REVIEW`; bước tiếp theo là `READY FOR STAGING
VALIDATION`, **không phải `APPROVED`**. Chỉ chuyển `APPROVED` sau khi người dùng duyệt và kiểm trên
MySQL staging.
