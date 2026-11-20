# Báo cáo Audit Frontend hiện tại – Phase 1 Academic Setup

> **Dự án:** MEMS (Management Education Management System)  
> **Người thực hiện:** Senior Frontend Engineer  
> **Ngày thực hiện:** 20/11/2026  
> **Tài liệu tham chiếu:** Quyết định `D-01` đến `D-15`, `subject-business-requirements.md`, `curriculum-business-design.md`, `api-contract.md`, `role-permission-matrix.md`, `teacher-subject-design.md`, `validation-and-error-cases.md`, `test-cases.md`, `wp1-readiness-report.md`.

---

## 1. Cấu trúc tổng thể và Công nghệ hiện tại

### 1.1. Công nghệ lõi
- **Framework:** React 19.3.1 (`react`, `react-dom`)
- **Ngôn ngữ:** TypeScript 6.0.3 (`tsconfig.app.json`, `tsconfig.node.json`)
- **Build Tool:** Vite 8.3.8 (`@vitejs/plugin-react` 6.3.0)
- **Styling:** TailwindCSS 4.3.5 (`@tailwindcss/vite`, `clsx`, `tailwind-merge`, `class-variance-authority`)
- **Routing:** React Router DOM 7.18.5
- **Server State / Data Fetching:** `@tanstack/react-query` 5.107.1
- **Client State Management:** `zustand` 5.1.0 (cho `session-store`, `ui-store`)
- **HTTP Client:** `axios` 1.21.1 (với interceptors và dynamic mock adapter)
- **UI Primitives:** Radix UI (`@radix-ui/react-dialog`, `avatar`, `dropdown-menu`, `popover`, `select`, `tabs`, `tooltip`, `checkbox`, `slot`)
- **Icons:** `lucide-react` 1.73.0
- **Toast Notifications:** `sonner` 2.0.8
- **Date Handling:** `date-fns` 4.4.0
- **Testing:** `vitest` 5.1.0, `@testing-library/react` 16.3.3, `@testing-library/jest-dom` 7.0.1, `jsdom` 31.0.1. Kết quả chạy kiểm thử toàn bộ test suite hiện tại: **31 test files passed, 170 tests passed (100% PASS)**.

### 1.2. Cấu trúc thư mục nguồn (`frontend/src/`)
```text
frontend/src/
├── app/                  # Khởi tạo App, Routes chính, ErrorBoundary, Providers
├── components/
│   ├── brand/           # Logo, branding
│   ├── layout/          # PageContainer, Header, Sidebar
│   └── ui/              # Button, Input, DataTable, Dialog, Drawer, ConfirmDialog, Badge, etc.
├── features/            # Feature modules (Feature-Driven Architecture)
│   ├── academic/        # Đào tạo (Classes, Teachers, Students, Subjects)
│   ├── auth/            # Đăng nhập, đăng ký, hồ sơ, đổi mật khẩu
│   ├── organization/    # Tổ chức, phòng ban, nhân sự, chức vụ, modules
│   ├── platform/        # Quản trị hệ thống, tổ chức, audit logs, accounts
│   ├── schedule/        # Lịch học
│   ├── facility/        # Cơ sở vật chất, phòng, thiết bị, sự cố
│   └── workflows/       # Phê duyệt, điều chuyển, ủy quyền, thông báo
├── hooks/               # Custom hooks dùng chung
├── layouts/             # AppShell, Sidebar, Header, WorkspaceSwitcher, SessionWatcher
├── lib/                 # Core utilities: permissions, modules, api-error, jwt, nav, scope, format
├── routes/              # Route Guards (RequireAuth, PermissionGuard, WorkspaceGuard), Landing, Error pages
├── services/            # Axios instance (http.ts) và Mock Adapter (mock/adapter.ts, fixtures.ts)
├── stores/              # Zustand stores (session-store, ui-store)
├── styles/              # Global styles (globals.css)
├── tests/               # Test setup, renderPage helper
└── types/               # Core TypeScript definitions (api.ts, session.ts)
```

---

## 2. Hệ thống Authentication & Permission Handling

### 2.1. Authentication & JWT Handling
- **Lưu trữ phiên:** Sử dụng Zustand store (`session-store.ts`) đồng bộ với `token-storage.ts` (lưu token trong bộ nhớ và localStorage an toàn).
- **JWT Decoding:** `lib/jwt.ts` giải mã token trực tiếp phía client để trích xuất: `userId`, `roles`, `permissions`, `permissionScopes`, `orgId`, `departmentId`, `mustChangePassword`.
- **Axios Interceptor (`services/http.ts`):**
  - Tự động đính kèm `Authorization: Bearer <accessToken>` vào mọi request.
  - Tự động bắt mã lỗi `401 Unauthorized` và điều phối gọi `POST /api/v1/auth/refresh` bằng `refreshToken`, cập nhật token mới và replay request cũ mà không làm gián đoạn luồng người dùng.
  - Bắt lỗi mismatch khi frontend nhận nhầm trang HTML do cấu hình gateway/proxy (`ApiDeploymentMismatchError`).

### 2.2. Permission & Module Guarding
- **Permission Catalog:** Tập trung tại `src/lib/permissions.ts` (`PERM`), định nghĩa các mã quyền chuẩn của MEMS.
- **Hook `usePermission()` (`features/auth/hooks.ts`):** Cung cấp các helper `can(code)`, `canAny(codes[])`, `canAll(codes[])`, tự động nhận biết quyền đặc biệt của `OWNER` / `SUPER_ADMIN`.
- **Route Guards (`routes/guards.tsx`):**
  - `<RequireAuth>`: Chặn truy cập khi chưa đăng nhập.
  - `<WorkspaceGuard workspaceId="...">`: Kiểm tra điều kiện vào phân hệ làm việc.
  - `<PermissionGuard permission="..." anyOf={[...]}>`: Ẩn/chặn route nếu tài khoản không đủ quyền.
- **Module Guards (`lib/nav.ts` & `lib/modules.ts`):**
  - Hàm `hasModule(session, moduleCode)` và `canWriteModule(session, moduleCode)`.
  - Phân hệ `academic` và các thực thể Subject, Curriculum, Class được bảo vệ bởi module guard `STUDENT_MANAGEMENT`. Nếu module ở trạng thái `disabled` hoặc `locked`, giao diện tự động vô hiệu hóa các nút Thêm/Sửa/Xóa (chỉ cho phép xem ở chế độ Read-Only).

---

## 3. Các Component & Tiện ích có thể tái sử dụng

Dự án MEMS sở hữu hệ thống UI component chất lượng cao, đồng nhất theo thiết kế Tailwind + Radix UI:
1. **Bảng dữ liệu (`components/ui/data-table.tsx`):** Hỗ trợ cột linh hoạt (`DataColumn<T>`), sorting, phân trang tích hợp, responsive (`hideBelow`), trạng thái rỗng (`EmptyState`), loading skeleton.
2. **Hộp thoại (`components/ui/dialog.tsx`):** Cấu trúc chuẩn `DialogHeader`, `DialogBody`, `DialogFooter` cho các form tạo/sửa.
3. **Drawer trượt (`components/ui/drawer.tsx`):** Lý tưởng cho việc hiển thị chi tiết hoặc form cấu hình nhiều bước mà không làm che khuất toàn bộ màn hình (ví dụ: chi tiết môn học trong chương trình đào tạo, lịch sử đổi môn).
4. **Hộp thoại xác nhận (`components/ui/confirm-dialog.tsx`):** Dùng để xác nhận các thao tác nguy hiểm (ngừng kích hoạt môn học, xóa môn khỏi template, áp dụng curriculum cho lớp).
5. **Form controls (`components/ui/input.tsx`, `select.tsx`, `checkbox.tsx`, `switch.tsx`):** Đã bọc kèm `Field` hiển thị nhãn, dấu `required`, thông báo lỗi validation.
6. **Thông báo trạng thái (`components/ui/feedback.tsx` - Alert, `sonner` - Toast):** Đồng bộ hiển thị lỗi từ `ApiError` và thông báo thành công.
7. **Xử lý lỗi API (`lib/api-error.ts`):** Chuẩn hóa thông điệp lỗi nghiệp vụ từ backend theo mã lỗi (`code`).

---

## 4. Kiến trúc Dữ liệu & Mock API Mechanism

- **Tách biệt Data Layer:** Toàn bộ API call nằm trong file `api.ts` của từng feature (ví dụ `features/academic/api.ts`), không gọi `axios` trực tiếp trong component.
- **React Query Hooks:** Toàn bộ queries và mutations được đóng gói thành custom hooks tại `hooks.ts` với quản lý `queryKey` chặt chẽ, tối ưu cache và tự động invalidate khi mutate thành công.
- **Cơ chế Mock API:**
  - Được cấu hình thông qua biến môi trường `VITE_DATA_SOURCE=mock`.
  - Được nạp bằng **dynamic import** (`services/mock/adapter.ts`), hoàn toàn **không bị đóng gói vào bundle production**.
  - Mock Adapter mô phỏng chính xác độ trễ mạng (`LATENCY_MS = 220`), cấu trúc phân trang `{items, total, page, size}`, và định dạng lỗi `ApiResponse` (`{success: false, code, message}`) của Backend Spring Boot.

---

## 5. Đánh giá hiện trạng các chức năng Phase 1 và Khoảng trống (Gap Analysis)

Dựa trên việc kiểm tra chi tiết source code hiện tại và đối chiếu với các quyết định nghiệp vụ `D-01` đến `D-15`:

| STT | Chức năng Phase 1 | Hiện trạng source code | Khoảng trống cần xử lý | Quyết định nghiệp vụ liên quan |
|---|---|---|---|---|
| 1 | **Quản lý Môn học (Subject Management)** | Đã có `SubjectsPage` (`/dao-tao/mon-hoc`) cơ bản. | - Chưa đối chiếu đầy đủ các error code mới (`SUBJECT_CODE_EXISTS`).<br>- Cần tối ưu form validation: `code` tuỳ chọn (nullable) nhưng nếu nhập thì duy nhất; `name` bắt buộc ≤ 200 ký tự.<br>- Hợp đồng D-13 đã chốt giữ mảng (không phân trang), tìm kiếm `q` theo cả code & name.<br>- Kiểm tra cảnh báo số lớp đang dùng môn trước khi ngừng kích hoạt (`GET /subjects/{id}/usage`). | `D-04`, `D-05`, `D-10`, `D-13` |
| 2 | **Quản lý CTĐT (Curriculum Management)** | **Chưa có** trong route, nav menu, hay feature academic. | - Thêm mã quyền `curriculum.view` và `curriculum.manage` vào `permissions.ts` (D-14).<br>- Thêm mục điều hướng "Chương trình đào tạo" vào `WORKSPACES[academic]` trong `nav.ts`.<br>- Tạo danh sách Curriculum có phân trang `{items, total, page, size}`, lọc trạng thái, tìm kiếm.<br>- Tạo form thêm mới / cập nhật Curriculum có quản lý `version` (optimistic lock).<br>- Không có khái niệm học kỳ (termNo) theo D-02. | `D-01`, `D-02`, `D-14` |
| 3 | **Quản lý Môn học trong CTĐT** | **Chưa có**. | - Màn hình chi tiết Curriculum hiển thị bảng môn học.<br>- Cấu hình: số buổi bắt buộc (`requiredSessions`), lý thuyết (`theorySessions`), thực hành (`practiceSessions`), thời lượng (`sessionMinutes`), thứ tự (`sequenceNo`), bắt buộc (`required`).<br>- Thêm môn, sửa môn, xóa môn khỏi template. | `D-02`, `D-03`, `D-07` |
| 4 | **Quản lý Môn học tiên quyết** | **Chưa có**. | - Giao diện chọn các môn tiên quyết (`prerequisiteSubjectIds`: mảng 0..n môn trong cùng CTĐT).<br>- Validation phía frontend ngăn chọn chính môn đó hoặc chọn trùng.<br>- Xử lý bắt lỗi chu trình (`400 SUBJECT_PREREQUISITE_CYCLE` kèm `path`).<br>- Hiển thị cảnh báo môn tiên quyết dạng badge trực quan. | `D-07` |
| 5 | **Chuyên môn giáo viên (Specialty Subject)** | `TeachersPage` mới chỉ có liên kết `specialty` danh mục chung. | - Cần giao diện gán môn học thuộc chuyên môn của giáo viên (`specialty_subject`).<br>- Quyền thực hiện: `employee.edit` (phạm vi ORGANIZATION / DEPARTMENT). | `D-06` |
| 6 | **Môn học phân công cho GV (Teacher Subject)** | **Chưa có** phân biệt rõ giữa specialty và teacher_subject. | - Giao diện gán môn học giáo viên đủ điều kiện giảng dạy (`teacher_subject`).<br>- **Tuyệt đối không có trạng thái PENDING, không có nút Approve/Reject** (D-06a: mặc định APPROVED có hiệu lực ngay).<br>- Tra cứu giáo viên đủ điều kiện theo môn học (`GET /teachers/assignable?subjectId=`). | `D-06`, `D-06a`, `D-09` |
| 7 | **Quản lý Môn học của lớp (Class Subject)** | `ClassesPage` hiện tại chỉ lưu 1 trường đơn `subjectId` trên `school_class`. | - Mở rộng giao diện lớp học để quản lý danh sách môn (`class_subject`).<br>- Chức năng áp dụng Curriculum (`PUT /classes/{classId}/curriculum`) với tùy chọn `confirmReplace` và `keepManualSubjects`.<br>- Thêm môn thủ công (`source = MANUAL`) cho lớp.<br>- Đảm bảo hiển thị tương thích với lớp legacy chưa có `class_subject` (D-09, D-15). | `D-08`, `D-09`, `D-15` |
| 8 | **Thay đổi môn học chính của lớp (Primary Subject Change)** | **Chưa có**, hiện tại cho phép sửa form chung lớp. | - Xây dựng modal riêng có kiểm soát chặt chẽ cho thao tác đổi môn chính (`PUT /classes/{classId}/subjects/primary`).<br>- Kiểm soát theo trạng thái lớp:<br>  + Lớp `CHUA_BAT_DAU`: cho phép thay đổi tự do.<br>  + Lớp `DANG_DIEN_RA`: chỉ cho đổi qua dialog kiểm soát; **bắt buộc nhập lý do** (1..500 ký tự); **bắt buộc truyền `expectedVersion`**; **tự sinh `operationId` UUID**; cảnh báo giáo viên không tự chuyển.<br>  + Lớp `DA_KET_THUC` / `DA_HUY` / `CLOSED`: khóa hoàn toàn chức năng đổi môn.<br>- Không cho phép xóa dòng môn chính qua API xóa môn thường (`CLASS_SUBJECT_LEGACY_PROTECTED`). | `D-08`, `D-15` |
| 9 | **Xem lịch sử thay đổi môn học chính** | **Chưa có**. | - Màn hình/tab xem lịch sử thay đổi môn chính của lớp (`GET /classes/{classId}/subject-history`).<br>- Hiển thị dạng timeline hoặc bảng lịch sử: thời gian đổi, người đổi, môn cũ (`oldSubjectCode`, `oldSubjectName`, `oldSource`), môn mới (`newSubjectCode`, `newSubjectName`, `newSource`), lý do đổi, mã giao dịch `operationId`.<br>- Dữ liệu lịch sử là read-only, không có nút sửa/xóa. | `D-08`, `D-15` |
| 10 | **Hệ thống Mock Data** | `mock/adapter.ts` chưa mock các API Phase 1. | - Bổ sung mock data và endpoints cho: `/api/curricula/**`, `/api/classes/{id}/subjects/**`, `/api/classes/{id}/subject-history`, `/api/teachers/{id}/subjects`, `/specialties/{id}/subjects`. | Yêu cầu mục 8 |

---

## 6. Kiến trúc đề xuất cho Phase 1

### 6.1. Tổ chức mã nguồn trong `frontend/src/features/academic/`
Chúng ta sẽ tuân thủ 100% cấu trúc hiện tại của dự án, mở rộng các module sau:
```text
frontend/src/features/academic/
├── api.ts                         # Bổ sung curriculaApi, classSubjectsApi, teacherSubjectsApi
├── hooks.ts                       # Bổ sung useCurricula, useCurriculum, useClassSubjects, useSubjectHistory, etc.
├── types.ts                       # Bổ sung types: Curriculum, CurriculumSubject, ClassSubject, PrimarySubjectChangeInput, SubjectHistory, etc.
├── components/
│   ├── curriculum-form-dialog.tsx       # Dialog tạo/sửa Curriculum (quản lý version)
│   ├── curriculum-subject-drawer.tsx    # Drawer thêm/sửa môn học & tiên quyết trong CTĐT
│   ├── class-curriculum-apply-dialog.tsx # Dialog áp dụng CTĐT cho lớp học
│   ├── primary-subject-change-dialog.tsx # Dialog đổi môn chính có kiểm soát (reason, version, operationId)
│   ├── class-subject-history-drawer.tsx # Drawer/modal xem lịch sử thay đổi môn chính
│   └── teacher-subject-dialog.tsx       # Dialog quản lý môn học giảng dạy của giáo viên (APPROVED ngay)
└── pages/
    ├── subjects-page.tsx          # Cập nhật hoàn thiện Subject Management (đối chiếu API Contract)
    ├── curricula-page.tsx         # Màn hình danh sách & quản lý CTĐT mới
    ├── curriculum-detail-page.tsx  # Màn hình chi tiết CTĐT & danh sách môn, tiên quyết
    ├── classes-page.tsx           # Tích hợp quản lý môn học của lớp & đổi môn chính
    └── teachers-page.tsx          # Tích hợp quản lý môn dạy giáo viên (Teacher Subject)
```

### 6.2. Cập nhật Router & Navigation
1. **`src/lib/permissions.ts`**:
   - Khai báo bổ sung:
     ```typescript
     curriculumView: 'curriculum.view',
     curriculumManage: 'curriculum.manage',
     ```
2. **`src/lib/nav.ts`**:
   - Bổ sung `curricula` vào nhóm `academic-teaching`:
     ```typescript
     {
       id: 'curricula',
       label: 'Chương trình đào tạo',
       to: '/dao-tao/chuong-trinh-dao-tao',
       icon: BookOpenCheck, // hoặc Library/GraduationCap
       permissions: [PERM.curriculumView, PERM.curriculumManage],
       modules: ['STUDENT_MANAGEMENT'],
       status: 'ready',
     }
     ```
3. **`src/app/app.tsx`**:
   - Đăng ký routes:
     - `/dao-tao/chuong-trinh-dao-tao` -> `<CurriculaPage />`
     - `/dao-tao/chuong-trinh-dao-tao/:id` -> `<CurriculumDetailPage />`
   - Bọc qua `WorkspaceGuard` và `PermissionGuard`.

### 6.3. API Service & Type Contracts
Tất cả các định dạng DTO, request input, và response sẽ được định nghĩa chuẩn xác theo `docs/phase-1/api-contract.md`:
- `GET /subjects` trả về mảng `Subject[]` (D-13).
- `GET /curricula` trả về `{ items, total, page, size }` (1-based page).
- `PUT /curricula/{id}` gửi kèm `version` để kiểm soát concurrency `DATA_CHANGED`.
- `PUT /classes/{classId}/subjects/primary` gửi:
  ```typescript
  {
    subjectId: string
    reason: string // 1..500 ký tự
    expectedVersion: number // Khớp school_class.version
    operationId: string // UUID chuẩn
    plannedSessions?: number
    sessionMinutes?: number
  }
  ```
- Lịch sử môn chính trả về snapshot nguyên trạng (`oldSource`, `newSource`, `reason`, `operationId`).

---

## 7. Kết luận và Kế hoạch tiếp theo

1. **Kết luận Audit:**
   - Cấu trúc frontend hiện tại rất hoàn chỉnh, chuẩn mực và đã sẵn sàng để triển khai Phase 1 mà không cần thay đổi kiến trúc cốt lõi.
   - Các UI primitives, hook patterns, hệ thống phân quyền và module guard hiện có đáp ứng 100% các tiêu chí kỹ thuật cần thiết.
   - Toàn bộ 170 test cases hiện tại đều đang chạy thành công (PASS).

2. **Kế hoạch tiếp theo:**
   - **Dừng lại tại đây** theo đúng quy định để báo cáo cho người dùng kiểm tra và xác nhận.
   - Sau khi nhận được xác nhận từ người dùng, sẽ tiến hành **Giai đoạn 2 – Thiết kế UI/UX** và soạn thảo tài liệu `docs/phase-1/frontend-ui-plan.md`.
