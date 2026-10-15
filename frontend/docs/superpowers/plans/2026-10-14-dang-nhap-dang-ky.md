# Trang đăng nhập & đăng ký (Sprint 1 · EP-01) — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng ứng dụng React đầu tiên trong `frontend/` gồm 3 màn hình tĩnh — đăng nhập, đăng ký tổ chức, và màn "Bạn đang là …" — để nhóm chốt thiết kế. Không gọi backend ở bất kỳ đâu.

**Architecture:** Vite + React + TypeScript. Ant Design 5 làm toàn bộ UI; mọi màu / bo góc / font khai báo một chỗ trong `src/theme.ts` rồi truyền qua `ConfigProvider` — component không hardcode. Danh sách 4 tác nhân là một mảng hằng ở `src/features/auth/roles.ts`, dùng chung cho cả nút bấm lẫn trang kết quả, nên không thể lệch nhau. Điều hướng bằng React Router `createBrowserRouter`.

**Tech Stack:** React 19 · TypeScript 6 · Vite 8 · Ant Design 5.29 · React Router 7 · Vitest 5 + React Testing Library · ESLint 9 + Prettier + `eslint-plugin-jsx-a11y`

**Spec:** Bố cục đã chốt là **phương án A — một cột** (bản phác thảo: `C:\Users\night\AppData\Local\Temp\opencode\mems-mockups\mockup-dangnhap.html`, file tạm có thể bị xoá — kế hoạch này tự chứa đủ thông tin). ADR nền: `D:\Đồ án tốt nghiệp\Tài liệu liên quan dự án\Frontend_Stack_MEMS.md` (ADR-FE-002 = Ant Design 5).

## Global Constraints

Mọi task đều phải thỏa phần này.

- **UI library:** Ant Design 5. Không Tailwind, không CSS framework khác, không tự dựng `<table>`/`<input>`.
- **Theming:** màu, bo góc, font chỉ khai trong `src/theme.ts` và truyền qua `ConfigProvider`. **Không** hardcode hex/px trong component. Ngoại lệ duy nhất: `src/theme.ts`.
- **Locale:** antd `vi_VN`.
- **Ngôn ngữ:** UI copy và comment **tiếng Việt**; identifier **tiếng Anh**.
- **Nền tảng:** desktop-first (quyết định của Nghĩa, ghi đè dòng "Mobile-first" trong `AGENTS.md`). Không cần bố cục mobile.
- **BR-08:** không dùng màu làm tín hiệu duy nhất — mỗi nút tác nhân phải có **chữ**, không chỉ màu/icon.
- **WCAG 2.1 AA:** nút chỉ có icon phải có `aria-label`; giữ `:focus-visible`, không `outline: none` trần.
- **Bảo mật:** không `dangerouslySetInnerHTML`.
- **Không gọi API** trong toàn bộ phạm vi này. Không cài TanStack Query / Axios / Zustand / Zod / Recharts / dayjs / Playwright ở giai đoạn này — thêm khi có việc thật dùng tới.
- **Bốn tác nhân, đúng thứ tự này:**

  | `id` (slug, ASCII) | `label` (UI)   | `description` (UI)               |
  | ------------------ | -------------- | -------------------------------- |
  | `platform-admin`   | Admin hệ thống | Quản trị toàn nền tảng           |
  | `academic-staff`   | Cán bộ quản lý | Giáo vụ của tổ chức              |
  | `teacher`          | Giáo viên      | Xem lịch dạy, báo sự cố thiết bị |
  | `student`          | Sinh viên      | Xem thời khóa biểu               |

- **Giá trị token (chép nguyên):** `colorPrimary: '#1677ff'`, `borderRadius: 10`, `colorBgLayout: '#f1f5fb'`, `fontFamily: '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'`. Nền trang `#f1f5fb`; thẻ trắng bo `16px`, đổ bóng `0 4px 20px rgba(22,119,255,.08)`, rộng tối đa `420px`, canh giữa.
- **Đường dẫn (ASCII, không dấu):** `/` → chuyển hướng `/dang-nhap`; `/dang-nhap`; `/dang-ky`; `/xem-thu/:vaiTro`; `*` → 404.
- Môi trường: Node 24.19.0, npm 11.17.0, Windows, PowerShell 5.1.

## Review Focus

Năm tình huống dưới đây kế hoạch không tự sinh ra test, nhưng người dùng thật sẽ gặp — mỗi dòng đã được gắn test ở task tương ứng:

1. **`/xem-thu/<slug lạ>`** (gõ sai, hoặc link cũ sau khi đổi slug) → phải hiện thông báo "không có vai trò này", **không** trắng trang, không crash. _(Task 7)_
2. **Mở thẳng `/xem-thu/giao-vien`** khi chưa bấm nút nào (dán link, F5) → phải dựng đúng, không phụ thuộc state từ lần bấm trước. _(Task 7)_
3. **Tiếng Việt có dấu** ở nhãn nút, tiêu đề trang, `document.title` → không vỡ chữ. _(Task 3, Task 5)_
4. **Bấm tab "Đăng ký" rồi Back của trình duyệt** → phải quay về đúng tab "Đăng nhập", không kẹt ở Đăng ký. _(Task 4)_
5. **Cửa sổ hẹp ~1024px** (reviewer kéo nhỏ cửa sổ) → thẻ không tràn, không sinh thanh cuộn ngang. _(Task 8)_

---

### Task 1: Dựng khung dự án và bộ công cụ

**Files:**

- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig*.json`, `frontend/index.html`
- Create: `frontend/eslint.config.js`, `frontend/.prettierrc.json`, `frontend/.prettierignore`
- Create: `frontend/.gitignore` (bổ sung)
- Create: `frontend/src/main.tsx` (bản tạm), `frontend/src/App.tsx` (bản tạm)
- Create: `frontend/src/test/setup.ts`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**

- Consumes: không
- Produces: các script `npm run dev` · `npm run build` · `npm test` · `npm run lint` · `npm run format`

- [ ] **Step 1: Scaffold**

Chạy trong `D:\Final_Project\frontend` (tạo thư mục trước):

```
npm create vite@latest . -- --template react-ts
npm install
```

Template hiện tại cho: React 19.2, TypeScript 6.0, Vite 8.3, `@vitejs/plugin-react` 6.1.

- [ ] **Step 2: Cài dependency của dự án**

```
npm install antd@^5.29.3 @ant-design/v5-patch-for-react-19@^1.0.3 react-router-dom@^7.18.4
npm install -D vitest@^5 @testing-library/react@^16 @testing-library/jest-dom@^7 @testing-library/user-event@^14 jsdom@^30 eslint@^9 typescript-eslint@^8 eslint-plugin-react-hooks@^5 eslint-plugin-jsx-a11y@^6 eslint-config-prettier@^10 prettier@^3
```

Lý do các lựa chọn ít thấy:

- `antd@5` giữ đúng **ADR-FE-002**. antd mới nhất đã là v6 nhưng ADR chốt v5.
- `@ant-design/v5-patch-for-react-19` là gói **chính thức của antd** để v5 chạy được trên React 19 (template sinh React 19). Sẽ import một dòng ở `main.tsx`.
- Template Vite mặc định dùng `oxlint`, nhưng `AGENTS.md` yêu cầu ESLint + `eslint-plugin-jsx-a11y` → cài ESLint riêng, bỏ script `oxlint`.
- **Chưa** cài TanStack Query, Axios, Zustand, Zod, Recharts, dayjs, Playwright (xem Global Constraints).

- [ ] **Step 3: Bổ sung `test` và sửa `lint` vào `package.json`**

Thêm `"test": "vitest run"`, `"test:watch": "vitest"`, `"format": "prettier --write ."`; đổi `"lint"` từ `oxlint` sang `eslint .`.

- [ ] **Step 4: Cấu hình Vitest trong `vite.config.ts`**

Thêm khối `test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts', css: true }`. Nếu `defineConfig` báo lỗi kiểu, import `defineConfig` từ `vitest/config`.

- [ ] **Step 5: Viết `src/test/setup.ts`**

Nội dung: `import '@testing-library/jest-dom/vitest';` và `import '@ant-design/v5-patch-for-react-19';`

- [ ] **Step 6: Viết test khói (failing trước)**

`frontend/src/App.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

it('dựng được ứng dụng', () => {
  render(<App />);
  expect(screen.getByText(/mems/i)).toBeInTheDocument();
});
```

`src/App.tsx` tạm thời trả về `<div>MEMS</div>`.

- [ ] **Step 7: Chạy test và build**

Run: `npm test` → 1 passed. Run: `npm run build` → không lỗi. Run: `npm run lint` → không lỗi.

- [ ] **Step 8: Bổ sung `.gitignore`**

Thêm vào `.gitignore` của `frontend/`: `node_modules`, `dist`, `coverage`, `.env`, `.env.local`, `*.local`, `.DS_Store`, `opencode.json`, `.opencode/`.

- [ ] **Step 9: Commit**

```bash
git add frontend
git commit -m "feat(fe): dựng khung Vite + React + TypeScript + Ant Design 5"
```

---

### Task 2: Theme, ConfigProvider và khung định tuyến

**Files:**

- Create: `frontend/src/theme.ts`
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/router.tsx`
- Create: `frontend/src/pages/LoginPage/LoginPage.tsx` (bản tạm)
- Create: `frontend/src/pages/RegisterPage/RegisterPage.tsx` (bản tạm)
- Create: `frontend/src/pages/RolePreviewPage/RolePreviewPage.tsx` (bản tạm)
- Create: `frontend/src/pages/NotFoundPage/NotFoundPage.tsx`
- Delete: `frontend/src/App.tsx`, `frontend/src/App.test.tsx`, `frontend/src/index.css` (nếu template sinh ra và không dùng)
- Test: `frontend/src/router.test.tsx`

**Interfaces:**

- Consumes: không
- Produces:
  - `src/theme.ts` → `export const themeToken: ThemeConfig['token']` (locale `vi_VN` import thẳng trong `main.tsx`, không đặt ở đây)
  - `src/router.tsx` → `export const router: ReturnType<typeof createBrowserRouter>` dùng ở `main.tsx`
  - Đường dẫn chuẩn: `/` → `/dang-nhap`, `/dang-nhap`, `/dang-ky`, `/xem-thu/:vaiTro`, `*`

- [ ] **Step 1: Viết `src/theme.ts`**

Xuất một hằng chứa đúng các giá trị token ở Global Constraints, cộng thêm `colorLink: '#1677ff'`, `controlHeight: 38`, `fontSize: 14`. Đây là **nơi duy nhất** trong repo được phép có mã màu.

- [ ] **Step 2: Viết test định tuyến (failing trước)**

`frontend/src/router.test.tsx` — dùng `createMemoryRouter` với chính bảng route trong `src/router.tsx` (tách `routes` thành mảng xuất được để test dùng lại):

```tsx
it('chuyển hướng gốc về trang đăng nhập', …)           // router ban đầu ở '/'
it('hiện trang đăng ký ở /dang-ky', …)
it('hiện 404 ở đường dẫn không tồn tại', …)
```

Chạy `npm test` → phải FAIL vì chưa có route.

- [ ] **Step 3: Tạo `src/router.tsx`**

Xuất `export const routes: RouteObject[]` và `export const router = createBrowserRouter(routes)`. Mỗi route trỏ tới component trang tương ứng. `/` dùng `<Navigate to="/dang-nhap" replace />`.

- [ ] **Step 4: Tạo các trang tạm**

Mỗi trang tạm chỉ trả về một câu tiếng Việt nhận ra được, ví dụ `LoginPage` trả `<div>Trang đăng nhập</div>`. `NotFoundPage` trả `<div>Không tìm thấy trang</div>`.

- [ ] **Step 5: Viết `src/main.tsx`**

`import '@ant-design/v5-patch-for-react-19'` ở dòng đầu; bọc `<ConfigProvider locale={viVN} theme={{ token: themeToken }}>` quanh `<RouterProvider router={router} />`; `import 'antd/dist/reset.css'`. Đặt `document.title = 'MEMS'` trong `index.html`.

- [ ] **Step 6: Chạy test**

Run: `npm test` → tất cả PASS.

- [ ] **Step 7: Kiểm tra bằng mắt + commit**

Run: `npm run dev`, mở 4 đường dẫn, xác nhận mỗi đường dẫn ra đúng trang tạm và không có lỗi trong console.

```bash
git add frontend
git commit -m "feat(fe): theme Ant Design 5, locale vi_VN và khung định tuyến"
```

---

### Task 3: Nguồn dữ liệu tác nhân và nút tác nhân

**Files:**

- Create: `frontend/src/features/auth/roles.ts`
- Create: `frontend/src/components/RoleButton/RoleButton.tsx`
- Test: `frontend/src/features/auth/roles.test.ts`
- Test: `frontend/src/components/RoleButton/RoleButton.test.tsx`

**Interfaces:**

- Consumes: không
- Produces:

  ```ts
  export type RoleId = 'platform-admin' | 'academic-staff' | 'teacher' | 'student';
  export interface Role {
    id: RoleId;
    label: string;
    description: string;
  }
  export const ROLES: readonly Role[]; // đúng thứ tự ở Global Constraints
  export function findRole(slug: string | undefined): Role | undefined; // nhận thẳng useParams()
  export function rolePreviewPath(id: RoleId): string; // '/xem-thu/<id>'
  ```

  ```tsx
  export interface RoleButtonProps {
    role: Role;
    onSelect: (role: Role) => void;
  }
  export function RoleButton(props: RoleButtonProps): JSX.Element;
  ```

- [ ] **Step 1: Viết test cho `roles.ts` (failing trước)**

```ts
it('có đúng 4 tác nhân, đúng thứ tự', () => {
  expect(ROLES.map((r) => r.id)).toEqual([
    'platform-admin',
    'academic-staff',
    'teacher',
    'student',
  ]);
});
it('mọi nhãn đều có chữ tiếng Việt có dấu', () => {
  expect(ROLES.map((r) => r.label)).toContain('Cán bộ quản lý');
});
it('findRole trả undefined với slug lạ', () => {
  expect(findRole('giao-vien')).toBeUndefined();
});
it('rolePreviewPath ghép đúng', () => {
  expect(rolePreviewPath('teacher')).toBe('/xem-thu/teacher');
});
```

Chạy → FAIL.

- [ ] **Step 2: Viết `roles.ts`** cho test xanh.

- [ ] **Step 3: Viết test cho `RoleButton` (failing trước)**

```tsx
it('hiện nhãn và mô tả dạng chữ, không chỉ màu', …)   // getByText('Giáo viên') và getByText(/báo sự cố/i)
it('bấm thì gọi onSelect với đúng role', …)           // userEvent.click
it('là button thật, bấm được bằng bàn phím', …)        // role === 'button', focus + Enter
```

- [ ] **Step 4: Viết `RoleButton.tsx`** cho test xanh. Dùng `antd` `Button` với `type="default"`, `block`, `htmlType="button"`; bên trong là `Flex` chứa icon (`@ant-design/icons` hoặc antd `Avatar`) + cột chữ (`label` đậm, `description` mờ). **Bắt buộc có chữ** (BR-08). Màu chỉ lấy từ token.

- [ ] **Step 5: Chạy test + commit**

Run: `npm test` → PASS.

```bash
git add frontend/src/features frontend/src/components
git commit -m "feat(fe): dữ liệu 4 tác nhân và nút chọn tác nhân"
```

---

### Task 4: Khung thẻ đăng nhập/đăng ký dùng chung

**Files:**

- Create: `frontend/src/components/AuthCard/AuthCard.tsx`
- Create: `frontend/src/components/AuthCard/types.ts`
- Test: `frontend/src/components/AuthCard/AuthCard.test.tsx`

**Interfaces:**

- Consumes: `themeToken` từ Task 2 (chỉ để tham chiếu, không import nếu không cần)
- Produces:

  ```tsx
  export type AuthTab = 'login' | 'register';
  export interface AuthCardProps {
    activeTab: AuthTab;
    title: string;
    subtitle: string;
    children: ReactNode;
  }
  export function AuthCard(props: AuthCardProps): JSX.Element;
  ```

  Thẻ căn giữa màn hình, rộng tối đa 420px, có logo chữ "M" + tiêu đề "MEMS" + phụ đề, và 2 tab.

- [ ] **Step 1: Viết test (failing trước)**

```tsx
it('tab đang mở được đánh dấu cho trình đọc màn hình', …)  // aria-selected / aria-current
it('tab kia là liên kết tới /dang-ky', …)                  // getByRole('link', {name:'Đăng ký'}), href
it('render children', …)
```

Chạy → FAIL.

- [ ] **Step 2: Viết `AuthCard.tsx`**

Dùng antd `Card` + `Tabs` (hoặc `Segmented`), nhưng tab phải là **liên kết thật** (`react-router` `Link`) để Back của trình duyệt hoạt động đúng (Review Focus #4) — nếu `Tabs` không cho phần tử tuỳ biến, dựng bằng `Flex` + `Link` có style lấy từ token.

- [ ] **Step 3: Chạy test + commit**

Run: `npm test` → PASS.

```bash
git add frontend/src/components/AuthCard
git commit -m "feat(fe): khung thẻ đăng nhập/đăng ký dùng chung"
```

---

### Task 5: Trang đăng nhập

**Files:**

- Modify: `frontend/src/pages/LoginPage/LoginPage.tsx`
- Test: `frontend/src/pages/LoginPage/LoginPage.test.tsx`

**Interfaces:**

- Consumes: `AuthCard` (Task 4), `ROLES` / `RoleButton` / `rolePreviewPath` (Task 3)
- Produces: component trang, xuất mặc định, không nhận prop

- [ ] **Step 1: Viết test (failing trước)**

```tsx
it('có ô tên đăng nhập và mật khẩu', …)                 // getByLabelText('Tên đăng nhập')
it('có đủ 4 nút tác nhân', …)                            // getAllByRole('button') lọc theo tên
it('bấm "Giáo viên" thì chuyển tới /xem-thu/teacher', …)  // memory router, đọc location sau click
it('bấm Đăng nhập khi bỏ trống thì hiện lỗi tại trường', …) // antd Form required
```

Chạy → FAIL.

- [ ] **Step 2: Viết `LoginPage.tsx`**

`AuthCard activeTab="login"`. Bên trong: `Form` của antd với 2 `Form.Item` (Tên đăng nhập, Mật khẩu), `Checkbox` ghi nhớ, liên kết "Quên mật khẩu?" (trỏ `#` — chưa có trang), nút `Đăng nhập` (`htmlType="submit"`). Nút submit chỉ validate, **không** gọi API; khi hợp lệ thì không làm gì (hoặc `console.info`) và có comment `// TODO: nối API khi Sang chốt contract`.

Dưới form: dải phân cách chữ "hoặc xem thử theo vai trò", rồi `ROLES.map` ra `RoleButton`, `onSelect` gọi `navigate(rolePreviewPath(role.id))`.

Cuối thẻ: dòng "Chưa có tổ chức? Đăng ký tổ chức" trỏ `/dang-ky`.

- [ ] **Step 3: Chạy test + commit**

Run: `npm test` → PASS.

```bash
git add frontend/src/pages/LoginPage
git commit -m "feat(fe): trang đăng nhập với 4 nút chọn tác nhân"
```

---

### Task 6: Trang đăng ký tổ chức

**Files:**

- Modify: `frontend/src/pages/RegisterPage/RegisterPage.tsx`
- Test: `frontend/src/pages/RegisterPage/RegisterPage.test.tsx`

**Interfaces:**

- Consumes: `AuthCard` (Task 4)
- Produces: component trang, xuất mặc định, không nhận prop

Trường của form bám đúng schema `organization` + `account` trong repo backend:
`name`, `org_type` (`school` | `center`), `contact_email`, `contact_phone`, và tài khoản quản trị: `username`, `email`, `password`, `confirmPassword`.

- [ ] **Step 1: Viết test (failing trước)**

```tsx
it('có đủ trường thông tin tổ chức', …)              // Tên tổ chức, Loại tổ chức, Email liên hệ, Số điện thoại
it('có đủ trường tài khoản quản trị', …)              // Tên đăng nhập, Email, Mật khẩu, Nhập lại mật khẩu
it('nêu rõ tổ chức sẽ ở trạng thái chờ duyệt', …)      // getByText(/chờ duyệt/i)
it('bỏ trống rồi gửi thì hiện lỗi tại từng trường', …)
it('mật khẩu nhập lại khác thì báo lỗi', …)
```

Chạy → FAIL.

- [ ] **Step 2: Viết `RegisterPage.tsx`**

`AuthCard activeTab="register"`. `Form` antd, `layout="vertical"`, hai nhóm có tiêu đề "Thông tin tổ chức" và "Tài khoản quản trị". `Select` cho Loại tổ chức (Trường học / Trung tâm). Quy tắc `required` trên mọi trường; `confirmPassword` dùng `rules` với validator so khớp. Khối `Alert` (antd) màu cảnh báo nêu: _"Sau khi gửi, tổ chức sẽ ở trạng thái Chờ duyệt. Admin hệ thống phê duyệt xong bạn mới đăng nhập được."_ Nút `Gửi đăng ký` chỉ validate, **không** gọi API.

Lưu ý: dùng `Form` của antd ở bước này; khi nối API sẽ thay bằng React Hook Form + Zod theo ADR — ghi chú `// TODO` ngay tại chỗ.

- [ ] **Step 3: Chạy test + commit**

Run: `npm test` → PASS.

```bash
git add frontend/src/pages/RegisterPage
git commit -m "feat(fe): trang đăng ký tổ chức"
```

---

### Task 7: Trang "Bạn đang là …"

**Files:**

- Modify: `frontend/src/pages/RolePreviewPage/RolePreviewPage.tsx`
- Test: `frontend/src/pages/RolePreviewPage/RolePreviewPage.test.tsx`

**Interfaces:**

- Consumes: `findRole` (Task 3); tham số định tuyến `vaiTro`
- Produces: component trang, xuất mặc định

- [ ] **Step 1: Viết test (failing trước)**

```tsx
it('hiện "Bạn đang là" + nhãn vai trò khi slug hợp lệ', …)      // /xem-thu/teacher → 'Giáo viên'
it('dựng đúng khi mở thẳng URL, không cần bấm nút trước', …)     // Review Focus #2
it('slug lạ thì hiện thông báo, không trắng trang', …)           // Review Focus #1: /xem-thu/giao-vien
it('có nút quay lại về /dang-nhap', …)
it('có dòng nói rõ chưa kết nối hệ thống', …)                     // getByText(/chưa kết nối/i)
```

Chạy → FAIL.

- [ ] **Step 2: Viết `RolePreviewPage.tsx`**

`useParams()` lấy `vaiTro`; `findRole(vaiTro)`. Nếu không tìm thấy → hiện `Result` hoặc `Empty` của antd: "Không có vai trò này" + nút quay lại (Review Focus #1). Nếu tìm thấy → thẻ trắng căn giữa: dòng nhỏ "Bạn đang là", tên vai trò cỡ lớn, và `Tag`/`Alert` nêu _"Chế độ xem thử — chưa kết nối hệ thống"_ (màu **kèm chữ**, không chỉ màu — BR-08), cuối cùng là nút `Quay lại đăng nhập` trỏ `/dang-nhap`.

- [ ] **Step 3: Chạy test + commit**

Run: `npm test` → PASS.

```bash
git add frontend/src/pages/RolePreviewPage
git commit -m "feat(fe): trang xem thử theo vai trò"
```

---

### Task 8: Chốt, kiểm tra cuối và tài liệu

**Files:**

- Create: `frontend/AGENTS.md` (chuyển từ `D:\mems-frontend\AGENTS.md`)
- Create: `frontend/README.md`
- Modify: `frontend/AGENTS.md` (sửa dòng mobile-first)

**Interfaces:**

- Consumes: mọi task trước
- Produces: không

- [ ] **Step 1: Chuyển `AGENTS.md` vào `frontend/` và sửa quyết định nền tảng**

Chép `D:\mems-frontend\AGENTS.md` → `frontend/AGENTS.md`; đường dẫn ADR ở dòng 4 sửa thành `../../Đồ án tốt nghiệp/Tài liệu liên quan dự án/Frontend_Stack_MEMS.md`. Đổi mục 2: bỏ _"Mobile-first. Kiểm thử tại 320 / 768 / 1024 / 1440 px."_, thay bằng _"Desktop-first (quyết định Sprint 1). Tối thiểu 1024px; không yêu cầu bố cục mobile."_ Thêm một dòng ghi chú ngay dưới: antd v6 đã ra nhưng repo bám **Ant Design 5** theo ADR-FE-002.

- [ ] **Step 2: Viết `frontend/README.md`**

Cách chạy (`npm install`, `npm run dev`, `npm test`), và một câu nêu rõ: **giai đoạn này chưa nối backend**, 4 nút tác nhân chỉ là điều hướng tạm.

- [ ] **Step 3: Kiểm tra tự động toàn bộ**

Run: `npm run lint` → 0 lỗi (đặc biệt không có cảnh báo `jsx-a11y`).
Run: `npm test` → tất cả PASS.
Run: `npm run build` → thành công.

- [ ] **Step 4: Kiểm tra bằng mắt ở các bề rộng**

Run: `npm run dev`. Với mỗi đường dẫn `/dang-nhap`, `/dang-ky`, `/xem-thu/teacher`, `/xem-thu/sai-ten`, ở các bề rộng **1024px, 1280px, 1440px, 1920px**:

- thẻ nằm giữa, không tràn, **không có thanh cuộn ngang** (Review Focus #5)
- tiếng Việt hiển thị đúng dấu
- Tab tới từng nút bằng bàn phím: viền focus nhìn thấy rõ
- Bấm tab Đăng ký → Back → về Đăng nhập (Review Focus #4)

- [ ] **Step 5: Commit và push nhánh**

```bash
git add frontend
git commit -m "docs(fe): README, AGENTS.md và chốt Sprint 1"
git push -u origin nghia/fe-sprint1
```

_(Push cần danh tính git và quyền trên repo của Sang — nếu chưa có, dừng ở commit.)_

---

## Ghi chú về thứ tự thực thi

Task 1 và 2 dựng hạ tầng; Task 3–7 độc lập tương đối với nhau sau khi Task 3 xong (Task 5, 7 phụ thuộc Task 3; Task 5, 6 phụ thuộc Task 4). Nếu chạy song song, chỉ được song song **sau** khi Task 3 và 4 đã commit.
