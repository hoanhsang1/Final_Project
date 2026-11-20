# MEMS Phase 1 – Frontend UI/UX Plan

> **Tài liệu thiết kế giao diện Phase 1 – Academic Setup.**
> Nguồn nghiệp vụ: D-01…D-15 (đã chốt). Không có quyết định nghiệp vụ mới trong tài liệu này.
> Phạm vi: chỉ thiết kế UI/UX. Không có React code trong tài liệu này.

---

## Mục lục

1. [Design Overview](#1-design-overview)
2. [Scope – 9 Màn hình](#2-scope--9-màn-hình)
3. [Permission Matrix](#3-permission-matrix)
4. [Detailed Screen Specs](#4-detailed-screen-specs)
   - [Screen 1 – Subject Management](#screen-1--subject-management)
   - [Screen 2 – Curriculum Management](#screen-2--curriculum-management)
   - [Screen 3 – Curriculum Subject](#screen-3--curriculum-subject)
   - [Screen 4 – Curriculum Prerequisite](#screen-4--curriculum-prerequisite-trong-screen-3)
   - [Screen 5 – Teacher Specialty Subject](#screen-5--teacher-specialty-subject)
   - [Screen 6 – Teacher Subject](#screen-6--teacher-subject)
   - [Screen 7 – Class Subject Management](#screen-7--class-subject-management)
   - [Screen 8 – Primary Subject Change](#screen-8--primary-subject-change)
   - [Screen 9 – Class Subject History](#screen-9--class-subject-history)
5. [User Flows](#5-user-flows)
6. [API Mapping Table](#6-api-mapping-table)
7. [Form Fields & Validation](#7-form-fields--validation)
8. [Loading / Empty / Error States](#8-loading--empty--error-states)
9. [Responsive Behavior](#9-responsive-behavior)
10. [React Structure Proposal](#10-react-structure-proposal)
11. [Backend Dependencies](#11-backend-dependencies)
12. [Issues / Decisions Needed](#12-issues--decisions-needed)
13. [Implementation Order](#13-implementation-order)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. Design Overview

### Tech Stack (từ Audit Report)

| Layer | Công nghệ |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router DOM 7 |
| Server state | TanStack React Query 5 |
| Client state | Zustand 5 |
| HTTP | Axios (custom `http.ts` instance) |
| Styling | TailwindCSS 4 |
| UI Primitives | Radix UI |
| Testing | Vitest + Testing Library |

### Design System Principles

- **Không tạo thêm thư viện UI mới.** Chỉ sử dụng components đã có trong codebase.
- **Components tái sử dụng:**  
  `DataTable`, `Dialog`, `Drawer`, `ConfirmDialog`, `Badge`, `Button`, `Field`, `Input`, `Textarea`, `Select`, `SearchInput`, `Pagination`, `Alert`, `ErrorState`, `Spinner`, `PageHeader`, `PageContainer`, `PermissionGuard`, `WorkspaceGuard`
- **Pattern hiện tại:** `api.ts` → `hooks.ts` (React Query) → Page component
- **Mock mode:** `VITE_DATA_SOURCE=mock` → `mock/adapter.ts` interceptor (không bundle production)
- **Permission:** luôn dùng `usePermission()` hook + `PermissionGuard`. **Không hardcode theo role name.**
- **Labels UI:** tiếng Việt (nhất quán với app hiện tại).
- **Academic Workspace:** mọi màn hình mới nằm trong workspace `academic` (đã có).

### Kiến trúc hiện tại (giữ nguyên)

```
features/academic/
├── api.ts        ← tất cả API calls
├── hooks.ts      ← React Query hooks
├── types.ts      ← TypeScript types
└── pages/        ← Page components
```

Không cần xây dựng lại layout. Mở rộng workspace `academic` hiện có.

---

## 2. Scope – 9 Màn hình

| # | Màn hình | Route | Trạng thái | Phụ thuộc Backend |
|---|---|---|---|---|
| 1 | Subject Management | `/dao-tao/mon-hoc` | Đã có (cần nâng cấp) | WP2 |
| 2 | Curriculum Management | `/dao-tao/chuong-trinh-dao-tao` | **Mới** | WP4 |
| 3 | Curriculum Subject | `/dao-tao/chuong-trinh-dao-tao/:id` | **Mới** (sub-view) | WP4 |
| 4 | Curriculum Prerequisite | (trong Screen 3) | **Mới** (trong drawer) | WP4 |
| 5 | Teacher Specialty Subject | (trong teacher detail) | **Mới** (section) | WP3 |
| 6 | Teacher Subject | (trong teacher detail) | **Mới** (section) | WP3 |
| 7 | Class Subject Management | (trong class detail) | **Mới** (tab) | WP5 |
| 8 | Primary Subject Change | (dialog trong Screen 7) | **Mới** | WP5 |
| 9 | Class Subject History | (tab trong class detail) | **Mới** | WP5 |

---

## 3. Permission Matrix

| Màn hình | Xem (read) | Ghi (write) | Module guard | Ghi chú |
|---|---|---|---|---|
| Subject Management | `subject.view` HOẶC `subject.manage` | `subject.manage` | `STUDENT_MANAGEMENT` | `includeInactive` chỉ hiển thị khi có `subject.manage` |
| Curriculum Management | `curriculum.view` HOẶC `curriculum.manage` | `curriculum.manage` | `STUDENT_MANAGEMENT` | **D-14: quyền mới, chưa có trong catalog** |
| Curriculum Subject | `curriculum.view` | `curriculum.manage` | `STUDENT_MANAGEMENT` | Cùng quyền với Curriculum |
| Curriculum Prerequisite | `curriculum.view` | `curriculum.manage` | `STUDENT_MANAGEMENT` | Trong form Curriculum Subject |
| Teacher Specialty Subject | `employee.view` | `employee.edit` | — | Trong teacher detail |
| Teacher Subject | `employee.view` | `employee.edit` | — | Trong teacher detail |
| Class Subject Management | `class.view` | `class.edit` | `STUDENT_MANAGEMENT` | Trong class detail |
| Primary Subject Change | `class.view` | `class.edit` | `STUDENT_MANAGEMENT` | Dialog từ Screen 7 |
| Class Subject History | `class.view` | — (read only) | — | Tab trong class detail |

> **⚠ BACKEND DEPENDENCY (D-14):**  
> `curriculum.view` và `curriculum.manage` **chưa có** trong `frontend/src/lib/permissions.ts` và chưa có trong PermissionCatalog backend.  
> Frontend phải thêm vào `lib/permissions.ts`; backend phải thêm vào catalog và gán qua chức danh Giáo vụ.

---

## 4. Detailed Screen Specs

---

### Screen 1 – Subject Management

**Route:** `/dao-tao/mon-hoc` (ĐÃ TỒN TẠI – nâng cấp)  
**Mục đích:** Quản lý danh sách môn học của tổ chức.  
**Người dùng:** OWNER, người có `subject.manage` (Giáo vụ), người có `subject.view` (xem).

#### Layout

```
PageContainer
└─ PageHeader (tiêu đề "Môn học", nút "Thêm môn học" nếu có quyền ghi)
   └─ Toolbar
      ├─ SearchInput (placeholder: "Tìm theo tên, mã môn...")
      └─ Toggle "Hiển thị môn ngừng dùng" (chỉ hiện khi có subject.manage)
   └─ DataTable
      └─ Pagination (nếu API trả về)
```

#### Cột DataTable

| Cột | Field | Responsive |
|---|---|---|
| Môn học | `name` + `code` (badge phụ bên dưới) | Luôn hiện |
| Mô tả | `description` (truncate 100 ký tự) | Ẩn dưới `md` |
| Trạng thái | Badge: `active=true` → "Đang dùng" (xanh), `false` → "Ngừng dùng" (xám) | Luôn hiện |
| Cập nhật | `updatedAt` định dạng `DD/MM/YYYY` | Ẩn dưới `lg` |
| Thao tác | Nút Sửa + nút Kích hoạt/Ngừng (chỉ khi có `subject.manage`) | Luôn hiện |

> **D-13:** `GET /api/subjects` trả **mảng** (không phân trang). Không hiển thị Pagination.  
> **D-04:** Cột "Mã" có thể rỗng → hiển thị "—".

#### Bộ lọc & tìm kiếm

| Tham số | Loại | Mô tả |
|---|---|---|
| `q` | text input | Tìm theo `name` và `code` (debounce 300ms) |
| `includeInactive` | boolean toggle | Mặc định `false`; chỉ hiển thị toggle khi có `subject.manage` |

#### Thao tác CRUD

| Thao tác | Trigger | Điều kiện |
|---|---|---|
| Thêm môn | Nút "Thêm môn học" → Dialog | `subject.manage` |
| Sửa | Nút "Sửa" trong row → Dialog | `subject.manage` |
| Kích hoạt | Nút "Kích hoạt" (confirm dialog) | `subject.manage`; môn đang ngừng |
| Ngừng hoạt động | Nút "Ngừng dùng" (confirm dialog kèm cảnh báo) | `subject.manage`; môn đang active |

#### Form Thêm/Sửa môn (Dialog)

| Field | Type | Bắt buộc | Ràng buộc | Lỗi |
|---|---|---|---|---|
| Mã môn | Input text | ❌ Không | ≤ 50 ký tự; unique trong org nếu có giá trị (D-04) | "Mã môn đã tồn tại" (409 `SUBJECT_CODE_EXISTS`) |
| Tên môn | Input text | ✅ Có | ≤ 200 ký tự | "Tên môn là bắt buộc"; "Tên môn đã tồn tại" (409 `CONFLICT`) |
| Mô tả | Textarea | ❌ Không | ≤ 500 ký tự | — |

**Validation client-side:**
- `name`: trim; không được rỗng; ≤ 200 ký tự
- `code`: nếu rỗng → không gửi (gửi `null`); nếu có → trim; ≤ 50 ký tự
- `description`: ≤ 500 ký tự

**Confirm dialog Ngừng hoạt động:**
- Tiêu đề: "Ngừng hoạt động môn học?"
- Nội dung: "Môn học sẽ không thể chọn cho lớp mới. Các lớp đang sử dụng môn này không bị ảnh hưởng."
- Nếu có `classesUsingSubject > 0` (từ audit log): hiển thị cảnh báo "Hiện có [N] lớp đang sử dụng môn này."
- Nút: "Xác nhận" (đỏ) / "Huỷ"

#### Loading / Empty / Error states

| State | Hiển thị |
|---|---|
| Loading | Skeleton rows (DataTable built-in) |
| Empty (không có môn nào) | Icon + "Chưa có môn học nào. Hãy thêm môn học đầu tiên." + nút "Thêm môn học" |
| Empty (search không có kết quả) | "Không tìm thấy môn học phù hợp." |
| Error | `<Alert variant="destructive">` + nút "Thử lại" |

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Danh sách | `GET /api/subjects?q=&includeInactive=` | ✅ Đã có |
| Tạo mới | `POST /api/subjects` | ✅ Đã có |
| Cập nhật | `PUT /api/subjects/{id}` | ✅ Đã có |
| Đổi trạng thái | `PATCH /api/subjects/{id}/status` | ✅ Đã có |

---

### Screen 2 – Curriculum Management

**Route:** `/dao-tao/chuong-trinh-dao-tao` (**MỚI** – thêm vào nav.ts và app.tsx)  
**Mục đích:** Quản lý danh sách chương trình đào tạo (curriculum) của tổ chức.  
**Người dùng:** OWNER, người có `curriculum.manage` (Giáo vụ), `curriculum.view`.

> **D-02:** Curriculum là mẫu cấp tổ chức. Một lớp tham chiếu một curriculum.  
> **Không có học kỳ** trong Phase 1 (D-02). Không hiển thị bất kỳ trường `termNo` nào.  
> **D-12:** Sửa curriculum tăng `version`. Lớp đã áp dụng giữ snapshot, không bị ảnh hưởng.

#### Layout

```
PageContainer
└─ PageHeader (tiêu đề "Chương trình đào tạo", nút "Tạo CTĐT" nếu có quyền)
   └─ Toolbar
      ├─ SearchInput (placeholder: "Tìm theo mã, tên CTĐT...")
      └─ Select "Trạng thái" (Tất cả / Đang dùng / Ngừng dùng)
   └─ DataTable với Pagination
```

#### Cột DataTable

| Cột | Field | Responsive |
|---|---|---|
| Mã CTĐT | `code` | Luôn hiện |
| Tên CTĐT | `name` | Luôn hiện |
| Khối/Niên khoá | `gradeLevel` (hoặc "—") | Ẩn dưới `md` |
| Phiên bản | `version` (Badge: "v{n}") | Ẩn dưới `md` |
| Trạng thái | Badge: active → "Đang dùng", inactive → "Ngừng dùng" | Luôn hiện |
| Số môn | Số lượng môn trong curriculum (từ response) | Ẩn dưới `lg` |
| Thao tác | Xem chi tiết / Sửa / Kích hoạt/Ngừng | Luôn hiện |

#### Bộ lọc & tìm kiếm

| Tham số | Loại | Mô tả |
|---|---|---|
| `q` | text | Tìm theo `code` và `name` (debounce 300ms) |
| `isActive` | select | `true` / `false` / (rỗng = tất cả) |
| `page` | number | 1-based (backend Curriculum dùng 1-based) |
| `size` | number | Mặc định 20 |

#### Thao tác

| Thao tác | Trigger | Điều kiện |
|---|---|---|
| Tạo CTĐT | Nút "Tạo CTĐT" → Dialog | `curriculum.manage` |
| Xem chi tiết | Nút "Xem" hoặc click tên → `/dao-tao/chuong-trinh-dao-tao/:id` | `curriculum.view` |
| Sửa | Nút "Sửa" → Dialog | `curriculum.manage` |
| Kích hoạt/Ngừng | Nút trong row → ConfirmDialog | `curriculum.manage` |

#### Form Tạo/Sửa CTĐT (Dialog)

| Field | Type | Bắt buộc | Ràng buộc | Lỗi |
|---|---|---|---|---|
| Mã CTĐT | Input | ✅ Có | ≤ 50 ký tự; unique trong org | "Mã CTĐT đã tồn tại" (409 `CURRICULUM_CODE_EXISTS`) |
| Tên CTĐT | Input | ✅ Có | ≤ 200 ký tự; unique trong org | "Tên CTĐT đã tồn tại" (409 `CONFLICT`) |
| Mô tả | Textarea | ❌ Không | ≤ 1000 ký tự | — |
| Khối/Niên khoá | Input | ❌ Không | ≤ 50 ký tự | — |
| Mã ngành | Input | ❌ Không | ≤ 50 ký tự | — |
| `version` | (hidden field) | Form sửa | Lấy từ curriculum response | Dùng cho optimistic lock |

**Khi sửa:** hiển thị badge "Phiên bản hiện tại: v{n}" trong dialog header.  
Sau khi sửa thành công: invalidate query, hiển thị toast "Đã cập nhật. Phiên bản mới: v{n+1}".

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Danh sách | `GET /api/curricula?q=&isActive=&page=&size=` | ⚠️ Đề xuất – chưa implement |
| Tạo | `POST /api/curricula` | ⚠️ Đề xuất – chưa implement |
| Cập nhật | `PUT /api/curricula/{id}` | ⚠️ Đề xuất – chưa implement |
| Đổi trạng thái | `PATCH /api/curricula/{id}/status` | ⚠️ Đề xuất – chưa implement |

> **⚠ BACKEND DEPENDENCY:** Gateway route `/api/curricula/**` chưa được cấu hình (xem §11).

---

### Screen 3 – Curriculum Subject

**Route:** `/dao-tao/chuong-trinh-dao-tao/:id` (**MỚI** – Curriculum Detail Page)  
**Mục đích:** Quản lý danh sách môn học trong một chương trình đào tạo.  
**Người dùng:** `curriculum.view` (xem), `curriculum.manage` (ghi).

#### Layout tổng thể

```
PageContainer
└─ Curriculum Header Card
   ├─ Mã CTĐT, Tên, Mô tả, Khối
   ├─ Badge: Phiên bản (v{n}), Trạng thái
   └─ Nút "Sửa CTĐT" (nếu có curriculum.manage)
└─ Tabs
   ├─ Tab "Danh sách môn" (mặc định)
   │  ├─ Nút "Thêm môn" (nếu có curriculum.manage + curriculum đang active)
   │  └─ DataTable môn học
   └─ [Prerequisite được quản lý trong form của từng môn – xem Screen 4]
```

#### Cột DataTable (Curriculum Subject)

| Cột | Field | Responsive |
|---|---|---|
| STT | `sequenceNo` | Luôn hiện |
| Môn học | `subjectName` + `subjectCode` (badge phụ) | Luôn hiện |
| Bắt buộc | `isRequired` → Badge "Bắt buộc" / "Tuỳ chọn" | Ẩn dưới `sm` |
| Số buổi | `requiredSessions` | Luôn hiện |
| Lý thuyết | `theoryHours` | Ẩn dưới `md` |
| Thực hành | `practiceHours` | Ẩn dưới `md` |
| Thời lượng (phút) | `sessionMinutes` | Ẩn dưới `lg` |
| Tiên quyết | Danh sách tên môn tiên quyết dưới dạng badges (rỗng = "—") | Ẩn dưới `lg` |
| Ghi chú | `notes` (truncate) | Ẩn dưới `lg` |
| Thao tác | Nút Sửa / Xóa (chỉ khi có quyền) | Luôn hiện |

> **D-03:** Không ép `theoryHours + practiceHours = requiredSessions`. Chỉ validate `>= 0`.  
> **D-07:** Tiên quyết là mảng 0..n. Phase 1 chỉ cảnh báo, không chặn.

#### Thêm môn vào Curriculum (Dialog)

**Bước 1:** Chọn môn từ danh sách môn active của tổ chức (combobox có search).  
Lọc ra các môn **chưa có trong curriculum** này.

**Bước 2:** Điền thông tin định nghĩa (form bên dưới combobox hoặc bước riêng):

| Field | Type | Bắt buộc | Ràng buộc |
|---|---|---|---|
| Thứ tự (STT) | Number | ✅ | ≥ 1; unique trong curriculum |
| Số buổi yêu cầu | Number | ✅ | ≥ 1, ≤ 1000 |
| Thời lượng buổi (phút) | Number | ✅ | ≥ 1, ≤ 600 |
| Giờ lý thuyết | Number | ❌ | ≥ 0 |
| Giờ thực hành | Number | ❌ | ≥ 0 |
| Bắt buộc | Switch/Checkbox | ❌ | Default: true |
| Ghi chú | Textarea | ❌ | ≤ 500 ký tự |
| Môn tiên quyết | Multi-select | ❌ | Chọn từ môn **đã có trong curriculum**; không tự trỏ; ≤ 50 |

#### Sửa môn (Drawer)

Drawer mở từ phải, hiển thị form tương tự như Thêm môn nhưng:
- Môn học hiển thị read-only (không đổi môn).
- Muốn đổi môn: xóa rồi thêm lại.
- Hiển thị danh sách tiên quyết hiện tại + multi-select để thay toàn bộ.

#### Xóa môn khỏi Curriculum (Confirm Dialog)

- Tiêu đề: "Xóa môn khỏi chương trình?"
- Nội dung: "Môn học [tên] sẽ bị xóa khỏi chương trình. Các lớp đã áp dụng chương trình này không bị ảnh hưởng."
- Cảnh báo thêm: nếu môn này là tiên quyết của môn khác trong cùng curriculum → hiển thị danh sách môn phụ thuộc; yêu cầu xác nhận.

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Lấy chi tiết curriculum | `GET /api/curricula/{id}` | ⚠️ Đề xuất |
| Danh sách môn trong curriculum | `GET /api/curricula/{id}/subjects` | ⚠️ Đề xuất |
| Thêm môn | `POST /api/curricula/{id}/subjects` | ⚠️ Đề xuất |
| Cập nhật môn | `PUT /api/curricula/{id}/subjects/{subjectId}` | ⚠️ Đề xuất |
| Xóa môn | `DELETE /api/curricula/{id}/subjects/{subjectId}` | ⚠️ Đề xuất |
| Danh sách môn org (cho combobox) | `GET /api/subjects` | ✅ Đã có |

---

### Screen 4 – Curriculum Prerequisite (trong Screen 3)

**Vị trí:** Nằm trong form Thêm/Sửa môn của Screen 3 (không phải màn hình riêng biệt).  
**Mục đích:** Quản lý môn tiên quyết cho từng môn trong curriculum.

#### UI Component: Prerequisite Multi-Select

Hiển thị trong Drawer/Dialog của Screen 3, phần "Môn tiên quyết":

```
Section: Môn tiên quyết
└─ Multi-select combobox
   ├─ Options: tất cả môn KHÁC trong cùng curriculum
   ├─ Đã chọn: hiển thị dưới dạng tags/badges có thể xóa
   └─ Placeholder: "Chọn môn tiên quyết (không bắt buộc)"
└─ Warning banner (nếu prerequisites chưa đủ):
   "⚠ Cảnh báo: Môn tiên quyết có thể chưa đủ. Phase 1 chỉ cảnh báo, không chặn."
```

#### Business Rules cho Prerequisite

| Rule | Xử lý UI |
|---|---|
| Không được tự trỏ vào chính mình | Lọc bỏ môn hiện tại khỏi danh sách chọn |
| Không trùng lặp | Multi-select tự loại bỏ duplicate |
| Không được tạo chu trình | Chỉ phát hiện sau khi gọi API (409 `SUBJECT_PREREQUISITE_CYCLE`) |
| Tối đa 50 tiên quyết | Validation client: `> 50` → báo lỗi ngay |
| Môn tiên quyết phải nằm trong cùng curriculum | Multi-select chỉ cho chọn môn trong curriculum |

#### Xử lý lỗi Prerequisite

| Mã lỗi | Hiển thị |
|---|---|
| `SUBJECT_PREREQUISITE_CYCLE` | Alert: "Chuỗi tiên quyết tạo vòng lặp. Vui lòng kiểm tra lại." (backend trả `path` trong `data`) |
| `PREREQUISITE_DUPLICATE` | Alert: "Môn tiên quyết bị trùng lặp." |
| `PREREQUISITE_IDS_TOO_MANY` | Alert: "Tối đa 50 môn tiên quyết." |
| `CURRICULUM_SUBJECT_NOT_FOUND` | Alert: "Môn tiên quyết không tồn tại trong chương trình này." |

---

### Screen 5 – Teacher Specialty Subject

**Vị trí:** Section trong Teacher Detail (drawer hoặc trang riêng `/dao-tao/giao-vien/:staffId`).  
**Mục đích:** Quản lý ánh xạ chuyên môn ↔ môn học (specialty → subject mapping).  
**Người dùng:** `employee.view` (xem), `employee.edit` (ghi).

> **D-06:** `specialty_subject` = ánh xạ chuyên môn sang môn học. Đây là **gợi ý**, không phải nguồn sự thật về quyền dạy.  
> **D-06:** `teacher_subject` mới là nguồn sự thật. Xem Screen 6.

#### Layout (trong Teacher Detail)

```
Section: Chuyên môn
└─ List các chuyên môn của giáo viên
   └─ Với mỗi chuyên môn:
      ├─ Tên chuyên môn (read-only)
      └─ Danh sách môn thuộc chuyên môn này (multi-select có thể sửa)
         └─ Nút "Lưu" khi thay đổi (nếu có employee.edit)
```

#### Cột hiển thị cho mỗi chuyên môn

| Phần | Hiển thị |
|---|---|
| Tên chuyên môn | Bold, không chỉnh sửa |
| Môn học thuộc chuyên môn | Multi-select (các môn active của org); lưu khi nhấn Lưu |

#### Thao tác

| Thao tác | Trigger | Điều kiện |
|---|---|---|
| Sửa môn thuộc chuyên môn | Multi-select trong section | `employee.edit` |
| Lưu thay đổi | Nút "Lưu" trong section | `employee.edit` |

**API:** `PUT /api/specialties/{specialtyId}/subjects` – thay **toàn bộ** danh sách môn của chuyên môn đó.

**Lỗi:**
- `SUBJECT_NOT_FOUND` → "Môn học không tồn tại."
- `SUBJECT_INACTIVE` → "Chỉ có thể chọn môn đang hoạt động."

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Lấy môn của chuyên môn | `GET /api/specialties/{id}/subjects` | ⚠️ Đề xuất |
| Cập nhật môn của chuyên môn | `PUT /api/specialties/{id}/subjects` | ⚠️ Đề xuất |
| Danh sách môn org | `GET /api/subjects` | ✅ Đã có |

---

### Screen 6 – Teacher Subject

**Vị trí:** Section trong Teacher Detail (cùng trang với Screen 5, tab hoặc section riêng).  
**Mục đích:** Quản lý danh sách môn giáo viên được xác nhận **đủ điều kiện giảng dạy** (`teacher_subject`).  
**Người dùng:** `employee.view` (xem), `employee.edit` (ghi).

> **D-06a:** Không có PENDING, không có Approve/Reject. Mọi gán môn đều lập tức `APPROVED`.  
> **BR-TCH-07:** `teacher_subject.status` chỉ là `APPROVED` hoặc `REVOKED` ở Phase 1.  
> **BR-TCH-11:** `specialty_subject` chỉ là gợi ý; `teacher_subject` là quyền dạy thực sự.

#### Layout

```
Section: Môn học giảng dạy
└─ Mô tả ngắn: "Danh sách môn giáo viên được xác nhận đủ điều kiện giảng dạy."
└─ Nút "Thêm môn" (nếu có employee.edit)
└─ DataTable
```

#### Cột DataTable (Teacher Subject)

| Cột | Field | Responsive |
|---|---|---|
| Môn học | `subjectName` + `subjectCode` | Luôn hiện |
| Nguồn | `source` → Badge: "Chuyên môn" (SPECIALTY, xanh) / "Thủ công" (MANUAL, xám) | Luôn hiện |
| Ngày gán | `createdAt` → `DD/MM/YYYY` | Ẩn dưới `md` |
| Trạng thái | Chỉ hiển thị `APPROVED` (Phase 1 không có PENDING) | Ẩn dưới `lg` |
| Thao tác | Nút "Thu hồi" (nếu có employee.edit) | Luôn hiện |

#### Thêm môn (Dialog)

- Combobox chọn môn active của org, lọc bỏ môn đã có (APPROVED).
- Nguồn: tự động set `MANUAL`.
- Ngay khi tạo: `status = APPROVED` (D-06a).

**Lỗi:**
- `TEACHER_SUBJECT_EXISTS` → "Môn học này đã được gán cho giáo viên."
- `SUBJECT_INACTIVE` → "Chỉ có thể chọn môn đang hoạt động."
- `TEACHER_NOT_AVAILABLE` → "Giáo viên đã nghỉ việc, không thể gán môn."

#### Thu hồi môn (Confirm Dialog / với cảnh báo)

Flow:
1. Nhấn "Thu hồi" → gọi `PUT /api/teachers/{staffId}/subjects` với `confirmRevokeInUse=false`.
2. Nếu response `409 TEACHER_SUBJECT_IN_USE`: hiển thị cảnh báo:
   > "Giáo viên đang giảng dạy môn này tại [N] lớp đang hoạt động. Thu hồi có thể ảnh hưởng đến các lớp sau: [danh sách lớp]. Bạn có chắc muốn tiếp tục?"
   - Nút "Xác nhận thu hồi" → gọi lại với `confirmRevokeInUse=true`.
   - Nút "Huỷ".
3. Thu hồi thành công: set `status = REVOKED` (không xóa dòng – BR-TCH-05).

> **D-06a:** Không có nút "Duyệt" hay "Từ chối". Đây là **quyết định cuối** (không phải tạm hoãn).

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Danh sách môn GV | `GET /api/teachers/{staffId}/subjects` | ⚠️ Đề xuất |
| Thêm môn | `POST /api/teachers/{staffId}/subjects` | ⚠️ Đề xuất |
| Thay toàn bộ / Thu hồi | `PUT /api/teachers/{staffId}/subjects` | ⚠️ Đề xuất |

> **Ghi chú:** `version` trong teacher API là `staff_profile.version` (không phải `teacher_profile.version`).

---

### Screen 7 – Class Subject Management

**Vị trí:** Tab "Môn học" trong Class Detail (mở rộng ClassesPage hiện có).  
**Mục đích:** Xem và quản lý danh sách môn học của một lớp.  
**Người dùng:** `class.view` (xem), `class.edit` (ghi).

> **D-01:** Một lớp có thể có nhiều môn học qua `class_subject`.  
> **D-08:** Quyền thao tác phụ thuộc vào trạng thái lớp.  
> **D-15:** Dòng môn chính (is_primary=1) và dòng LEGACY không xóa được qua API thường.

#### Layout

```
ClassDetail → Tab "Môn học"
└─ Class Info Bar (tên lớp, trạng thái, môn chính hiện tại)
└─ Action Bar (tùy thuộc trạng thái lớp):
   ├─ [CHUA_BAT_DAU]: Nút "Áp dụng CTĐT" + Nút "Thêm môn thủ công"
   ├─ [DANG_DIEN_RA]: Nút "Đổi môn chính" (mở Screen 8)
   └─ [DA_KET_THUC/DA_HUY/CLOSED]: Không có nút ghi
└─ DataTable môn học của lớp
```

#### Cột DataTable (Class Subject)

| Cột | Field | Responsive |
|---|---|---|
| Môn chính | `isPrimary` → Icon ★ (vàng) hoặc — | Luôn hiện |
| Môn học | `subjectName` + `subjectCode` | Luôn hiện |
| Nguồn | `source` → Badge: CURRICULUM / MANUAL / LEGACY | Luôn hiện |
| Giáo viên | `teacherName` hoặc "Chưa phân công" (nếu `teacherId = null` và dòng tồn tại – D-09: **không fallback**) | Ẩn dưới `sm` |
| Số buổi | `plannedSessions` / `requiredSessions` | Ẩn dưới `md` |
| Thời lượng | `sessionMinutes` phút | Ẩn dưới `lg` |
| Trạng thái | `status` badge | Ẩn dưới `md` |
| Thao tác | Nút Xóa (điều kiện phức tạp – xem bên dưới) | Luôn hiện |

**Hiển thị giáo viên (D-09):**
- `class_subject` tồn tại + `teacherId != null` → hiển thị tên giáo viên.
- `class_subject` tồn tại + `teacherId = null` → hiển thị "Chưa phân công" (**không fallback**).
- Lớp chưa có bất kỳ `class_subject` nào → hiển thị dòng LEGACY từ `school_class.subject_id` với `teacherId = school_class.teacher_id` (fallback chỉ cho dòng suy ra này).

**Nút Xóa môn:**
- Chỉ hiển thị khi trạng thái lớp là `CHUA_BAT_DAU`.
- Ẩn khi: `isPrimary=true`, `source=LEGACY`, `source=CURRICULUM` (tùy nghiệp vụ), hoặc lớp không phải `CHUA_BAT_DAU`.
- Nhấn → ConfirmDialog → `DELETE /api/classes/{classId}/subjects/{subjectId}`.
- Nếu nhận `409 CLASS_SUBJECT_LEGACY_PROTECTED` → hiển thị: "Không thể xóa môn học chính."

#### Áp dụng CTĐT (Dialog – chỉ CHUA_BAT_DAU)

```
Dialog: Áp dụng Chương trình đào tạo
└─ Select CTĐT (combobox – chỉ curriculum active của org)
└─ Nếu lớp đã có class_subject nguồn CURRICULUM:
   └─ Cảnh báo: "Lớp đã có môn từ CTĐT. Áp dụng CTĐT mới sẽ thay thế các môn này."
   └─ Checkbox: confirmReplace = true (bắt buộc nếu có cảnh báo)
└─ Checkbox: "Giữ lại môn thủ công" (keepManualSubjects, default: true)
└─ Nút "Áp dụng" / "Huỷ"
```

**Lỗi:**
- `CLASS_SUBJECT_LOCKED` → "Chỉ có thể áp dụng CTĐT khi lớp chưa bắt đầu."
- `CURRICULUM_INACTIVE` → "CTĐT đã ngừng hoạt động."
- `DATA_CHANGED` → "Dữ liệu đã thay đổi. Vui lòng tải lại."

#### Thêm môn thủ công (Dialog – chỉ CHUA_BAT_DAU)

| Field | Bắt buộc | Ràng buộc |
|---|---|---|
| Môn học | ✅ | Combobox; chỉ môn active, chưa có trong lớp |
| Số buổi kế hoạch | ✅ | ≥ 1 |
| Thời lượng buổi (phút) | ✅ | ≥ 1 |
| Giáo viên | ❌ | Combobox GV có chuyên môn môn này (từ assignable API) |

**Lỗi:** `CLASS_SUBJECT_EXISTS`, `SUBJECT_INACTIVE`, `CLASS_NOT_EDITABLE`.

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Danh sách môn lớp | `GET /api/classes/{classId}/subjects` | ⚠️ Đề xuất |
| Áp dụng CTĐT | `PUT /api/classes/{classId}/curriculum` | ⚠️ Đề xuất |
| Thêm môn thủ công | `POST /api/classes/{classId}/subjects` | ⚠️ Đề xuất |
| Xóa môn | `DELETE /api/classes/{classId}/subjects/{subjectId}` | ⚠️ Đề xuất |
| Danh sách GV assignable | `GET /api/teachers/assignable?subjectId=` | ✅ Đã có (mở rộng) |
| Danh sách curriculum | `GET /api/curricula?isActive=true` | ⚠️ Đề xuất |

---

### Screen 8 – Primary Subject Change

**Vị trí:** Dialog mở từ Screen 7 khi nhấn "Đổi môn chính".  
**Mục đích:** Thay đổi môn học chính của lớp có kiểm soát.  
**Người dùng:** `class.edit` + module `STUDENT_MANAGEMENT`.  
**Điều kiện:** Trạng thái lớp là `CHUA_BAT_DAU` HOẶC `DANG_DIEN_RA`.

> **D-08:** `reason`, `expectedVersion`, `operationId` là **bắt buộc** (không phân biệt trạng thái lớp).  
> **D-15/BR-TCH-16:** Đổi môn chính **không** chuyển giáo viên sang môn mới.  
> **BR-SUB-23:** `operationId` phải là UUID v4, sinh phía client trước khi gửi.  
> Idempotency: cùng `operationId` + cùng payload → trả kết quả cũ.

#### Layout Dialog

```
Dialog: Đổi môn học chính
└─ Info: "Môn chính hiện tại: [tên môn cũ] ([code])"
└─ Form
   ├─ Môn học mới* (Select/Combobox)
   │  ├─ Lọc: chỉ môn active, thuộc org
   │  ├─ Nếu lớp là CHUA_BAT_DAU: có thể chọn cả môn chưa có trong class_subject
   │  └─ Nếu lớp là DANG_DIEN_RA: nên ưu tiên môn đã có trong class_subject
   ├─ Lý do thay đổi* (Textarea, placeholder: "Nhập lý do thay đổi môn chính...")
   │  └─ Counter: "[n]/500 ký tự"
   ├─ [Nếu môn mới chưa có trong class_subject – hiển thị optional fields:]
   │  ├─ Số buổi kế hoạch (Number, không bắt buộc)
   │  └─ Thời lượng buổi (phút) (Number, không bắt buộc)
   └─ Warning Banner (màu vàng):
      "⚠ Giáo viên của môn cũ sẽ KHÔNG tự động chuyển sang môn mới. Bạn cần phân công giáo viên riêng cho môn mới sau khi đổi."
└─ [Hidden fields tự động:]
   ├─ expectedVersion: lấy từ class.version (truy vấn hiện tại)
   └─ operationId: UUID v4, generate khi dialog mở
└─ Nút "Xác nhận đổi môn" (primary, màu đỏ cảnh báo) / "Huỷ"
```

#### Validation Client-side

| Field | Rule |
|---|---|
| Môn học mới | Bắt buộc; không được trùng với môn chính hiện tại |
| Lý do | Bắt buộc; ≥ 1 ký tự; ≤ 500 ký tự |
| operationId | Tự động (UUID v4), không để người dùng sửa |
| expectedVersion | Tự động từ class data, không để người dùng sửa |

#### Xử lý lỗi (Server-side)

| Mã lỗi | Hiển thị |
|---|---|
| `DATA_CHANGED` (409) | Alert: "Dữ liệu lớp đã thay đổi bởi người khác. Vui lòng tải lại trang." + nút "Tải lại" |
| `CLASS_SUBJECT_OPERATION_CONFLICT` (409) | Alert: "Thao tác xung đột. Vui lòng thử lại sau." |
| `CLASS_NOT_EDITABLE` (409) | Alert: "Lớp học này không thể thay đổi môn chính." |
| `SUBJECT_INACTIVE` (400) | Alert: "Môn học mới đã ngừng hoạt động." |
| `REASON_TOO_LONG` (400) | Lỗi inline field: "Lý do không được vượt quá 500 ký tự." |
| `VALIDATION_ERROR` (400) | Lỗi inline theo field |

**Thành công:** đóng dialog → invalidate query class subjects + class detail → toast "Đã đổi môn chính thành công."

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Đổi môn chính | `PUT /api/classes/{classId}/subjects/primary` | ⚠️ MỚI – chưa implement |

**Request body:**
```json
{
  "subjectId": "uuid",
  "reason": "Lý do bắt buộc",
  "expectedVersion": 4,
  "operationId": "uuid-v4-generated-client-side",
  "plannedSessions": null,
  "sessionMinutes": null
}
```

---

### Screen 9 – Class Subject History

**Vị trí:** Tab "Lịch sử môn chính" trong Class Detail (cùng page với Screen 7).  
**Mục đích:** Xem lịch sử thay đổi môn học chính của lớp.  
**Người dùng:** `class.view`.  
**Tính chất:** **READ-ONLY**. Không có thao tác sửa/xóa (D-15).

#### Layout

```
ClassDetail → Tab "Lịch sử môn chính"
└─ Mô tả: "Lịch sử tất cả các lần thay đổi môn học chính của lớp."
└─ DataTable (sắp xếp `changedAt` DESC)
└─ Pagination (0-based page, size=20)
```

#### Cột DataTable

| Cột | Field | Responsive |
|---|---|---|
| Thời gian | `changedAt` → `DD/MM/YYYY HH:mm` | Luôn hiện |
| Người thực hiện | `changedByName` | Luôn hiện |
| Môn cũ | `oldSubjectCode` + `oldSubjectName` | Luôn hiện |
| Nguồn cũ | `oldSource` badge (CURRICULUM/MANUAL/LEGACY) | Ẩn dưới `md` |
| GV cũ | `oldTeacherName` hoặc "—" | Ẩn dưới `lg` |
| Môn mới | `newSubjectCode` + `newSubjectName` | Luôn hiện |
| Nguồn mới | `newSource` badge | Ẩn dưới `md` |
| Lý do | `reason` (truncate 100 ký tự, tooltip full) | Ẩn dưới `sm` |
| Mã giao dịch | `operationId` (truncate 8 ký tự đầu, tooltip full) | Ẩn dưới `lg` |

> **Quan trọng:** Hiển thị dữ liệu **snapshot** từ history. **Không** tra cứu tên môn/GV hiện tại từ bảng khác.

#### Empty / Loading / Error

| State | Hiển thị |
|---|---|
| Loading | Skeleton rows |
| Empty | "Chưa có lịch sử thay đổi môn chính." |
| Error | Alert + nút Thử lại |

#### API Dependencies

| Thao tác | Endpoint | Trạng thái |
|---|---|---|
| Danh sách history | `GET /api/classes/{classId}/subject-history?page=0&size=20` | ⚠️ MỚI – chưa implement |

> **Lưu ý:** `page` là **0-based** (khác với Curriculum là 1-based).

---

## 5. User Flows

### Flow 1: Tạo môn học mới

```
Người dùng (subject.manage)
→ Mở /dao-tao/mon-hoc
→ Nhấn "Thêm môn học"
→ Điền Tên môn (bắt buộc), Mã môn (tùy chọn), Mô tả
→ Submit → POST /api/subjects
→ [201] Toast "Đã thêm môn học." → Refresh danh sách
→ [409 SUBJECT_CODE_EXISTS] Hiển thị lỗi inline "Mã môn đã tồn tại"
→ [409 CONFLICT] Hiển thị lỗi inline "Tên môn đã tồn tại"
```

### Flow 2: Tạo curriculum → thêm môn → cấu hình tiên quyết

```
Người dùng (curriculum.manage)
→ Mở /dao-tao/chuong-trinh-dao-tao
→ Nhấn "Tạo CTĐT"
→ Điền Mã*, Tên*, Mô tả, Khối
→ [201] Curriculum tạo xong, chuyển sang /dao-tao/chuong-trinh-dao-tao/:id
→ Nhấn "Thêm môn" trong tab Danh sách môn
→ Chọn môn từ combobox (các môn active của org)
→ Điền STT, Số buổi*, Thời lượng*, LT, TH, Ghi chú
→ Chọn môn tiên quyết (nếu có; chỉ chọn trong curriculum)
→ Submit → POST /api/curricula/:id/subjects
→ [400 SUBJECT_PREREQUISITE_CYCLE] Hiển thị cảnh báo chu trình
→ Thêm thêm môn → cấu hình xong
```

### Flow 3: Quản lý chuyên môn GV → xác nhận môn dạy

```
Người dùng (employee.edit)
→ Mở Teacher Detail → Section "Chuyên môn"
→ Chọn/bỏ chọn môn trong multi-select của chuyên môn
→ Nhấn "Lưu" → PUT /api/specialties/:id/subjects
→ [200] Cập nhật xong

(Riêng biệt) Sang Section "Môn học giảng dạy"
→ Nhấn "Thêm môn" → Chọn môn từ combobox
→ POST /api/teachers/:staffId/subjects
→ [201] Môn được thêm với status=APPROVED ngay lập tức (D-06a)
→ Không có bước duyệt
```

### Flow 4: Xem môn học của lớp + giáo viên được phân công

```
Người dùng (class.view)
→ Mở Class List → Click vào lớp
→ Chuyển sang tab "Môn học"
→ GET /api/classes/:classId/subjects
→ Nếu lớp chưa có class_subject: hiển thị 1 dòng LEGACY từ school_class.subject_id
→ Nếu có class_subject: hiển thị danh sách; teacher_id=null → "Chưa phân công" (không fallback)
```

### Flow 5: Đổi môn chính khi lớp CHUA_BAT_DAU

```
Người dùng (class.edit)
→ Tab "Môn học" của lớp CHUA_BAT_DAU
→ Nhấn "Đổi môn chính"
→ Dialog mở: chọn môn mới, nhập lý do (bắt buộc)
→ operationId tự sinh (UUID v4), expectedVersion tự điền
→ Nhấn "Xác nhận đổi môn"
→ PUT /api/classes/:classId/subjects/primary
→ [200] Đóng dialog → Toast "Đã đổi môn chính." → Refresh
```

### Flow 6: Đổi môn chính khi lớp DANG_DIEN_RA (flow có kiểm soát)

```
Người dùng (class.edit)
→ Tab "Môn học" của lớp DANG_DIEN_RA
→ Nút "Đổi môn chính" (chỉ nút này, không có thêm/xóa)
→ Dialog mở với warning nổi bật:
   "⚠ Giáo viên sẽ KHÔNG tự động chuyển. Phân công giáo viên mới riêng."
→ Chọn môn mới (ưu tiên môn đã có trong class_subject)
→ Nhập lý do (bắt buộc, ≤ 500 ký tự)
→ Nhấn "Xác nhận đổi môn"
→ [409 DATA_CHANGED] Alert + nút "Tải lại" → đóng dialog → reload class data
→ [200] Đóng dialog → Toast → Refresh
→ Người dùng mở tab "Lịch sử môn chính" để xem bản ghi mới
```

### Flow 7: Người dùng không có quyền

```
Người dùng (class.view, không có class.edit)
→ Tab "Môn học": DataTable chỉ đọc, không có nút Action
→ PermissionGuard ẩn các nút Thêm, Sửa, Đổi môn chính
→ Truy cập trực tiếp API → 403 FORBIDDEN (backend)
```

### Flow 8: Module STUDENT_MANAGEMENT bị tắt

```
Người dùng
→ Truy cập /dao-tao/mon-hoc
→ POST /api/subjects → 400 MODULE_NOT_ENABLED
→ Hiển thị Alert: "Module Quản lý học sinh chưa được kích hoạt cho tổ chức này."
→ FE nên kiểm tra module status trước (nếu có API module check)
→ Ẩn các nút ghi hoặc hiển thị banner cảnh báo đầu trang
```

---

## 6. API Mapping Table

### Subject APIs

| Endpoint | Phương thức | Screen | Trạng thái | Ghi chú |
|---|---|---|---|---|
| `/api/subjects` | GET | 1 | ✅ Đã có | Trả mảng (D-13), không phân trang |
| `/api/subjects` | POST | 1 | ✅ Đã có | |
| `/api/subjects/{id}` | PUT | 1 | ✅ Đã có | |
| `/api/subjects/{id}/status` | PATCH | 1 | ✅ Đã có | body: `{active: boolean}` |
| `/api/subjects/check-code` | GET | 1 | ⚠️ Đề xuất | Nice-to-have; UX real-time check |
| `/api/subjects/{id}/usage` | GET | 1 | ⚠️ Đề xuất | Dùng cho cảnh báo ngừng môn |

### Curriculum APIs

| Endpoint | Phương thức | Screen | Trạng thái | Ghi chú |
|---|---|---|---|---|
| `/api/curricula` | GET | 2 | ⚠️ Đề xuất | Phân trang 1-based; `{items,total,page,size}` |
| `/api/curricula` | POST | 2 | ⚠️ Đề xuất | |
| `/api/curricula/{id}` | GET | 3 | ⚠️ Đề xuất | |
| `/api/curricula/{id}` | PUT | 2 | ⚠️ Đề xuất | Tăng version |
| `/api/curricula/{id}/status` | PATCH | 2 | ⚠️ Đề xuất | |
| `/api/curricula/{id}/subjects` | GET | 3, 4 | ⚠️ Đề xuất | |
| `/api/curricula/{id}/subjects` | POST | 3, 4 | ⚠️ Đề xuất | Kèm prerequisiteSubjectIds (mảng) |
| `/api/curricula/{id}/subjects/{subjectId}` | PUT | 3, 4 | ⚠️ Đề xuất | Thay toàn bộ tiên quyết |
| `/api/curricula/{id}/subjects/{subjectId}` | DELETE | 3 | ⚠️ Đề xuất | |

> **⚠ Gateway route `/api/curricula/**` chưa được cấu hình (Backend Dependency #2).**

### Class Subject APIs

| Endpoint | Phương thức | Screen | Trạng thái | Ghi chú |
|---|---|---|---|---|
| `/api/classes/{id}/subjects` | GET | 7 | ⚠️ Đề xuất | Có thể trả dòng LEGACY |
| `/api/classes/{id}/curriculum` | PUT | 7 | ⚠️ Đề xuất | Áp curriculum; `confirmReplace`, `keepManualSubjects` |
| `/api/classes/{id}/subjects` | POST | 7 | ⚠️ Đề xuất | Thêm môn thủ công |
| `/api/classes/{id}/subjects/{subjectId}` | PUT | 7 | ⚠️ Đề xuất | Cập nhật giáo viên/sessions cho môn |
| `/api/classes/{id}/subjects/{subjectId}` | DELETE | 7 | ⚠️ Đề xuất | Chỉ CHUA_BAT_DAU; chặn primary |
| `/api/classes/{id}/subjects/primary` | PUT | 8 | ⚠️ MỚI | `operationId`, `expectedVersion`, `reason` bắt buộc |
| `/api/classes/{id}/subject-history` | GET | 9 | ⚠️ MỚI | Phân trang 0-based |

### Teacher Subject APIs

| Endpoint | Phương thức | Screen | Trạng thái | Ghi chú |
|---|---|---|---|---|
| `/api/teachers/{staffId}/subjects` | GET | 6 | ⚠️ Đề xuất | `version` = `staff_profile.version` |
| `/api/teachers/{staffId}/subjects` | POST | 6 | ⚠️ Đề xuất | `source=MANUAL`; response `status=APPROVED` |
| `/api/teachers/{staffId}/subjects` | PUT | 6 | ⚠️ Đề xuất | Thay toàn bộ; `confirmRevokeInUse` |
| `/api/teachers/assignable` | GET | 7 | ✅ Đã có (mở rộng) | Thêm filter `teacher_subject APPROVED` |
| `/api/specialties/{id}/subjects` | GET | 5 | ⚠️ Đề xuất | |
| `/api/specialties/{id}/subjects` | PUT | 5 | ⚠️ Đề xuất | Thay toàn bộ |

---

## 7. Form Fields & Validation

### Subject Form

| Field | Type | Required | Min | Max | Error messages |
|---|---|---|---|---|---|
| `name` | text | ✅ | 1 | 200 | "Tên môn là bắt buộc" / "Tên môn không được vượt 200 ký tự" |
| `code` | text | ❌ | — | 50 | "Mã môn không được vượt 50 ký tự" / "Mã môn đã tồn tại" (409) |
| `description` | textarea | ❌ | — | 500 | "Mô tả không được vượt 500 ký tự" |

### Curriculum Form

| Field | Type | Required | Min | Max | Error messages |
|---|---|---|---|---|---|
| `code` | text | ✅ | 1 | 50 | "Mã CTĐT là bắt buộc" / "Mã CTĐT đã tồn tại" (409) |
| `name` | text | ✅ | 1 | 200 | "Tên CTĐT là bắt buộc" / "Tên CTĐT đã tồn tại" (409) |
| `description` | textarea | ❌ | — | 1000 | "Mô tả không được vượt 1000 ký tự" |
| `gradeLevel` | text | ❌ | — | 50 | — |
| `majorCode` | text | ❌ | — | 50 | — |

### Curriculum Subject Form

| Field | Type | Required | Min | Max | Error messages |
|---|---|---|---|---|---|
| `subjectId` | select | ✅ | — | — | "Vui lòng chọn môn học" |
| `sequenceNo` | number | ✅ | 1 | — | "STT phải ≥ 1" / "STT đã được sử dụng" (409) |
| `requiredSessions` | number | ✅ | 1 | 1000 | "Số buổi phải từ 1-1000" |
| `sessionMinutes` | number | ✅ | 1 | 600 | "Thời lượng phải từ 1-600 phút" |
| `theoryHours` | number | ❌ | 0 | — | "Giờ lý thuyết không được âm" |
| `practiceHours` | number | ❌ | 0 | — | "Giờ thực hành không được âm" |
| `isRequired` | boolean | ❌ | — | — | — |
| `notes` | textarea | ❌ | — | 500 | "Ghi chú không được vượt 500 ký tự" |
| `prerequisiteSubjectIds` | multi-select | ❌ | 0 | 50 | "Tối đa 50 tiên quyết" / "Tiên quyết tạo vòng lặp" |

> **D-03:** Không validate `theoryHours + practiceHours = requiredSessions`. Chỉ validate `>= 0`.

### Primary Subject Change Form

| Field | Type | Required | Min | Max | Error messages |
|---|---|---|---|---|---|
| `subjectId` | select | ✅ | — | — | "Vui lòng chọn môn học mới" |
| `reason` | textarea | ✅ | 1 | 500 | "Lý do là bắt buộc" / "Lý do không được vượt 500 ký tự" |
| `plannedSessions` | number | ❌ | 1 | — | "Số buổi phải ≥ 1" |
| `sessionMinutes` | number | ❌ | 1 | — | "Thời lượng phải ≥ 1 phút" |
| `operationId` | hidden | ✅ (auto) | — | — | UUID v4, generate khi dialog open |
| `expectedVersion` | hidden | ✅ (auto) | — | — | Lấy từ class data |

### Teacher Subject Form (Add)

| Field | Type | Required | Min | Max | Error messages |
|---|---|---|---|---|---|
| `subjectId` | select | ✅ | — | — | "Vui lòng chọn môn học" |
| `source` | hidden | ✅ (auto) | — | — | Luôn `MANUAL` khi thêm thủ công |

---

## 8. Loading / Empty / Error States

### Pattern chung

| State | Component | Ghi chú |
|---|---|---|
| Loading (table) | DataTable skeleton (built-in) | 5-10 skeleton rows |
| Loading (dialog submit) | Button spinner + disabled | Ngăn double-submit |
| Empty (no data) | Icon + message + CTA (nếu có quyền) | Per-screen |
| Empty (search) | "Không tìm thấy kết quả phù hợp." | Không có CTA |
| Error (network/server) | `<Alert variant="destructive">` + nút "Thử lại" | Dùng `onError` của React Query |
| Error 403 | "Bạn không có quyền xem nội dung này." | WorkspaceGuard / PermissionGuard |
| Error 404 | "Không tìm thấy dữ liệu." | Redirect hoặc inline |

### Per-Screen Empty Messages

| Screen | Empty message |
|---|---|
| Subject Management | "Chưa có môn học nào. Hãy thêm môn học đầu tiên." |
| Curriculum Management | "Chưa có chương trình đào tạo nào." |
| Curriculum Subject | "Chương trình này chưa có môn học nào. Hãy thêm môn." |
| Teacher Specialty Subject | "Chuyên môn này chưa có môn học nào được ánh xạ." |
| Teacher Subject | "Giáo viên chưa được xác nhận đủ điều kiện dạy môn nào." |
| Class Subject Management | "Lớp này chưa có môn học nào." |
| Class Subject History | "Chưa có lịch sử thay đổi môn chính." |

---

## 9. Responsive Behavior

### Breakpoints (TailwindCSS)

| Breakpoint | Min-width | Mô tả |
|---|---|---|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / Desktop |
| `xl` | 1280px | Desktop |

### Chiến lược per-screen

| Màn hình | Mobile (< md) | Tablet (md-lg) | Desktop (> lg) |
|---|---|---|---|
| Subject List | 2 cột: Môn học + Thao tác | +Trạng thái | +Mô tả, Cập nhật |
| Curriculum List | 2 cột: Tên CTĐT + Thao tác | +Mã, Trạng thái | +Khối, Version, Số môn |
| Curriculum Subject | 3 cột: STT + Môn học + Thao tác | +Bắt buộc, Số buổi | +LT/TH, Phút, Tiên quyết |
| Class Subject | 3 cột: ★ + Môn học + Nguồn | +Giáo viên, Trạng thái | +Số buổi, Thời lượng |
| Class Subject History | 3 cột: Thời gian + Người + Môn cũ→mới | +Lý do | +Nguồn, GV cũ, operationId |

### Form behavior

- **Mobile:** Form trong Dialog chuyển sang full-screen drawer.
- **Tablet+:** Dialog giữ nguyên width `max-w-lg` hoặc `max-w-2xl` tùy độ phức tạp.
- Primary Subject Change Dialog: `max-w-lg` ở mọi breakpoint (nội dung vừa phải).
- Curriculum Subject Drawer: `width: 480px` trên desktop, full-screen trên mobile.

---

## 10. React Structure Proposal

### File structure mở rộng

```
frontend/src/
├── lib/
│   ├── permissions.ts       ← THÊM: curriculumView, curriculumManage (D-14)
│   └── nav.ts               ← THÊM: Curriculum nav item trong academic group
├── app/
│   └── app.tsx              ← THÊM: routes cho curricula pages
└── features/
    └── academic/
        ├── api.ts           ← THÊM: curriculaApi, classSubjectsApi, teacherSubjectsApi, specialtySubjectsApi
        ├── hooks.ts         ← THÊM: useCurricula, useCurriculum, useCurriculumSubjects,
        │                              useClassSubjects, useClassSubjectHistory,
        │                              useTeacherSubjects, useSpecialtySubjects
        ├── types.ts         ← THÊM: Curriculum, CurriculumSummary, CurriculumSubject,
        │                              ClassSubject, ClassSubjectHistoryItem,
        │                              PrimarySubjectChangeInput, TeacherSubject,
        │                              SpecialtySubjectMapping
        ├── components/
        │   ├── subject-form-dialog.tsx                 ← Nâng cấp từ hiện có
        │   ├── curriculum-form-dialog.tsx              ← MỚI
        │   ├── curriculum-subject-drawer.tsx           ← MỚI (kèm prerequisite)
        │   ├── apply-curriculum-dialog.tsx             ← MỚI
        │   ├── primary-subject-change-dialog.tsx       ← MỚI (operationId gen ở đây)
        │   ├── class-subject-history-table.tsx         ← MỚI
        │   └── teacher-subject-panel.tsx               ← MỚI
        └── pages/
            ├── subjects-page.tsx          ← Nâng cấp (thêm includeInactive toggle, D-04 UX)
            ├── curricula-page.tsx         ← MỚI (Screen 2)
            ├── curriculum-detail-page.tsx ← MỚI (Screen 3 + 4)
            ├── classes-page.tsx           ← Mở rộng (thêm tab Môn học – Screen 7, 8, 9)
            └── teachers-page.tsx          ← Mở rộng (thêm section Chuyên môn + Môn dạy – Screen 5, 6)
```

### Thêm vào `lib/permissions.ts`

```typescript
// D-14: Curriculum permissions (NEW – not yet in backend catalog)
curriculumView: 'curriculum.view',
curriculumManage: 'curriculum.manage',
```

### Thêm vào `lib/nav.ts`

```typescript
// Trong academic workspace, academic-teaching group:
{
  key: 'curricula',
  label: 'Chương trình đào tạo',
  href: '/dao-tao/chuong-trinh-dao-tao',
  permission: 'curriculum.view', // hoặc curriculum.manage
}
```

### Thêm vào `app.tsx`

```typescript
// Trong academic routes:
<Route path="/dao-tao/chuong-trinh-dao-tao" element={<CurriculaPage />} />
<Route path="/dao-tao/chuong-trinh-dao-tao/:id" element={<CurriculumDetailPage />} />
```

### Mock data cần thêm (`mock/fixtures.ts` và `mock/adapter.ts`)

Các route mock mới cần thêm:
- `GET /api/curricula` → mock list với pagination
- `GET /api/curricula/:id` → mock curriculum detail
- `GET /api/curricula/:id/subjects` → mock curriculum subjects list
- `POST|PUT|DELETE /api/curricula/**` → mock mutations
- `GET /api/classes/:id/subjects` → mock class subjects (kể cả dòng LEGACY)
- `PUT /api/classes/:id/subjects/primary` → mock primary change
- `GET /api/classes/:id/subject-history` → mock history list
- `GET|POST|PUT /api/teachers/:staffId/subjects` → mock teacher subjects
- `GET|PUT /api/specialties/:id/subjects` → mock specialty subjects

---

## 11. Backend Dependencies

Danh sách phụ thuộc backend cần thiết trước khi FE implement. FE **không tự sửa** backend.

| # | Mô tả | WP | Độ ưu tiên |
|---|---|---|---|
| 1 | Thêm `curriculum.view` và `curriculum.manage` vào `PermissionCatalog` backend + gán cho chức danh Giáo vụ (D-14) | WP0 | 🔴 Bắt buộc |
| 2 | Cấu hình Gateway route `/api/curricula/**` → PeopleService | WP4 | 🔴 Bắt buộc |
| 3 | Implement toàn bộ Curriculum APIs (`GET/POST/PUT/PATCH /api/curricula/**`) | WP4 | 🔴 Bắt buộc |
| 4 | Implement Class Subject APIs (`GET/POST/PUT/DELETE /api/classes/:id/subjects`) | WP5 | 🔴 Bắt buộc |
| 5 | Implement `PUT /api/classes/:id/subjects/primary` (đổi môn chính + history) | WP5 | 🔴 Bắt buộc |
| 6 | Implement `GET /api/classes/:id/subject-history` | WP5 | 🔴 Bắt buộc |
| 7 | Implement Teacher Subject APIs (`GET/POST/PUT /api/teachers/:staffId/subjects`) | WP3 | 🔴 Bắt buộc |
| 8 | Implement Specialty Subject APIs (`GET/PUT /api/specialties/:id/subjects`) | WP3 | 🔴 Bắt buộc |
| 9 | Mở rộng `GET /api/teachers/assignable?subjectId=` để lọc theo `teacher_subject APPROVED` | WP3 | 🟡 Quan trọng |
| 10 | Thêm module guard `STUDENT_MANAGEMENT` vào SubjectController và CurriculumController (D-10) | WP2 | 🟡 Quan trọng |
| 11 | Implement `GET /api/subjects/{id}/usage` (số lớp đang dùng môn) | WP2 | 🟢 Nice-to-have |
| 12 | Implement `GET /api/subjects/check-code?code=&excludeId=` | WP2 | 🟢 Nice-to-have |

---

## 12. Issues / Decisions Needed

| # | Vấn đề | Tác động | Đề xuất |
|---|---|---|---|
| I-01 | `reason` có bắt buộc khi lớp `CHUA_BAT_DAU` không? API contract §4.8 nói bắt buộc (không phân biệt trạng thái) | Form UX: nếu không bắt buộc → `required=false` cho `CHUA_BAT_DAU` | **Giả định: bắt buộc mọi trường hợp** (theo §4.8 và BR-SUB-22). Confirm với backend. |
| I-02 | Route cho Teacher Detail: drawer trong TeachersPage hay trang riêng `/dao-tao/giao-vien/:staffId`? | Ảnh hưởng routing và UX navigation | Đề xuất: trang riêng để có URL shareable; nhưng cần confirm với bạn. |
| I-03 | `GET /api/classes/:id/subject-history` phân trang 0-based hay 1-based? | Frontend pagination logic | Từ api-contract.md: **0-based** (khác với Curriculum là 1-based). Đã phản ánh ở Screen 9. |
| I-04 | Curriculum list: `GET /api/curricula` có trả số môn (`subjectCount`) không? | Cột "Số môn" trong Screen 2 | Nếu không có trong response → ẩn cột này. Cần confirm API shape. |
| I-05 | `PUT /api/classes/:id/subjects/{subjectId}` cho gán giáo viên theo môn: có cần `version` không? | Form validation | Theo api-contract §4.6: cần `version` (school_class.version). Confirm. |
| I-06 | `DELETE /api/teachers/:staffId/subjects/:subjectId` hay `PUT` với `confirmRevokeInUse`? | Thu hồi môn GV | Từ api-contract §5.4: dùng `PUT` với toàn bộ danh sách mới. Không có DELETE riêng lẻ. |

---

## 13. Implementation Order

Thứ tự đề xuất cho FE, sau khi backend đã sẵn sàng (xem §11):

| Bước | Màn hình / Task | Điều kiện |
|---|---|---|
| 1 | Thêm `curriculum.view/manage` vào `lib/permissions.ts` | WP0 backend xong |
| 2 | Thêm Curriculum nav item vào `lib/nav.ts` | Sau bước 1 |
| 3 | Thêm routes Curriculum vào `app.tsx` | Sau bước 2 |
| 4 | Nâng cấp Subject Management (Screen 1): thêm `includeInactive` toggle, D-04 UX | WP2 backend xong |
| 5 | Thêm `types.ts` mới: Curriculum, CurriculumSubject, ClassSubject, etc. | Có thể song song |
| 6 | Thêm `api.ts` mới: `curriculaApi` | WP4 backend xong |
| 7 | Thêm `hooks.ts` mới: `useCurricula`, `useCurriculum` | Sau bước 6 |
| 8 | Curriculum Management page (Screen 2) | Sau bước 7 |
| 9 | Curriculum Detail page (Screen 3) | Sau bước 8 |
| 10 | Prerequisite management trong Curriculum Subject drawer (Screen 4) | Sau bước 9 |
| 11 | Class Subject tab trong ClassesPage (Screen 7) | WP5 backend xong |
| 12 | Apply Curriculum Dialog (trong Screen 7) | Sau bước 11 |
| 13 | Primary Subject Change Dialog (Screen 8) | Sau bước 11 |
| 14 | Class Subject History tab (Screen 9) | Sau bước 11 |
| 15 | Teacher Specialty Subject section (Screen 5) | WP3 backend xong |
| 16 | Teacher Subject section (Screen 6) | Sau bước 15 |
| 17 | Mock data cho tất cả API mới | Có thể làm sớm để UI dev song song backend |

---

## 14. Acceptance Criteria

### Screen 1 – Subject Management

- [ ] Danh sách môn hiển thị từ `GET /api/subjects` (mảng, không phân trang – D-13).
- [ ] Toggle `includeInactive` chỉ hiển thị khi có `subject.manage`.
- [ ] Nút "Thêm", "Sửa" ẩn khi không có `subject.manage`.
- [ ] `code` là optional trong form; không hiển thị required indicator (D-04).
- [ ] Lỗi 409 `SUBJECT_CODE_EXISTS` → hiển thị inline lỗi dưới field `code`.
- [ ] Lỗi 409 `CONFLICT` (trùng tên) → hiển thị inline lỗi dưới field `name`.
- [ ] Confirm dialog khi ngừng hoạt động.
- [ ] `code = null` hiển thị "—".

### Screen 2 – Curriculum Management

- [ ] Route `/dao-tao/chuong-trinh-dao-tao` hoạt động với nav item.
- [ ] PermissionGuard với `curriculum.view`.
- [ ] Phân trang 1-based.
- [ ] Version hiển thị là badge "v{n}".
- [ ] Form tạo/sửa: `code` và `name` required; không có trường `termNo` hay học kỳ.
- [ ] Sau sửa: toast với version mới.

### Screen 3 – Curriculum Subject

- [ ] Route `/dao-tao/chuong-trinh-dao-tao/:id` load đúng curriculum.
- [ ] Combobox thêm môn chỉ hiển thị môn active chưa có trong curriculum.
- [ ] Validation: `sequenceNo` unique trong curriculum → 409 `CURRICULUM_SEQUENCE_DUPLICATE`.
- [ ] `requiredSessions` ≥ 1 ≤ 1000; `sessionMinutes` ≥ 1 ≤ 600.
- [ ] Không validate `theoryHours + practiceHours = requiredSessions` (D-03).
- [ ] Xóa môn: ConfirmDialog; không xóa môn tiên quyết của môn khác mà không cảnh báo.

### Screen 4 – Curriculum Prerequisite

- [ ] Multi-select chỉ cho chọn môn trong cùng curriculum, không chọn self.
- [ ] Lỗi `SUBJECT_PREREQUISITE_CYCLE` → Alert với thông báo rõ ràng.
- [ ] `prerequisiteSubjectIds` ≤ 50 → validate client-side.
- [ ] Phase 1: hiển thị warning badge, không chặn.

### Screen 5 – Teacher Specialty Subject

- [ ] Section "Chuyên môn" trong teacher detail.
- [ ] `employee.edit` mới có thể sửa.
- [ ] `PUT /api/specialties/:id/subjects` thay toàn bộ danh sách.
- [ ] Chỉ chọn môn active.

### Screen 6 – Teacher Subject

- [ ] Section "Môn học giảng dạy" trong teacher detail.
- [ ] Thêm môn → `status=APPROVED` ngay lập tức, không có bước duyệt (D-06a).
- [ ] **Không có** nút "Duyệt" hay "Từ chối" (D-06a).
- [ ] Thu hồi khi có lớp đang dùng: cảnh báo + confirm với `confirmRevokeInUse=true`.
- [ ] Badge nguồn: SPECIALTY / MANUAL.

### Screen 7 – Class Subject Management

- [ ] Tab "Môn học" trong class detail.
- [ ] `CHUA_BAT_DAU`: hiển thị nút Áp dụng CTĐT + Thêm môn.
- [ ] `DANG_DIEN_RA`: chỉ hiển thị nút Đổi môn chính; ẩn tất cả nút ghi khác (D-08).
- [ ] `DA_KET_THUC/DA_HUY/CLOSED`: không có nút ghi nào.
- [ ] D-09: `teacher_id = null` → "Chưa phân công" (không fallback sang `school_class.teacher_id`).
- [ ] Dòng LEGACY hiển thị khi lớp chưa có `class_subject`.
- [ ] Xóa môn chính → 409 `CLASS_SUBJECT_LEGACY_PROTECTED` → Alert.

### Screen 8 – Primary Subject Change

- [ ] `operationId` UUID v4 được sinh client-side khi dialog mở.
- [ ] `expectedVersion` lấy từ class data hiện tại.
- [ ] `reason` bắt buộc, ≤ 500 ký tự.
- [ ] Warning banner "Giáo viên không tự động chuyển" luôn hiển thị (D-08/D-15).
- [ ] 409 `DATA_CHANGED` → Alert + nút "Tải lại" (không submit lại tự động).
- [ ] Sau thành công: invalidate class subjects query + class detail query.

### Screen 9 – Class Subject History

- [ ] Read-only hoàn toàn.
- [ ] Phân trang 0-based.
- [ ] Dữ liệu snapshot: không tra cứu tên môn/GV hiện tại.
- [ ] `operationId` truncated 8 ký tự + tooltip full.
- [ ] Empty state: "Chưa có lịch sử thay đổi môn chính."

---

> **Kết thúc Phase 2 – UI/UX Design.**  
> Tài liệu này đủ chi tiết để Developer triển khai trực tiếp không cần đoán.  
> Bước tiếp theo: nhận xác nhận từ bạn trước khi bắt đầu Phase 3 (React implementation).
