# Phase 1 — Test Cases & Acceptance Criteria

> Tài liệu thiết kế kiểm thử. Test case đánh dấu **UT** (unit), **IT** (integration/H2),
> **API** (HTTP/MockMvc), **E2E** (gateway + FE), **DB** (kiểm migration/constraint),
> **SEC** (bảo mật). Không có test nào được chạy trong tài liệu này.
> **Trạng thái quyết định:** `D-01`…`D-15` **đã được người dùng chốt** (xem
> `subject-business-requirements.md`). Test case dưới đây viết theo quyết định cuối, không còn
> nhánh "nếu D-xx = …".
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
| SEC | JWT/role | 401/403, cross-org, quyền curriculum |

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
| TC-SUB-003 | Tên quá dài | name 201 ký tự | POST | 400 `INVALID_KEY` (message `NAME_TOO_LONG`) | API |
| TC-SUB-004 | Trùng tên khác dấu/hoa thường | `toán`, `TOÁN` | POST lần 2 | 409 `CONFLICT` | IT |
| TC-SUB-005 | Trùng mã (code có giá trị) | code `TOAN` đã tồn tại | POST | 409 `SUBJECT_CODE_EXISTS` | API |
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
| TC-SUB-020 | Mã để trống (D-04) | code NULL | POST hai lần | Cả hai 201; nhiều bản ghi NULL cùng org được | DB |
| TC-SUB-021 | Hợp đồng danh sách môn giữ mảng (D-13) | không tham số phân trang | GET `/subjects` | Response là JSON array `[...]`, không có `items/total/page/size` | API |

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
| TC-CUR-008 | LT+TH ≠ tổng — quy tắc tuỳ chọn (D-03 không bắt buộc) | 30 + 10 ≠ 45 | Không lỗi mặc định; nếu tổ chức bật rule tuỳ chọn → 400 `THEORY_PRACTICE_MISMATCH` | UT |
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
| TC-CUR-019 | Tiên quyết ngoài curriculum | một phần tử `prerequisiteSubjectIds` là môn org A nhưng **không** thuộc curriculum này | 404 `CURRICULUM_SUBJECT_NOT_FOUND`, không ghi cạnh | IT |
| TC-CUR-020 | Xoá môn đang là tiên quyết | DELETE môn B khi A có cạnh `prerequisite=B` | 409 `CONFLICT` (FK RESTRICT); muốn xoá phải gỡ cạnh của A trước trong cùng transaction | IT |
| TC-CUR-021 | Nhiều tiên quyết | Tin học có tiên quyết `[Toán, Vật lý]` | 201; 2 cạnh trong `curriculum_subject_prerequisite`; response trả đủ 2 id | API |
| TC-CUR-022 | Cạnh tiên quyết trùng | `prerequisiteSubjectIds=[Toán, Toán]` | 400 `PREREQUISITE_DUPLICATE`, không ghi cạnh | API |
| TC-CUR-023 | Quá nhiều tiên quyết | 51 phần tử | 400 `PREREQUISITE_IDS_TOO_MANY`, không ghi | API |
| TC-CUR-024 | Thay toàn bộ tiên quyết | PUT với mảng mới `[Vật lý]` | 200; cạnh cũ (Toán) bị xoá, chỉ còn Vật lý; version tăng | IT |
| TC-CUR-025 | Ngừng curriculum không đổi lớp đã áp | active=false | 200; `class_subject` của lớp đã áp không đổi | IT |

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
| TC-CLS-007 | Thiếu confirmReplace | lớp đã có curriculum khác, `confirmReplace=false` | 409 `CONFLICT` (api-contract §4.3) | API |
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
| TC-CLS-019 | Xoá dòng LEGACY khớp môn chính (D-15) | DELETE dòng `source=LEGACY` trùng `school_class.subject_id` | 409 `CLASS_SUBJECT_LEGACY_PROTECTED`; đổi môn chính qua `PUT /classes/{id}/subjects/primary` mới xoá được | API |
| TC-CLS-020 | FK tổ hợp chặn chéo org | INSERT `class_subject` với `class_id` org B + `org_id` org A (SQL trực tiếp) | FK `(class_id, org_id)` từ chối (lỗi ràng buộc) | DB |
| TC-CLS-021 | Đổi môn chính trước khi bắt đầu | lớp `CHUA_BAT_DAU`, `PUT .../subjects/primary` | 200; history 1 dòng; `school_class.subject_id` đổi; version +1 | IT |
| TC-CLS-022 | Đổi môn chính khi `DANG_DIEN_RA` | lớp đang học, đổi môn chính | 200; history ghi; môn khác/curriculum **không** đổi | IT |
| TC-CLS-023 | Từ chối lớp kết thúc/huỷ/đóng | `DA_KET_THUC`, `DA_HUY`, `CLOSED` | 409 `CLASS_NOT_EDITABLE`; **không** có history mới | API |
| TC-CLS-024 | Môn mới inactive | `subject.is_active = 0` | 400 `SUBJECT_INACTIVE`; không ghi gì | API |
| TC-CLS-025 | Không xoá dòng primary | DELETE dòng `is_primary = 1` | 409 `CLASS_SUBJECT_LEGACY_PROTECTED`; dòng còn nguyên | API |
| TC-CLS-026 | Snapshot mã/tên môn cũ | đổi Toán→Lý, sau đó đổi tên/xoá mềm môn Toán | History vẫn hiển thị `old_subject_code/name` gốc | IT |
| TC-CLS-027 | Lưu `old_teacher_id` + giới hạn `reason` | môn cũ có GV; `reason` 501 ký tự | `reason` 501 → 400 `REASON_TOO_LONG`; `reason` hợp lệ → history lưu `old_teacher_id` đúng, `reason` ≤ 500 | API |
| TC-CLS-028 | Không chuyển giáo viên | môn cũ có GV A, đổi sang môn mới | Dòng môn mới `teacher_id = NULL`; GV A không xuất hiện ở môn mới | IT |
| TC-CLS-029 | Môn mới đã có trong lớp | môn Lý đã là dòng `class_subject` của lớp | **Tái dùng** dòng đó (`is_primary=1`), không tạo dòng thứ hai; đúng một primary | IT |
| TC-CLS-030 | Rollback khi ghi history lỗi | giả lập lỗi DB bước history/`school_class` | 500; không history, `school_class.subject_id` và `class_subject` **không** đổi | IT |
| TC-CLS-031 | Version lệch | `expectedVersion` cũ | 409 `DATA_CHANGED`; không ghi | API |
| TC-CLS-032 | Hai request đổi primary đồng thời | 2 request song song | Một thành công; request còn lại 409 `CLASS_SUBJECT_OPERATION_CONFLICT`/`DATA_CHANGED`; không có 2 primary | IT |
| TC-CLS-033 | Cách ly org khi đổi môn chính | lớp org B với JWT org A | 404 `CLASS_NOT_FOUND`; không history | SEC |
| TC-CLS-034 | Không có API sửa/xoá history | PUT/DELETE `/classes/{id}/subject-history` | 404/405 (endpoint không tồn tại) | API |
| TC-CLS-035 | `PUT /classes/{id}` không vòng qua history | đổi `subjectId` qua endpoint lớp | 200; **có** history + đồng bộ primary như §4.8 | API |
| TC-CLS-036 | Lớp legacy đổi môn chính lần đầu | lớp chưa có `class_subject`, có `subject_id` | Tạo history với `old_subject_*` từ `school_class`; insert dòng primary mới | IT |
| TC-CLS-037 | Xoá cứng lớp đã có history | `DELETE /classes/{id}` trên lớp đã đổi môn chính ≥1 lần | 409 `CONFLICT` (không 500 do FK); history còn nguyên | API |
| TC-CLS-038 | Xoá cứng lớp chưa có history | `DELETE /classes/{id}` lớp chưa đổi môn chính | 204 như hành vi hiện tại | API |
| TC-CLS-039 | Snapshot `old_source`/`new_source` | đổi môn chính từ dòng `CURRICULUM` sang dòng `MANUAL` đã có | History lưu `old_source=CURRICULUM`, `new_source=MANUAL` (nguồn của dòng thực tế) | IT |
| TC-CLS-040 | `subject_id = NULL` → không primary | lớp không môn | `class_subject` không có dòng `is_primary=1`; GET subjects trả mảng rỗng | DB |
| TC-CLS-041 | Thiếu trường bắt buộc | body thiếu `reason`/`expectedVersion`/`operationId` | 400 `VALIDATION_ERROR`, không history | API |
| TC-CLS-042 | Cùng `operationId` payload khác | retry với `subjectId` khác | 409 `CLASS_SUBJECT_OPERATION_CONFLICT` | API |
| TC-CLS-043 | Cùng `operationId` payload giống | retry y nguyên sau thành công | 200, cùng `historyId`, **không** thêm history | IT |
| TC-CLS-044 | `PUT /classes/{id}` thiếu trường khi đổi môn | đổi `subjectId` nhưng thiếu `reason`/`operationId`/`version` | 400 `VALIDATION_ERROR`, không ghi history | API |
| TC-CLS-045 | Retry sau request thất bại | request đầu fail ở bước `class_subject`; retry cùng `operationId` | Lần đầu rollback sạch; retry thành công tạo đúng **một** history | IT |
| TC-CLS-046 | Fallback giáo viên theo D-09 | lớp có dòng `class_subject` nhưng `teacher_id=NULL`; `school_class.teacher_id` có GV | Response `teacherId=null` (không fallback); lớp legacy chưa có dòng → fallback | IT |
| TC-CLS-047 | Rollback khi cập nhật `class_subject` lỗi | giả lập lỗi sau khi đã insert history/update `school_class` | 500; rollback cả ba; không primary thứ hai | IT |
| TC-CLS-048 | `school_class.subject_id` = primary | sau đổi môn chính | `subject_id` khớp đúng dòng `is_primary=1`; các dòng khác `is_primary=0` | IT |

---

## 6. Giáo viên – Môn

| ID | Mục tiêu | Đầu vào | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-TCH-001 | Xem môn của GV | GV Toán | Danh sách có Toán, đúng status/source | API |
| TC-TCH-002 | Gán môn thủ công | thêm Toán 10 | 201, `source=MANUAL` | API |
| TC-TCH-003 | Trùng môn | gán lại | 409 `TEACHER_SUBJECT_EXISTS` | API |
| TC-TCH-004 | Môn inactive | subject active=false | 400 `SUBJECT_INACTIVE` | API |
| TC-TCH-005 | Bulk theo chuyên môn | chọn chuyên môn Toán | Sinh môn từ `specialty_subject`, `source=SPECIALTY`, `status=APPROVED` | IT |
| TC-TCH-006 | Bulk thu hồi đang dạy | bỏ Toán khi đang dạy C002 | 409 `TEACHER_SUBJECT_IN_USE` + danh sách lớp | API |
| TC-TCH-007 | Bulk thu hồi có xác nhận | `confirmRevokeInUse=true` | 200, status `REVOKED`, lớp không đổi GV | IT |
| TC-TCH-008 | ~~Duyệt PENDING~~ **không tồn tại ở Phase 1** (D-06a = không duyệt) | — | — | (Phase 2) |
| TC-TCH-009 | ~~Duyệt lại~~ **không tồn tại ở Phase 1** | — | — | (Phase 2) |
| TC-TCH-010 | ~~Từ chối~~ **không tồn tại ở Phase 1** | — | — | (Phase 2) |
| TC-TCH-011 | ~~Tự duyệt~~ **không tồn tại ở Phase 1** | — | — | (Phase 2) |
| TC-TCH-012 | Đổi tên môn | đổi Toán → Toán học | `teachesSubject` vẫn true | IT |
| TC-TCH-013 | Giáo viên nghỉ việc | `NGHI_VIEC` | Không có trong assignable; `teachesSubject=false` | IT |
| TC-TCH-014 | Chuyển phòng ban | đổi department | `teacher_subject`/`teacher_specialty` giữ nguyên | IT |
| TC-TCH-015 | Cách ly org | GV org B | 404 | SEC |
| TC-TCH-016 | assignable theo môn | `subjectId=Tin học` | Chỉ GV có Tin học APPROVED | API |
| TC-TCH-017 | Sửa ánh xạ chuyên môn | thêm môn vào chuyên môn | `specialty_subject` cập nhật; **không** tự sinh `teacher_subject` (gán GV vẫn là thao tác riêng) | IT |
| TC-TCH-018 | Version giáo viên | bulk với version cũ (`staff_profile.version`) | 409 `DATA_CHANGED` | API |
| TC-TCH-019 | Gán môn có hiệu lực ngay (D-06a) | POST gán Toán cho GV | 201, `status=APPROVED`, `approvedBy/At=NULL`, `teachesSubject=true` | API |
| TC-TCH-020 | Không có endpoint duyệt ở Phase 1 | POST `/teachers/{id}/subjects/{subjectId}/approve` | 404/405 (endpoint không tồn tại) | API |

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
| TC-RBAC-010 | ~~Duyệt chuyên môn~~ **không tồn tại ở Phase 1** | — | — | (Phase 2) |
| TC-RBAC-011 | Quyền curriculum (D-14) | user chỉ có `subject.view` gọi POST/PUT curriculum | 403 `FORBIDDEN` (cần `curriculum.manage`); user có `curriculum.view` gọi GET → 200 | SEC |
| TC-RBAC-012 | Giáo vụ được cấp qua chức danh | position ORGANIZATION có `curriculum.manage` | POST curriculum → 201; nhân viên thường không có chức danh → 403 | SEC |
| TC-RBAC-013 | Module guard curriculum (D-10) | `STUDENT_MANAGEMENT` off | GET/POST curriculum → 400 `MODULE_NOT_ENABLED` | SEC |
| TC-RBAC-014 | Quyền đổi môn chính | user có `class.edit` gọi `PUT .../subjects/primary` | 200; user chỉ có `class.view`/`subject.view` → 403 `FORBIDDEN` | SEC |
| TC-RBAC-015 | Xem lịch sử đổi môn | user có `class.view` | 200; user không có `class.view` → 403; không vai trò nào sửa/xoá được history | SEC |

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
| TC-LEG-009 | Index `(id, org_id)` của `school_class` | kiểm `information_schema.statistics` | Có unique `uq_school_class_id_org` (bắt buộc trước FK tổ hợp) | DB |
| TC-LEG-010 | FK tổ hợp `curriculum_subject` chéo org | INSERT `curriculum_id` org A + `subject_id` org B | FK từ chối | DB |
| TC-LEG-011 | Tiên quyết khác curriculum | INSERT cạnh với `curriculum_id` org A + `prerequisite_subject_id` thuộc curriculum khác | FK tổ hợp `(curriculum_id, prerequisite_subject_id, org_id)` từ chối | DB |
| TC-LEG-012 | Cạnh tiên quyết chéo org | INSERT cạnh `org_id` A với môn/tiên quyết org B | FK tổ hợp từ chối | DB |
| TC-LEG-013 | Cạnh trùng bị PK chặn | INSERT cùng `(curriculum_id, subject_id, prerequisite_subject_id)` hai lần | PK từ chối (lỗi ràng buộc) | DB |
| TC-LEG-014 | Tự tiên quyết bị CHECK chặn | INSERT `subject_id = prerequisite_subject_id` | CHECK từ chối | DB |
| TC-LEG-015 | UNIQUE 3 cột của `curriculum_subject` | kiểm `information_schema.statistics` | Có `uq_curriculum_subject_org(curriculum_id, subject_id, org_id)` | DB |
| TC-LEG-016 | Backfill primary exact-match | lớp có `subject_id` và dòng `class_subject` khớp | Chỉ dòng khớp nhận `is_primary=1`; lớp không có dòng nào được tạo dòng `LEGACY` | DB |
| TC-LEG-017 | Báo cáo block: lớp không khớp/mập mờ | lớp có `subject_id` nhưng không dòng khớp, >1 primary, primary lệch, hoặc `subject_id NULL` mà có primary | Dòng xuất hiện trong `51_52_precheck_data.sql` (danh sách `BLOCK_MIGRATION`); migration **không** tự sửa | DB |
| TC-LEG-018 | MySQL generated column | `INSERT ... (is_primary=1)` | `primary_class_id = class_id`; `is_primary=0` → NULL; không được list `primary_class_id` trong INSERT (errno 3105) | DB |
| TC-LEG-019 | H2 parity | chạy IT H2 | `primary_class_id` là cột thường, service phải set; ghi rõ H2 **không** chứng minh MySQL generated column | DB |
| TC-LEG-020 | UNIQUE chỉ chặn >1 primary | INSERT 2 dòng `is_primary=1` cùng lớp trên MySQL | Dòng thứ hai bị UNIQUE từ chối | DB |
| TC-LEG-021 | Phân loại pre-check đủ trường hợp | staging có: khớp primary; chưa primary; primary lệch; >1 primary; `subject_id NULL` có primary; subject/giáo viên/lớp khác org hoặc mồ côi | `51_52_precheck_data.sql` trả đúng `reason_code`/nhãn `NO_ACTION`, `AUTO_BACKFILL_CANDIDATE`, `BLOCK_MIGRATION`; danh sách block liệt kê đủ 9 mã, không có `MANUAL_REVIEW` | DB |
| TC-LEG-022 | Backfill chạy lại idempotent | chạy 5a/5b hai lần trên staging | Lần 2 không tạo dòng mới, không đổi `is_primary`, số dòng `class_subject` giữ nguyên; PK/UNIQUE không bị vi phạm | DB |
| TC-LEG-023 | Backfill không ghi đè/không tạo sai primary | lớp `subject_id NULL` có primary; lớp có primary lệch subject; lớp đã xoá mềm có `subject_id` | 5a không chèn; 5b không đổi primary hiện có và không chạm lớp `deleted_at` khác NULL; dòng thuộc `BLOCK_MIGRATION`, migration không tự sửa | DB |
| TC-LEG-024 | Partial rollback đúng dependency | partial rollback giữ `class_subject` | Drop `uq_class_subject_primary` → `chk_class_subject_primary` → `primary_class_id` → `is_primary` thành công; đảo thứ tự bị MySQL từ chối | DB |
| TC-LEG-025 | Giáo viên mồ côi chặn migration | `school_class.teacher_id` hoặc `class_subject.teacher_id` không có trong `staff_profile` cùng org | Pre-check data trả `CLASS_ORPHAN_TEACHER`/`CS_ORPHAN_TEACHER`; 52 `SIGNAL` ở `mems_m52_assert_backfill_safe`; **không** set `teacher_id = NULL` | DB |
| TC-LEG-026 | Bảng cũ thiếu cấu trúc bị từ chối | (a) tạo `class_subject` chỉ có vài cột (bản nháp cũ) rồi chạy 52; (b) `teacher_subject` cũ có CHECK chứa `PENDING` rồi chạy 52 | (a) `mems_m52_assert_class_subject_schema` `SIGNAL` trước backfill, không tự `ADD COLUMN`; (b) `mems_m52_assert_teacher_subject_schema` `SIGNAL`; không tự sửa CHECK | DB |
| TC-LEG-027 | Bảng cũ sai cấu trúc index/FK/CHECK/cột sinh bị từ chối | staging dựng bảng đủ 20 cột nhưng (i) đảo thứ tự cột trong index, (ii) FK trỏ sai bảng/cột, (iii) CHECK thiếu một giá trị, (iv) `primary_class_id` là cột thường hoặc VIRTUAL | (i)–(iv) pre-check 0b trả `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE`; 52 `SIGNAL 45000` ở audit tương ứng; không tự sửa schema | DB |
| TC-LEG-028 | Index hỗ trợ FK không bị chặn nhầm | bảng `class_subject`/`teacher_subject` do chính draft 52 tạo trên MySQL | `information_schema.statistics` có thêm index non-unique `(class_id, org_id)`/`(subject_id, org_id)` (và `(user_id, org_id)` cho `teacher_subject`); 0b vẫn trả `DATA_PRECHECK_READY`, 52 audit pass; thêm index lạ khác ⇒ ABORT | DB |
| TC-LEG-029 | `teacher_subject` sai cấu trúc ngoài `PENDING` | staging: thiếu/đổi cột, sai thứ tự PK, FK trỏ `staff_profile` thay vì `teacher_profile`, CHECK source thiếu `SPECIALTY` | `mems_m52_assert_teacher_subject_schema` `SIGNAL 45000`; không tự sửa | DB |
| TC-LEG-030 | Sai `DATA_TYPE` bị chặn | staging: `class_subject.created_at` đổi `datetime(3)` → `date`; `source` → `int` | `51_52_precheck.sql` query 0b trả `attr_mismatch > 0` ⇒ `BLOCKED_SCHEMA_INCOMPLETE_OLD_TABLE`; 52 `SIGNAL` trong `mems_m52_assert_class_subject_schema` (`data_type` so với spec); không tự `MODIFY`. Vị trí: 0b `cs_attr`, audit 52 | DB |
| TC-LEG-031 | Sai `COLUMN_TYPE` (độ dài/độ chính xác) bị chặn | staging: `note varchar(500)` → `varchar(200)`; `sequence_no smallint` → `int`; `is_primary tinyint(1)` → `tinyint(4)` | 0b `attr_mismatch > 0` ⇒ BLOCKED; 52 audit `SIGNAL` (`column_type`, `numeric_precision`); không tự sửa. Vị trí: 0b `cs_attr`, `mems_m52_assert_class_subject_schema` | DB |
| TC-LEG-032 | Sai NULL/DEFAULT bị chặn | staging: `status` cho phép NULL hoặc DEFAULT `'ACTIVE'`; `is_primary` bỏ DEFAULT; `created_at` thêm DEFAULT | 0b `attr_mismatch > 0` ⇒ BLOCKED; 52 audit `SIGNAL` (`is_nullable`/`column_default` so sánh NULL-safe `<=>`); không tự sửa. Vị trí: 0b `cs_attr`, audit 52 | DB |
| TC-LEG-033 | Sai collation bị chặn | staging: `subject.name`/`class_subject.note` dùng `utf8mb4_general_ci` | 0b `attr_mismatch > 0` ⇒ BLOCKED; 52 audit `SIGNAL` (`collation_name` khác `utf8mb4_unicode_ci`); không tự `CONVERT`. Vị trí: `cs_attr`/spec 20 cột | DB |
| TC-LEG-034 | Sai `DELETE_RULE` bị chặn | staging: `fk_class_subject_class` `ON DELETE RESTRICT` (đúng phải CASCADE); `fk_class_subject_subject` `ON DELETE CASCADE` (đúng phải RESTRICT) | 0b `cs_fk.fk_rule_bad > 0` ⇒ BLOCKED; 52 audit `SIGNAL` (`v_fk_rule_bad <> 0`); không tự drop/tạo lại FK. Vị trí: 0b join `referential_constraints`, audit 52 | DB |
| TC-LEG-035 | Sai `UPDATE_RULE` bị chặn | staging: một FK của `class_subject`/`teacher_subject` đặt `ON UPDATE CASCADE` thay vì RESTRICT | 0b `fk_rule_bad > 0` ⇒ BLOCKED; 52 audit `SIGNAL`; không tự sửa. Vị trí: 0b `cs_fk`, audit 52 `v_fk_rule_bad` | DB |
| TC-LEG-036 | History cascade bị từ chối | staging: `class_subject_history.fk_csh_class` đặt `ON DELETE CASCADE` | `mems_m52_assert_history_schema` (52) `SIGNAL` (`'… history must not cascade'`); history **không** bị xoá theo lớp; không tự sửa FK | DB |
| TC-LEG-037 | History thiếu cột snapshot | staging: bảng `class_subject_history` cũ thiếu `new_subject_name` (còn 15 cột) hoặc thiếu `uq_csh_operation` | `mems_m52_assert_history_schema` (52) `SIGNAL` (`16` cột + index groups + FK + 3 CHECK); 52 không tự `ADD COLUMN`/`CREATE` đè; precheck 0h cảnh báo số cột | DB |
| TC-LEG-038 | `specialty_subject` sai schema | staging: bảng `specialty_subject` cũ thiếu `idx_specialty_subject_org_subject`, sai PK, hoặc FK trỏ `staff_profile` | `mems_m52_assert_specialty_subject_schema` (52) `SIGNAL` (5 cột, index whitelist, 2 FK + action, không CHECK lạ); không tự `ALTER`; 0h hiển thị column_count/FK rule | DB |
| TC-LEG-039 | Trùng tên index nhưng sai định nghĩa | staging: đã có `uq_school_class_id_org` nhưng non-unique hoặc đúng cột sai thứ tự/prefix | 51 `mems_m51_add_unique` `SIGNAL` (`'existing index differs from expected (unique/columns/prefix)'`), **không** bỏ qua theo tên; không tự drop index | DB |
| TC-LEG-040 | Trùng tên FK nhưng sai mapping/action | staging: đã có `fk_school_class_curriculum` nhưng `ON DELETE CASCADE` hoặc trỏ sai cột | 51 `mems_m51_add_fk` `SIGNAL` (`'existing FK differs from expected (mapping/update/delete rule)'`); không tự drop/tạo lại | DB |
| TC-LEG-041 | ABORT sau 5a/5b rồi chạy lại | staging cố ý để 52 dừng sau 5b (dữ liệu khiến `mems_m52_assert_no_duplicate_primary`/bước sau `SIGNAL`) | DDL và DML 5a/5b **vẫn tồn tại** (implicit commit); sửa dữ liệu gốc → chạy lại precheck (phải `DATA_PRECHECK_READY`), precheck data (block = 0), 52; 5a/5b idempotent nên số dòng `class_subject`/`source='LEGACY'` không tăng; postcheck 2a–2e = 0 dòng. Vị trí: `ROLLBACK.md` §2 | DB |

---

## 9. Đồng thời

| ID | Mục tiêu | Cách kiểm | Kết quả mong đợi | Loại |
|---|---|---|---|---|
| TC-CON-001 | Tạo trùng mã đồng thời | 2 request song song cùng `code` | 1×201, 1×409 `SUBJECT_CODE_EXISTS` | IT |
| TC-CON-002 | Áp curriculum đồng thời | 2 request cùng version | 1×200, 1×409 `DATA_CHANGED` | IT |
| TC-CON-003 | Sửa curriculum đồng thời | 2 PUT cùng version | 1×200, 1×409 | IT |
| TC-CON-004 | Trạng thái lớp đổi giữa chừng | scheduler chuyển `DANG_DIEN_RA` | Request sửa môn nhận 409 `CLASS_SUBJECT_LOCKED` | IT |
| TC-CON-005 | Bulk chuyên môn đồng thời | 2 PUT cùng version | 1×200, 1×409 | IT |
| TC-CON-006 | Thêm cạnh tiên quyết đồng thời | 2 request thêm cùng cạnh | 1×201, 1×409 `PREREQUISITE_DUPLICATE`/`CONFLICT` | IT |

---

## 10. Ma trận Acceptance Criteria

| AC | Test case |
|---|---|
| AC-SUB-01…08 | TC-SUB-001…021 |
| AC-CUR-01…10 | TC-CUR-001…025 |
| AC-TCH-01…09 | TC-TCH-001…020 (TC-TCH-008…011 không thuộc Phase 1) |
| AC-RBAC-01…06 | TC-RBAC-001…009, TC-RBAC-011…013 |
| AC-VAL-01…11 | E-01…E-29 |
| AC-VAL-12…20, AC-SUB-15…17 | TC-CLS-021…048, E-30…E-43 |
| Legacy | TC-LEG-001…041 (021…024: phân loại pre-check, backfill idempotent/an toàn, rollback dependency; 030…041: audit thuộc tính cột, referential action, history/specialty_subject, helper 51, abort-rerun) |
| Concurrency | TC-CON-001…006 |

---

## 11. Điều kiện "Done" cho kiểm thử

1. Tất cả test hiện có vẫn xanh (không regression): Identity 78, People 319, Schedule 19,
   Facility 9, Gateway 3 (số tại thời điểm khảo sát; có thể thay đổi khi thêm test).
2. Test mới chạy offline (`./mvnw -o test`) cho từng service bị ảnh hưởng.
3. Có ít nhất 1 kịch bản E2E qua gateway: tạo môn → tạo curriculum → áp lớp → xem lớp–môn.
4. Kiểm MySQL staging cho DDL/backfill (không production).
5. Báo cáo test ghi rõ test nào chạy H2, test nào chạy MySQL, test nào chưa chạy được.

---

## 12. Quyết định đã chốt và câu hỏi kỹ thuật

**Đã chốt:** D-01…D-15. Test case không còn nhánh phụ thuộc quyết định:

- D-04 → TC-SUB-005/019/020, TC-CON-001.
- D-06a → TC-TCH-008…011, TC-RBAC-010 là Phase 2; TC-TCH-019 xác nhận `APPROVED` ngay.
- D-07 → TC-CUR-009/010/019…024, TC-LEG-011…015, TC-CON-006.
- D-14 → TC-RBAC-011/012.
- D-08/D-15 → TC-CLS-019, TC-CLS-021…048, TC-LEG-016…026.
- D-06a (không duyệt) → TC-TCH-008/009/010 là “không tồn tại”; schema CHECK chỉ `APPROVED/REVOKED` kiểm ở TC-LEG-026 (nhánh (b): bảng cũ còn `PENDING` → 52 ABORT) và ở IT H2 (câu lệnh `INSERT` trạng thái `PENDING` bị CHECK từ chối).
- D-09 → TC-CLS-046 (fallback chỉ khi chưa có bản ghi `class_subject` tương ứng).

Câu hỏi kỹ thuật còn lại:

1. Có cần test hiệu năng danh sách môn với 10k bản ghi không?
2. (D-13 đã chốt giữ mảng) TC-SUB-021 đã bao phủ tương thích FE cũ.
3. Có cần test migration trên bản dump `DB_11_16.sql` không?
4. Mức độ phủ tối thiểu (line/branch) cho service mới?
5. Có cần test chu trình tiên quyết với đồ thị lớn (1000 môn) để kiểm hiệu năng DFS không?
