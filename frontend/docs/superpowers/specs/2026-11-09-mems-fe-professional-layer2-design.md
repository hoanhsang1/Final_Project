# MEMS FE — Lớp 2: Auth + mẫu lõi + reduced-motion (spec thiết kế, chờ duyệt)

> Trạng thái: **ĐỀ XUẤT / CHỜ DUYỆT**. Chưa lập plan, chưa triển khai. Chỉ code sau khi spec được duyệt.
> Ngày: 2026-11-09. Thuộc lộ trình “lớp chuyên nghiệp” (Layer 1 đã thực thi một phần, uncommitted). Chọn phương án **tối ưu** theo uỷ quyền của người dùng.

## 1. Mục tiêu
- Restyle **Auth**: Login / Register / Forgot / Reset. **Xoá `loginFigma`** (palette cục bộ ở Login). Giữ toàn bộ hành vi/contract.
- Định nghĩa và áp dụng **mẫu lõi (core templates) mỏng, opt-in** trên **2 trang đại diện** (1 list, 1 detail) để nhất quán header/state/action — app luôn chạy, không quét toàn bộ.
- Thêm **`prefers-reduced-motion`** và **siết micro-interaction token** (150–200ms), tinh tế, không che lỗi/NFR-REL-001. Không thêm thư viện animation.

## 2. Bất biến (không được phá)
- **Không đổi contract/API/DTO** (không bịa field). Không đổi **route/guard/URL/IA**. Không đổi hành vi Sprint 4: `version`, 409/`SPECIALITY_MISMATCH`, stale-409, **NFR-REL-001** (lỗi/timeout → không báo thành công, không lưu sai).
- Giữ `vi_VN`. A11y nền tảng: skip link `#noi-dung-chinh`, focus-visible, `aria-label`, `aria-current="page"`, ngữ nghĩa form/alert. Nhận thức đủ 5 trạng thái khi áp dụng: loading/empty/error/success/no-permission.
- Ant Design 5 + `ConfigProvider` token/components là nguồn sự thật. **Không** hardcode hex/px rải rác. Không Tailwind, không lib animation mới.
- Hiệu ứng: 150–200ms, có mục đích; **tôn trọng `prefers-reduced-motion`**; **không che** trạng thái lỗi/NFR-REL-001.
- Layer 1 hiện uncommitted; repo có nhiều thay đổi sẵn — **không commit/push/merge/branch** trừ khi được yêu cầu. Không đụng phần không liên quan.

## 3. Thực trạng (cơ sở quyết định)
- Layer 1 artifact có trên disk: `PageHeader` (mới), `ConsoleShell`/`OverviewPage`/`DepartmentsPage`/menu/icon refactor (modified). **Nhưng** `frontend/src/theme.ts` (modified) trên disk hiện là palette **đỏ-cam/navi Sprint 1 auth** (`#C2410C`…), **không** phải palette xanh enterprise Layer 1 đã duyệt (`#155EEF/#1849A9/#EFF4FF`). → Lớp 2 phải **tái lập nền token xanh enterprise Layer 1 đã duyệt** trong `theme.ts` (giữ export/shape tương thích) rồi mới restyle nhất quán lên đó. Đây là bước nền tảng, không đổi hành vi.
- Auth: `LoginPage` split-hero dùng `loginFigma` cục bộ + logic redirect/role-preview/NFR-REL-001 (test `LoginPage.test.tsx` assert nhãn/link/redirect). `AuthCard` dùng bởi Register/Forgot/Reset (test `AuthCard.test.tsx` assert width/tab). Register/Forgot/Reset giữ logic module-catalog, chống dò email, token URL/hết hạn, NFR-REL-001.
- List/detail: `DepartmentsPage` dùng `PageHeader`+`Alert/Empty/Table`; `ClassesPage` dùng `Title`+filter+`Table`/`Alert` (chưa `PageHeader`); `ClassDetailPage` dùng `Spin/Alert/Descriptions/Tabs` + nhiều mutation **gửi `version`**, xử lý **409 stale → invalidate+refetch**, NFR-REL-001.

## 4. Quyết định thiết kế (tối ưu)

### 4a. Auth — **Phương án A3: `AuthCard` biến thể hero + migrate Login**, xoá `loginFigma`
**Chọn A3** (thống nhất một shell auth **và** giữ bản sắc hero trái của Login) thay vì A1 (đổi bố cục Login, rủi ro cao) hay A2 (hai implementation song song).

- **`AuthCard` (tương thích ngược):** mở rộng opt-in để hỗ trợ biến thể hero/left-panel qua props/composition (vd `hero` node/variant), mặc định hành vi/diện mạo nền tảng giữ cho Register/Forgot/Reset. Toàn bộ màu/bo góc/đổ bóng lấy từ token/theme (enterprise blue). SVG icon inline giữ nguyên (không phụ thuộc thêm). `activeTab`/width semantics hiện có được bảo toàn để `AuthCard.test.tsx` vẫn hợp lệ (điều chỉnh test chỉ khi *cần* và tương thích ngược).
- **RegisterPage / ForgotPasswordPage / ResetPasswordPage:** tiếp tục dùng `AuthCard`; **chỉ presentation** hưởng lợi từ token/`AuthCard` mới. **Không đổi** logic: module-catalog fetch/validate/payload (Register), chống dò email (Forgot), token `useSearchParams`/hết hạn/xác nhận mật khẩu (Reset), mọi `Alert role="alert"`/`Result`/NFR-REL-001, route link.
- **LoginPage:** xoá **toàn bộ** `loginFigma`. Migrate phần form + hero sang `AuthCard` biến thể hero (giữ hero trái 01/02/03, chuyển sang palette enterprise token-driven). **Bảo toàn tuyệt đối**: `handleSubmit` chỉ gửi `{username,password}` (không `remember`); phân nhánh redirect `SUPER_ADMIN→/quan-tri`, `isOwnerRole→/to-chuc`, `canAccessAcademicArea→/dao-tao`, `rolePreviewPath`/`notice`; `formError` inline `role="alert"` + **không điều hướng** (NFR-REL-001); field `username`/`password`, `required` message, `autoComplete`, link `/quen-mat-khau` + `aria-label="Đăng ký tổ chức"` → `/dang-ky`, tablist nhãn “Chọn loại tài khoản”, khu **“xem thử theo vai trò”** (`ROLES` + `RoleButton`/`rolePreviewPath`) giữ nguyên (chỉ restyle). `LoginPage.test.tsx` phải xanh (chỉ chỉnh selector nếu đổi markup phá tương đương ngữ nghĩa — ưu tiên không đổi).
- **A11y auth:** label gắn field, `role="alert"` lỗi, tab/link đạt tên truy cập, focus-visible rõ, contrast AA.

### 4b. Mẫu lõi (mỏng, opt-in) — **2 đại diện: `ClassesPage` (list) + `ClassDetailPage` (detail)**
Không tạo abstraction nặng/framework form. Chuẩn hoá *pattern* dùng primitive sẵn (`PageHeader`, token, `Alert/Empty/Spin/Table/Descriptions/Tabs`).

- **List template pattern (áp dụng `ClassesPage`):** chuyển sang `PageHeader` (title + vùng action/filter nếu hợp lý) + khối state nhất quán: `!canView` → cảnh báo no-permission; `isError` → `Alert` lỗi + nút retry (NFR-REL-001, không trạng thái thành công giả); loading qua `Table loading`; empty qua `locale.emptyText`/`Empty`. **Giữ nguyên** `queryKey ['classes',{page,size,closeState,search}]`, `enabled: canView`, permission gate `isOwner || CLASS_VIEW`, cột/link `/dao-tao/lop-hoc/:id`, filter/search/pagination handlers, `sprint4ErrorMessage`. Chỉ presentation/cấu trúc.
- **Detail header + state pattern (áp dụng `ClassDetailPage`):** header chi tiết thống nhất (nút quay lại + `PageHeader`/khối tiêu đề + tag closeState + nhóm action theo quyền) + state `isLoading→Spin (giữ tip)`, `isError→Alert` + Retry/Quay lại, not-found. **Giữ nguyên tuyệt đối** mọi hành vi nghiệp vụ: `fetch*` query keys/enabled, `useMutation` bọc `doMut` gửi `version` (ném nếu thiếu), `handleError` hiện `sprint4ErrorMessage` + khi stale/409 **`invalidate` + `refetch`** (NFR-REL-001), mọi modal/form/validate, phân nhánh quyền `can()`/hiển thị nút theo `closeState`/`status`, tab Info/Status logs/Close events, dữ liệu bảng con. Chỉ presentation.
- **Ngoài scope 4b:** không refactor trang list/detail khác; không tạo form template chung; `DepartmentsPage` (Layer 1) giữ nguyên trừ khi cần chỉnh nhỏ để đồng bộ pattern (không đổi logic).

### 4c. Reduced-motion + siết micro-interaction token
- **Global reduced-motion:** thêm `frontend/src/index.css` (mới) và import trong `main.tsx` (sau `antd/dist/reset.css` hoặc vị trí phù hợp) với `@media (prefers-reduced-motion: reduce)` giảm/tắt `animation`/`transition` và `scroll-behavior: auto`. Không ảnh hưởng logic; không che lỗi.
- **Motion token (ConfigProvider, `theme.ts`):** đặt `motion: true` và siết `motionDurationFast/Mid/Slow` về **~150–200ms** (tinh tế) + easing mặc định AntD; tinh chỉnh `themeComponents` chỉ khi cần để giữ chuyển động nhẹ (Button/Table/Modal…). Không thêm lib. Nền token đồng thời chuyển sang **blue enterprise Layer 1 đã duyệt** (`colorPrimary` #155EEF, active #1849A9, soft #EFF4FF, neutral/semantic/border/shadow sạch) và giữ export `color/typeScale/themeToken/themeComponents/layoutBackground/cardStyle/fontFamily` tương thích.

## 5. Bản đồ thay đổi dự kiến (phạm vi file)
- **Nền/motion:** `src/theme.ts` (tái lập token Layer 1 blue + siết motion token/components), `src/index.css` (mới, reduced-motion), `src/main.tsx` (import `index.css`).
- **Auth:** `src/components/AuthCard/AuthCard.tsx` (+ `types.ts` nếu cần prop hero, tương thích ngược), `src/components/AuthCard/AuthCard.test.tsx` (chỉ khi cần, giữ nghĩa), `src/pages/LoginPage/LoginPage.tsx` (xoá `loginFigma`, migrate lên AuthCard hero, giữ logic), `src/pages/LoginPage/LoginPage.test.tsx` (giữ xanh; chỉnh tối thiểu nếu bắt buộc). Register/Forgot/Reset `*.tsx` chủ yếu **không đổi logic** (có thể chỉnh nhỏ spacing/class không ảnh hưởng hành vi).
- **Mẫu lõi đại diện:** `src/pages/ClassesPage/ClassesPage.tsx`, `src/pages/ClassDetailPage/ClassDetailPage.tsx` (presentation/pattern; **không đổi** data/permission/version/409 logic).
- **Có thể chạm (chỉ nếu tương thích):** `PageHeader` props nhỏ; không đổi route/menu/guards.

## 6. Xác minh (mỗi lát cắt + cuối)
- `npx tsc -b` → exit 0.
- `npx vitest run` (ít nhất) các file auth + trang chạm: `LoginPage.test`, `AuthCard.test`, `RegisterPage.test` (nếu có/đang xanh), và test liên quan Classes/ClassDetail nếu có; ghi rõ fail *sẵn có ngoài scope* (đã biết `router.test.tsx` lệch H1 LoginPage là pre-existing/unrelated Layer 2).
- `npm run build` → OK.
- Kiểm tay nhanh (khi chạy local): 4 trang auth render/flow đúng (đăng nhập redirect, quên MK báo trung tính, reset token hợp lệ/hết hạn, đăng ký), `ClassesPage` filter/paging/link, `ClassDetailPage` action gửi version và 409 stale refetch; bật reduced-motion (DevTools) → chuyển động giảm/tắt.
- A11y smoke: focus-visible, label/aria alert, skip link không vỡ.

## 7. Rủi ro & giảm thiểu
- **Theme đổi nền (red→blue):** ảnh hưởng diện mạo toàn app (đúng hướng Layer 1) → giảm thiểu bằng bám token đã duyệt, chạy build+tests, kiểm trang auth/shell.
- **Refactor Login (A3):** rủi ro vỡ selector/flow → bảo toàn field name/rule/message/link/redirect/role-preview; chạy `LoginPage.test` sớm, chỉnh markup tối thiểu.
- **ClassDetailPage nghiệp vụ nhạy:** chỉ đụng presentation; tuyệt đối không chạm `version`/409/invalidate/mutation/permission.
- **`prefers-reduced-motion !important`:** global mạnh → giới hạn trong media query; chấp nhận trade-off chuẩn để đảm bảo tuân thủ.

## 8. Ngoài scope Lớp 2
- Quét restyle toàn bộ trang, form template chung, đổi BE/route/guard/IA, dọn fail pre-existing không liên quan (`router.test.tsx`), commit/push/merge. Sprint 4 Teachers/Specialties BE/E2E (chờ Sang cung cấp branch/URL).