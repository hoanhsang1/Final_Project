# Phase 1 — Thiết kế quan hệ Giáo viên – Môn học

> Tài liệu thiết kế. Hiện trạng đã kiểm chứng tại HEAD `cdd03b8`. Quyết định nghiệp vụ
> `D-06` (mô hình chuyên môn) và `D-06a` (**không có quy trình duyệt** ở Phase 1) **đã chốt**
> trong `subject-business-requirements.md`. Tài liệu không thay đổi source.

---

## 1. Hiện trạng (đã kiểm chứng)

### 1.1. Mô hình dữ liệu hiện có

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `specialty` | `id, org_id, name, name_unaccented, is_active, created_by, created_at` | UNIQUE `(org_id, name_unaccented)`; không có `subject_id` |
| `teacher_specialty` | `user_id, specialty_id, org_id` | PK `(user_id, specialty_id)`; FK CASCADE tới `teacher_profile`/`specialty` |
| `teacher_profile` | `user_id, org_id, contract_type, teaching_status, version` | `teaching_status ∈ DANG_DAY, TAM_NGHI, NGHI_VIEC`. Lưu ý: API cập nhật giáo viên dùng `staff_profile.version` (không phải cột này) — xem `api-contract.md` §5.2 |
| `subject` | `id, org_id, name, name_unaccented, is_active, …` | Không liên kết vật lý với `specialty` |

### 1.2. Cơ chế kiểm tra "giáo viên dạy được môn" hiện tại

So khớp **theo tên không dấu**, không dùng ID:

- `backend/PeopleService/src/main/java/com/mems/repository/TeacherRepository.java:74-83`
  (`teachesSubject`):
  ```sql
  JOIN teacher_specialty ts
  JOIN specialty s ON s.id = ts.specialty_id AND s.org_id = ts.org_id AND s.is_active = TRUE
  JOIN subject sub ON sub.id = ? AND sub.org_id = ts.org_id AND sub.is_active = TRUE
  WHERE ts.user_id = ? AND ts.org_id = ?
    AND s.name_unaccented = sub.name_unaccented
  ```
- `TeacherRepository.java:278-296` (`subjectMismatch`): lớp có môn mà chuyên môn không trùng tên
  ⇒ trả danh sách lớp lệch; `TeacherService.update` ném `SpecialtyMismatchException` trừ khi
  `confirm=true`.
- `SchoolClassService.assignTeacher` (dòng 185–189): nếu lớp có `subject_id` và
  `teachesSubject=false` → `409 SUBJECT_MISMATCH`.

### 1.3. Hệ quả

| Vấn đề | Ví dụ |
|---|---|
| Đổi tên môn/chuyên môn làm sai kiểm tra âm thầm | Đổi `Toán` → `Toán học` ⇒ giáo viên Toán không còn dạy được lớp Toán |
| Không phân biệt 2 môn cùng chuyên môn | `Toán 10` và `Toán 11` dùng chung chuyên môn `Toán`; không gán riêng được |
| Dữ liệu nhập tự do lệch dấu/khác tên | `Vật lý` vs `Vật lí` (sau khi bỏ dấu đều `vat ly` — may mắn khớp); `Tin` vs `Tin học` thì không |
| Không có lịch sử/duyệt | Không biết ai gán, khi nào, có được duyệt không |
| Không có trạng thái hết hiệu lực | Nghỉ việc vẫn còn `teacher_specialty`; chỉ chặn nhờ `teaching_status` ở luồng gán lớp |

---

## 2. Phương án mô hình

| Phương án | Mô tả | Ưu | Nhược | Ảnh hưởng |
|---|---|---|---|---|
| **A. Giữ Specialty, so tên** | Không đổi schema | Không migration | Phụ thuộc tên; không phân biệt môn cùng chuyên môn | Không |
| **B. `teacher_subject` theo Subject ID** | Bảng nối giáo viên–môn | Chính xác, không phụ thuộc tên | Nhập từng môn; mất cách gán theo chuyên môn | Thêm 1 bảng; đổi `teachesSubject` |
| **C. `specialty_subject` + `teacher_subject`** | Chuyên môn ánh xạ nhiều môn; giáo viên được gán môn trực tiếp, có thể sinh từ chuyên môn | Gán hàng loạt + chính xác theo ID; lưu nguồn gán | Thêm 2 bảng; cần đồng bộ khi đổi ánh xạ | Thêm 2 bảng; backfill |

**Chốt: C (D-06).**

- `specialty_subject` là **ánh xạ danh mục** (chuyên môn ↔ môn), dùng để gợi ý/gán hàng loạt.
- `teacher_subject` là **nguồn sự thật** khi kiểm tra giáo viên dạy môn.
- `teacher_specialty` **giữ nguyên** (lịch sử nhân sự, báo cáo), không xoá.

---

## 3. Mô hình dữ liệu đề xuất

### 3.1. `specialty_subject`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `specialty_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 |
| `org_id` | char(36) | NOT NULL |
| `created_by` | char(36) | NULL |
| `created_at` | datetime(3) | NOT NULL |

PK `(specialty_id, subject_id)`.
FK `(specialty_id, org_id) → specialty(id, org_id)` ON DELETE CASCADE.
FK `(subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
Index `idx_specialty_subject_org_subject(org_id, subject_id)`.

Mục đích: trả lời "chuyên môn Vật lý gồm những môn nào" và gán hàng loạt.

### 3.2. `teacher_subject`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `user_id` | char(36) | PK phần 1 |
| `subject_id` | char(36) | PK phần 2 |
| `org_id` | char(36) | NOT NULL |
| `status` | varchar(20) | NOT NULL DEFAULT `APPROVED`; Phase 1 chỉ dùng `APPROVED`/`REVOKED` (D-06a) |
| `source` | varchar(20) | NOT NULL; `SPECIALTY` / `MANUAL` |
| `approved_by` | char(36) | NULL |
| `approved_at` | datetime(3) | NULL |
| `created_by` | char(36) | NULL |
| `created_at` | datetime(3) | NOT NULL |
| `updated_at` | datetime(3) | NULL |

PK `(user_id, subject_id)`.
FK `(user_id, org_id) → teacher_profile(user_id, org_id)` ON DELETE CASCADE.
FK `(subject_id, org_id) → subject(id, org_id)` ON DELETE RESTRICT.
Index `idx_teacher_subject_org_subject_status(org_id, subject_id, status)`,
`idx_teacher_subject_org_user(org_id, user_id)`.
CHECK `status IN ('PENDING','APPROVED','REVOKED')`, `source IN ('SPECIALTY','MANUAL')`.

**Quy tắc nguồn sự thật:** mọi kiểm tra "dạy được môn" đọc `teacher_subject` với
`status='APPROVED'`; **không** đọc tên.

**Baseline Phase 1 (D-06a, không duyệt):** mọi dòng do API tạo/sinh từ chuyên môn đều ghi
`status='APPROVED'`; thu hồi ghi `REVOKED`. Không có luồng `PENDING`, không có API approve/reject.
Cột `status` và CHECK 3 giá trị vẫn khai báo để Phase 2 mới bật duyệt mà không đổi schema.

### 3.3. Truy vấn thay thế `teachesSubject` (pseudocode)

```
SELECT 1
FROM teacher_subject ts
JOIN teacher_profile tp ON tp.user_id = ts.user_id AND tp.org_id = ts.org_id
JOIN subject sub ON sub.id = ts.subject_id AND sub.org_id = ts.org_id
WHERE ts.user_id = ?
  AND ts.org_id = ?
  AND ts.subject_id = ?
  AND ts.status = 'APPROVED'
  AND sub.is_active = TRUE
  AND tp.teaching_status = 'DANG_DAY'
```

Trong giai đoạn chuyển tiếp (trước khi backfill xong), có thể fallback về so tên cũ; fallback
phải được ghi rõ trong code và có test riêng, không để vĩnh viễn.

---

## 4. Nghiệp vụ chi tiết

### 4.1. BR-TCH-F01 — Quản lý chuyên môn (giữ nguyên + mở rộng)

- **Actor:** OWNER hoặc `employee.edit` (scope theo phòng ban của giáo viên).
- **Hiện tại:** `PUT /teachers/{staffId}` với `specialtyIds`; `SpecialtyController`
  GET `/specialties` (`OWNER | employee.view | employee.edit | class.assign_teacher`),
  POST `/specialties` (`OWNER | employee.edit`).
- **Đề xuất:** thêm ánh xạ chuyên môn → môn:
  - `GET /specialties/{id}/subjects`
  - `PUT /specialties/{id}/subjects` (thay danh sách subjectId)
- **Quyền:** `employee.edit` (+ scope phòng ban); nếu chốt thêm `teacher.expertise.manage` thì
  dùng mã đó (xem `role-permission-matrix.md`).
- **Thay thế:** môn không tồn tại/inactive → `400 INVALID_SPECIALTY`/`SUBJECT_NOT_FOUND`.

### 4.2. BR-TCH-F02 — Gán chuyên môn môn học cho giáo viên

Hai cách:

1. **Theo chuyên môn (bulk):** chọn 1–n chuyên môn ⇒ hệ thống sinh `teacher_subject`
   `source=SPECIALTY` cho mọi `specialty_subject` tương ứng.
2. **Thủ công:** chọn trực tiếp môn ⇒ `source=MANUAL`.

- **Actor:** OWNER hoặc `employee.edit` (trong phạm vi phòng ban của giáo viên).
- **Điều kiện:** giáo viên tồn tại trong org; `teaching_status != NGHI_VIEC`; môn active;
  chưa có cặp `(user_id, subject_id)` hoặc đang `REVOKED` (được kích hoạt lại).
- **Luồng (Phase 1, D-06a không duyệt):**
  1. Ghi `teacher_subject` với `status='APPROVED'` (không có bước duyệt).
  2. Audit `TEACHER_SUBJECT_ASSIGNED` (không dùng `REQUESTED/APPROVED` vì không có luồng duyệt).
  3. Trả danh sách môn hiệu lực.
- **Thay thế:** trùng → 409 `TEACHER_SUBJECT_EXISTS`; môn inactive → 400 `SUBJECT_INACTIVE`;
  giáo viên nghỉ việc → 409 `TEACHER_NOT_AVAILABLE`.

> **Không có luồng duyệt (F03) ở Phase 1.** D-06a đã chốt không duyệt: không quyền
> `teacher.expertise.approve`, không endpoint approve/reject, không trạng thái `PENDING`.

### 4.3. BR-TCH-F04 — Thu hồi chuyên môn

- **Actor:** OWNER hoặc `employee.edit` / `teacher.expertise.manage`.
- **Điều kiện:** giáo viên không còn dạy môn đó ở lớp `DANG_DIEN_RA` **hoặc** người dùng xác
  nhận (`confirm=true`) và hệ thống trả danh sách lớp bị ảnh hưởng.
- **Luồng:** `APPROVED → REVOKED`; **không xoá dòng** (giữ lịch sử).
- **Ảnh hưởng:** giáo viên không còn xuất hiện trong `GET /teachers/assignable?subjectId=`;
  lớp đang gán vẫn giữ `class_subject.teacher_id` (không tự đổi — đúng nguyên tắc Phase 2
  SCH-01: không tự động thay giáo viên).
- **Audit:** `TEACHER_SUBJECT_REVOKED` + `affectedClasses`.

### 4.4. BR-TCH-F05 — Chuyển phòng ban

- Chuyên môn và môn học là **cấp tổ chức** (`org_id`), không thuộc phòng ban.
- `TransferService` đổi `department_member.department_id`; **không** xoá `teacher_specialty`
  hay `teacher_subject`.
- Quyền quản lý chuyên môn sau chuyển: theo phòng ban mới (`employee.edit` scope).
- Lớp cũ vẫn giữ giáo viên; nếu chính sách yêu cầu đổi, dùng luồng phân công lại
  (`class.teacher.reassign`) — không tự động.

### 4.5. BR-TCH-F06 — Nghỉ việc / vô hiệu hoá

- `teaching_status = NGHI_VIEC` ⇒ không xuất hiện trong danh sách assignable; không gán lớp mới.
- `teacher_subject` **giữ nguyên** (lịch sử), nhưng truy vấn hiệu lực lọc `teaching_status`.
- Lớp đang dạy: `ResignationService` đánh dấu `needs_reassignment` (đã có); không tự xoá giáo viên.
- `TAM_NGHI`: chặn gán mới giống `NGHI_VIEC`? Hiện `assignTeacher` chỉ chấp nhận `DANG_DAY`
  ⇒ giữ nguyên.

### 4.6. BR-TCH-F07 — Danh sách giáo viên theo môn (phục vụ gán lớp)

- **API đề xuất:** `GET /teachers/assignable?subjectId={id}` (mở rộng endpoint hiện có).
- **Điều kiện trả về:** `teaching_status='DANG_DAY'`, có position TEACHER, có
  `teacher_subject APPROVED` cho môn, cùng org; lọc phòng ban nếu scope DEPARTMENT.
- **Quyền:** `class.assign_teacher` / `class.teacher.reassign` (như hiện tại).
- **Không trả:** giáo viên nghỉ, không chuyên môn, khác org.

### 4.7. Tóm tắt điều kiện từng luồng (Phase 1)

| Luồng | Actor | Điều kiện đầu vào | Thành công | Thất bại |
|---|---|---|---|---|
| F01 Quản lý chuyên môn | `employee.edit` (+scope) | chuyên môn/môn cùng org, môn active | 200, audit | 400 `INVALID_SPECIALTY`/`SUBJECT_INACTIVE` |
| F02 Gán môn | `employee.edit` | GV tồn tại, `!= NGHI_VIEC`, subject active, chưa trùng | 201, `APPROVED`, audit | 409/400 |
| F04 Thu hồi | như F02 | không dạy lớp active hoặc `confirm=true` | 200 `REVOKED`, audit + danh sách lớp | 409 `IN_USE` |
| F05 Chuyển phòng ban | `TransferService` | luồng chuyển hiện có | đổi phòng, giữ chuyên môn | theo luồng chuyển |
| F06 Nghỉ việc | `teacher.change_status` | trạng thái hợp lệ | `NGHI_VIEC`, loại khỏi assignable | 409 `TEACHER_NOT_AVAILABLE` khi gán |
| F07 Assignable theo môn | `class.assign_teacher` | môn tồn tại/org | danh sách GV đủ điều kiện | 403/404 |
| F08 Đổi môn chính của lớp | `class.edit` | xem `api-contract.md` §4.8 | history + đồng bộ primary | — |

> Phase 1 **không có luồng duyệt** (D-06a); `status` chỉ đi `APPROVED → REVOKED`.

### 4.8. BR-TCH-F08 — Đổi môn chính không chuyển giáo viên (D-08/D-15)

- Đổi môn chính của lớp **không** thay đổi `teacher_subject` của bất kỳ giáo viên nào.
- Dòng `class_subject` của môn mới có `teacher_id = NULL` (dù môn mới đã có dòng sẵn thì giữ
  `teacher_id` hiện có của dòng đó — **không** gán giáo viên của môn cũ).
- Giáo viên cũ vẫn giữ `class_subject.teacher_id` trên dòng môn cũ (dòng này chỉ mất `is_primary`).
- `class_subject_history.old_teacher_id` là **snapshot tham khảo**, không tạo/gỡ `teacher_subject`.
- Gán giáo viên cho môn mới là thao tác riêng (`PUT /classes/{id}/subjects/{subjectId}` với
  `teacherId`) và vẫn kiểm chuyên môn (`SUBJECT_MISMATCH`) + `DANG_DAY`.
- **Không** fallback `school_class.teacher_id` cho dòng môn mới; fallback này chỉ dùng khi lớp
  chưa có `class_subject` nào (dòng `LEGACY` suy ra).

> Hệ quả khi code: `TeacherRepository`/service gán giáo viên theo lớp không được suy giáo viên từ
> `school_class.teacher_id` nếu lớp đã có `class_subject`.

---

## 5. Business Rules

| Mã | Quy tắc |
|---|---|
| BR-TCH-01 | Kiểm tra dạy môn dùng `teacher_subject` + Subject ID, không dùng tên |
| BR-TCH-02 | Chỉ môn **active** mới được gán |
| BR-TCH-03 | Chỉ giáo viên `DANG_DAY` mới được gán lớp mới |
| BR-TCH-04 | `teacher_subject` duy nhất theo `(user_id, subject_id)` |
| BR-TCH-05 | Thu hồi là `REVOKED`, không xoá dòng |
| BR-TCH-06 | Sinh từ chuyên môn ghi `source=SPECIALTY`; gán tay ghi `source=MANUAL` |
| BR-TCH-07 | Chỉ `teacher_subject.status='APPROVED'` mới có hiệu lực. Phase 1 (D-06a) mọi dòng gán đều `APPROVED`, không có `PENDING` |
| BR-TCH-08 | Không tự đổi giáo viên lớp đang dạy khi thu hồi/nghỉ việc |
| BR-TCH-09 | Chuyển phòng ban không đổi chuyên môn/môn |
| BR-TCH-10 | Mọi thay đổi chuyên môn có audit + người thực hiện |
| BR-TCH-11 | `specialty_subject` chỉ là ánh xạ gợi ý/bulk; quyền dạy môn nằm ở `teacher_subject` do API gán tạo |
| BR-TCH-12 | Org A không thấy/gán chuyên môn của org B |
| BR-TCH-13 | Khi đổi tên môn, kiểm tra chuyên môn vẫn đúng (nhờ ID) |
| BR-TCH-14 | Giáo viên có thể dạy nhiều môn; một môn có nhiều giáo viên |
| BR-TCH-15 | Một lớp–một môn có tối đa một giáo viên ở Phase 1 (D-09) |
| BR-TCH-16 | Đổi môn chính của lớp **không** chép/suy giáo viên cũ sang môn mới; giáo viên mới phải gán riêng (D-08/D-15) |
| BR-TCH-17 | `class_subject_history.old_teacher_id` chỉ là snapshot; không tạo/gỡ `teacher_subject` |
| BR-TCH-18 | Fallback `school_class.teacher_id` chỉ áp cho dòng `LEGACY` suy ra khi lớp **chưa có bản ghi `class_subject` tương ứng**; bản ghi đã tồn tại mà `teacher_id = NULL` nghĩa là chưa phân công, **không** fallback (D-09) |

---

## 6. Backfill dữ liệu cũ (draft, không chạy trong tài liệu)

1. `specialty_subject`:
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
2. `teacher_subject`:
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
3. Kiểm đếm trước/sau; báo cáo chuyên môn không ánh xạ được môn nào (dữ liệu nhập tự do).
4. Chỉ sau khi đối soát mới đổi `teachesSubject` sang bảng mới.

> MySQL: câu lệnh trên là **draft minh hoạ**; người dùng tự đưa vào migration riêng theo D-11
> (chỉ backfill khớp chính xác, báo cáo phần mập mờ). Không chạy trên production từ tài liệu này.

---

## 7. Ví dụ

### 7.1. Ánh xạ chuyên môn → môn

| specialty | subject |
|---|---|
| `8888…0001` Toán | `9999…9001` Toán, `9999…9004` Toán 10 |
| `8888…0002` Vật lý | `9999…9002` Vật lý |
| `8888…0003` Tin học | `9999…9003` Tin học |

### 7.2. Giáo viên

| user | môn được dạy | status | source |
|---|---|---|---|
| `2222…0005` | `9999…9001` Toán | APPROVED | SPECIALTY |
| `2222…0005` | `9999…9004` Toán 10 | APPROVED | SPECIALTY |
| `2222…0006` | `9999…9002` Vật lý | APPROVED | MANUAL |

`GET /teachers/assignable?subjectId=9999…9004` trả `2222…0005`; không trả `2222…0006`.

### 7.3. Đổi tên môn

Đổi `Toán` → `Toán học`: `teacher_subject` giữ nguyên ⇒ giáo viên vẫn dạy được. Đây là
khác biệt cốt lõi so với so khớp tên.

---

## 8. Acceptance Criteria

- AC-TCH-01: `teachesSubject` trả đúng theo `teacher_subject APPROVED`, không phụ thuộc tên.
- AC-TCH-02: Đổi tên môn không làm mất quyền dạy của giáo viên.
- AC-TCH-03: Gán môn inactive/khác org bị chặn.
- AC-TCH-04: Giáo viên `NGHI_VIEC` không xuất hiện trong assignable và không gán lớp được.
- AC-TCH-05: Thu hồi môn không tự đổi giáo viên lớp đang dạy; trả danh sách lớp ảnh hưởng.
- AC-TCH-06: Chuyển phòng ban giữ nguyên chuyên môn/môn.
- AC-TCH-07: Phase 1 mọi dòng gán có `status='APPROVED'`; **không** có endpoint approve/reject và
  không tạo ra `PENDING` (D-06a).
- AC-TCH-08: Bulk theo chuyên môn sinh đúng các dòng `source=SPECIALTY`.
- AC-TCH-09: Audit ghi người gán/thu hồi; không có audit approve/reject ở Phase 1.

---

## 9. Quyết định đã chốt & câu hỏi kỹ thuật còn lại

`D-06` = C (`specialty_subject` + `teacher_subject`, `teacher_subject` là nguồn sự thật) và
`D-06a` = **không duyệt** ở Phase 1 **đã chốt**. Các điểm kỹ thuật còn lại:

1. Có cho giáo viên tự đề xuất môn không? (ngoài Phase 1 — không có luồng đề xuất/duyệt)
2. Chỉ áp dụng một chiều: một chuyên môn ánh xạ nhiều môn, một môn có thể thuộc nhiều chuyên môn
   (không phải quyết định nghiệp vụ, chỉ là dữ liệu).
3. Khi thu hồi môn đang dạy lớp `DANG_DIEN_RA`: chặn hay cho phép kèm cảnh báo? (đề xuất: chặn,
   cần `confirm=true`).
4. Có cần phân biệt "giáo viên chính" và "trợ giảng" cho một môn/lớp không? (đề xuất: không ở
   Phase 1 — D-09 một giáo viên/môn/lớp).

---

## Phụ lục A — Ghi chú Phase 2 (không có trong hợp đồng Phase 1)

Phase 1 **không** có quy trình duyệt chuyên môn (D-06a). Không có quyền
`teacher.expertise.approve`, không endpoint approve/reject, không trạng thái `PENDING`.
Nếu Phase 2 quyết định bật duyệt, phải thiết kế và bổ sung đồng thời: quyền vào catalog, API,
mã lỗi, audit và test — không tái sử dụng bất kỳ phần nào của tài liệu này làm hợp đồng.
