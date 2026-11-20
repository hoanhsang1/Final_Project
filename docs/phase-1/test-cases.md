# Phase 1 — Test Cases & Acceptance Criteria

> Tài liệu thiết kế kiểm thử. Test case đánh dấu **UT** (unit), **IT** (integration/H2),
> **API** (HTTP/MockMvc), **E2E** (gateway + FE), **DB** (kiểm migration/constraint),
> **SEC** (bảo mật). Không có test nào được chạy trong tài liệu này.
> Quy ước lỗi: `validation-and-error-cases.md`. API: `api-contract.md`.

---

## 1. Chiến lược kiểm thử

| Lớp | Công cụ hiện có | Phạm vi |
|---|---|---|
| Unit | JUnit 5 + Mockito | Rule thuần: chu trình tiên quyết, tính LT/TH, chọn giáo viên |
| Integration | `@JdbcTest` / `@SpringBootTest` + H2 MySQL mode | Repository/SQL, org isolation, unique, version |
| API | MockMvc hoặc HTTP thật | Validation, mã lỗi, quyền, JSON contract |
| E2E | Gateway + People + Identity + FE | Luồng giáo vụ tạo curriculum → áp lớp |
| DB | MySQL staging (không production) | DDL, FK, CHECK, backfill, index |
| SEC | JWT/role | 401/403, cross-org, tự duyệt |

Lưu ý môi trường:

- Backend chạy offline theo service: `cd backend/PeopleService && ./mvnw -o test`.
- Test H2 **không thay thế** kiểm MySQL thật (H2 dễ bỏ qua khác biệt CHECK/FK).
- Mỗi test dùng `org_id` riêng hoặc dọn bảng trong `@BeforeEach` để tránh nhiễm dữ liệu.
- Tắt outbox publisher trong test properties (`outbox.publisher.enabled=false`) như hiện tại.

---

## 2. Fixture chuẩn

| Thực thể | ID | Ghi chú |
|---|---|---|
| Org A | `11111111-1111-4111-8111-111111111111` | |
| Org B | `eff0ce1e-1234-4892-a9f7-031383a681a5` | |
| Subject Toán | `99999999-9999-4999-8999-999999999001` | code `TOAN`, active |
| Subject Vật lý | `99999999-9999-4999-8999-999999999002` | code `LY`, active |
| Subject Tin học | `99999999-9999-4999-8999-999999999003` | code `TIN`, active |
| Subject ngừng | `99999999-9999-4999-8999-999999999009` | active=false |
| Lớp C001 | `55555555-5555-4555-8555-555555555001` | `CHUA_BAT_DAU`, subject Toán |
| Lớp C002 | `55555555-5555-4555-8555-555555555002` | `DANG_DIEN_RA`, subject Toán |
| Lớp C003 | `55555555-5555-4555-8555-555555555003` | `DA_KET_THUC` |
| Lớp C005 | `55555555-5555-4555-8555-555555555005` | `DANG_DIEN_RA`, `close_state=CLOSED` |
| Lớp không môn | `f5aff886-cfa1-4e7f-863d-5cf5855ecd58` | org B, `subject_id` NULL |
| Giáo viên Toán | `22222222-2222-4222-8222-222222222005` | `DANG_DAY` |
| Giáo viên Lý | `22222222-2222-4222-8222-222222222006` | `TAM_NGHI` |
| Chuyên môn Toán | `88888888-8888-4888-8888-888888888001` | |
| Chuyên môn Vật lý | `88888888-8888-4888-8888-888888888002` | |
| Chuyên môn Tin học | `88888888-8888-4888-8888-888888888003` | |

Curriculum mẫu: `c0000000-0000-4000-8000-000000000001` (`CT-K10-2026`), 3 môn như
`curriculum-business-design.md` mục 6.

---

## 3. Subject

| ID | Mục tiêu | Đầu vào | Các bước | Kết quả mong đợi | Loại |
|---|---|---|---|---|---|
| TC-SUB-001 | Tạo môn thành công | code `TOAN10`, name `Toán 10` | POST `/subjects` với `subject.manage` | 201, `active=true`, `Location`, audit `SUBJECT_CREATED` | API |
| TC-SUB-002 | Thiếu tên | `{code:"X"}` | POST | 400 `INVALID_KEY`/`NAME_REQUIRED`, không tạo | API |
| TC-SUB-003 | Tên quá dài | name 201 ký tự | POST | 400 `NAME_TOO_LONG` | API |
| TC-SUB-004 | Trùng tên khác dấu/hoa thường | `toán`, `TOÁN` | POST lần 2 | 409 `CONFLICT` | IT |
| TC-SUB-005 | Trùng mã (D-04) | code `TOAN` đã tồn tại | POST | 409 `SUBJECT_CODE_EXISTS` | API |
| TC-SUB-006 | Sửa môn | đổi mã/name/description | PUT | 200, `updatedAt` có giá trị, audit `SUBJECT_UPDATED` | API |
| TC-SUB-007 | Sửa sang mã của môn khác | code trùng | PUT | 409 `SUBJECT_CODE_EXISTS` | API |
| TC-SUB-008 | Xem chi tiết | id hợp lệ | GET | 200 đúng trường `SubjectResponse` | API |
| TC-SUB-009 | Tìm theo tên và mã | `q=toan`, `q=TOAN10` | GET | Trả đúng môn (nếu áp tìm cả code) | API |
| TC-SUB-010 | Lọc inactive theo quyền | `includeInactive=true` | GET với user chỉ `subject.view` | Không thấy inactive; OWNER thấy | SEC |
| TC-SUB-011 | Ngừng môn đang dạy | active=false | PATCH status | 200, audit có `classesUsingSubject > 0` | API |
| TC-SUB-012 | Kích hoạt lại | active=true | PATCH | 200, lớp chọn được môn | API |
| TC-SUB-013 | Cách ly org | ID môn org B | GET/PUT/PATCH với org A | 404 `SUBJECT_NOT_FOUND` | SEC |
| TC-SUB-014 | Không có quyền ghi | user `subject.view` | POST/PUT/PATCH | 403 `FORBIDDEN` | SEC |
| TC-SUB-015 | check-code | code mới / code tồn tại | GET check-code | `available=true/false`, `existingId` đúng | API |
| TC-SUB-016 | DB lỗi không trả rỗng | mock JdbcTemplate ném lỗi | GET list | 500 `UNCATEGORIZED_EXCEPTION`, không phải `[]` | UT |
| TC-SUB-017 | Module tắt (D-10) | org tắt `STUDENT_MANAGEMENT` | POST | 400 `MODULE_NOT_ENABLED` | API |
| TC-SUB-018 | usage | môn có 3 lớp | GET usage | `classesUsingSubject=3`, danh sách đúng | API |
| TC-SUB-019 | Mã trùng giữa 2 org | cùng code ở org A/B | POST mỗi org | Cả hai 201 | IT |
| TC-SUB-020 | Mã để trống legacy | code NULL | POST (nếu D-04 cho NULL) | 201; nhiều bản ghi NULL cùng org được | DB |

---

## 4. Curriculum

| ID | Mục tiêu | Đầu vào | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-CUR-001 | Tạo curriculum | code/name hợp lệ | 201, active, version=0, audit | API |
| TC-CUR-002 | Trùng code | code đã có trong org | 409 `CURRICULUM_CODE_EXISTS` | API |
| TC-CUR-003 | Trùng tên khác dấu | `Chương trình 10` / `chuong trinh 10` | 409 `CONFLICT` | IT |
| TC-CUR-004 | Chi tiết kèm môn | GET sau khi thêm 3 môn | 200, `subjects` đúng thứ tự `sequenceNo` | API |
| TC-CUR-005 | Thêm môn | subject Toán | 201, version tăng | API |
| TC-CUR-006 | Trùng môn | thêm Toán lần 2 | 409 `CURRICULUM_SUBJECT_DUPLICATE` | API |
| TC-CUR-007 | Trùng thứ tự | `sequenceNo=1` đã dùng | 409 `CURRICULUM_SEQUENCE_DUPLICATE` | API |
| TC-CUR-008 | LT+TH ≠ tổng | 30 + 10 ≠ 45 | 400 `THEORY_PRACTICE_MISMATCH` | UT |
| TC-CUR-009 | Chu trình tiên quyết | A→B→C→A | 400 `SUBJECT_PREREQUISITE_CYCLE`, data path | UT |
| TC-CUR-010 | Tự tiên quyết | prerequisite = subjectId | 400 `SUBJECT_PREREQUISITE_CYCLE` | UT |
| TC-CUR-011 | Version cũ | PUT version=0 khi đã 3 | 409 `DATA_CHANGED` | IT |
| TC-CUR-012 | Ngừng curriculum | active=false | 200; áp cho lớp mới → 400 `CURRICULUM_INACTIVE` | API |
| TC-CUR-013 | Sửa template không đổi snapshot | đổi số buổi sau khi lớp đã áp | `class_subject` lớp giữ số cũ | IT |
| TC-CUR-014 | Phân trang | 25 curriculum, page=2 size=10 | 10 item, `total=25` | API |
| TC-CUR-015 | Clone | clone với code mới | 201, copy đủ môn, version=0 | API |
| TC-CUR-016 | Thêm môn org khác | subject org B vào curriculum org A | 400 `SUBJECT_NOT_FOUND` | SEC |
| TC-CUR-017 | Thêm môn inactive | subject active=false | 400 `SUBJECT_INACTIVE` | API |
| TC-CUR-018 | Xoá môn khỏi template | DELETE | 200/204, version tăng, lớp đã áp không đổi | API |

---

## 5. Lớp – Môn

| ID | Mục tiêu | Đầu vào | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-CLS-001 | Lớp legacy | C001 có `subject_id`, chưa backfill | GET trả 1 dòng `source=LEGACY` | IT |
| TC-CLS-002 | Lớp nhiều môn | sau áp curriculum | GET trả đủ 3 môn, đúng field | IT |
| TC-CLS-003 | Áp curriculum thành công | C001 `CHUA_BAT_DAU` | 200, tạo 3 `class_subject`, version lớp tăng | IT |
| TC-CLS-004 | Áp với môn inactive | curriculum chứa môn vừa ngừng | 400 `SUBJECT_INACTIVE`, không ghi | IT |
| TC-CLS-005 | Áp cho lớp đang học | C002 `DANG_DIEN_RA` | 409 `CLASS_SUBJECT_LOCKED` | API |
| TC-CLS-006 | Version lệch | version sai | 409 `DATA_CHANGED` | API |
| TC-CLS-007 | Thiếu confirmReplace | lớp đã có curriculum khác, `confirmReplace=false` | 409 `DATA_CHANGED`/`CONFLICT` (cần chốt mã) | API |
| TC-CLS-008 | Giữ môn MANUAL | `keepManualSubjects=true` | Môn manual còn, môn curriculum thay đúng | IT |
| TC-CLS-009 | Thêm môn thủ công | Tin học, 30 buổi, 90 phút | 201, `source=MANUAL` | API |
| TC-CLS-010 | Thêm trùng môn | Toán đã có | 409 `CLASS_SUBJECT_EXISTS` | API |
| TC-CLS-011 | Sửa plannedSessions | 60 → 55 | 200, version tăng | API |
| TC-CLS-012 | Xoá môn trước khi bắt đầu | C001 | 200, môn biến mất | API |
| TC-CLS-013 | Xoá môn khi đang học | C002 | 409 `CLASS_SUBJECT_LOCKED` | API |
| TC-CLS-014 | Giáo viên không chuyên môn | gán GV Lý cho môn Toán | 409 `SUBJECT_MISMATCH` | IT |
| TC-CLS-015 | Giáo viên nghỉ | GV `NGHI_VIEC`/`TAM_NGHI` | 409 `TEACHER_NOT_AVAILABLE` | IT |
| TC-CLS-016 | Cách ly org | class org B với JWT org A | 404 `CLASS_NOT_FOUND` | SEC |
| TC-CLS-017 | Version tăng đúng | sau mỗi thao tác ghi | `school_class.version` +1 | IT |
| TC-CLS-018 | Lớp đã đóng | C005 `close_state=CLOSED` | 409 `CLASS_NOT_EDITABLE` | API |

---

## 6. Giáo viên – Môn

| ID | Mục tiêu | Đầu vào | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-TCH-001 | Xem môn của GV | GV Toán | Danh sách có Toán, đúng status/source | API |
| TC-TCH-002 | Gán môn thủ công | thêm Toán 10 | 201, `source=MANUAL` | API |
| TC-TCH-003 | Trùng môn | gán lại | 409 `TEACHER_SUBJECT_EXISTS` | API |
| TC-TCH-004 | Môn inactive | subject active=false | 400 `SUBJECT_INACTIVE` | API |
| TC-TCH-005 | Bulk theo chuyên môn | chọn chuyên môn Toán | Sinh môn từ `specialty_subject`, `source=SPECIALTY` | IT |
| TC-TCH-006 | Bulk thu hồi đang dạy | bỏ Toán khi đang dạy C002 | 409 `TEACHER_SUBJECT_IN_USE` + danh sách lớp | API |
| TC-TCH-007 | Bulk thu hồi có xác nhận | `confirmRevokeInUse=true` | 200, status `REVOKED`, lớp không đổi GV | IT |
| TC-TCH-008 | Duyệt PENDING | approve | 200 `APPROVED`, `approvedBy/At` | API |
| TC-TCH-009 | Duyệt lại | approve lần 2 | 409 `TEACHER_SUBJECT_NOT_PENDING` | API |
| TC-TCH-010 | Từ chối | reject có lý do | 200 `REVOKED` | API |
| TC-TCH-011 | Tự duyệt | người yêu cầu tự approve | 403 `SELF_APPROVAL_NOT_ALLOWED` | SEC |
| TC-TCH-012 | Đổi tên môn | đổi Toán → Toán học | `teachesSubject` vẫn true | IT |
| TC-TCH-013 | Giáo viên nghỉ việc | `NGHI_VIEC` | Không có trong assignable; `teachesSubject=false` | IT |
| TC-TCH-014 | Chuyển phòng ban | đổi department | `teacher_subject`/`teacher_specialty` giữ nguyên | IT |
| TC-TCH-015 | Cách ly org | GV org B | 404 | SEC |
| TC-TCH-016 | assignable theo môn | `subjectId=Tin học` | Chỉ GV có Tin học APPROVED | API |
| TC-TCH-017 | Sửa ánh xạ chuyên môn | thêm môn vào chuyên môn | `specialty_subject` cập nhật, không tự cấp `teacher_subject` nếu có duyệt | IT |
| TC-TCH-018 | Version giáo viên | bulk với version cũ | 409 `DATA_CHANGED` | API |

---

## 7. RBAC & bảo mật

| ID | Mục tiêu | Đầu vào | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-RBAC-001 | View-only ghi môn | `subject.view` | 403 | SEC |
| TC-RBAC-002 | Trưởng phòng ghi môn | position DEPARTMENT | 403 (khi giữ ORGANIZATION-only) | SEC |
| TC-RBAC-003 | Owner toàn quyền | OWNER | Mọi thao tác thành công | SEC |
| TC-RBAC-004 | Uỷ quyền | delegation `subject.manage` còn hạn | Thành công; hết hạn → 403 | SEC |
| TC-RBAC-005 | Lọc phòng ban | `class.view` scope DEPT | Chỉ thấy lớp phòng mình | SEC |
| TC-RBAC-006 | Module tắt | `STUDENT_MANAGEMENT` off | 400 `MODULE_NOT_ENABLED` | SEC |
| TC-RBAC-007 | Audit org | user không `org.audit.view` | 403 khi gọi audit | SEC |
| TC-RBAC-008 | Không token | không Authorization | 401 `UNAUTHENTICATED` | SEC |
| TC-RBAC-009 | Chuyên môn theo phòng ban | `employee.edit` DEPT | Chỉ sửa GV phòng mình | SEC |
| TC-RBAC-010 | Duyệt chuyên môn | không `teacher.expertise.approve` | 403 | SEC |

---

## 8. Dữ liệu cũ & migration

| ID | Mục tiêu | Cách kiểm | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-LEG-001 | Trùng mã trước UNIQUE | query 6.1 trong `database-schema.md` | 0 dòng; nếu >0 thì dừng migration | DB |
| TC-LEG-002 | Backfill `class_subject` | đếm trước/sau | Số dòng = số lớp có `subject_id`, không trùng | DB |
| TC-LEG-003 | Không đổi dữ liệu lớp | so `school_class` trước/sau | `subject_id/teacher_id/status` không đổi | DB |
| TC-LEG-004 | Backfill idempotent | chạy lại script | Không thêm dòng trùng | DB |
| TC-LEG-005 | Lớp không môn | GET subjects | `subjects=[]`, không lỗi | API |
| TC-LEG-006 | Giữ `teacher_specialty` | so bảng trước/sau | Không mất dòng | DB |
| TC-LEG-007 | Org chéo sau backfill | query 6.4 | 0 dòng | DB |
| TC-LEG-008 | H2 vs MySQL | chạy IT + DDL staging | Constraint giống nhau | DB |

---

## 9. Đồng thời

| ID | Mục tiêu | Cách kiểm | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-CON-001 | Tạo trùng mã đồng thời | 2 request song song | 1×201, 1×409 `SUBJECT_CODE_EXISTS` | IT |
| TC-CON-002 | Áp curriculum đồng thời | 2 request cùng version | 1×200, 1×409 `DATA_CHANGED` | IT |
| TC-CON-003 | Sửa curriculum đồng thời | 2 PUT cùng version | 1×200, 1×409 | IT |
| TC-CON-004 | Trạng thái lớp đổi giữa chừng | scheduler chuyển `DANG_DIEN_RA` | Request sửa môn nhận 409 `CLASS_SUBJECT_LOCKED` | IT |
| TC-CON-005 | Bulk chuyên môn đồng thời | 2 PUT cùng version | 1×200, 1×409 | IT |

---

## 10. Ma trận Acceptance Criteria

| AC | Test case |
|---|---|
| AC-SUB-01…08 | TC-SUB-001…020 |
| AC-CUR-01…09 | TC-CUR-001…018 |
| AC-TCH-01…09 | TC-TCH-001…018 |
| AC-RBAC-01…06 | TC-RBAC-001…010 |
| AC-VAL-01…07 | E-01…E-24 |
| Legacy | TC-LEG-001…008 |
| Concurrency | TC-CON-001…005 |

---

## 11. Điều kiện "Done" cho kiểm thử

1. Tất cả test hiện có vẫn xanh (không regression): Identity 78, People 319, Schedule 19,
   Facility 9, Gateway 3 (số tại thời điểm khảo sát; có thể thay đổi khi thêm test).
2. Test mới chạy offline (`./mvnw -o test`) cho từng service bị ảnh hưởng.
3. Có ít nhất 1 kịch bản E2E qua gateway: tạo môn → tạo curriculum → áp lớp → xem lớp–môn.
4. Kiểm MySQL staging cho DDL/backfill (không production).
5. Báo cáo test ghi rõ test nào chạy H2, test nào chạy MySQL, test nào chưa chạy được.

---

## 12. Câu hỏi mở

1. Có cần test hiệu năng danh sách môn với 10k bản ghi không?
2. Có cần test tương thích FE cũ (gọi `GET /subjects` dạng mảng) không (D-13)?
3. Có cần test migration trên bản dump `DB_11_16.sql` không?
4. Mức độ phủ tối thiểu (line/branch) cho service mới?
