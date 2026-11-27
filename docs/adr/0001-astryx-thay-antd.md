# ADR-0001 — Thay Ant Design 5 bằng Astryx, bỏ React Hook Form/Zod

- **Ngày:** 14/11/2026 (verify lại 26/11/2026)
- **Trạng thái:** Accepted

## Bối cảnh

FE khởi đầu dùng Ant Design 5 + React Hook Form + Zod, tự dựng theme (`ConfigProvider`,
`themeToken`, patch React 19). Khi cần đồng bộ với hệ thống thiết kế chung, mình phải chọn:
giữ AntD và tự dựng lại thang chữ/radius/spacing, hay dùng thư viện đã có token sẵn.

## Quyết định

- Dùng **`@astryxdesign/core` 0.7.16** làm nguồn component duy nhất.
- Token lấy từ thư viện, chỉ `src/theme.ts` + CSS vars (`astryx-theme.ts`) được chứa giá trị thô.
- Form dùng hook nội bộ `src/hooks/useFormState.ts` — **không** React Hook Form/Zod.
- Locale `vi-VN`. E2E bám role/`aria-label`, không bám class `.ant-*`.

## Phương án bị bỏ

| Phương án | Lý do bỏ |
|---|---|
| Giữ AntD +override token | Mỗi component phải ghi đè → fork thư viện, dễ lệch |
| Chạy cả hai cùng lúc | CSS layer xung đột; antd thắng ở selector trùng, dễ lỗi khó tìm |

## Hệ quả

- `frontend/src` hiện **0 import `from 'antd'`**; `package.json` sạch (lockfile vẫn vài chuỗi
  `antd` do máy không có npm để regenerate — không xoá lockfile).
- Live-region `role="status"`/`role="alert"` đi kèm toast là thiết kế a11y đúng, **giữ lại**;
  E2E scope theo `region "Notifications"` / `.astryx-field-status`, không dùng `.first()` ẩu.
- plan/spec thời AntD trở thành tài liệu lịch sử, đã gắn banner snapshot.
- Chi tiết thực thi: `../ui-conventions.md` (bỏ qua mục 13 cũ).
