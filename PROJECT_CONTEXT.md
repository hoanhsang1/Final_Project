# MEMS — Ngữ cảnh toàn bộ đồ án (từ đầu đến hiện tại)

> **Mục đích file:** Tổng hợp ngữ cảnh dự án MEMS để onboard nhanh (cho bạn, teammate, hoặc AI như Cursor/OpenCode).  
> **Nguồn tham chiếu:** `README.md`, `docs/api.md`, `frontend/package.json`, git history/branches tại `D:\Final_Project`, `AGENTS.md` (workspace MEMS FE), và ngữ cảnh trao đổi gần đây.  
> **Cập nhật:** 2026-11-05 (draft). Hãy chỉnh sửa phần “Cần xác nhận” bên dưới cho đúng thực tế.

---

## 0) Phạm vi thông tin

- **Xác nhận từ Nghĩa (2026-11-05):** Ngoài repo và ngữ cảnh trao đổi, nhóm chưa có metadata chính thức (tên đồ án đầy đủ, GVHD, timeline, phạm vi in/out, SRS/ADR ngoài repo, môi trường demo, quy ước merge chi tiết).
- **Phân vai (Nghĩa xác nhận 2026-11-05):** Nghĩa — Frontend. Sang — Backend. Bảo — BA. Vy — QA. Người đang làm việc với Cursor trong workspace này là Nghĩa. Khi thiếu thông tin hoặc chưa chắc, hỏi Nghĩa trước khi suy đoán.
- File này chỉ tổng hợp những gì **đã biết/quan sát được**. Khi có thông tin mới, cập nhật trực tiếp vào các mục bên dưới.

---

## 1) Tổng quan dự án

**MEMS — Hệ thống Quản lý Giáo dục theo Module** là nền tảng quản lý giáo dục **đa tổ chức** (multi-tenant): nhiều trường/trung tâm dùng chung hệ thống, mỗi tổ chức bật/tắt module theo nhu cầu (quản lý con người, thời khóa biểu, phòng học & thiết bị…).

**Nhóm người dùng chính (theo README):**
- **Admin hệ thống (SUPER_ADMIN):** duyệt tổ chức, quản trị nền tảng.
- **Cán bộ quản lý / Owner tổ chức (ORG/OWNER…):** quản lý trong phạm vi tổ chức (giáo vụ, cấu hình/phân quyền theo tổ chức).
- **Giáo viên:** xem lịch dạy, báo sự cố thiết bị (phạm vi theo thiết kế).
- **Sinh viên:** xem thời khóa biểu (phạm vi theo thiết kế).

> Lưu ý: tên role/code chi tiết cần đối chiếu SRS/BE (README ghi `SUPER_ADMIN`, `ORG_ADMIN`, `FACILITY_STAFF` ở phần hạn chế; codebase FE có luồng Owner Console). **Ưu tiên BE contract + SRS làm nguồn sự thật.**

---

## 2) Kiến trúc & công nghệ

### 2.1 Kiến trúc tổng thể (local dev)
```text
Browser (localhost:5173)
        │  /api/...
        ▼
   Vite dev server  --proxy-->  API Gateway (:8080)
                                      │
                                      ▼
                            IdentityService (:8081)  (+ các service khác theo sprint)
                                      │
                                      ▼
                                MySQL (:3306)
```

- FE gọi `/api/...` qua Vite proxy → Gateway → service. Tránh CORS trong dev (BE chưa cấu hình CORS đầy đủ cho tách domain).
- **Đừng dùng** `127.0.0.1:5173` nếu gặp vấn đề (Vite có thể bind IPv6) — dùng `http://localhost:5173`.

### 2.2 Backend (theo README/docs)
- Microservices: **IdentityService (8081)**, **APIGateway (8080)**, **EurekaServer (8761)**, PeopleService (8082), ScheduleService (8083), FacilityService (8084) — mức độ nối gateway/hoàn thiện khác nhau theo sprint.
- MySQL 8.0.16+ (schema dùng `DEFAULT (UUID())`). DB/schema qua SQL files ở root (không Flyway/Liquibase theo README).
- Auth: JWT access token (Bearer) + refresh token (rotate). Chi tiết xem `docs/api.md`.

### 2.3 Frontend (đã chốt — không tự thay)
- **Stack:** TypeScript, Vite, React, React Router
- **Server state:** TanStack Query
- **Client state:** Zustand (chỉ: phiên đăng nhập, role, module đang bật)
- **HTTP:** Axios (interceptor JWT; 401 → refresh → retry; refresh fail → xóa token + về `/dang-nhap`)
- **UI:** **Ant Design 5** — **KHÔNG Tailwind/CSS framework khác**
- **Form:** React Hook Form + Zod
- **Khác:** dayjs (`Asia/Ho_Chi_Minh`), Recharts
- **Test:** Vitest + React Testing Library, Playwright
- **Chất lượng:** ESLint + Prettier + `eslint-plugin-jsx-a11y`

**Ràng buộc UI quan trọng (AGENTS.md):**
- Mọi style qua **token `ConfigProvider`**; không hardcode hex/px rải rác.
- Locale **`vi_VN`**.
- **5 trạng thái** khi áp dụng: loading, empty, error, success, no-permission.
- **BR-04:** UI dùng “**Vô hiệu hoá**”, không dùng “Xoá”.
- **BR-08:** không dùng màu làm tín hiệu duy nhất (cần nhãn chữ/icon).
- **NFR-REL-001:** lỗi/timeout kiểm tra xung đột → **không hiện thành công**; hiện “không lưu được, thử lại”.
- A11y mục tiêu **WCAG 2.1 AA**.
- **Không `dangerouslySetInnerHTML`**; sanitize HTML người dùng nhập nếu buộc phải render.
- **DTO không bịa:** bám OpenAPI/BE contract (hiện có thể còn viết tay do BE chưa phát OpenAPI đầy đủ — cần cẩn thận khi BE đổi).

---

## 3) Repo, cấu trúc & lệnh thường dùng

**Repo (git):** `https://github.com/hoanhsang1/Final_Project.git` (local: `D:\Final_Project`)

**Cấu trúc chính:**
- `backend/` — services + gateway + eureka
- `frontend/` — React app (`src/pages`, `src/features`, `src/components`, `src/stores`, `src/lib/api.ts`, `src/router.tsx`)
- `docs/` — tài liệu backend/API (vd: `docs/api.md`)
- `01_identity_db.sql` … `05_seed_admin.sql`, `docker-compose.yml`, `.env.example`

**Frontend commands (trong `frontend/`):**
```bash
npm install
npm run dev
npm run build          # tsc -b && vite build
npm run lint
npm test               # vitest run
npm run test:watch
npm run test:e2e       # playwright
npm run test:e2e:ui
npm run format
```

**Backend native (đã kiểm chứng theo README):** build jar IdentityService + APIGateway, set env (`DB_*`, `JWT_SECRET_BASE64`, `EUREKA_CLIENT_ENABLED=false`, `IDENTITY_SERVICE_URL=...`), chạy từng service. Cần MySQL đã nạp SQL đúng thứ tự.

---

## 4) Tiến trình theo sprint (tóm tắt từ README + git + ngữ cảnh)

> Chi tiết sprint/spec nằm trong tài liệu dự án ngoài repo và/hoặc `frontend/docs/superpowers/plans/`. Phần dưới là tóm tắt suy luận từ repo.

### Sprint 1 (nền tảng đăng nhập)
- Đăng nhập nối backend thật.
- Trang đăng ký mới là UI (BE chưa có endpoint đăng ký theo README).
- Chưa có trang chủ đầy đủ theo vai trò; sau login có thể vào trang tạm `/xem-thu/<vai-tro>`.
- Luồng quên/đặt lại mật khẩu (FE) có nhắc đến trong git history; cần đối chiếu trạng thái BE (D-32/D-33 theo commit message).

### Sprint 2 (Admin console / quản trị)
- `SUPER_ADMIN` có console `/quan-tri/...` (tổng quan, tổ chức chờ duyệt, danh sách/tất cả tổ chức, chi tiết, module, tài khoản, nhật ký — theo router hiện tại).
- Hạn chế đã biết (README): BE chưa lưu lý do từ chối đầy đủ (D-05), chưa có endpoint cấu hình module PUT (D-16), danh mục module thiếu/thiếu `is_core` (D-15), DTO FE có thể lệch do chưa có OpenAPI phát hành.

### Sprint 3 (Owner Console / quản lý trong tổ chức) — **đang hoàn thiện/merge**
- Nhánh: `nghia/fe-owner-console` (remote có `origin/nghia/fe-owner-console`).
- Commit gần: `feat: owner console - quan ly phong ban, chuc vu, nhan vien`.
- FE đã triển khai (theo ngữ cảnh làm việc gần đây): routes `/to-chuc` với `OwnerGuard` + `OwnerConsoleLayout`, `DepartmentsPage`, `DepartmentDetailPage`, `PositionsPage`, các modal (form phòng ban/chức vụ/nhân viên, gán chức vụ, mật khẩu tạm), `features/owner/*` API layer.
- Kiểm tra đã chạy (theo ngữ cảnh): **117/117 unit tests pass**, `tsc -b` OK, `npm run build` OK.
- BE Sprint 3 (Department/Position/Member) được xác nhận có trên `origin/main` (controller/gateway routes) — cần test tích hợp khi chạy BE.
- **PR:** `https://github.com/hoanhsang1/Final_Project/pull/new/nghia/fe-owner-console` (đợi Sang review/merge theo quy ước nhóm — **không tự merge**).

---

## 5) Trạng thái hiện tại (snapshot)

- **Đang làm gần đây:** Owner Console FE + kiểm tra tương thích BE contract; review thiết kế Stitch (AI-gen, **không phải nguồn sự thật**).
- **Sẵn sàng:** Owner Console FE (unit/type/build) — chờ review/merge + integration test với BE.
- **Blocker phổ biến:** test end-to-end local cần BE + MySQL + JDK/Maven; đôi khi chỉ có FE dev server (`npm run dev` tại `frontend/`, port 5173).
- **Thiết kế Stitch:** có thể dùng tham khảo ý tưởng layout, nhưng **phải** chuyển sang Ant Design + token + đúng nghiệp vụ/API; không copy Tailwind.

---

## 6) Quy ước làm việc & rủi ro cần nhớ

- **Nguồn sự thật:** BE contract (`origin/main`/API thật), SRS/ADR, `AGENTS.md`. Không suy đoán field/endpoint.
- **Không commit/branch/push/merge** nếu chưa được yêu cầu rõ (đặc biệt PR Owner Console: Sang merge).
- **Bảo mật:** không commit `.env`, không lộ JWT secret/mật khẩu; repo công khai.
- **Khi sửa code:** ưu tiên thay đổi nhỏ, đúng chỗ; chạy verify phù hợp (test/lint/build).
- **PowerShell:** dùng `curl.exe` thay vì `curl` alias khi cần; truyền JSON phức tạp nên dùng file `--data-binary @file.json`.

---

## 7) Cursor — Setup & cách dùng cho đồ án này

### 7.1 Setup đã chuẩn bị trong repo
Đã tạo rule cho Cursor (áp dụng tự động):
- `D:\Final_Project\frontend\.cursor\rules\mems-frontend.mdc`
- `D:\mems-frontend\.cursor\rules\mems-frontend.mdc`

Nội dung rule bao gồm: stack cố định, AntD-only + tokens, TanStack Query/Zustand, Axios auth flow, RBAC, 5 trạng thái UI, `vi_VN`, a11y, bảo mật, test, và các mã ràng buộc (BR-04/08, NFR-REL-001).

### 7.2 Checklist khi mở Cursor
1. `File > Open Folder` → mở `D:\Final_Project\frontend` (để Cursor index đúng app FE).
2. Kiểm tra `Cursor Settings > Rules` thấy rule MEMS.
3. Bật codebase indexing nếu được hỏi.
4. Cài extensions hữu ích (gợi ý): ESLint, Prettier, EditorConfig (nếu có).
5. Đảm bảo dùng Node version phù hợp (`node -v`, khuyến nghị theo dự án).
6. Trước task lớn: yêu cầu Cursor “đọc `AGENTS.md` + file liên quan + tóm tắt plan trước khi sửa”.

### 7.3 Cách prompt hiệu quả trong Cursor (ngắn gọn)
- Luôn nêu: **mục tiêu**, **file/màn hình**, **ràng buộc** (AntD token, không Tailwind, vi_VN), **tiêu chí xong** (test/typecheck/build).
- Với API: dán **endpoint/method/request/response** hoặc trỏ file contract; cấm bịa DTO.
- Với UI: yêu cầu đủ **loading/empty/error/success/no-permission** nếu áp dụng.
- Với thay đổi nhạy cảm (auth/RBAC/router): yêu cầu liệt kê rủi ro + cách verify.

---

## 8) Prompt mẫu cho Cursor (copy/paste)

> Thay phần trong `[...]` trước khi dùng. Ưu tiên chạy trong thư mục `D:\Final_Project\frontend`.

### 8.1 Onboard / hiểu codebase
```text
Bạn đang làm việc trong dự án MEMS Frontend (React + TS + Vite + Ant Design 5 + TanStack Query + Zustand).
Hãy đọc .cursor/rules/mems-frontend.mdc và các file liên quan đến [tính năng/màn hình].
Tóm tắt: cấu trúc hiện tại, luồng dữ liệu, API liên quan, rủi ro.
Không sửa code ở bước này.
```

### 8.2 Thêm/sửa màn hình UI (theo chuẩn MEMS)
```text
Mục tiêu: [mô tả].
Phạm vi file: [đường dẫn].
Ràng buộc bắt buộc:
- Ant Design 5, dùng token ConfigProvider, KHÔNG Tailwind/không hardcode màu.
- UI tiếng Việt, locale vi_VN khi dùng DatePicker/Pagination.
- Đủ trạng thái: loading (Skeleton), empty, error (Alert + retry), success, no-permission nếu áp dụng.
- Không bịa DTO/API; bám contract: [dán endpoint/method/schema hoặc trỏ file].
- Không dùng dangerouslySetInnerHTML (nếu có HTML người dùng nhập phải sanitize).
Trước khi sửa: liệt kê file sẽ thay đổi và kế hoạch ngắn.
Sau khi sửa: chạy kiểm tra phù hợp (tsc -b, vitest liên quan, build nếu cần) và báo kết quả.
```

### 8.3 Tích hợp API với TanStack Query
```text
Tích hợp endpoint: [METHOD] [PATH]
Request: [mô tả]
Response: [mô tả]
Yêu cầu:
- Thêm/điều chỉnh API trong layer feature phù hợp, xử lý lỗi đúng pattern hiện có.
- Dùng TanStack Query (query key có cấu trúc, invalidate sau mutation).
- Không đưa server data vào Zustand.
- UI có loading/error/empty/success rõ ràng.
- Viết/cập nhật test cho nhánh lỗi và empty nếu có.
Bám theo code hiện có trong [file tham chiếu].
```

### 8.4 Form (React Hook Form + Zod)
```text
Tạo/sửa form [tên form] theo React Hook Form + Zod.
Yêu cầu: validate FE rõ ràng tại từng trường; không disable nút Submit trước khi gửi; hiển thị lỗi server đúng chỗ nếu có; dùng AntD Form components phù hợp; text tiếng Việt.
Thêm test cho submit hợp lệ, validation lỗi, và lỗi API.
```

### 8.5 RBAC / Owner-Admin guard
```text
Kiểm tra và chỉnh sửa quyền truy cập cho route/màn hình [path].
Yêu cầu: đúng role guard hiện có, không làm lộ dữ liệu qua UI, hỗ trợ điều kiện module nếu liên quan (BR-06/07).
Giải thích cách verify (manual steps + test nếu có).
```

### 8.6 Sửa bug
```text
Bug: [mô tả + bước tái hiện + kết quả mong đợi/thực tế].
Hãy tìm nguyên nhân gốc (root cause) trước, đề xuất fix nhỏ nhất đúng chỗ, không refactor lan man.
Thêm/cập nhật test tái hiện bug nếu hợp lý.
Sau fix chạy: [lệnh test/lint/build liên quan].
```

### 8.7 Review code (tự review trước PR)
```text
Review các thay đổi hiện tại trong [file/feature].
Kiểm tra: đúng AntD/token, không Tailwind/hardcode, đủ trạng thái UI, RBAC, BR-04/08, NFR-REL-001, a11y, bảo mật, test coverage nhánh lỗi/empty/no-permission, khớp BE contract.
Chỉ ra vấn đề theo mức độ (critical/major/minor) và đề xuất sửa cụ thể.
```

### 8.8 Viết/cập nhật test
```text
Viết/cập nhật test cho [component/page/hook] dùng Vitest + React Testing Library (và Playwright nếu là E2E).
Bắt buộc phủ: success + error + empty + no-permission (nếu áp dụng), và các tương tác chính.
Không chỉ test happy path. Giữ test ổn định, tránh phụ thuộc timing không cần thiết.
```

### 8.9 Chuẩn bị PR description (không tự push/merge)
```text
Soạn nội dung PR cho thay đổi hiện tại (tiếng Việt hoặc song ngữ tùy nhóm).
Gồm: mục tiêu, thay đổi chính, ảnh hưởng/rủi ro, cách test, checklist (tsc, test, build), và lưu ý tương thích BE.
Không chạy git push/merge.
```

---

## 9) Ghi chú về nguồn tài liệu ngoài repo

README có nhắc tài liệu dự án (SRS, ADR, đặc tả Sprint 1 & 2, biên bản họp, từ điển thuật ngữ) nằm ngoài repo tại: `../Đồ án tốt nghiệp/Tài liệu liên quan dự án/`. Workspace `D:\mems-frontend` cũng có `AGENTS.md` tham chiếu `Frontend_Stack_MEMS.md` (ADR-FE-001..003). Khi có tài liệu cập nhật, cần đồng bộ lại ngữ cảnh/rule/code.

---

## 10) Nhật ký cập nhật file này

- **2026-11-05:** Tạo draft từ README, git history, API doc header, frontend stack, và ngữ cảnh Owner Console/Stitch; thêm Cursor setup + prompt templates.
- **2026-11-05:** Người dùng xác nhận nhóm chỉ có thông tin trong repo + ngữ cảnh hiện tại; cập nhật mục phạm vi thông tin, không suy đoán thêm.
- **2026-11-05:** Nghĩa xác nhận phân vai: Nghĩa (FE), Sang (BE), Bảo (BA), Vy (QA). Thiếu thông tin thì hỏi Nghĩa.
