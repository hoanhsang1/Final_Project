# MEMS — Frontend

Phần giao diện của **MEMS** (Hệ thống Quản lý Giáo dục theo Module).

> Hướng dẫn đầy đủ để dựng cả hệ thống (database, backend, frontend) nằm ở
> [`../README.md`](../README.md). File này chỉ nói về phần frontend.

## Công nghệ

React 19 · TypeScript · Vite · React Router · TanStack Query (dữ liệu từ server) ·
Zustand (trạng thái phía trình duyệt) · Axios · Ant Design 5 · React Hook Form + Zod ·
dayjs · Recharts · Vitest + React Testing Library · Playwright · ESLint + Prettier.

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5173

⚠️ Gõ đúng `localhost:5173`, **đừng** dùng `127.0.0.1:5173` — Vite lắng nghe trên IPv6.

Frontend cần backend đang chạy. Nếu chưa, xem [`../README.md`](../README.md) mục 6.

## Lệnh

| Lệnh | Việc nó làm |
|---|---|
| `npm run dev` | Dev server, tự cập nhật khi sửa code |
| `npm run build` | Kiểm tra type rồi build production |
| `npm test` | Chạy toàn bộ unit test |
| `npm run test:watch` | Chạy test ở chế độ theo dõi |
| `npm run test:e2e` | Chạy test e2e (Playwright) — tự build rồi bật preview server ở cổng 4173 |
| `npm run test:e2e:ui` | Mở Playwright UI để xem từng ca e2e chạy thế nào |
| `npm run lint` | Kiểm tra ESLint |
| `npm run format` | Định dạng code bằng Prettier |
| `npm run preview` | Xem thử bản đã build |

## Cấu trúc

```
src/
├── pages/          # Mỗi trang một thư mục (kèm test ngay cạnh)
├── components/     # Component dùng chung
├── features/auth/  # Gọi API, kiểu dữ liệu, ánh xạ vai trò
├── features/modules/ # Danh mục module (lấy từ GET /api/v1/modules, dùng chung)
├── features/admin/ # Gọi API + câu chữ cho console quản trị
├── stores/         # Zustand — chỉ giữ trạng thái phía trình duyệt
├── lib/api.ts      # Axios + interceptor gắn token, tự refresh khi gặp 401
├── theme.ts        # Token của Ant Design
└── router.tsx
e2e/                # Test e2e Playwright cho console quản trị
```

## Quên / đặt lại mật khẩu

| Đường dẫn | Màn | Ai được vào |
|---|---|---|
| `/quen-mat-khau` | Nhập email → gửi liên kết đặt lại | Công khai |
| `/dat-lai-mat-khau?token=…` | Đặt mật khẩu mới bằng token trong email | Công khai (cần token) |

- Thông báo sau khi gửi là **trung tính** ("Nếu email đã đăng ký…") để không ai dùng màn này
  dò email nào có trong hệ thống.
- BE chưa có `D-32`/`D-33` (`docs/api.md`) → bấm gửi hiện *"chức năng chưa sẵn sàng"*,
  **không** giả thành công (`NFR-REL-001`).

## Console quản trị (Sprint 2)

| Đường dẫn | Màn | Ai được vào |
|---|---|---|
| `/quan-tri` | Tổng quan (số liệu chờ duyệt + danh mục module) | `SUPER_ADMIN` |
| `/quan-tri/to-chuc` | Danh sách tổ chức chờ duyệt | `SUPER_ADMIN` |
| `/quan-tri/to-chuc/:id` | Chi tiết tổ chức + duyệt/từ chối + cấu hình module + vô hiệu hoá | `SUPER_ADMIN` |
| `/quan-tri/to-chuc/tat-ca` | Tất cả tổ chức (bộ lọc theo trạng thái/loại/từ khoá) | `SUPER_ADMIN` |
| `/quan-tri/to-chuc/:id/lich-su` | Lịch sử duyệt của 1 tổ chức | `SUPER_ADMIN` |
| `/quan-tri/module` | Danh mục module (lõi / mở rộng) | `SUPER_ADMIN` |
| `/quan-tri/tai-khoan` | Quản lý tài khoản | `SUPER_ADMIN` |
| `/quan-tri/tai-khoan/:id` | Chi tiết tài khoản + đổi trạng thái + nhật ký | `SUPER_ADMIN` |
| `/quan-tri/nhat-ky` | Nhật ký hệ thống (audit log) | `SUPER_ADMIN` |

- Khung console: **Sider ≥1024px**, **Drawer + nút hamburger <1024px** (menu dùng chung
  component `ConsoleMenu`). Chi tiết: đặc tả *Sprint 2 — Mở rộng console* §5.2.
- Bộ lọc và trang của màn "Tất cả tổ chức" / "Tài khoản" / "Nhật ký" lưu **trong URL**
  (`?status=`, `?page=`, `?q=`) → deep-link được, quay lại giữ nguyên bộ lọc.
- `AdminGuard` chặn route: chưa đăng nhập → `/dang-nhap`; sai vai trò → màn 403 tại chỗ.
  **Ẩn UI không phải bảo mật** — backend vẫn phải chặn (`SUPER_ADMIN` trên các endpoint quản trị).
- Đăng nhập bằng `SUPER_ADMIN` sẽ vào thẳng **Tổng quan** `/quan-tri`. Tài khoản nhiều role thì
  lấy role quyền cao nhất, không phụ thuộc thứ tự role trong JWT.
- E2E của các màn mới chạy được **không cần backend** (mock trong `e2e/helpers.ts`), vì
  `GET /organizations`, `/audit-logs`, `/accounts`… (`D-20`–`D-28`) chưa có ở BE.

## Gọi backend

`vite.config.ts` chuyển tiếp mọi request `/api/...` sang gateway ở cổng 8080:

```ts
server: { proxy: { '/api': 'http://127.0.0.1:8080' } }
```

Backend **chưa** cấu hình CORS, nên **không** gọi thẳng `http://localhost:8080` từ
trình duyệt — phải đi qua proxy này.

## Quy ước khi viết code

- Một component một thư mục: `Component.tsx`, `Component.test.tsx`, `use-component.ts`, `types.ts`.
- Tách **container** (gọi API, xử lý loading/error) khỏi **presentation** (chỉ nhận props).
- Đủ **5 trạng thái** khi áp dụng được: loading, empty, error, success, no-permission.
- Chỉ dùng **Ant Design 5**. Không dùng Tailwind hay CSS framework khác.
- Mọi màu/khoảng cách/bo góc đi qua **token** của `ConfigProvider` — không hardcode hex hay px.
- Locale **`vi_VN`** cho Ant Design. Chữ trên giao diện viết **tiếng Việt**; code đặt tên **tiếng Anh**.
- **Server state = TanStack Query**, **client state = Zustand**. Không nhét dữ liệu server vào store.
- Lỗi từ backend là tiếng Anh → dịch ở `features/auth/authApi.ts`, không hiện thẳng cho người dùng.
- Không dùng `dangerouslySetInnerHTML`. Buộc render HTML do người dùng nhập thì phải sanitize.
- Mục tiêu **WCAG 2.1 AA**: nút chỉ có icon phải có `aria-label`, trạng thái không chỉ thể hiện bằng màu.

## Kiểm thử

```bash
npm test        # unit test (Vitest + React Testing Library)
npm run test:e2e  # e2e (Playwright)
```

Test phải bao phủ cả nhánh **error / empty / no-permission**, không chỉ đường thành công.

### E2E dùng API giả

Các ca e2e của console quản trị chạy trên **API giả** (`page.route` trong `e2e/helpers.ts`)
vì backend chưa sẵn sàng (`PUT /organizations/{id}/modules` chưa có; `reject` chưa nhận body
`reason`). Contract của API giả bám đúng code backend thật, nên khi backend xong chỉ cần
bỏ đi phần chặn route là chạy được ngay trên backend thật.

E2E chạy trên **bản build** (`npm run build` + `vite preview` ở cổng 4173), không phải dev
server — dev server phải transform hàng trăm module nên nhiều worker chạy song song hay
gặp ca đỏ giả do hết thời gian.
