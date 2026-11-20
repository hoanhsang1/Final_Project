# Phase 1 — Implementation Roadmap (handoff cho người dùng)

> Tài liệu kế hoạch. **Không có code nào được viết bởi tài liệu này.** Người dùng trực tiếp triển khai
> Backend Java Spring Boot. Thứ tự dưới đây ưu tiên **additive** (không phá dữ liệu cũ), kiểm chứng
> được từng bước và có thể dừng giữa chừng mà hệ thống vẫn chạy.

---

## 1. Nguyên tắc triển khai

1. **Schema trước, logic sau:** tạo bảng/cột mới, chưa đổi hành vi cũ.
2. **Không xoá** `school_class.subject_id`, `teacher_specialty`, hay bất kỳ cột/dữ liệu cũ.
3. **Không đổi role/quyền mặc định**; chỉ thêm quyền nếu người dùng chốt.
4. **Mỗi bước có test và điểm rollback**; migration idempotent như migration 42.
5. **Không chạy production** trong quá trình này; staging/DB test riêng.
6. **Docs ≠ evidence:** sau mỗi WP phải có test thật, không dựa vào tài liệu.

---

## 2. Điều kiện tiên quyết

Chốt các quyết định trước khi code:

| ID | Nội dung | Ảnh hưởng |
|---|---|---|
| D-01 | Một/nhiều môn mỗi lớp | `class_subject` |
| D-02 | Curriculum gắn đâu | `curriculum`, `curriculum_id` |
| D-03 | Khai báo số buổi/giờ ở đâu + đơn vị | cột + validation |
| D-04 | Mã môn bắt buộc/duy nhất | `subject.code`, index |
| D-05 | Ai quản lý môn | catalog/scope |
| D-06/D-06a | Chuyên môn theo ID; có duyệt? | `teacher_subject` |
| D-07 | Tiên quyết | cột + rule |
| D-08 | Đổi khi đang học | rule/API |
| D-09 | Giáo viên theo môn | `class_subject.teacher_id` |
| D-10 | Module guard | controller |
| D-11 | Backfill dữ liệu cũ | script |
| D-12 | Versioning curriculum | `version` |
| D-13 | Phân trang danh sách môn | API/FE |

Nếu chưa chốt, chỉ nên làm **WP1 phần bảng mới không phụ thuộc** (curriculum/curriculum_subject)
và **WP2 phần không đổi hợp đồng**.

---

## 3. Work Packages

### WP0 — Chốt quyết định & baseline (S)

- **Việc:** trả lời D-01…D-13; xác nhận không đổi role; xác nhận môi trường test MySQL.
- **Output:** biên bản quyết định (có thể ghi ngay vào sổ D-xx).
- **DoD:** mọi mục `NEEDS_USER_DECISION` có lựa chọn cuối.

### WP1 — Migration & schema test (M)

- **Mục tiêu:** thêm bảng/cột mới, chưa đổi API.
- **Việc:**
  1. Tạo `51_people_curriculum.sql` (curriculum, curriculum_subject, `school_class.curriculum_id`).
  2. Tạo `52_people_teacher_subject.sql` (specialty_subject, teacher_subject, class_subject).
  3. (Nếu D-04) đổi `uq_subject_org_code` thành UNIQUE **sau** pre-check trùng.
  4. (Nếu D-03) thêm cột default trên `subject`.
  5. Cập nhật `backend/PeopleService/src/test/resources/people-test-schema.sql` tương ứng.
  6. Viết script backfill riêng (D-11), chưa chạy production.
- **File:** các migration ở thư mục gốc repo; test schema H2 nêu trên.
- **Test:** TC-LEG-001…008 trên MySQL staging; test H2 dựng schema không lỗi.
- **DoD:** migration idempotent chạy 2 lần không lỗi; rollback đã ghi; không đổi dữ liệu cũ.
- **Rollback:** drop bảng mới/cột mới; không đụng cột cũ.

### WP2 — Hoàn thiện Subject (M)

- **Mục tiêu:** đủ nghiệp vụ môn mà không phá FE.
- **Việc:**
  1. `SubjectRequest`: bắt buộc `code` nếu D-04; chuẩn hoá trim/upper (nếu chốt).
  2. `SubjectRepository`: kiểm mã trùng chủ động + map constraint; thêm đếm usage theo lớp;
     (nếu D-13=B) query phân trang.
  3. `SubjectController`: thêm module guard (D-10), `GET /subjects/check-code`,
     `GET /subjects/{id}/usage`, (nếu D-13=B) page/size.
  4. `ErrorCode`: thêm `SUBJECT_CODE_EXISTS`, `SUBJECT_INACTIVE` (nếu chốt).
  5. Map `DuplicateKeyException` theo tên constraint (code vs name).
  6. Audit giữ nguyên; bổ sung `classesUsingSubject` ở status (đã có).
- **File thật:**
  - `backend/PeopleService/src/main/java/com/mems/controller/SubjectController.java`
  - `.../repository/SubjectRepository.java`
  - `.../dto/SubjectRequest.java`, `.../dto/SubjectResponse.java`
  - `.../exception/ErrorCode.java`
  - (mới) `.../dto/SubjectCodeCheckResponse.java`, `.../dto/SubjectUsageResponse.java`
- **Test:** TC-SUB-001…020.
- **DoD:** không đổi response cũ (trừ D-13); FE hiện tại vẫn chạy; lỗi trùng mã đúng.
- **Rollback:** tắt endpoint mới; giữ code cũ.

### WP3 — Teacher–Subject theo ID (L)

- **Mục tiêu:** bỏ phụ thuộc tên; gán chuyên môn ổn định.
- **Việc:**
  1. Repository/service cho `specialty_subject` (đọc/ghi theo `SpecialtyController`).
  2. `TeacherSubjectRepository` (hoặc mở rộng `TeacherRepository`) cho `teacher_subject`.
  3. API `GET/POST/PUT/DELETE /teachers/{staffId}/subjects`; (nếu D-06a) approve/reject.
  4. Đổi `TeacherRepository.teachesSubject` sang `teacher_subject` (có giai đoạn dual-read nếu cần).
  5. Đổi `TeacherRepository.subjectMismatch` sang so `class_subject`/`teacher_subject`.
  6. Mở rộng `GET /teachers/assignable?subjectId=`.
  7. Backfill chạy staging; đối soát số dòng; báo cáo chuyên môn không map được.
  8. `TeacherService.update` khi đổi specialty: cập nhật `teacher_subject` theo chính sách.
- **File thật:**
  - `.../repository/TeacherRepository.java`, `.../service/TeacherService.java`
  - `.../controller/TeacherController.java`, `.../controller/SpecialtyController.java`
  - `.../repository/SpecialtyRepository.java`, `.../service/SpecialtyService.java`
  - (mới) `.../repository/TeacherSubjectRepository.java`
  - (mới) DTO `TeacherSubject*`
- **Test:** TC-TCH-001…018; đặc biệt TC-TCH-012 (đổi tên môn).
- **DoD:** mọi kiểm tra chuyên môn dùng ID; đổi tên môn không làm sai; backfill đối soát khớp.
- **Rollback:** dual-read trả về so tên nếu bảng mới lỗi; không xoá dữ liệu.

### WP4 — Curriculum CRUD (L)

- **Mục tiêu:** quản lý chương trình + môn/kỳ/số buổi/tiên quyết.
- **Việc:**
  1. `CurriculumRepository`, `CurriculumService`, `CurriculumController`.
  2. DTO create/update/response/subject.
  3. Validate chu trình tiên quyết (DFS), LT/TH, sequence, version.
  4. Audit `CURRICULUM_*`; optimistic lock.
  5. (Tuỳ chọn) clone.
- **File thật (mới):**
  - `.../controller/CurriculumController.java`
  - `.../service/CurriculumService.java`
  - `.../repository/CurriculumRepository.java`
  - `.../dto/CurriculumCreateRequest.java`, `CurriculumUpdateRequest.java`,
    `CurriculumResponse.java`, `CurriculumSubjectRequest.java`, `CurriculumSubjectResponse.java`
- **Test:** TC-CUR-001…018.
- **DoD:** CRUD đầy đủ; lỗi trùng/chu trình đúng mã; version hoạt động.
- **Rollback:** tắt controller/route; bảng giữ nguyên.

### WP5 — Class–Subject & áp curriculum (L)

- **Mục tiêu:** lớp có nhiều môn; snapshot từ curriculum; giáo viên theo môn.
- **Việc:**
  1. `ClassSubjectRepository` (đọc lớp môn, upsert, xoá, suy legacy từ `subject_id`).
  2. `SchoolClassService`: applyCurriculum, add/update/delete subject; kiểm trạng thái + version.
  3. `SchoolClassController`: 5 endpoint mục 4 `api-contract.md`.
  4. `SchoolClassResponse` thêm `curriculumId` (field mới, không phá).
  5. Gán giáo viên theo môn: kiểm `teacher_subject` + `DANG_DAY`.
  6. Audit `CLASS_CURRICULUM_APPLIED`, `CLASS_SUBJECT_*`.
- **File thật:**
  - `.../controller/SchoolClassController.java`
  - `.../service/SchoolClassService.java`
  - `.../repository/SchoolClassRepository.java`
  - `.../dto/SchoolClassResponse.java`
  - (mới) `.../repository/ClassSubjectRepository.java`, `.../dto/ClassSubject*`,
    `.../dto/ApplyCurriculumRequest.java`
- **Test:** TC-CLS-001…018, TC-CON-002/004.
- **DoD:** lớp legacy đọc được; lớp mới áp curriculum đúng; sửa template không đổi snapshot.
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
| Migration | `51_people_curriculum.sql`, `52_people_teacher_subject.sql` (gốc repo) | Tạo mới |
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
| A | Chỉ migration + bảng mới | Không đổi runtime |
| B | Subject API cải tiến | Tương thích ngược (trừ D-04/D-13) |
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

- [ ] Chốt D-01…D-13.
- [ ] Viết migration 51/52 + cập nhật test schema.
- [ ] Thêm mã lỗi mới (nếu chọn).
- [ ] Hoàn thiện Subject (validation/check-code/usage/module guard/pagination).
- [ ] Teacher–Subject (repo/service/API, đổi `teachesSubject`, assignable).
- [ ] Curriculum (CRUD + validate chu trình/version).
- [ ] Class–Subject (snapshot, áp curriculum, giáo viên theo môn).
- [ ] Internal API/outbox hook (khi cần).
- [ ] Test theo `test-cases.md`.
- [ ] Gateway route `/api/curricula/**`.
- [ ] Handoff FE.
- [ ] Báo cáo kết quả, nêu rõ phần chưa kiểm được.

---

## 9. Definition of Done (Phase 1)

1. Subject: đủ nghiệp vụ, mã môn theo quyết định, kiểm trùng đúng, không phá dữ liệu.
2. Curriculum: tạo/sửa/ngừng, môn/kỳ/số buổi/LT-TH/tiên quyết, version.
3. Class–Subject: nhiều môn, snapshot, legacy fallback, giáo viên theo môn.
4. Teacher–Subject: nguồn sự thật theo ID, backfill đối soát, assignable đúng.
5. RBAC: không đổi role ngoài phê duyệt; quyền mới (nếu có) được ghi rõ.
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
9. Câu hỏi nghiệp vụ còn chờ xác nhận.

**Dừng sau Phase 1.** Không tự chuyển sang Phase 2 và không triển khai thuật toán xếp lịch cho tới
khi người dùng duyệt.
