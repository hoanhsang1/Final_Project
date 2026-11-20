# Phase 1 — Implementation Roadmap (handoff cho người dùng)

> Tài liệu kế hoạch. **Không có code nào được viết bởi tài liệu này.** Người dùng trực tiếp triển khai
> Backend Java Spring Boot. Thứ tự dưới đây ưu tiên **additive** (không phá dữ liệu cũ), kiểm chứng
> được từng bước và có thể dừng giữa chừng mà hệ thống vẫn chạy.

---

## 1. Nguyên tắc triển khai

1. **Schema trước, logic sau:** tạo bảng/cột mới, chưa đổi hành vi cũ.
2. **Không xoá** `school_class.subject_id`, `teacher_specialty`, hay bất kỳ cột/dữ liệu cũ.
3. **Không đổi role/quyền mặc định**; chỉ thêm các quyền đã chốt ở D-14 (`curriculum.view/manage`).
4. **Mỗi bước có test và điểm rollback**; migration idempotent như migration 42.
5. **Không chạy production** trong quá trình này; staging/DB test riêng.
6. **Docs ≠ evidence:** sau mỗi WP phải có test thật, không dựa vào tài liệu.

---

## 2. Quyết định đầu vào (đã chốt)

`D-01`…`D-15` **đã chốt** tại `subject-business-requirements.md`; roadmap dưới đây đã phản ánh
các lựa chọn cuối, không còn bước "chờ chốt".

| ID | Quyết định cuối | Ảnh hưởng |
|---|---|---|
| D-01 | Nhiều môn mỗi lớp qua `class_subject`; giữ `school_class.subject_id` legacy | `class_subject` |
| D-02 | Curriculum là template cấp tổ chức; một lớp ↔ một curriculum; **không có học kỳ** | `curriculum`, `curriculum_id` |
| D-03 | Số buổi/giờ khai ở `curriculum_subject`; không bắt buộc LT + TH = tổng | cột + validation |
| D-04 | `code` tuỳ chọn; UNIQUE `(org_id, code)` khi có giá trị | `subject.code`, index |
| D-05 | Giáo vụ quản lý môn, ORGANIZATION | catalog/scope |
| D-06 / D-06a | `specialty_subject` + `teacher_subject` (nguồn sự thật); **không duyệt** | `teacher_subject` |
| D-07 | Nhiều tiên quyết qua bảng nối; Phase 1 chỉ cảnh báo | `curriculum_subject_prerequisite` |
| D-08 | `CHUA_BAT_DAU` đổi curriculum/môn trực tiếp; `DANG_DIEN_RA` chỉ đổi **môn chính** + ghi `class_subject_history`; lớp kết thúc cần quy trình riêng | history/API/test |
| D-09 | `class_subject.teacher_id`; fallback `school_class.teacher_id` **chỉ** cho dòng `LEGACY` suy ra | `class_subject` |
| D-10 | Module guard `STUDENT_MANAGEMENT` cho môn/curriculum | controller |
| D-11 | Backfill chỉ khớp chính xác; báo cáo phần mập mờ | script |
| D-12 | Sửa curriculum tại chỗ + tăng `version` | `version` |
| D-13 | `GET /subjects` trả **mảng**, không phân trang | hợp đồng API |
| D-14 | Tách `curriculum.view/manage`, ORGANIZATION, cấp qua chức danh Giáo vụ | catalog/RBAC |
| D-15 | Giữ `school_class.subject_id` = dòng `is_primary`; đổi môn chính atomic + history; chặn xoá trực tiếp | `class_subject`, `class_subject_history`, API |

---

## 3. Work Packages

### WP0 — Baseline môi trường (S)

- **Việc:** xác nhận baseline source `cdd03b8`, môi trường test MySQL riêng; rà `frontend/src/lib/permissions.ts`
  để biết FE đang dùng mã quyền nào trước khi thêm `curriculum.view/manage`.
- **Output:** ghi chú baseline + danh sách mã quyền FE cần bổ sung.
- **DoD:** không còn mục nghiệp vụ nào chưa chốt; danh sách quyền mới được xác nhận với FE.

### WP1 — Migration & schema test (M)

- **Mục tiêu:** thêm bảng/cột mới, chưa đổi API.
- **Việc:**
  1. Tạo `51_people_curriculum.sql`: `curriculum`, `curriculum_subject` (kèm
     `uq_curriculum_subject_org (curriculum_id, subject_id, org_id)`), bảng nối
     `curriculum_subject_prerequisite`, `school_class.curriculum_id`, **và** index
     `uq_school_class_id_org (id, org_id)` — bắt buộc cho FK tổ hợp ở migration 52.
     Bảng nối dùng hai FK tổ hợp 3 cột trỏ `curriculum_subject(curriculum_id, subject_id, org_id)`.
  2. Tạo `52_people_class_subject.sql` (specialty_subject, teacher_subject, class_subject,
     class_subject_history, backfill).
     `class_subject` dùng FK tổ hợp `(class_id, org_id) → school_class(id, org_id)`, có
     `is_primary` + cột sinh `primary_class_id` + UNIQUE `uq_class_subject_primary`, tạo **đầy đủ
     trong một `CREATE TABLE`**. Nếu bảng đã tồn tại, 52 **chỉ** chấp nhận schema Revision 3 đầy đủ;
     khác → `SIGNAL` (không tự `ADD COLUMN` cho bảng cũ không rõ nguồn gốc).
     `teacher_subject` theo D-06a: CHECK `status IN ('APPROVED','REVOKED')`, không `PENDING`.
     `class_subject_history` có `old_source`/`new_source`, `reason`/`operation_id` NOT NULL,
     UNIQUE `(org_id, operation_id)`, FK `(class_id, org_id)` RESTRICT.
     **Không** tạo migration 53 trừ khi xác minh một bản 52 cũ đã chạy.
  3. Đổi `uq_subject_org_code` thành **UNIQUE** sau pre-check trùng (D-04; nhiều NULL hợp lệ).
  4. (Tuỳ chọn D-03) thêm cột default trên `subject` nếu người dùng muốn.
  5. Cập nhật `backend/PeopleService/src/test/resources/people-test-schema.sql` tương ứng
     (lưu ý: H2 dùng cột thường thay cột sinh — xem `database-schema.md` §9.1; `teacher_subject`
     CHECK chỉ `APPROVED/REVOKED`).
  6. Viết script backfill riêng (D-11), chưa chạy production; mọi dòng không khớp/mập mờ là
     `BLOCK_MIGRATION` (phải sửa dữ liệu), không phải “ghi nhận để rà soát sau”.
     Backfill `class_subject.is_primary = 1` **chỉ** cho dòng khớp chính xác
     `school_class.subject_id`; không đoán, không tạo primary khi `subject_id IS NULL`, không ghi đè
     primary đang mâu thuẫn, không tạo trùng `(class_id, subject_id)`, không set `teacher_id = NULL`
     để né FK. `teacher_id` của lớp và của dòng `class_subject` phải tồn tại trong
     `staff_profile(user_id, org_id)` cùng org (nếu không → BLOCK).
  7. Bảng `class_subject_history` **không** backfill hồi tố (không có dữ liệu nguồn).
  8. Chạy pre-check schema `migrations/51_52_precheck.sql` (query 0b quyết định bước tiếp theo), rồi
     (nếu `DATA_PRECHECK_READY`) pre-check data `migrations/51_52_precheck_data.sql`, sau đó
     post-check `51_52_postcheck.sql` mục 7 trên staging; lưu báo cáo.
     **Gate:** danh sách `BLOCK_MIGRATION` phải **0 dòng** và mọi dòng phải được **sửa dữ liệu**
     trước 52 — không có nhãn “chấp nhận ghi nhận”.
  9. Trước khi chạy 52 trên dữ liệu thật, xác nhận optimistic locking: `school_class.version` tồn tại
     (dump `DB_11_16.sql:391`, H2 `people-test-schema.sql:147`) và `SchoolClassRepository.update`
     dùng `version = version + 1 ... AND version = ?` — xem `wp1-readiness-report.md` §3.1.
- **File:** draft `docs/phase-1/migrations/51_people_curriculum.sql`,
  `52_people_class_subject.sql`, `51_52_precheck.sql`, `51_52_precheck_data.sql`,
  `51_52_postcheck.sql`, `ROLLBACK.md`; test schema H2 nêu trên.
- **Test:** TC-LEG-001…026 trên MySQL staging; test H2 dựng schema không lỗi; TC-CLS-020,
  TC-LEG-009…026.
- **DoD:** migration idempotent chạy 2 lần không lỗi; **51 chạy trước 52**; rollback 7 bước (partial
  rollback 4 bước đúng dependency) đã ghi; không đổi dữ liệu cũ.
- **Rollback:** theo `ROLLBACK.md` — quiesce → export history → export class_subject/liên quan →
  xác minh → drop FK → partial primary: index → CHECK → cột sinh → `is_primary` → drop bảng con →
  cha. Nếu đã có history hoặc dữ liệu mới: **forward-fix**, không rollback.

### WP2 — Hoàn thiện Subject (M)

- **Mục tiêu:** đủ nghiệp vụ môn mà không phá FE.
- **Việc:**
  1. `SubjectRequest`: `code` **tuỳ chọn** (D-04), chuẩn hoá trim/upper nếu người dùng chọn.
  2. `SubjectRepository`: kiểm mã trùng chủ động khi `code` có giá trị + map constraint; thêm đếm usage theo lớp.
  3. `SubjectController`: thêm module guard (D-10), `GET /subjects/check-code`,
     `GET /subjects/{id}/usage`. **Không** thêm `page`/`size` (D-13 = A).
  4. `ErrorCode`: thêm `SUBJECT_CODE_EXISTS`, `SUBJECT_INACTIVE`.
  5. Map `DuplicateKeyException` theo tên constraint (code vs name).
  6. Audit giữ nguyên; bổ sung `classesUsingSubject` ở status (đã có).
- **File thật:**
  - `backend/PeopleService/src/main/java/com/mems/controller/SubjectController.java`
  - `.../repository/SubjectRepository.java`
  - `.../dto/SubjectRequest.java`, `.../dto/SubjectResponse.java`
  - `.../exception/ErrorCode.java`
  - (mới) `.../dto/SubjectCodeCheckResponse.java`, `.../dto/SubjectUsageResponse.java`
- **Test:** TC-SUB-001…021.
- **DoD:** response cũ giữ nguyên (D-13 = A: mảng); FE hiện tại vẫn chạy; lỗi trùng mã đúng;
  bản ghi `code = NULL` tạo được.
- **Rollback:** tắt endpoint mới; giữ code cũ.

### WP3 — Teacher–Subject theo ID (L)

- **Mục tiêu:** bỏ phụ thuộc tên; gán chuyên môn ổn định.
- **Việc:**
  1. Repository/service cho `specialty_subject` (đọc/ghi theo `SpecialtyController`).
  2. `TeacherSubjectRepository` (hoặc mở rộng `TeacherRepository`) cho `teacher_subject`.
  3. API `GET/POST/PUT/DELETE /teachers/{staffId}/subjects`; **Phase 1 không có approve/reject**
     (D-06a: mọi dòng gán `APPROVED` ngay, không có `PENDING`).
  4. Đổi `TeacherRepository.teachesSubject` sang `teacher_subject` (có giai đoạn dual-read nếu cần).
  5. Đổi `TeacherRepository.subjectMismatch` sang so `class_subject`/`teacher_subject`.
  6. Mở rộng `GET /teachers/assignable?subjectId=`.
  7. Backfill chạy staging; đối soát số dòng; báo cáo chuyên môn không map được.
  8. `TeacherService.update` khi đổi specialty: cập nhật `teacher_subject` theo chính sách
     (`status='APPROVED'` ở Phase 1).
- **File thật:**
  - `.../repository/TeacherRepository.java`, `.../service/TeacherService.java`
  - `.../controller/TeacherController.java`, `.../controller/SpecialtyController.java`
  - `.../repository/SpecialtyRepository.java`, `.../service/SpecialtyService.java`
  - (mới) `.../repository/TeacherSubjectRepository.java`
  - (mới) DTO `TeacherSubject*`
- **Test:** TC-TCH-001…020 (TC-TCH-008…011 ngoài Phase 1); đặc biệt TC-TCH-012 (đổi tên môn).
- **DoD:** mọi kiểm tra chuyên môn dùng ID; đổi tên môn không làm sai; backfill đối soát khớp.
- **Rollback:** dual-read trả về so tên nếu bảng mới lỗi; không xoá dữ liệu.

### WP4 — Curriculum CRUD (L)

- **Mục tiêu:** quản lý chương trình + danh sách môn, thứ tự, số buổi/giờ, nhiều tiên quyết.
- **Việc:**
  1. `CurriculumRepository`, `CurriculumService`, `CurriculumController`.
  2. DTO create/update/response/subject; trường `prerequisiteSubjectIds` (mảng 0..n).
  3. Validate chuỗi tiên quyết (DFS), sequence, version; **không** kiểm tổng LT + TH bắt buộc.
  4. Ghi/xoá cạnh trong `curriculum_subject_prerequisite` cùng transaction với `curriculum_subject`.
  5. Audit `CURRICULUM_*`; optimistic lock.
  6. (Tuỳ chọn) clone — phải remap `prerequisiteSubjectIds` sang môn của bản clone.
- **File thật (mới):**
  - `.../controller/CurriculumController.java`
  - `.../service/CurriculumService.java`
  - `.../repository/CurriculumRepository.java`
  - `.../repository/CurriculumSubjectPrerequisiteRepository.java`
  - `.../dto/CurriculumCreateRequest.java`, `CurriculumUpdateRequest.java`,
    `CurriculumResponse.java`, `CurriculumSubjectRequest.java`, `CurriculumSubjectResponse.java`
- **Test:** TC-CUR-001…025.
- **DoD:** CRUD đầy đủ; lỗi trùng/chu trình/tiên quyết ngoài curriculum đúng mã; nhiều tiên quyết
  hoạt động; version hoạt động.
- **Rollback:** tắt controller/route; bảng giữ nguyên.

### WP5 — Class–Subject & áp curriculum (L)

- **Mục tiêu:** lớp có nhiều môn; snapshot từ curriculum; giáo viên theo môn.
- **Việc:**
  1. `ClassSubjectRepository` (đọc lớp môn, upsert, xoá, suy legacy từ `subject_id`).
  2. `SchoolClassService`: applyCurriculum, add/update/delete subject; kiểm trạng thái + version.
  3. `SchoolClassController`: 7 endpoint mục 4 `api-contract.md` (gồm đổi môn chính + history).
  4. `SchoolClassResponse` thêm `curriculumId` (field mới, không phá);
     `ClassSubjectResponse` thêm `isPrimary`.
  5. Gán giáo viên theo môn: kiểm `teacher_subject` + `DANG_DAY`; **chỉ** fallback
     `school_class.teacher_id` khi lớp chưa có bản ghi `class_subject` tương ứng (D-09).
  6. Audit `CLASS_CURRICULUM_APPLIED`, `CLASS_SUBJECT_*`, `CLASS_PRIMARY_SUBJECT_CHANGED`.
  7. (D-15) Đồng bộ môn chính: tách service đổi môn chính (ví dụ `PrimarySubjectChangeService`)
     gồm một `@Transactional`: kiểm `operationId`/idempotency → khoá lớp → kiểm `expectedVersion`
     (bắt buộc) → ghi `class_subject_history` (kèm `old_source`/`new_source`) → cập nhật
     `school_class.subject_id` + version → đồng bộ `is_primary` (tái dùng dòng nếu có) → audit.
     Cả `PUT /classes/{id}/subjects/primary` và `PUT /classes/{id}` (khi `subjectId` đổi) phải
     gọi **cùng** service này; `changedBy` lấy từ JWT; API class-subject **không** cho xoá dòng
     primary (409 `CLASS_SUBJECT_LEGACY_PROTECTED`).
  8. `GET /classes/{id}/subject-history` — chỉ đọc, trả snapshot.
  9. (D-08/D-15) `DELETE /classes/{id}`: nếu lớp đã có `class_subject_history` → 409 `CONFLICT`
     (message: có lịch sử môn), **không** CASCADE/xoá history; kiểm trước để không rơi lỗi FK 500.
- **File thật:**
  - `.../controller/SchoolClassController.java`
  - `.../service/SchoolClassService.java`
  - `.../repository/SchoolClassRepository.java`
  - `.../dto/SchoolClassResponse.java`
  - (mới) `.../repository/ClassSubjectRepository.java`, `.../repository/ClassSubjectHistoryRepository.java`,
    `.../service/PrimarySubjectChangeService.java`, `.../dto/ClassSubject*`,
    `.../dto/ChangePrimarySubjectRequest.java`, `.../dto/SubjectChangeHistoryResponse.java`,
    `.../dto/ApplyCurriculumRequest.java`
- **Test:** TC-CLS-001…048, TC-RBAC-014/015, TC-CON-002/004.
- **DoD:** lớp legacy đọc được; lớp mới áp curriculum đúng; sửa template không đổi snapshot;
  đổi môn chính (kể cả `DANG_DIEN_RA`) sinh history + đồng bộ `school_class.subject_id`, một
  transaction, không chuyển giáo viên, không tạo primary thứ hai; dòng primary được bảo vệ.
- **Rollback:** API mới tắt; `class_subject` không ảnh hưởng lớp cũ.

### WP6 — Internal API & event hook (M, chỉ khi cần Phase 2)

- **Mục tiêu:** cung cấp dữ liệu cho Schedule khi làm xếp lịch.
- **Việc:**
  1. `GET /internal/classes/{id}/subjects`, `/internal/teachers?subjectId=`,
     `/internal/subjects`, `/internal/curricula/{id}`.
  2. (Đề xuất) outbox event `ClassSubjectsChanged` khi danh sách môn lớp đổi,
     `TeacherSubjectChanged` khi chuyên môn đổi — theo khuôn Phase 2 sẵn có.
  3. Không sửa Schedule trong Phase 1.
- **File thật:**
  - `.../controller/InternalScheduleLookupController.java` (mở rộng hoặc controller mới)
  - `.../service/PeopleOutbox...` (theo hạ tầng outbox hiện có)
- **Test:** internal key đúng/sai; org khớp; payload đủ field.
- **DoD:** Schedule có thể đọc dữ liệu mà không cần join DB People.
- **Lưu ý:** đây là **hook**; thuật toán xếp lịch thuộc Phase 2, không làm ở đây.

### WP7 — Kiểm thử & E2E (M)

- **Việc:**
  1. Chạy toàn bộ test từng service offline.
  2. E2E: tạo môn → tạo curriculum → áp lớp → xem lớp–môn → gán giáo viên theo môn.
  3. Kiểm MySQL staging cho migration + backfill.
  4. Báo cáo trung thực: test nào chưa chạy được, vì sao.
- **DoD:** mục 11 `test-cases.md`; không regression.

### WP8 — Handoff FE & tài liệu (S)

- **Việc:**
  1. Cập nhật `docs/phase-1/*` nếu quyết định thay đổi.
  2. Viết handoff FE: màn hình, quyền cần, endpoint, field mới.
  3. Không sửa FE trong Phase 1 (trừ khi người dùng yêu cầu riêng).
- **DoD:** FE có đủ contract để tự triển khai.

---

## 4. Thứ tự & phụ thuộc

```text
WP0 ─┬─> WP1 ─┬─> WP4 ──> WP5 ──> WP7
     │        ├─> WP3 ──┘
     │        └─> WP6 (sau WP5)
     └─> WP2 (độc lập, có thể làm song song WP1)
                              WP8 sau WP7
```

- WP2 độc lập với schema mới, có thể làm ngay sau WP0 (trừ phần D-04 cần WP1).
- WP3 cần WP1 (bảng) + D-06.
- WP5 cần WP3 (kiểm giáo viên) + WP4 (curriculum).
- WP6 chỉ làm khi chuẩn bị Phase 2.

---

## 5. File/module dự kiến chạm

| Loại | Đường dẫn | Hành động |
|---|---|---|
| Migration | `51_people_curriculum.sql` (kèm `curriculum_subject_prerequisite`, `uq_curriculum_subject_org`, `uq_school_class_id_org`), `52_people_class_subject.sql` (gốc repo) | Tạo mới, chạy 51 trước 52 |
| Test schema | `backend/PeopleService/src/test/resources/people-test-schema.sql` | Sửa |
| Error | `.../exception/ErrorCode.java` | Sửa (nếu chốt mã mới) |
| Subject | `.../controller/SubjectController.java`, `.../repository/SubjectRepository.java`, `.../dto/SubjectRequest.java` | Sửa |
| Teacher | `.../repository/TeacherRepository.java`, `.../service/TeacherService.java`, `.../controller/TeacherController.java` | Sửa |
| Specialty | `.../repository/SpecialtyRepository.java`, `.../service/SpecialtyService.java`, `.../controller/SpecialtyController.java` | Sửa |
| Class | `.../controller/SchoolClassController.java`, `.../service/SchoolClassService.java`, `.../repository/SchoolClassRepository.java`, `.../dto/SchoolClassResponse.java` | Sửa |
| Curriculum | `.../controller/CurriculumController.java` + service/repository/DTO | Tạo mới |
| Class–Subject | `.../repository/ClassSubjectRepository.java` + DTO | Tạo mới |
| Teacher–Subject | `.../repository/TeacherSubjectRepository.java` + DTO | Tạo mới |
| Internal | `.../controller/InternalScheduleLookupController.java` | Sửa/thêm method |
| Gateway | `backend/APIGateway/src/main/resources/application.yml` | Thêm route `/api/curricula/**` |
| Audit | dùng `PeopleAuditService` hiện có | Không tạo bảng mới |

> Trước khi tạo file, kiểm tra lại repo (tên có thể đã tồn tại). Không đặt tên trùng chức năng.

---

## 6. Chiến lược rollout

| Bước | Hành vi | An toàn |
|---|---|---|
| A | Chỉ migration + bảng mới (gồm index `uq_school_class_id_org`) | Không đổi runtime |
| B | Subject API cải tiến | Tương thích ngược (D-13 giữ mảng; D-04 mã tuỳ chọn nên form cũ vẫn hợp lệ) |
| C | Teacher–Subject dual-read → new | Fallback so tên khi bảng mới thiếu |
| D | Curriculum CRUD | Endpoint mới |
| E | Class–Subject đọc + suy legacy | Endpoint mới |
| F | Áp curriculum/ghi | Chỉ lớp `CHUA_BAT_DAU` |

Không cần feature flag lâu dài. Nếu dùng dual-read, đặt property tạm thời và **xoá** sau khi
đối soát xong (tránh nhánh chết).

---

## 7. Rủi ro & giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Dữ liệu mã môn trùng | Cao | Pre-check, xử lý trước UNIQUE |
| Backfill theo tên bỏ sót | Trung bình | Báo cáo môn không map; không tự tạo dữ liệu |
| Đổi `teachesSubject` làm hỏng gán lớp cũ | Cao | Dual-read + test TC-TCH-012; chạy staging |
| Lớp tự chuyển trạng thái khi đang sửa môn | Trung bình | Khoá + kiểm lại trạng thái |
| Schedule mirror lệch tên môn | Trung bình | Phase 2 dùng `subjectId`; hiện không sửa |
| FE dùng quyền không có trong catalog | Trung bình | Rà `frontend/src/lib/permissions.ts`; không thêm mã lạ |
| H2 khác MySQL | Trung bình | Kiểm DDL staging |
| Áp module guard làm hỏng luồng cũ | Trung bình | Chỉ bật sau khi xác nhận module luôn bật |

---

## 8. Việc người dùng cần tự code (checklist)

- [ ] Xác nhận baseline `cdd03b8` + môi trường test MySQL.
- [ ] Viết migration 51/52 (51 kèm bảng nối tiên quyết, `uq_curriculum_subject_org`,
      `uq_school_class_id_org`) + cập nhật test schema.
- [ ] Thêm mã lỗi mới theo `validation-and-error-cases.md`.
- [ ] Hoàn thiện Subject (validation/check-code/usage/module guard; **không** phân trang;
      `code` tuỳ chọn).
- [ ] Thêm `curriculum.view/manage` vào catalog, gán cho chức danh Giáo vụ (D-14).
- [ ] Teacher–Subject (repo/service/API, đổi `teachesSubject`, assignable; **không** approve/reject).
- [ ] Curriculum (CRUD + nhiều tiên quyết + version).
- [ ] Class–Subject (snapshot, áp curriculum, giáo viên theo môn, bảo vệ dòng primary).
- [ ] Đổi môn chính + `class_subject_history` (D-08/D-15), dùng chung cho `PUT /classes/{id}`.
- [ ] `DELETE /classes/{id}` trả 409 `CONFLICT` khi đã có history (không rơi lỗi FK).
- [ ] Internal API/outbox hook (khi cần).
- [ ] Test theo `test-cases.md`.
- [ ] Gateway route `/api/curricula/**`.
- [ ] Handoff FE.
- [ ] Báo cáo kết quả, nêu rõ phần chưa kiểm được.

---

## 9. Definition of Done (Phase 1)

1. Subject: đủ nghiệp vụ, `code` tuỳ chọn + unique khi có giá trị, không phá dữ liệu.
2. Curriculum: tạo/sửa/ngừng, danh sách môn + thứ tự + số buổi/LT-TH + **nhiều tiên quyết**, version.
3. Class–Subject: nhiều môn, snapshot, legacy fallback, giáo viên theo môn, dòng primary được bảo vệ
   (D-15); đổi môn chính (kể cả `DANG_DIEN_RA`) ghi `class_subject_history` + đồng bộ
   `school_class.subject_id` trong một transaction, không chuyển giáo viên (D-08/D-15).
4. Teacher–Subject: nguồn sự thật theo ID, backfill đối soát, assignable đúng; không có bước duyệt.
5. RBAC: `curriculum.view/manage` (D-14) tách khỏi `subject.*`, ORGANIZATION, không tự cấp.
6. ERD/schema/API/validation/test khớp nhau.
7. Test xanh; E2E qua gateway; báo cáo trung thực.
8. Không chạm Phase 2 (xếp lịch).

---

## 10. Báo cáo cuối Phase 1 (mẫu)

Khi hoàn thành, báo cáo 9 mục theo yêu cầu:

1. Đã phân tích gì.
2. Đã thiết kế gì.
3. Vấn đề phát hiện trong source.
4. Nghiệp vụ người dùng tự code.
5. API cần triển khai.
6. Entity/quan hệ cần tạo/điều chỉnh.
7. Thứ tự code đề xuất.
8. Test cần chạy.
9. Rủi ro kỹ thuật còn lại (không còn câu hỏi nghiệp vụ mở — D-01…D-15 đã chốt).

**Dừng sau Phase 1.** Không tự chuyển sang Phase 2 và không triển khai thuật toán xếp lịch cho tới
khi người dùng duyệt.
