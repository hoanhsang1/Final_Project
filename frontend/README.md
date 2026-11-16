# MEMS Frontend v2 — FE-00

Frontend mới của **MEMS (Modular Education Management System)**, xây dựng lại từ đầu trong
`frontend-v2/`. Frontend cũ trong `frontend/` **không bị sửa và không bị xoá**.

> Trạng thái: **FE-00 — nền tảng + 4 màn hình mẫu**. Chưa phải bản tích hợp toàn bộ backend.
> Xem [báo cáo FE-00](docs/01-FE00-REPORT.md) và [ma trận tích hợp](docs/04-INTEGRATION-MATRIX.md).

## Chạy nhanh

```bash
cd frontend-v2
npm install
npm run dev          # http://localhost:5174
```

Mặc định chạy ở **chế độ dữ liệu demo** (`VITE_DATA_SOURCE=mock`): toàn bộ dữ liệu nằm trong
`src/services/mock/`, không gọi backend. Giao diện hiển thị rõ “Dữ liệu demo · chưa nối API”.

### Kết nối backend thật

1. Chạy backend (docker-compose hoặc 4 service + API Gateway ở `:8080`).
2. Tạo `.env.local`:

```bash
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://localhost:8080
VITE_ENABLE_DEMO_TOOLBAR=false
```

3. `npm run dev`. Vite proxy `/api`, `/departments`, `/positions`, `/students`, `/classes`,
   `/teachers`, `/specialties`, `/transfer-requests`, `/notifications` sang gateway (backend
   không bật CORS nên bắt buộc đi qua proxy).

## Tài khoản demo

| Tài khoản | Mật khẩu | Vai trò | Ghi chú |
|---|---|---|---|
| `platform_admin` | `123456` | SUPER_ADMIN | Duyệt tổ chức, nhật ký hệ thống |
| `sample_owner` | `Sample@123456` | OWNER | Toàn quyền tổ chức mẫu |
| `sample_hr` | `Sample@123456` | MANAGER + chức vụ HR | Vào tổng quan tổ chức |
| `sample_academic` | `Sample@123456` | STAFF + Giáo vụ | |
| `sample_teacher` | `Sample@123456` | STAFF + Giáo viên | |
| `sample_head` | `Sample@123456` | STAFF + Trưởng phòng | |
| `csvc_lam` | `Sample@123456` | STAFF + CSVC | Còn mật khẩu tạm, bị buộc đổi |

Biểu tượng bình thí nghiệm trên topbar (chỉ hiện ở chế độ mock) cho phép đổi nhanh vai trò demo.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | Dev server cổng 5174 |
| `npm run build` | `tsc -b` + build production |
| `npm run preview` | Xem bản build |
| `npm run lint` | ESLint (0 error; cảnh báo `set-state-in-effect` có chủ đích) |
| `npm test` | Vitest + Testing Library (45 test) |
| `npm run format` | Prettier |

## Cấu trúc

```
src/
  app/            # App, providers, error boundary, test luồng
  layouts/        # AppShell, sidebar, topbar, auth layout, command palette
  routes/         # guards, planned page, 404
  features/
    auth/         # đăng nhập, đổi mật khẩu, hồ sơ
    platform/     # tổ chức, danh mục module, nhật ký (SUPER_ADMIN)
    organization/ # phòng ban, nhân sự, chức vụ, điều chuyển, dashboard
  components/ui/  # Design System (button, table, dialog, drawer…)
  services/       # http client + mock adapter (tách khỏi code production)
  stores/         # session (token) + UI state
  hooks/          # breadcrumb, debounce, badge điều hướng
  lib/            # jwt, quyền, điều hướng, format, lỗi
  styles/         # design tokens + base CSS
  tests/          # setup
```

## Nguyên tắc đã áp dụng

- Menu và nút bấm lọc theo **quyền hiệu lực** (permission), không theo role cứng. OWNER được
  backend bypass nhưng FE vẫn lấy quyền từ JWT; `MANAGER`/`STAFF` không tự có quyền gì.
- Backend luôn là nơi kiểm tra quyền thật; FE chỉ ẩn/hiện.
- Không dùng endpoint không tồn tại. Màn hình chưa làm được đánh dấu **PLANNED** và route giữ chỗ.
- Mock tách biệt hoàn toàn: chỉ nạp động khi `VITE_DATA_SOURCE=mock`; bản build API không tải dữ liệu demo.
- Mọi thông báo lỗi backend (tiếng Anh) được dịch theo `code`, không hiển thị nguyên văn.

## Tài liệu

- [Báo cáo FE-00 (deliverables 1–11)](docs/01-FE00-REPORT.md)
- [Design System](docs/02-DESIGN-SYSTEM.md)
- [Sitemap & điều hướng theo quyền](docs/03-SITEMAP.md)
- [Ma trận tích hợp FE–BE](docs/04-INTEGRATION-MATRIX.md)
- Ảnh giao diện: `docs/screenshots/`

## Giới hạn đã biết (chi tiết ở báo cáo)

- Backend **chưa có** `GET /me`: hồ sơ đọc từ JWT; JWT không có họ tên/email/tên tổ chức/module.
- `MemberResponse` không có họ tên/email → FE tải thêm chi tiết cho tối đa 30 người (xem
  `ENRICH_LIMIT`), chờ backend bổ sung trường.
- Chức vụ, điều chuyển, ủy quyền, đào tạo, lịch, CSVC, thông báo là **PLANNED** — đã có sitemap,
  quyền và API dự kiến, chưa có giao diện hoạt động.
- Module đang bật: OWNER nạp từ `GET /api/v1/organizations/my/modules` sau đăng nhập nên menu ẩn
  module đã tắt. MANAGER/STAFF/giáo viên/sinh viên chưa có nguồn module (JWT không có claim) nên
  menu chỉ lọc theo quyền; backend vẫn chặn bằng `MODULE_NOT_ENABLED`.
