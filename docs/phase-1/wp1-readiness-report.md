# WP1 Readiness Report — Phase 1 Revision 3

> **Trạng thái: `READY FOR USER REVIEW` — KHÔNG phải `APPROVED`.**
> Báo cáo này mô tả công việc tài liệu/schema draft cho WP1. Không có migration nào được chạy,
> không có Java/React nào bị sửa, không kết nối DB production/staging, không test nào được thực thi.
> Ngày: 2026-11-20. Nhánh: `fixFlowCreateEmployee`.

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
| `test-cases.md` | TC-CLS-039…048, TC-LEG-016…020, ma trận AC |
| `implementation-roadmap.md` | WP1 dùng 51/52 (không 53), WP5 `operationId`/`expectedVersion`, test range 001…048 |
| `review-report.md` | Viết lại thành Revision 3 (`READY FOR USER REVIEW`) |
| `wp0-readiness-report.md` | Ghi chú Revision 3 + bỏ migration 53 không bằng chứng |
| `wp1-readiness-report.md` | File này |

### 1.2. Migration drafts (mới, **chưa chạy**)

- `docs/phase-1/migrations/51_people_curriculum.sql`
- `docs/phase-1/migrations/52_people_class_subject.sql`
- `docs/phase-1/migrations/51_52_precheck.sql`
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

---

## 4. Migration 51/52/53 — trạng thái

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

Nằm ở `migrations/51_52_precheck.sql`, gồm:

1. Bảng/cột đã tồn tại (migration chạy một phần?).
2. `subject.code` trùng trong org.
3. Lớp có `subject_id` nhưng không có dòng `class_subject` khớp.
4. Lớp không có dòng khớp **hoặc** đã có >1 primary (mập mờ → báo cáo).
5. Trùng khóa `(class_id, subject_id)`.
6. Org lệch (`class_subject` vs `school_class`/`subject`).
7. Index/constraint đã tồn tại.
8. `class_subject.subject_id` không tồn tại trong `subject` (FK sẽ fail).
9. Lớp đã kết thúc/huỷ còn `subject_id`.
10. `school_class.subject_id` không tồn tại trong `subject` cùng org (backfill sẽ fail FK).

Truy vấn 4–7 chỉ chạy sau khi xác nhận `class_subject` tồn tại (truy vấn 0).
Kết quả pre-check **chưa được chạy**; mọi dòng trả về phải được đưa vào báo cáo manual review.

---

## 6. Backfill strategy & unresolved rows

**Chiến lược (D-11):**

1. Chỉ dùng `school_class.subject_id` — khớp **ID chính xác**.
2. Tạo dòng `class_subject` `source='LEGACY'`, `is_primary=1` khi lớp chưa có dòng khớp và chưa có
   primary.
3. Đánh `is_primary=1` cho dòng đã có nếu khớp chính xác và lớp chưa có primary.
4. Không backfill `class_subject_history` hồi tố (không có actor/thời điểm/lý do nguồn).
5. Không suy đoán khi dữ liệu mập mờ.

**Unresolved rows (phải xử lý tay):**

- Lớp có `subject_id` nhưng không có dòng `class_subject` nào và không thể tạo do ràng buộc khác.
- Lớp đã có >1 dòng `is_primary=1` (từ bản nháp cũ) → migration **dừng** (SIGNAL) trước khi thêm UNIQUE.
- `class_subject` trỏ môn/lớp khác org.
- `class_subject.subject_id` hoặc `school_class.subject_id` không tồn tại trong `subject` cùng org.

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

**Không** tuyên bố schema đã được xác minh chỉ dựa trên H2. Không có test H2 nào được chạy.

---

## 9. Rollback risks

- `class_subject_history`: mất vĩnh viễn nếu drop mà chưa export (không tái tạo được actor/thời gian/lý do).
- `class_subject`: mất snapshot môn/giáo viên/số buổi của lớp.
- `is_primary`: mất dấu primary; có thể suy lại từ `subject_id` nếu dữ liệu nhất quán.
- Backfill `LEGACY`: xoá sẽ mất dòng môn legacy đã tạo.
- Nếu đã phát sinh history/dữ liệu mới → **forward-fix**, không rollback.
- Chi tiết + thứ tự lệnh: `migrations/ROLLBACK.md`.

---

## 10. Unresolved technical decisions

1. **MySQL generated column** chưa được kiểm thực tế trên MySQL 8 staging.
2. **`expectedVersion`:** `school_class.version` **tồn tại** trong H2 schema và dùng trong
   `SchoolClassRepository` (`version = version + 1 ... AND version = ?`), nên không cần đổi schema.
   Tuy nhiên `SchoolClassUpdateRequest.version` hiện **tuỳ chọn** (`@PositiveOrZero Long version`);
   WP5 phải bắt buộc khi đổi `subjectId`. Không thay bằng timestamp.
3. Mã lỗi mới 2240/3054 cần người dùng xác nhận thêm vào enum (đề xuất, chưa sửa code).
4. `GET /classes/{id}/subject-history` có cần lọc thời gian/actor không (Phase 1 đang phân trang).
5. `plannedSessions`/`sessionMinutes` khi tạo dòng mới giữ thiết kế hiện tại; không đặt default mới.
6. Outbox: không triển khai ở Phase 1 (giữ nguyên quyết định).

---

## 11. Tests added vs executed

**Đã bổ sung (thiết kế, chưa viết code test):**

- TC-CLS-039…048: source snapshot, NULL subject, required fields, same/different `operationId`,
  retry sau thất bại, D-09 fallback, rollback cập nhật `class_subject`, `subject_id` = primary.
- TC-LEG-016…020: backfill exact-match, báo cáo mập mờ, MySQL generated column, H2 parity,
  UNIQUE chặn >1 primary.
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
- **Không** commit/push/merge/reset/force-push.
- Chỉ tạo file draft SQL trong `docs/phase-1/migrations/` và cập nhật tài liệu + H2 test schema.
- Schema **chưa được xác minh** trên MySQL; migration **chưa được áp dụng**.

**Kết luận:** tài liệu và draft đã sẵn sàng để người dùng review. Trạng thái
`READY FOR USER REVIEW`; chuyển `APPROVED` chỉ sau khi người dùng duyệt và kiểm staging.
