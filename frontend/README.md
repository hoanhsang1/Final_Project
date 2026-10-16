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
| `npm run lint` | Kiểm tra ESLint |
| `npm run format` | Định dạng code bằng Prettier |
| `npm run preview` | Xem thử bản đã build |

## Cấu trúc

```
src/
├── pages/          # Mỗi trang một thư mục (kèm test ngay cạnh)
├── components/     # Component dùng chung
├── features/auth/  # Gọi API, kiểu dữ liệu, ánh xạ vai trò
├── stores/         # Zustand — chỉ giữ trạng thái phía trình duyệt
├── lib/api.ts      # Axios + interceptor gắn token, tự refresh khi gặp 401
├── theme.ts        # Token của Ant Design
└── router.tsx
```

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
npm test
```

Test phải bao phủ cả nhánh **error / empty / no-permission**, không chỉ đường thành công.
