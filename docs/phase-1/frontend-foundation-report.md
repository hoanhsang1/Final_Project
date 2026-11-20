# MEMS Phase 1 – Frontend Foundation Report

> Bước 3.1 (Types, Permissions, Navigation, Routes) + Bước 3.2 (API & Mock Infrastructure)

---

## 1. Git

| Mục | Giá trị |
|-----|---------|
| **Branch** | `fixFlowCreateEmployee` |
| **HEAD tham chiếu** | `be2b049d3dd00830244d7019d6c0797316667ddf` |
| **HEAD sau khi hoàn thành** | Không có commit mới (không được phép commit) |
| **Uncommitted changes** | Có (toàn bộ là các file mới/sửa trong scope Phase 1) |

---

## 2. Files tạo mới

| File | Mô tả |
|------|-------|
| `frontend/src/features/academic/pages/curricula-page.tsx` | Placeholder page cho `/dao-tao/chuong-trinh-dao-tao` — dùng `BackendDependencyPage` vì API chưa sẵn sàng |
| `frontend/src/features/academic/pages/curriculum-detail-page.tsx` | Placeholder page cho `/dao-tao/chuong-trinh-dao-tao/:id` |
| `frontend/src/features/academic/phase1-foundation.test.ts` | Test suite Phase 1: permissions, API client, mock fixtures, D-rules |

---

## 3. Files sửa đổi

| File | Thay đổi |
|------|----------|
| `frontend/src/lib/permissions.ts` | Thêm `PERM.curriculumView`, `PERM.curriculumManage`, metadata vào `PERMISSION_GROUPS` |
| `frontend/src/lib/nav.ts` | Thêm `'curriculum.'` vào `ACADEMIC_PREFIXES`; thêm NavItem cho `curricula` |
| `frontend/src/features/academic/types.ts` | Thêm toàn bộ Phase 1 TypeScript types (xem §4) |
| `frontend/src/app/app.tsx` | Thêm 2 routes mới với `WorkspaceGuard` + `PermissionGuard` |
| `frontend/src/features/academic/api.ts` | Thêm 4 API modules mới; cập nhật `subjectsApi` |
| `frontend/src/features/academic/hooks.ts` | Thêm React Query hooks cho tất cả Phase 1 entities |
| `frontend/src/services/mock/fixtures.ts` | Thêm mock data cho subjects, curricula, classSubjects, history, teacherSubjects, specialtySubjects |
| `frontend/src/services/mock/adapter.ts` | Thêm mock handlers cho tất cả Phase 1 endpoints; fix TypeScript errors |

---

## 4. TypeScript Types đã thêm

### Subject
- `SubjectCreateRequest`
- `SubjectUpdateRequest`
- `SubjectStatusUpdateRequest`
- `SubjectCodeCheckResponse`
- `SubjectUsageResponse`

### Curriculum
- `Curriculum`
- `CurriculumSummary`
- `CurriculumCreateRequest`
- `CurriculumUpdateRequest`
- `CurriculumStatusUpdateRequest`

### Curriculum Subject
- `CurriculumSubject`
- `CurriculumSubjectCreateRequest`
- `CurriculumSubjectUpdateRequest`

### Prerequisite
- `PrerequisiteSubject`
- `PrerequisiteSubjectIds`

### Teacher Subject
- `TeacherSubject`
- `TeacherSubjectListResponse`
- `TeacherSubjectCreateRequest`
- `TeacherSubjectUpdateRequest`

### Specialty Subject
- `SpecialtySubject`
- `SpecialtySubjectUpdateRequest`

### Class Subject
- `ClassSubjectSource` (union: `'CURRICULUM' | 'MANUAL' | 'LEGACY'`)
- `ClassSubjectStatus` (union: `'ACTIVE' | 'INACTIVE'`)
- `ClassSubject`
- `ClassSubjectListResponse`
- `ClassSubjectCreateRequest`
- `ClassSubjectUpdateRequest`
- `ApplyCurriculumRequest`
- `PrimarySubjectChangeRequest`
- `PrimarySubjectChangeResponse`
- `ClassSubjectHistory`
- `ClassSubjectHistoryResponse`
- `CLASS_SUBJECT_SOURCE_LABELS` (display map)
- `CLASS_SUBJECT_STATUS_LABELS` (display map)

---

## 5. Permissions & Routes

### Permissions mới

| Constant | Giá trị |
|----------|---------|
| `PERM.curriculumView` | `'curriculum.view'` |
| `PERM.curriculumManage` | `'curriculum.manage'` |

### Routes mới

| Route | Component | Guard |
|-------|-----------|-------|
| `/dao-tao/chuong-trinh-dao-tao` | `CurriculaPage` | `WorkspaceGuard` + `PermissionGuard anyOf={[curriculumView, curriculumManage]}` |
| `/dao-tao/chuong-trinh-dao-tao/:id` | `CurriculumDetailPage` | `WorkspaceGuard` + `PermissionGuard anyOf={[curriculumView, curriculumManage]}` |

### Navigation

- NavItem `curricula` được thêm vào academic sidebar sau `subjects`
- Icon: `FileBadge` (lucide-react)
- Hiển thị khi có `curriculum.view` hoặc `curriculum.manage` và module `STUDENT_MANAGEMENT`

---

## 6. API Client

### `subjectsApi` (cập nhật)
| Method | Endpoint |
|--------|----------|
| `list()` | `GET /api/subjects` |
| `byId(id)` | `GET /api/subjects/:id` |
| `create(data)` | `POST /api/subjects` |
| `update(id, data)` | `PUT /api/subjects/:id` |
| `setActive(id, active)` | `PATCH /api/subjects/:id/status` |
| `checkCode(code, excludeId?)` | `GET /api/subjects/check-code` |
| `usage(id)` | `GET /api/subjects/:id/usage` |

### `curriculaApi` (mới)
| Method | Endpoint |
|--------|----------|
| `list(params?)` | `GET /api/curricula` |
| `byId(id)` | `GET /api/curricula/:id` |
| `create(data)` | `POST /api/curricula` |
| `update(id, data)` | `PUT /api/curricula/:id` |
| `setActive(id, active)` | `PATCH /api/curricula/:id/status` |
| `subjects(id)` | `GET /api/curricula/:id/subjects` |
| `addSubject(id, data)` | `POST /api/curricula/:id/subjects` |
| `updateSubject(id, subjectId, data)` | `PUT /api/curricula/:id/subjects/:subjectId` |
| `removeSubject(id, subjectId)` | `DELETE /api/curricula/:id/subjects/:subjectId` |

### `classSubjectsApi` (mới)
| Method | Endpoint |
|--------|----------|
| `list(classId)` | `GET /api/classes/:classId/subjects` |
| `applyCurriculum(classId, data)` | `PUT /api/classes/:classId/curriculum` |
| `addSubject(classId, data)` | `POST /api/classes/:classId/subjects` |
| `updateSubject(classId, subjectId, data)` | `PUT /api/classes/:classId/subjects/:subjectId` |
| `removeSubject(classId, subjectId)` | `DELETE /api/classes/:classId/subjects/:subjectId` |
| `changePrimarySubject(classId, data)` | `PUT /api/classes/:classId/subjects/primary` |
| `history(classId, params?)` | `GET /api/classes/:classId/subject-history` |

### `teacherSubjectsApi` (mới)
| Method | Endpoint |
|--------|----------|
| `list(staffId)` | `GET /api/teachers/:staffId/subjects` |
| `addSubject(staffId, data)` | `POST /api/teachers/:staffId/subjects` |
| `replaceSubjects(staffId, data)` | `PUT /api/teachers/:staffId/subjects` |

### `specialtySubjectsApi` (mới)
| Method | Endpoint |
|--------|----------|
| `getSubjects(specialtyId)` | `GET /api/specialties/:specialtyId/subjects` |
| `updateSubjects(specialtyId, data)` | `PUT /api/specialties/:specialtyId/subjects` |

---

## 7. React Query Hooks

### Keys mới (`academicKeys`)
`subjectUsage`, `curricula`, `curriculum`, `curriculumSubjects`, `classSubjects`, `classSubjectHistory`, `teacherSubjects`, `specialtySubjects`

### Hooks mới
| Hook | Mô tả |
|------|-------|
| `useSubjectUsage(id)` | Kiểm tra môn học có đang được sử dụng không |
| `useCurricula(params?)` | Danh sách CTĐT (pagination) |
| `useCurriculum(id)` | Chi tiết CTĐT |
| `useCurriculumSubjects(id)` | Danh sách môn trong CTĐT |
| `useCurriculumMutations()` | CRUD + setActive CTĐT |
| `useCurriculumSubjectMutations()` | Thêm/sửa/xóa môn trong CTĐT |
| `useClassSubjects(classId)` | Danh sách môn của lớp |
| `useClassSubjectHistory(classId, params?)` | Lịch sử thay đổi môn chính |
| `useClassSubjectMutations()` | CRUD + changePrimary + applyCurriculum |
| `useTeacherSubjects(staffId)` | Danh sách môn giáo viên |
| `useTeacherSubjectMutations()` | Thêm/thay thế môn giáo viên |
| `useSpecialtySubjects(specialtyId)` | Môn theo chuyên môn |
| `useSpecialtySubjectMutations()` | Cập nhật môn chuyên môn |

---

## 8. Mock Adapter – D-rules đã triển khai

| Rule | Endpoint | Mô tả |
|------|----------|-------|
| **D-04** | `POST /api/subjects` | `code=null` cho phép; nếu có code phải duy nhất trong org |
| **D-06a** | `POST /api/teachers/:id/subjects` | Status = `APPROVED` ngay lập tức, không có `PENDING` |
| **D-07** | `POST/PUT /api/curricula/:id/subjects/:subjectId` | Phát hiện vòng lặp prerequisite bằng DFS |
| **D-08** | `PUT /api/classes/:id/subjects/primary` | Kiểm tra `expectedVersion`, `operationId` (idempotency), `reason` |
| **D-09** | `GET /api/classes/:id/subjects` | Legacy fallback chỉ khi `classSubjects` rỗng |
| **D-13** | `GET /api/subjects` | Trả về flat array (không pagination) |
| **D-15** | `DELETE /api/classes/:id/subjects/:subjectId` | Row `isPrimary=true` không thể xóa → 409 `CLASS_SUBJECT_LEGACY_PROTECTED` |

---

## 9. Backend Dependencies (API chưa sẵn sàng)

Các endpoints sau chưa có Backend thật. Placeholder pages hiển thị `BackendDependencyPage`.

| Endpoint | Mô tả |
|----------|-------|
| `GET /api/curricula` | Danh sách CTĐT |
| `POST /api/curricula` | Tạo CTĐT |
| `GET /api/curricula/:id` | Chi tiết CTĐT |
| `PUT /api/curricula/:id` | Cập nhật CTĐT |
| `PATCH /api/curricula/:id/status` | Đổi trạng thái CTĐT |
| `GET /api/curricula/:id/subjects` | Môn trong CTĐT |
| `POST /api/curricula/:id/subjects` | Thêm môn vào CTĐT |
| `PUT /api/curricula/:id/subjects/:subjectId` | Sửa môn trong CTĐT |
| `DELETE /api/curricula/:id/subjects/:subjectId` | Xóa môn khỏi CTĐT |
| `GET /api/classes/:id/subjects` | Môn của lớp |
| `PUT /api/classes/:id/curriculum` | Áp dụng CTĐT cho lớp |
| `POST /api/classes/:id/subjects` | Thêm môn thủ công |
| `PUT /api/classes/:id/subjects/:subjectId` | Sửa môn lớp |
| `DELETE /api/classes/:id/subjects/:subjectId` | Xóa môn lớp |
| `PUT /api/classes/:id/subjects/primary` | Thay đổi môn chính |
| `GET /api/classes/:id/subject-history` | Lịch sử thay đổi môn chính |
| `GET /api/teachers/:id/subjects` | Môn giáo viên |
| `POST /api/teachers/:id/subjects` | Gán môn cho giáo viên |
| `PUT /api/teachers/:id/subjects` | Thay thế danh sách môn |
| `GET /api/specialties/:id/subjects` | Môn theo chuyên môn |
| `PUT /api/specialties/:id/subjects` | Cập nhật môn chuyên môn |

---

## 10. Kết quả kiểm thử

| Nhóm | File | Tests | Kết quả |
|------|------|-------|---------|
| Toàn bộ suite (trước khi thêm Phase 1 tests) | 31 files | 170/170 | ✅ Tất cả pass |
| Phase 1 foundation tests | `phase1-foundation.test.ts` | 36/36 | ✅ Tất cả pass |
| **Toàn bộ suite (sau khi thêm Phase 1 tests)** | **32 files** | **206/206** | **✅ Tất cả pass (115.77s)** |

### Phase 1 test coverage
- **Permission constants** (6 tests): `curriculumView`, `curriculumManage` trong `PERM` và `PERMISSION_GROUPS`
- **API client** (11 tests): Kiểm tra tất cả API modules và functions tồn tại
- **Mock mode flag** (2 tests): `isMockMode` là boolean, false trong test environment
- **Mock fixtures – D-04** (3 tests): code=null cho phép; code duy nhất trong org; nhiều org trong fixtures
- **Mock fixtures – Org isolation** (4 tests): `OTHER_ORG_ID` và `DEMO_ORG_ID` tách biệt
- **Mock fixtures – D-06a** (2 tests): Teacher subject chỉ có APPROVED/REVOKED, không có PENDING
- **Mock fixtures – D-07** (2 tests): Curriculum và ClassSubject có dữ liệu
- **Mock fixtures – D-08/D-15** (1 test): Mỗi lớp có tối đa 1 primary subject
- **Mock fixtures – History** (2 tests): History có entries với đủ fields
- **Mock fixtures – Specialty** (1 test): Array tồn tại
- **Mock fixtures – Curriculum versions** (2 tests): version là number; có curriculum inactive

---

## 11. Vấn đề đã phát hiện

### Không có vấn đề nghiệp vụ mới

Tất cả D-rules từ D-01 đến D-15 đã được triển khai trong mock adapter theo đúng spec.

### TypeScript build errors (đã fix)

| Lỗi | Nguyên nhân | Fix |
|-----|------------|-----|
| `OTHER_ORG_ID declared but not read` | Import thừa trong adapter.ts | Xóa khỏi import |
| `account.orgId: string \| null` không gán được vào `string` | MockSubject.orgId typed là string | Dùng `account.orgId!` (guaranteed sau requireAccount) |
| `profile` possibly undefined sau find + push | TypeScript không narrow sau mutable push | Dùng pattern: `const newProfile = ...; push(newProfile); profile = newProfile` |
| `TeacherSubject` not found | Thiếu import từ types | Thêm vào import block |
| `entry` possibly undefined (specialtySubjects) | Tương tự profile | Same fix pattern |
| `MockTeacherSubjectProfile` / `MockSpecialtySubject` | Không import type | Thêm vào fixtures import |

---

## 12. Chưa làm (Bước 3.3+)

- UI cho 9 màn hình (Subject, Curriculum, CurriculumSubject, Prerequisite, TeacherSpecialty, TeacherSubject, ClassSubject, PrimaryChange, History)
- Kết nối với Backend thật (cần Backend triển khai các endpoints ở §9 trước)
- E2E tests
