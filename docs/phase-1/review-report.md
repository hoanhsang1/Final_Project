# Phase 1 — Review Report (Revision 2: D-08/D-15)

> **Ngày:** 2026-11-20 · **Branch:** `fixFlowCreateEmployee` · **Baseline source:** `cdd03b8`
> **Phạm vi:** chỉ tài liệu trong `docs/phase-1/`. Không sửa source Java/React, không tạo hay chạy
> migration, không truy cập database, không đổi cấu hình/deploy, không commit/push/merge.

## TRẠNG THÁI: `APPROVED` — Revision 2

Bộ tài liệu Phase 1 đã được cập nhật đồng bộ theo **D-08 và D-15 sửa đổi** (giữ lịch sử khi đổi
môn chính của lớp đang học + đồng bộ `school_class.subject_id`). Sau khi rà chéo, không còn mâu
thuẫn giữa các tài liệu.

Lưu ý trung thực:

- Đây là **tài liệu thiết kế**, **không** phải kết quả triển khai.
- **Chưa** có migration nào được tạo/chạy; **chưa** có code Java/React nào được viết cho D-08/D-15.
- Các câu hỏi còn lại (§10) là chi tiết kỹ thuật, **không** phải quyết định nghiệp vụ mở.

---

## 1. Tổng quan Revision 2

### 1.1. Vì sao có Revision 2

Revision 1 chốt D-08 = "chỉ áp dụng trực tiếp cho lớp `CHUA_BAT_DAU`". Người dùng đã sửa lại:

- **D-08 mới:** lớp `DANG_DIEN_RA` **được đổi môn chính**, nhưng phải lưu lịch sử (snapshot môn
  cũ/mới, giáo viên cũ, actor, thời điểm). Không ghi đè curriculum, không chép giáo viên.
- **D-15 mới:** `school_class.subject_id` đồng bộ với môn chính trong `class_subject`; đổi môn
  chính ghi `class_subject_history` + cập nhật cả hai bảng trong **một** transaction; API thường
  không xoá dòng primary/history.

### 1.2. Tài liệu đã cập nhật

| # | File | Vai trò |
|---|---|---|
| 1 | `subject-business-requirements.md` | Sổ quyết định D-01…D-15 (D-08/D-15 viết lại), §3.8, §3.15, BR-SUB-16…20, AC-SUB-09…14 |
| 2 | `curriculum-business-design.md` | §3.4 `is_primary`, §3.6 `class_subject_history`, F05/F06/F07, BR-CUR-22…25, AC-CUR-11/12 |
| 3 | `database-schema.md` | DDL `class_subject` (+cột sinh +UNIQUE), DDL `class_subject_history`, migration 52 + 53 dự phòng, backfill, pre/post-check, H2 parity, rollback |
| 4 | `erd.md` | Thêm `CLASS_SUBJECT_HISTORY`, bất biến một-primary, index/UNIQUE, ghi chú org |
| 5 | `api-contract.md` | §4.7 `PUT /classes/{id}` không vòng qua history; §4.8 đổi môn chính; §4.9 history; `isPrimary`; mã lỗi |
| 6 | `role-permission-matrix.md` | §4.8 quyền đổi môn chính; ma trận; module guard; AC-RBAC-10/11 |
| 7 | `teacher-subject-design.md` | F08 + BR-TCH-16…18: không chuyển giáo viên, không fallback |
| 8 | `validation-and-error-cases.md` | `CLASS_SUBJECT_OPERATION_CONFLICT` (2240), `REASON_TOO_LONG` (3054), E-30…E-37, AC-VAL-12…15 |
| 9 | `test-cases.md` | TC-CLS-021…036, TC-RBAC-014/015 |
| 10 | `implementation-roadmap.md` | WP1/WP5/checklist/DoD theo D-08/D-15 |
| 11 | `review-report.md` | Báo cáo này (Revision 2) |
| 12 | `wp0-readiness-report.md` | Đánh dấu lại F-11 / BLK-04 theo quyết định mới |

### 1.3. Kết quả kiểm chéo

| Hạng mục | Trạng thái |
|---|---|
| Quyết định nghiệp vụ | 15/15 `CONFIRMED` (D-08, D-15 bản sửa đổi) |
| Tài liệu còn nói "`DANG_DIEN_RA` khoá mọi thay đổi môn" | 0 |
| Tài liệu còn nói "chỉ cập nhật `school_class.subject_id`, ghi cảnh báo" | 0 |
| Hợp đồng API đổi môn chính song song/mâu thuẫn | 0 (một luồng dùng chung) |
| Source/migration/DB bị thay đổi | 0 |

---

## 2. Nội dung D-08 / D-15 bản sửa đổi (đúng như đã ghi trong sổ quyết định)

### 2.1. D-08 — Preserve Historical Academic Snapshots

1. Lớp `CHUA_BAT_DAU` được đổi **curriculum và danh sách môn** trực tiếp.
2. Lớp `DANG_DIEN_RA` được đổi **môn chính**; bài tập cũ phải được giữ trong bảng lịch sử riêng.
3. Lịch sử giữ **snapshot** môn (mã + tên), giáo viên được gán, thời điểm hiệu lực/đổi, và người
   thực hiện.
4. Đổi môn chính **không** tự ghi đè toàn bộ curriculum.
5. Giáo viên cũ **không** được tự gán cho môn mới.
6. Lớp `DA_KET_THUC`/`DA_HUY`/`CLOSED` **không** dùng thao tác thường; sửa lịch sử cần quy trình
   riêng (ngoài Phase 1).

### 2.2. D-15 — Legacy Subject Synchronization and Historical Preservation

1. Giữ `school_class.subject_id` để tương thích ngược.
2. Đồng bộ nó với môn chính trong `class_subject`.
3. Đổi môn chính phải: ghi history → cập nhật `school_class.subject_id` → đồng bộ `class_subject`
   → giữ lịch sử.
4. API thường **không** xoá trực tiếp môn chính/legacy hay history.
5. Ba bước cập nhật nằm trong **một transaction**.
6. Nếu môn mới **đã có** trong danh sách môn của lớp → **tái dùng** dòng đó, không tạo trùng.
7. **Không** chuyển giáo viên cũ; môn mới cần gán giáo viên riêng.

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
| `new_subject_id` | char(36) | NOT NULL |
| `new_subject_code` | varchar(50) NULL | snapshot |
| `new_subject_name` | varchar(200) | NOT NULL snapshot |
| `reason` | varchar(500) NULL | |
| `operation_id` | varchar(64) NULL | UNIQUE `(org_id, operation_id)` — chống retry trùng |
| `changed_by` | char(36) | NOT NULL |
| `changed_at` | datetime(3) | NOT NULL |

- FK `(class_id, org_id) → school_class(id, org_id)` **ON DELETE RESTRICT** → không xoá lớp còn history.
- **Không** có FK tới `subject`/`staff_profile` cho các cột snapshot: môn đổi tên/ngừng, giáo viên
  nghỉ vẫn hiển thị đúng lịch sử.
- Append-only; Phase 1 không có API sửa/xoá.
- **Không** backfill hồi tố (không có dữ liệu nguồn về actor/thời điểm).

### 3.2. `class_subject` thêm cột

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `is_primary` | tinyint(1) NOT NULL DEFAULT 0 | CHECK `IN (0,1)` |
| `primary_class_id` | char(36) GENERATED … STORED | `CASE WHEN is_primary = 1 THEN class_id END` |

- UNIQUE `uq_class_subject_primary (primary_class_id)` ⇒ **tối đa một primary/lớp** (MySQL không có
  partial unique index, đây là cách tương đương).
- PK `(class_id, subject_id)` **giữ nguyên**; `source ∈ {LEGACY, CURRICULUM, MANUAL}` giữ nguyên.
- Không thêm UNIQUE `(class_id, is_primary)` (sẽ chặn mọi dòng không primary).

### 3.3. Bảng hiện có khác

| Đối tượng | Thay đổi |
|---|---|
| `school_class.subject_id` | **Giữ**, là bản sao của dòng `is_primary = 1`; mọi thay đổi đi qua một luồng service |
| `subject.code` | Giữ quyết định cũ: INDEX → UNIQUE `(org_id, code)` sau pre-check (D-04) |
| `school_class` | `curriculum_id` + `uq_school_class_id_org` (giữ nguyên Revision 1) |

### 3.4. Migration impact (chưa tạo, chưa chạy)

| Migration | Nội dung |
|---|---|
| **51** | `curriculum`, `curriculum_subject`, `curriculum_subject_prerequisite`, `school_class.curriculum_id`, `uq_school_class_id_org` |
| **52** | `specialty_subject`, `teacher_subject`, `class_subject` (**gồm** `is_primary`, `primary_class_id`, `uq_class_subject_primary`), **`class_subject_history`**, đổi `uq_subject_org_code` |
| **53 (dự phòng)** | Chỉ khi môi trường đã chạy một bản 52 cũ chưa có `is_primary`/history: `ALTER TABLE class_subject ADD …`, backfill primary, `CREATE TABLE class_subject_history` |

- Trong repo hiện tại **không có** file 51/52 nào → đường chuẩn là gộp vào 52, không cần 53.
- `UPDATE` đánh dấu primary phải chạy **trước** khi thêm UNIQUE nếu bảng đã có dữ liệu.
- Pre-check bắt buộc: `database-schema.md` §6.3a (không >1 primary/lớp; lớp có `class_subject`
  phải có primary; primary phải khớp `school_class.subject_id`).

### 3.5. Khác biệt H2 (test)

- H2 không hỗ trợ `STORED` → test schema khai báo `primary_class_id char(36)` thường + UNIQUE,
  service tự set cùng `is_primary`.
- Hệ quả: **test H2 không chứng minh** được ràng buộc DB một-primary → cần kiểm thủ công trên
  MySQL staging (TC-CLS-032).

---

## 4. Thay đổi API

### 4.1. `PUT /api/classes/{id}/subjects/primary` (mới)

Body: `subjectId` (bắt buộc), `reason` (≤500, tuỳ chọn), `expectedVersion` (tuỳ chọn),
`operationId` (tuỳ chọn, idempotent), `plannedSessions`/`sessionMinutes` (chỉ khi tạo dòng mới).

- Quyền: `class.edit`; module `STUDENT_MANAGEMENT`.
- Trạng thái cho phép: `CHUA_BAT_DAU`, `DANG_DIEN_RA`; còn lại 409 `CLASS_NOT_EDITABLE`.
- Transaction: khoá lớp → history → `school_class.subject_id` + version → `class_subject`
  (tái dùng dòng nếu môn đã có; tắt primary cũ; không xoá dòng cũ) → audit.
- Response: `classId`, `primarySubjectId`, `version`, `historyId`, `history{…}`, `teacherAssigned=false`.
- Lỗi: 400 `SUBJECT_INACTIVE`/`REASON_TOO_LONG`; 404 `CLASS_NOT_FOUND`/`SUBJECT_NOT_FOUND`;
  409 `CLASS_NOT_EDITABLE`/`DATA_CHANGED`/`CLASS_SUBJECT_OPERATION_CONFLICT`; 403; 400 module.

### 4.2. `GET /api/classes/{id}/subject-history` (mới)

- Quyền: `class.view`; phân trang `page`/`size`; sắp `changed_at DESC`.
- Trả snapshot thuần, không join `subject`/`staff_profile`.
- Không có endpoint sửa/xoá.

### 4.3. `PUT /api/classes/{id}` (hiện có)

- Nếu `subjectId` **đổi** → phải dùng **cùng** luồng đổi môn chính (history + đồng bộ), không được
  chỉ `UPDATE school_class`.
- Nếu `subjectId` không đổi → hành vi cũ.
- Response `ClassResponse` **không đổi** (không phá FE).

### 4.4. `GET /api/classes/{id}/subjects` (hiện có)

- Thêm `isPrimary` (field mới, không phá).
- Dòng `LEGACY` suy ra chỉ khi lớp **chưa có** `class_subject`; khi đó `isPrimary=true` và
  `teacherId` lấy từ `school_class.teacher_id`.
- Lớp đã có `class_subject`: **không** fallback `teacher_id` từ `school_class`.

### 4.5. Hành vi được nới

- `DANG_DIEN_RA` trước đây bị chặn mọi thay đổi môn; nay **được đổi môn chính**. Đây là nới điều
  kiện, không phá hợp đồng cũ (request/response giữ nguyên).

### 4.6. `DELETE /api/classes/{id}` (hiện có)

- Lớp **chưa có** `class_subject_history` → giữ `204` như hiện tại.
- Lớp **đã có** history → **409 `CONFLICT`** (message: có lịch sử môn); không xoá/CASCADE history.
- Bắt buộc kiểm trước ở service: FK `fk_csh_class … RESTRICT` (nếu bỏ qua, API trả 500 do lỗi FK).

---

## 5. Thay đổi quyền

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| `class.edit` | Dùng lại | Đổi môn chính + áp curriculum + gán môn; ORGANIZATION |
| `class.view` | Dùng lại | Xem danh sách môn + lịch sử đổi môn |
| `curriculum.view/manage` | Giữ D-14 | Không liên quan thao tác đổi môn chính |
| `employee.edit` | Giữ | Gán chuyên môn; không đổi |
| Quyền mới cho đổi môn chính | **Không tạo** | Đã cân nhắc `class.subject.primary`; không cần ở Phase 1 |
| Quyền sửa/xoá history | **Không tồn tại** | Không có API tương ứng |

**Câu hỏi quyền chưa chốt:** không có ở mức nghiệp vụ. Còn một chi tiết kỹ thuật: hiện
`class.edit` là ORGANIZATION-only, nên trưởng phòng DEPARTMENT **không** đổi được môn chính trừ khi
họ còn giữ chức danh ORGANIZATION — tài liệu ghi rõ, không tự mở scope.

---

## 6. Ảnh hưởng tương thích API hiện có

| Điểm | Ảnh hưởng |
|---|---|
| `PUT /classes/{id}` (FE đang dùng) | Request/response **không đổi**; chỉ hành vi khi `subjectId` đổi là khác (nay ghi history). Nếu FE đang đổi `subjectId` cho lớp `DANG_DIEN_RA` và bị 409 trước đây, nay sẽ thành công |
| `DELETE /classes/{id}` (FE đang dùng) | Lớp đã có lịch sử môn: nay **409 `CONFLICT`** thay vì xoá cứng (D-08/D-15 cấm xoá history). Lớp chưa có lịch sử: giữ 204 |
| `GET /classes/{id}/subjects` | Thêm `isPrimary`; FE cũ bỏ qua |
| Kiểm `ensureEditable` hiện tại | Chỉ chặn `DA_KET_THUC/DA_HUY/CLOSED` — khớp D-08, **không cần sửa** điều kiện này ngoài việc thêm luồng history |
| Audit log | Thêm `CLASS_PRIMARY_SUBJECT_CHANGED`; event cũ không đổi |
| Schedule PeopleClient | Không đổi; vẫn nhận `subjectName` mirror. Phase 1 không phát sự kiện đổi môn chính (Phase 2) |
| Gateway | Route `/api/classes/**` đã có → 2 endpoint mới đi qua route hiện tại, không cần sửa APIGateway |

---

## 7. Kiểm thử đã thêm

| ID | Nội dung |
|---|---|
| TC-CLS-021 | Đổi môn chính trước khi bắt đầu |
| TC-CLS-022 | Đổi môn chính khi `DANG_DIEN_RA` |
| TC-CLS-023 | Từ chối `DA_KET_THUC`/`DA_HUY`/`CLOSED` |
| TC-CLS-024 | Môn mới inactive → 400 |
| TC-CLS-025 | Chặn xoá dòng primary |
| TC-CLS-026 | Snapshot mã/tên cũ sau khi môn đổi tên |
| TC-CLS-027 | Lưu `old_teacher_id`; `reason` quá dài |
| TC-CLS-028 | Không chuyển giáo viên sang môn mới |
| TC-CLS-029 | Môn mới đã có → tái dùng dòng, một primary |
| TC-CLS-030 | Rollback khi một bước fail |
| TC-CLS-031 | `expectedVersion` lệch |
| TC-CLS-032 | Hai request đồng thời → không có 2 primary |
| TC-CLS-033 | Cách ly org |
| TC-CLS-034 | Không có API sửa/xoá history |
| TC-CLS-035 | `PUT /classes/{id}` không vòng qua history |
| TC-CLS-036 | Lớp legacy đổi môn chính lần đầu |
| TC-CLS-037 | `DELETE /classes/{id}` khi đã có history → 409 `CONFLICT` |
| TC-CLS-038 | `DELETE /classes/{id}` khi chưa có history → 204 |
| TC-RBAC-014 | Quyền đổi môn chính (`class.edit`) |
| TC-RBAC-015 | Quyền xem history (`class.view`) |

Ánh xạ 14 kịch bản người dùng yêu cầu:

| # | Kịch bản | Test |
|---|---|---|
| 1 | Đổi trước khi bắt đầu | 021 |
| 2 | Đổi khi đang diễn ra | 022 |
| 3 | Từ chối kết thúc/huỷ/đóng | 023 |
| 4 | Giữ snapshot mã/tên | 026 |
| 5 | Giữ giáo viên cũ trong history | 027 |
| 6 | Không chuyển giáo viên | 028 |
| 7 | Môn mới đã có | 029 |
| 8 | Chỉ một primary/lớp | 029, 032 |
| 9 | `school_class.subject_id` khớp primary | 021, 022 |
| 10 | Rollback khi history/sync fail | 030 |
| 11 | Chặn tham chiếu chéo org | 033 |
| 12 | Không có history không nhất quán khi đồng thời | 032 |
| 13 | API thường không xoá history | 034, 025, 037 |
| 14 | `PUT /classes/{id}` không bypass | 035 |

---

## 8. Rủi ro kỹ thuật còn lại

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Đường ghi thứ hai (`PUT /classes/{id}` vs `PUT .../subjects/primary`) lệch nhau | **Cao** | Bắt buộc dùng chung một service; TC-CLS-035 |
| Cột sinh khác nhau giữa MySQL và H2 | Trung bình | Test schema dùng cột thường; kiểm MySQL staging (TC-CLS-032) |
| Backfill/ALTER khi bảng `class_subject` đã có dữ liệu | Trung bình | Chạy pre-check §6.3a; dùng migration 53 dự phòng |
| `school_class.subject_id` bị ghi trực tiếp ở code khác | **Cao** | Rà mọi chỗ gán `subjectId`; chỉ service đổi môn chính được set |
| `DELETE /classes/{id}` rơi lỗi FK (500) thay vì 409 | Trung bình | Service kiểm `class_subject_history` trước khi xoá; TC-CLS-037/038 |
| History phình to | Thấp | Append-only, index `(org_id, class_id, changed_at)`; dọn là quyết định sau |
| Không có cơ chế sửa lịch sử sai (Phase 1) | Thấp | Cố ý ngoài phạm vi; ghi rõ trong D-08 |
| Migration 51/52/53 chưa tạo/chạy | Cao | Người dùng tự tạo, chạy staging trước, backup + rollback đã ghi |

---

## 9. Thứ tự triển khai (tóm tắt)

```text
WP0 baseline → WP1 migration 51/52 (+53 dự phòng) + test schema
             → WP2 Subject (song song được)
             → WP3 Teacher–Subject
             → WP4 Curriculum
             → WP5 Class–Subject + đổi môn chính/history
             → WP6 Internal API/outbox hook (khi cần)
             → WP7 Test + E2E
             → WP8 Handoff FE
```

---

## 10. Quyết định thiết kế còn lại (chi tiết kỹ thuật, không đổi nghiệp vụ)

1. `operationId` lưu vĩnh viễn hay dọn sau 24h? (đề xuất: vĩnh viễn ở Phase 1).
2. `expectedVersion` bắt buộc hay tuỳ chọn cho endpoint primary? (đề xuất: tuỳ chọn).
3. `GET /classes/{id}/subject-history` có cần lọc theo actor/khoảng thời gian? (đề xuất: chưa).
4. `plannedSessions`/`sessionMinutes` khi tạo dòng primary mới: lấy default của `subject` hay bắt
   buộc client gửi? (đề xuất: client gửi nếu có, ngược lại dùng default/NULL).
5. History có cần kèm `source` cũ/mới (LEGACY/CURRICULUM/MANUAL)? (đề xuất: không, snapshot môn là đủ).
6. Có phát event/outbox khi đổi môn chính ở Phase 1? (đề xuất: **không** — Phase 2 khi Schedule cần).

---

## 11. Xác nhận phạm vi

Trong toàn bộ Revision 2:

- **Không** sửa file Java/React/source nào.
- **Không** tạo, sửa hay chạy migration.
- **Không** kết nối, thay đổi hay reset database.
- **Không** sửa `.env`, CORS, `vercel.json`, backend URL, biến môi trường.
- **Không** deploy, restart container, đổi Vercel/Cloudflare.
- **Không** commit, push, merge, reset hay force-push.
- **Không** thêm quyền/mã lỗi/bảng vào source thực tế.
- **Không** triển khai Phase 2.
- **Không** tuyên bố implementation hoàn tất.

Thay đổi duy nhất: các file Markdown trong `docs/phase-1/`.

---

## 12. Điều kiện duy trì `APPROVED`

Trạng thái `APPROVED` áp dụng cho bộ tài liệu tại thời điểm này. Nếu thay đổi một `D-xx`, phải cập
nhật đồng thời và kiểm chéo:

1. `subject-business-requirements.md` (sổ quyết định là nguồn sự thật).
2. `curriculum-business-design.md` + `database-schema.md` + `erd.md`.
3. `api-contract.md` + `validation-and-error-cases.md`.
4. `role-permission-matrix.md` + `teacher-subject-design.md`.
5. `test-cases.md` + `implementation-roadmap.md` + `wp0-readiness-report.md`.

Không có thay đổi nào ngoài D-08/D-15 kể từ Revision 1.
