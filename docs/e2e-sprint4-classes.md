> ⚠️ **Cập nhật 2026-11-26:** một số mục bên dưới là snapshot cũ; đọc cùng `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md` để có trạng thái hiện tại.

# E2E mock slice Lớp/Giáo viên (Sprint 4)

> Nhánh `chore/sync-main-class-flow`. Mục tiêu: kiểm hành vi FE Astryx theo
> contract `frontend/src/features/sprint4/sprint4Api.ts` mà **không gọi BE thật**.

## 1. File mới

| File | Vai trò |
|---|---|
| `frontend/e2e/sprint4Helpers.ts` | JWT giả (`userId`/`roles`/`permissions`), fixture lớp/GV, `page.route` cho `/api/classes`, `/api/teachers`, `/positions`, `/departments`, `/api/specialties`. Mock mutate state để refetch trả bản ghi mới nhất. |
| `frontend/e2e/sprint4-classes.spec.ts` | 24 ca (`CL-01…CL-24`) cho danh sách, chi tiết, gán GV, huỷ/đóng/duyệt/từ chối/mở lại, xung đột 409. |

`helpers.ts` của Admin Sprint 2 **không dùng được** cho slice này: nó chỉ route
`**/api/v1/**`, trong khi Sprint 4 dùng `/api/...` và `/positions`, `/departments`.
Không đổi file helper cũ, không đổi source `frontend/src`, không thêm dependency.

## 2. Kết quả chạy (2026-11-25)

- Toolchain tạm thời như `docs/e2e-run-2026-11-25.md`: `node.exe` đi kèm Playwright
  Python, Chromium `channel: 'chromium'`, `vite preview` riêng ở `127.0.0.1:4173`,
  config tạm bỏ `webServer` (đã xoá sau khi chạy).
- `tsc -b --pretty false`: EXIT 0. `eslint e2e/sprint4Helpers.ts e2e/sprint4-classes.spec.ts`: EXIT 0.
- `playwright test sprint4-classes`: **24 passed / 0 failed**.

### Phạm vi đã phủ

- Danh sách: 5 state (success/empty/error/forbidden/loading gián tiếp), tổng số lấy
  từ `total` BE, lọc `q` + `status`, phân trang gửi `page`/`size`.
- BR-08: badge trạng thái và trạng thái đóng đều có **chữ**, không chỉ màu.
- Chi tiết: metadata, chuẩn hoá `changedAt`/`changedBy` → `at`/`actorId` của cả 2 tab,
  state 404/403/500 riêng cho trang và cho tab.
- Gán GV: chỉ `DANG_DAY`, tìm theo `q`, PUT kèm `version`; 409 `DATA_CHANGED` →
  báo "tải lại", đóng modal, refetch (NFR-REL-001: không báo thành công).
- Huỷ / yêu cầu đóng / duyệt / từ chối / mở lại: payload đúng contract, validation
  lý do bắt buộc, luật "không tự duyệt yêu cầu của mình", 409 `CLOSE_STATE_CHANGED`.
- §9 phân quyền: JWT chỉ có `CLASS_VIEW` → xem được nhưng không có nút thao tác;
  user không có quyền nào → guard chặn, **không gọi** `/api/classes`.

## 3. Phát hiện trong lúc chạy (không sửa source FE)

1. **Astryx "nhân đôi" thông báo** *(đã làm rõ 26/11 — không phải lỗi app)*: cùng một chuỗi xuất hiện trong component thật
   và trong `role="status" aria-live="polite"` / modal live-region. Các assert đã
   scope bằng `getByRole('heading'|'definition')`, `getByRole('dialog')` hoặc `.first()`.
   Đây cũng là nguyên nhân chính của 38 ca cũ fail trong
   `docs/e2e-run-2026-11-25.md`. **Đã verify 26/11:** đây là thiết kế a11y đúng
   (BR-08/WCAG 2.1 AA), live-region được giữ nguyên; test đã scope lại (region
   `Notifications` / `.astryx-field-status`), **không dùng `.first()` ẩu**. Đợt dọn
   locator-only xong, full suite **125/125 pass**.
2. **Menu bị banner chắn pointer**: ở lớp `closeState = CLOSED`, banner "Lớp đã đóng"
   nằm chồng lên `menuitem "Mở lại lớp"`; `locator.click()` bị chặn bởi banner.
   Test dùng `press('Enter')` trên menuitem để vẫn kiểm được hành động bàn phím.
   **Cần xác minh** với designer/thư viện Astryx: đây là lỗi z-index/overlay của
   `DropdownMenu` hay bố cục banner, và có cần sửa theme không. Không tự đổi source.
3. **Mã quyền**: mock dùng `CLASS_*`/`PEOPLE_*` theo FE; BE `origin/main` dùng
   `employee.view`/`class.view` granular. Xem
   `docs/sync-permission-code-conflict.md` — **Cần xác minh** trước khi nối BE thật.
4. Mock chỉ chứng minh FE xử lý đúng contract giả định. Không thay thế được
   integration test với BE khi có JDK; xếp lịch tự động vẫn BLOCKED theo
   `docs/scope-can-chot-xep-lich.md`.
