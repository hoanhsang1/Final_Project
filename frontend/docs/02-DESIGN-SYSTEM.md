# MEMS FE v2 — Design System

Nguồn token duy nhất: [`src/styles/globals.css`](../src/styles/globals.css) (`@theme`).
Component: [`src/components/ui/`](../src/components/ui). Không hard-code mã màu trong trang.

## 1. Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `canvas` | `#F4F6F3` | nền ứng dụng (giấy ấm, không chói) |
| `surface` | `#FFFFFF` | card, bảng, dialog |
| `surface-muted` | `#FAFBF9` | header bảng, dải phụ |
| `line` / `line-strong` | `#E2E7E3` / `#CDD5D0` | viền thường / viền input |
| `ink-900…400` | `#131D1B` → `#808C88` | chữ chính → phụ |
| `jade-700` | `#135C55` | hành động chính, link, active nav |
| `jade-50/100` | `#ECF8F5` / `#D1EFE8` | nền nhấn, badge thương hiệu |
| `saffron-400/500` | `#E6A623` / `#C98A12` | cảnh báo, badge chờ duyệt, điểm nhấn |
| `success-500/50` | `#12805C` / `#EAFAF1` | đang hoạt động, đã duyệt |
| `warning-500/50` | `#B06F09` / `#FEF6E7` | chờ duyệt, tạm nghỉ |
| `danger-500/50` | `#B42318` / `#FEF2F1` | từ chối, xoá, lỗi |
| `info-500/50` | `#1F56C4` / `#EEF4FF` | thông tin, giáo viên |
| `sidebar` | `#0E1B1A` | chrome tối cố định |
| `sidebar-text` / `muted` | `#B8C7C2` / `#7D8F8A` | chữ trên nền tối |
| `sidebar-active` | `#7FE3D4` | icon/thanh active |

Tương phản: chữ chính trên nền trắng ≥ 12:1; `ink-500` trên canvas ≥ 4.5:1; trắng trên
`jade-700` ≥ 5.9:1; `ink-400` chỉ dùng cho chữ phụ không bắt buộc đọc.

## 2. Typography — Be Vietnam Pro

| Vai trò | Size / line-height | Ghi chú |
|---|---|---|
| `text-2xs` | 11 / 16 | nhãn cột, eyebrow, badge nhỏ |
| `text-xs` | 12 / 18 | metadata, trợ giúp |
| `text-sm` | 13 / 20 | mật độ bảng, nhãn form |
| `text-base` | 15 / 24 | thân văn bản |
| `text-lg` | 17 / 26 | tiêu đề card |
| `text-xl` | 20 / 28 | tiêu đề trang phụ |
| `text-2xl` | 24 / 32 | H1 trang |
| `text-3xl/4xl` | 30 / 38 | hero đăng nhập |

- Chữ số trong bảng/KPI dùng `.tabular` (tabular-nums).
- Tiêu đề `font-semibold`, tracking âm nhẹ (`-0.02em`), không dùng quá 3 cấp trong một màn.
- Font dự phòng: system-ui; tải từ Google Fonts, không chặn render.

## 3. Khoảng cách, bo góc, đổ bóng

- Spacing: thang 4px (Tailwind). Nhịp dọc trong trang: 20/24px; trong card: 16/20px.
- Radius: `xs 6` · `sm 8` · `md 10` (input/button) · `lg 14` (card) · `xl 18` (dialog) · `2xl 24`.
- Elevation: `xs` (input/button) → `sm` (card) → `md` (dropdown) → `lg` (dialog/drawer). Không
  dùng shadow lớn cho bảng.
- Layout: sidebar 264px (thu gọn 76px), topbar 64px, nội dung tối đa 1400px (bảng lớn 1600px).

## 4. Component inventory

| Nhóm | Component | Biến thể / trạng thái chính |
|---|---|---|
| Hành động | `Button` | primary, secondary, outline, ghost, subtle, danger, danger-ghost, link; sm/md/lg/icon; `isLoading`, `asChild` |
| Nhập liệu | `Input`, `Textarea`, `Field`, `Checkbox`, `Select`, `DatePicker`, `SearchInput` | lỗi qua `aria-invalid`, hint, required; Select của Radix (bàn phím đầy đủ) |
| Dữ liệu | `DataTable`, `Table`, `Pagination`, `TableToolbar` | sắp xếp, phân trang client/server, loading skeleton, empty, error, cột ẩn theo breakpoint |
| Lớp phủ | `Dialog`, `Drawer`, `ConfirmDialog`, `Popover`, `DropdownMenu` | focus trap của Radix, đóng bằng Esc, nút đóng có nhãn |
| Hiển thị | `Card`, `Badge`, `Avatar`, `StatCard`, `Skeleton`, `Spinner` | badge 8 tông + dot; KPI có sparkline tuỳ chọn (FE-00 không dùng dữ liệu bịa) |
| Phản hồi | `Alert`, `EmptyState`, `ErrorState`, `ForbiddenState`, `NotFoundState`, `Toaster` | phân biệt rõ 4xx/5xx/mất mạng/rỗng |
| Điều hướng | `Breadcrumb`, `Tabs`, sidebar, workspace switcher, command palette | `aria-current`, phím tắt ⌘K, tooltip khi thu gọn |
| Tiện ích | `Tooltip`, `InfoTip`, `Separator` (qua border) | |

## 5. Accessibility (WCAG 2.1 AA — các luồng chính)

- Mọi input có `<label>` liên kết (`htmlFor/id`), lỗi có `role="alert"` và `aria-invalid`.
- Focus-visible toàn cục 2px `jade-600`, offset 2px; không xoá outline.
- Skip link “Bỏ qua điều hướng” ở đầu shell.
- Icon-only button luôn có `aria-label`; icon trang trí `aria-hidden`.
- Dialog/Drawer dùng Radix (focus trap, trả focus, Esc); tiêu đề dialog luôn có `DialogTitle`
  (có thể `sr-only`).
- Bảng: `<th scope="col">`, `aria-sort`, hàng click được có `tabIndex` + Enter/Space.
- Màu không phải tín hiệu duy nhất: trạng thái luôn kèm nhãn chữ.
- Tôn trọng `prefers-reduced-motion` (animation gần như tắt).
- Vùng chạm tối thiểu 36–44px; bảng có cuộn ngang trên mobile thay vì ép cột.

## 6. Quy ước viết UI

1. Dùng token (`bg-surface`, `text-ink-700`), không dùng `#fff`, `gray-500`.
2. Trang = `PageContainer` + `PageHeader`; không tự đặt padding khác.
3. Bảng dữ liệu dùng `DataTable`, toolbar dùng `TableToolbar`; không viết `<table>` thủ công
   trừ bảng nhỏ trong dashboard.
4. Mọi trạng thái phải có: loading, empty, error; trạng thái không có quyền dùng `ForbiddenState`.
5. Hành động nguy hiểm phải qua `ConfirmDialog` và nêu hậu quả cụ thể.
6. Không hiển thị message tiếng Anh của backend; dùng `ApiError` + `translateError`.
