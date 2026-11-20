# Phase 1 — Thiết kế Chương trình đào tạo (Curriculum) và Lớp–Môn

> Tài liệu thiết kế. **Chưa có** bảng `curriculum`, `curriculum_subject`, `class_subject` trong source.
> Mọi bảng/cột dưới đây là **đề xuất**; các quyết định nghiệp vụ đánh dấu `NEEDS_USER_DECISION`
> và tham chiếu sổ quyết định `D-xx` trong `subject-business-requirements.md`.
> Người dùng trực tiếp viết code Backend; tài liệu này không thay đổi source.

---

## 1. Mục tiêu và phạm vi

Thiết kế mô hình để trả lời rõ:

1. Một chương trình đào tạo gồm những môn nào.
2. Mỗi môn thuộc học kỳ/giai đoạn nào trong chương trình.
3. Số buổi, số giờ lý thuyết/thực hành, thời lượng buổi khai báo ở đâu.
4. Môn tiên quyết (nếu có) biểu diễn thế nào.
5. Một lớp có thể học nhiều môn không.
6. Được thay đổi chương trình/môn khi lớp đang học không.
7. Dữ liệu lịch sử (buổi đã xếp, lớp đã kết thúc) được bảo vệ ra sao.

Ngoài phạm vi: sinh lịch tự động, phân bổ giáo viên theo tiết, năm học/học kỳ dạng bảng
(Phase 2), học phí, điểm danh.

---

## 2. Hiện trạng liên quan (đã kiểm chứng)

| Thành phần | Hiện trạng |
|---|---|
| Môn của lớp | `school_class.subject_id` nullable, FK RESTRICT → `subject(id, org_id)`; tối đa 1 môn/lớp |
| Năm học | `school_class.academic_year varchar(50)` tự do, không phải bảng |
| Học kỳ/giai đoạn | **Chưa có** |
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
  └── curriculum (template cấp tổ chức)
        └── curriculum_subject (môn + kỳ/giai đoạn + số buổi + giờ LT/TH + tiên quyết)
school_class
  ├── curriculum_id (nullable, tham chiếu template đã áp dụng)
  ├── subject_id (legacy, môn chính)
  └── class_subject (snapshot môn thực tế của lớp + giáo viên theo môn)
```

Nguyên tắc:

- **Template ≠ bản ghi của lớp.** `curriculum_subject` là định nghĩa; `class_subject` là bản
  sao tại thời điểm áp dụng, được phép chỉnh `planned_sessions` trước khi xếp lịch.
- **Không sửa lịch sử:** sửa curriculum không làm đổi `class_subject` của lớp đã áp dụng.
- **Legacy không bị phá:** lớp cũ không có curriculum vẫn đọc/ghi được như hiện tại.

### 3.2. `curriculum`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | char(36) | PK |
| `org_id` | char(36) | NOT NULL |
| `code` | varchar(50) | NOT NULL; UNIQUE `(org_id, code)` |
| `name` | varchar(200) | NOT NULL |
| `name_unaccented` | varchar(200) | NOT NULL; UNIQUE `(org_id, name_unaccented)` |
| `description` | varchar(1000) | NULL |
| `grade_level` | varchar(50) | NULL — khối/niên khoá nếu dùng (NEEDS_USER_DECISION D-02) |
| `program_code` | varchar(50) | NULL — ngành/chương trình nếu dùng (NEEDS_USER_DECISION D-02) |
| `is_active` | tinyint(1) | NOT NULL DEFAULT 1 |
| `version` | bigint | NOT NULL DEFAULT 0 — optimistic lock (D-12) |
| `created_by` | char(36) | NULL |
| `created_at` | datetime(3) | NOT NULL |
| `updated_by` | char(36) | NULL |
| `updated_at` | datetime(3) | NULL |

Unique: `uq_curriculum_id_org(id, org_id)`, `uq_curriculum_org_code(org_id, code)`,
`uq_curriculum_org_name(org_id, name_unaccented)`.
Index: `idx_curriculum_org_active(org_id, is_active)`.

### 3.3. `curriculum_subject`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `curriculum_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 |
| `org_id` | char(36) | NOT NULL |
| `sequence_no` | smallint | NOT NULL — thứ tự trong chương trình; UNIQUE `(curriculum_id, sequence_no)` |
| `term_no` | smallint | NULL — kỳ/giai đoạn nội bộ chương trình (1, 2, …) |
| `required_sessions` | smallint | NOT NULL — tổng số buổi/tiết yêu cầu (đơn vị chốt tại D-03) |
| `theory_sessions` | smallint | NOT NULL DEFAULT 0 |
| `practice_sessions` | smallint | NOT NULL DEFAULT 0 |
| `session_minutes` | smallint | NOT NULL — độ dài 1 buổi (phút) |
| `prerequisite_subject_id` | char(36) | NULL — tối đa 1 tiên quyết (D-07) |
| `is_required` | tinyint(1) | NOT NULL DEFAULT 1 — bắt buộc/tự chọn |
| `note` | varchar(500) | NULL |
| `created_at` | datetime(3) | NOT NULL |
| `updated_at` | datetime(3) | NULL |

PK `(curriculum_id, subject_id)`.
FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE CASCADE.
FK `(subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
FK `(prerequisite_subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
CHECK: `required_sessions > 0`, `session_minutes > 0`, `theory_sessions >= 0`,
`practice_sessions >= 0`, `theory_sessions + practice_sessions = required_sessions`
(nếu chốt rằng required = LT + TH; nếu không, bỏ check này — xem D-03).

> **Lưu ý:** `term_no` chỉ là số/ký hiệu trong chương trình. Bảng năm học/học kỳ thật
> (`academic_term`) thuộc Phase 2; Phase 1 không tạo để tránh trùng chức năng.

### 3.4. `class_subject`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `class_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 |
| `org_id` | char(36) | NOT NULL |
| `curriculum_id` | char(36) | NULL — curriculum đã áp dụng khi tạo dòng |
| `source` | varchar(20) | NOT NULL — `LEGACY` / `CURRICULUM` / `MANUAL` |
| `teacher_id` | char(36) | NULL — giáo viên môn này (D-09) |
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

PK `(class_id, subject_id)`; UNIQUE không cần thêm.
FK `(class_id) → school_class(id)` ON DELETE CASCADE.
FK `(subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
FK `(class_id, org_id)` gián tiếp qua school_class; có thể thêm FK tổng hợp nếu muốn chặt.
FK `(teacher_id, org_id) → staff_profile(user_id, org_id)` ON DELETE RESTRICT (đồng bộ với `school_class.teacher_id`; service kiểm thêm `teacher_profile`).
FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE RESTRICT (không dùng SET NULL vì FK tổ hợp sẽ set cả `org_id`).
CHECK `status IN ('PLANNED','ACTIVE','COMPLETED','CANCELLED')`.
Index: `idx_class_subject_org_subject(org_id, subject_id)`, `idx_class_subject_teacher(teacher_id)`.

### 3.5. Thay đổi trên `school_class`

| Cột mới | Kiểu | Ghi chú |
|---|---|---|
| `curriculum_id` | char(36) NULL | FK `(curriculum_id, org_id) → curriculum(id, org_id)` ON DELETE RESTRICT |

- **Không** xoá `subject_id`; giữ làm môn chính legacy (D-01 phương án C).
- **Không** đổi `academic_year` ở Phase 1; Phase 2 thay bằng `academic_term_id` nếu chốt.

---

## 4. Nghiệp vụ chi tiết

### 4.1. BR-CUR-F01 — Tạo curriculum

- **Actor:** OWNER hoặc người có `curriculum.manage` (đề xuất) / `subject.manage` (phương án
  không thêm quyền — xem `role-permission-matrix.md`).
- **Điều kiện:** `code` + `name` hợp lệ; `code` duy nhất trong tổ chức; module đang bật.
- **Luồng chính:**
  1. `orgId` từ JWT.
  2. Kiểm `(org_id, code)` và `(org_id, name_unaccented)`.
  3. Insert `curriculum` với `is_active=true`, `version=0`.
  4. Audit `CURRICULUM_CREATED`.
- **Thay thế:** trùng → 409 `CURRICULUM_CODE_EXISTS` / `CONFLICT`.
- **Quyền:** ghi (xem ma trận).

### 4.2. BR-CUR-F02 — Thêm môn vào curriculum

- **Actor:** người có quyền quản lý curriculum.
- **Điều kiện:**
  - Curriculum tồn tại, đang active (hoặc cho sửa cả inactive? đề xuất chỉ active).
  - Subject tồn tại, **active**, cùng tổ chức.
  - Chưa có cặp `(curriculum_id, subject_id)`.
  - `sequence_no` chưa dùng.
  - `required_sessions`, `session_minutes` > 0; LT + TH khớp tổng (nếu chốt).
  - Tiên quyết (nếu có) là môn khác, cùng org, **không tạo chu trình**.
- **Luồng chính:** insert `curriculum_subject`; audit `CURRICULUM_SUBJECT_ADDED`; tăng
  `curriculum.version`.
- **Thay thế:** trùng môn → 409 `CURRICULUM_SUBJECT_DUPLICATE`; trùng thứ tự → 409;
  chu trình tiên quyết → 400 `SUBJECT_PREREQUISITE_CYCLE` (đề xuất).
- **Quyền:** ghi.

### 4.3. BR-CUR-F03 — Sửa/Xoá môn trong curriculum

- Sửa: cập nhật các cột định nghĩa; không đổi `subject_id` (muốn đổi thì xoá + thêm).
- Xoá: chỉ khi curriculum chưa được lớp nào tham chiếu **hoặc** người dùng xác nhận rằng
  lớp đã có `class_subject` giữ snapshot (xoá không ảnh hưởng lớp).
- **Đề xuất:** cho xoá tự do ở template; lớp đã áp dụng không bị đổi vì đã snapshot.
  Nếu có ràng buộc "không cho sửa curriculum đang được lớp active dùng", cần chốt (D-08).
- Audit `CURRICULUM_SUBJECT_UPDATED/REMOVED`.

### 4.4. BR-CUR-F04 — Áp dụng curriculum cho lớp

- **Actor:** người có quyền sửa lớp (`class.edit`) và quyền curriculum (đề xuất yêu cầu cả hai).
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
  toàn bộ (cần chốt).
- **Thay thế:** lớp đã bắt đầu → 409 `CLASS_NOT_EDITABLE` (hoặc mã riêng
  `CLASS_SUBJECT_LOCKED`); curriculum inactive → 400 `CURRICULUM_INACTIVE`.

### 4.5. BR-CUR-F05 — Gán/bỏ môn thủ công cho lớp

- Cho phép thêm môn ngoài curriculum (`source=MANUAL`) khi lớp `CHUA_BAT_DAU`.
- Bắt buộc nhập `planned_sessions` và `session_minutes` (không có default từ curriculum).
- Xoá môn: chỉ khi chưa có buổi học. Phase 1 **không gọi sang Schedule**; dùng trạng thái lớp
  làm chốt: `CHUA_BAT_DAU` mới được sửa danh sách môn. Nếu lớp `DANG_DIEN_RA` cần thêm môn,
  cần quyết định riêng (D-08).

### 4.6. BR-CUR-F06 — Đổi curriculum khi lớp đang học

**Đề xuất snapshot (D-08):**

- `class_subject` đã tạo **không** bị sửa khi curriculum thay đổi.
- Lớp `DANG_DIEN_RA`: không cho áp curriculum mới/xoá môn; chỉ cho sửa metadata không ảnh
  hưởng lịch (ghi chú).
- Lớp `DA_KET_THUC/DA_HUY/CLOSED`: read-only.

Nếu người dùng muốn cập nhật lớp đang học, cần thiết kế thêm luồng "điều chỉnh giữa kỳ"
(ngoài Phase 1).

### 4.7. Tóm tắt điều kiện từng luồng

| Luồng | Actor | Điều kiện đầu vào | Thành công | Thất bại |
|---|---|---|---|---|
| F01 Tạo curriculum | OWNER / `curriculum.manage` / `subject.manage` | code+name hợp lệ, chưa trùng, module bật | 201, `is_active=true`, `version=0`, audit | 409 trùng; 400 DTO; 403 |
| F02 Thêm môn | như F01 | curriculum active, subject active/org, chưa trùng, sequence trống, tiên quyết hợp lệ | 201, version tăng, audit | 404/409/400 tương ứng |
| F03 Sửa/xoá môn template | như F01 | curriculum tồn tại, version khớp | 200/204, version tăng, audit | 404, 409 `DATA_CHANGED` |
| F04 Áp curriculum | `class.edit` + quyền curriculum | lớp `CHUA_BAT_DAU`, curriculum active/org, version khớp | 200, tạo/cập nhật `class_subject`, version lớp tăng | 409 `CLASS_SUBJECT_LOCKED`/`DATA_CHANGED`; 400 |
| F05 Gán/bỏ môn thủ công | `class.edit` | lớp `CHUA_BAT_DAU`, subject active | 201/200, `source=MANUAL` | 409 trùng/không editable; 400 |
| F06 Đổi khi đang học | — | **không cho** (snapshot) | — | 409 `CLASS_SUBJECT_LOCKED` |

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
| BR-CUR-07 | `theory_sessions + practice_sessions = required_sessions` nếu chốt cách tính này |
| BR-CUR-08 | Tiên quyết phải là môn khác, cùng org, không tạo chu trình |
| BR-CUR-09 | Curriculum inactive không áp dụng được cho lớp mới |
| BR-CUR-10 | Áp dụng curriculum chỉ khi lớp `CHUA_BAT_DAU` |
| BR-CUR-11 | `class_subject` là snapshot; sửa curriculum không lan sang lớp |
| BR-CUR-12 | Lớp không có curriculum vẫn hợp lệ (legacy) |
| BR-CUR-13 | `class_subject` nguồn `LEGACY` không bị tự động xoá khi áp curriculum, trừ khi chọn thay thế |
| BR-CUR-14 | `school_class.subject_id` được coi là môn chính nếu chưa có `class_subject` |
| BR-CUR-15 | Một môn/lớp có tối đa một giáo viên ở Phase 1 (D-09) |
| BR-CUR-16 | Giáo viên môn phải có chuyên môn theo ID (D-06) |
| BR-CUR-17 | Xoá curriculum: chỉ khi không còn lớp tham chiếu; thực tế dùng `is_active=0` (FK RESTRICT) |
| BR-CUR-18 | Mọi thao tác ghi đều audit và tăng `version` tương ứng |
| BR-CUR-19 | Không tạo bảng năm học/học kỳ ở Phase 1 (tránh trùng Phase 2) |
| BR-CUR-20 | `planned_sessions` không được âm; nếu có buổi đã xếp, không cho giảm dưới số đã dùng (Phase 2) |

---

## 6. Ví dụ dữ liệu

### 6.1. Curriculum

| id | org_id | code | name | grade_level | is_active | version |
|---|---|---|---|---|---|---|
| `c0000000-0000-4000-8000-000000000001` | `1111…1111` | `CT-K10-2026` | Chương trình Khối 10 – 2026 | `K10` | 1 | 0 |

### 6.2. Curriculum subjects

| curriculum_id | subject_id | sequence | term_no | required | theory | practice | minutes | prerequisite |
|---|---|---|---|---|---|---|---|---|
| `c000…0001` | `9999…9001` (Toán) | 1 | 1 | 60 | 45 | 15 | 45 | NULL |
| `c000…0001` | `9999…9002` (Vật lý) | 2 | 1 | 45 | 30 | 15 | 45 | `9999…9001` |
| `c000…0001` | `9999…9003` (Tin học) | 3 | 2 | 30 | 0 | 30 | 90 | NULL |

> Các con số chỉ là **ví dụ**; đơn vị "tiết" và độ dài 45/90 phút **chưa được chốt** (D-03).

### 6.3. Áp dụng cho lớp C001

`class_subject` sau khi áp dụng:

| class_id | subject_id | source | curriculum_id | required | planned | teacher_id | status |
|---|---|---|---|---|---|---|---|
| `5555…5001` | `9999…9001` | CURRICULUM | `c000…0001` | 60 | 60 | `2222…0005` | PLANNED |
| `5555…5001` | `9999…9002` | CURRICULUM | `c000…0001` | 45 | 45 | `2222…0006` | PLANNED |
| `5555…5001` | `9999…9003` | CURRICULUM | `c000…0001` | 30 | 30 | NULL | PLANNED |

`school_class.curriculum_id = c000…0001`; `school_class.subject_id` vẫn là `9999…9001`
(legacy, môn chính).

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
      "status": "PLANNED"
    }
  ]
}
```

---

## 7. Ảnh hưởng dữ liệu cũ

1. `school_class.subject_id` NULL: không tạo `class_subject`; API trả danh sách rỗng.
2. `school_class.subject_id` có giá trị: có thể backfill `class_subject` nguồn `LEGACY`
   **hoặc** tính động khi đọc. Đề xuất backfill một lần (D-11) để API mới đơn giản.
3. Lớp đã kết thúc: backfill vẫn giữ snapshot lịch sử; không đổi trạng thái.
4. Môn bị ngừng: `class_subject` cũ vẫn giữ FK; không cho thêm mới.
5. Schedule mirror `class.subject` (text): Phase 1 **không** sửa Schedule; khi Phase 2 làm
   xếp lịch sẽ dùng `subjectId`.

---

## 8. Acceptance Criteria

- AC-CUR-01: Tạo curriculum + thêm 3 môn thành công; trùng code/môn/thứ tự bị chặn đúng mã lỗi.
- AC-CUR-02: Không thêm được môn inactive hoặc môn org khác.
- AC-CUR-03: Tiên quyết tạo chu trình bị chặn (`SUBJECT_PREREQUISITE_CYCLE`).
- AC-CUR-04: Áp curriculum cho lớp `CHUA_BAT_DAU` tạo đúng các dòng `class_subject` snapshot.
- AC-CUR-05: Sửa curriculum sau khi áp dụng **không** đổi `class_subject` của lớp.
- AC-CUR-06: Áp curriculum cho lớp `DANG_DIEN_RA` bị chặn 409.
- AC-CUR-07: Lớp legacy có `subject_id` vẫn trả danh sách môn qua API mới.
- AC-CUR-08: Xoá môn khỏi lớp chỉ thành công khi lớp `CHUA_BAT_DAU`.
- AC-CUR-09: Mọi thao tác ghi có audit + version tăng.

---

## 9. Câu hỏi mở

1. D-01, D-02, D-03, D-07, D-08, D-09, D-12 (mục 3 tài liệu subject).
2. Curriculum có cần `grade_level`/`program_code` không, hay chỉ `name` + `code`?
3. "Học kỳ" trong chương trình là số thứ tự (`term_no`) hay tham chiếu bảng học kỳ thật?
4. `required_sessions` là số **buổi** hay số **tiết**? Một buổi = mấy tiết?
5. `required_sessions` có bắt buộc bằng `theory + practice` không?
6. Khi áp curriculum thay thế, có xoá các môn `MANUAL` hiện có không?
7. Có cho một lớp học 2 curriculum (song bằng) không?
8. Có cần clone curriculum (`POST /curricula/{id}/clone`) không?
