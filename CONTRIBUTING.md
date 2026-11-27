# Đóng góp vào MEMS — quy ước làm việc

> File mới, soạn 26/11/2026 để thay dần `PROJECT_CONTEXT.md` (bản onboarding cũ, đã gắn
> nhãn snapshot). Đây là quy ước **hiện tại**; trạng thái dự án xem `docs/STATUS.md`
> *(sẽ đổi tên từ `docs/trang-thai-hien-tai-2026-11-26.md` ở bước dọn tiếp theo)*.

## 1. Nguyên tắc chung

- **Không commit / push / merge / rebase / reset / clean** khi chưa được yêu cầu rõ.
  Working copy hiện có nhiều file sửa chưa commit — coi như dữ liệu cần giữ.
- Thay đổi nhỏ, đúng chỗ. Không sửa code để làm test xanh nếu test đang sai locator.
- Mỗi task kết thúc bằng: nêu **mục tiêu**, **file đã đụng**, **cách verify**, **rủi ro**.

## 2. Toolchain trên máy này

| Việc | Cách |
|---|---|
| `npm` / `npx` | **Không có trong PATH** |
| Node | `D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe` |
| entry point | gọi trực tiếp file trong `frontend/node_modules/.../cli.js` |
| Chromium | `channel: 'chromium'`, `PLAYWRIGHT_BROWSERS_PATH='D:\AI skill\SEO\ms-playwright'` |
| JDK / Maven | **Không có** → BE chưa compile/test được; đừng nói "BE đã build xong" |
| lockfile | `frontend/package-lock.json` chưa regenerate, vẫn vài chuỗi `antd` (package.json đã sạch) |

Ví dụ:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='D:\AI skill\SEO\ms-playwright'
& 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe' `
  'D:\Final_Project\frontend\node_modules\@playwright\test\cli.js' test
```

Chi tiết: `docs/e2e-run-2026-11-25.md` §3.1 (config tạm cần tạo lại, đã xoá sau khi chạy).

## 3. Frontend

- Stack: React 19 + TS + Vite + React Router + TanStack Query + Zustand + Axios +
  **Astryx `@astryxdesign/core` 0.7.16**. Không dùng Ant Design 5, Tailwind hay React
  Hook Form/Zod (`useFormState.ts`). Quyết định: `docs/adr/0001-...`.
- Token ở `frontend/src/theme.ts` + CSS vars; locale `vi-VN`; UI tiếng Việt, code tiếng Anh.
- Form: `src/hooks/useFormState.ts`. Server state = TanStack Query, client state = Zustand.
- A11y: WCAG 2.1 AA, 5 trạng thái (loading/empty/error/success/no-permission).
  **Giữ nguyên live-region** `role="status"`/`role="alert"` của Astryx — đó là thiết kế đúng.

## 4. E2E

- Test nằm ở `frontend/e2e/*.spec.ts`, mock API bằng `page.route`, không ghi dữ liệu thật.
- Khi dọn locator: scope bằng `getByRole('region', { name: 'Notifications' })`,
  `.astryx-field-status`, `getByRole('cell'|'link'|'button'|'alertdialog')` theo DOM thật.
  **Không dùng `.first()` ẩu để che lỗi app.**
- Đợt dọn 26/11 chỉ sửa file spec; full suite **125/125 pass, 0 flaky**. Không đổi
  `frontend/src`, build/lint/CI.
- Baseline: `tsc -b`, `eslint .`, `vitest run`. FE shell `/dao-tao/tu-dong-xep-lich`
  nằm ở worktree `...\fab303\auto-schedule-fe-shell`, chưa commit, submit vẫn disabled.

## 5. Backend & database

- Gateway `APIGateway/src/main/resources/application.yml` gồm route Identity
  (`/api/v1/**`) và People (`/departments`, `/positions`, `/permissions`, `/api/classes`,
  `/api/teachers`, `/api/specialties`). Quyết định prefix: `docs/adr/0002-...`.
- CORS đã có `CorsConfig` ở 4 service (`CORS_ALLOWED_ORIGINS`, mặc định `localhost:5173`).
- `docker-compose.yml` **chưa truyền `PEOPLE_SERVICE_URL`** — kiểm tra khi chạy Docker.
- Cài DB: `01`–`05` trước. **Không chạy `db.sql`**, không chạy lại `01`–`05` trên DB đã có data.
- ⛔ **Không chạy `07_people_department_access.sql`** — lỗi DDL
  `ERROR 1064 near 'position(id) ON DELETE CASCADE'`; đã revert, chỉ báo cáo, không tự sửa.

## 6. Tài liệu

- Nguồn chuẩn hiện tại: `docs/trang-thai-hien-tai-2026-11-26.md`.
- Quyết định: `docs/adr/`. Hướng dẫn sống: `docs/api.md`, `docs/ui-conventions.md`,
  `docs/scope-can-chot-xep-lich.md`.
- Doc cũ giữ lại kèm banner snapshot. Khi cần cập nhật, **sửa doc trong repo trước**, đồng bộ
  ra `D:\Đồ án tốt nghiệp` sau. Hồ sơ nộp (.docx, .xlsx, SRS, biên bản) để ngoài repo.
- P4 xếp lịch tự động vẫn **BLOCKED**; đọc `docs/scope-can-chot-xep-lich.md` trước khi code.
