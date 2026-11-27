# Trạng thái hiện tại MEMS — snapshot 2026-11-26

> File này là **điểm tham chiếu duy nhất cho trạng thái hiện tại**. Các tài liệu cũ
> (README, `docs/api.md`, plan/spec, báo cáo sprint, ux-review) ghi trạng thái tại
> thời điểm soạn; khi đọc, đối chiếu vào đây trước. Không thay thế quyết định sản
> phẩm — các điểm chưa chốt vẫn nằm ở `docs/scope-can-chot-xep-lich.md`.

## 1. Working copy & nguyên tắc làm việc

- Repo chính: `D:\Final_Project`, nhánh `chore/sync-main-class-flow`, HEAD `5a4a286`.
- Working tree (cập nhật sau smoke BE/FE thật 27/11): **77 file `M`**,
  **46 file `??`**, **0 file `D`**; staged rỗng; gồm `docs/e2e-run-2026-11-25.md`,
  `docs/scope-can-chot-xep-lich.md` và plan/spec FE shell untracked. Tăng so với snapshot 26/11
  (48 `M` / 14 `??`) do mã FE Task 1–5 + final fix wave + P4 + workspace ledger/review package của SDD
  và 3 file BE ScheduleService (`ScheduleResponse`, `DepartmentScheduleController`, `AutoScheduleService`).
- FE shell `/dao-tao/tu-dong-xep-lich` **chỉ nằm ở worktree**
  `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell`
  (cùng HEAD, chưa commit) và **chỉ là nguồn tham khảo copy/câu chữ**. Màn tương ứng trong repo
  chính là `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.tsx`, gọi API thật qua `/auto-generate`.
- **Không commit / push / merge** khi chưa được yêu cầu rõ.
- Quyết định phân gói khách hàng 26/11: xem `docs/dinh-nghia-goi-khach-hang.md`
  (Gói chuẩn / Gói doanh nghiệp (Enterprise); đã chọn thêm cột nhóm trên `department`).
  File `10_department_functional_group.sql` đã tạo nhưng **chưa chạy DB**; phụ thuộc
  việc sửa/chạy `07_people_department_access.sql` ở đợt khác.

## 2. Frontend

- Stack hiện tại: React 19 + TypeScript + Vite + React Router + TanStack Query +
  Zustand + Axios + **`@astryxdesign/core` 0.7.16** + dayjs + Recharts + Vitest +
  Playwright + ESLint/Prettier.
- **Không còn Ant Design 5** (`0` import `from 'antd'` trong `frontend/src`),
  không dùng React Hook Form/Zod: form dùng `frontend/src/hooks/useFormState.ts`.
- Token nằm ở `frontend/src/theme.ts` + CSS variables (`astryx-theme.ts`), không
  phải AntD `ConfigProvider`. Locale Astryx `vi-VN`.
- Kiểm chứng trong worktree FE (snapshot cũ): `vitest run` **27 file / 182 test pass**;
  `tsc -b --pretty false` EXIT 0; `eslint` EXIT 0.
- Kiểm chứng repo chính sau Task 1–6 (27/11, từ `D:\Final_Project\frontend`):
  `vitest run` **44 file / 348 test pass** (sau final fix wave); `tsc -b --pretty false` EXIT 0;
  `eslint .` EXIT 0. Không chạy E2E/DB/build BE. Không commit/push/merge.
- Kiểm chứng cuối lưới tuần 27/11 (từ `frontend`, Node portable 22.20.0): `vitest run` **49 file / 390 test pass** EXIT 0, `npm run lint` EXIT 0, `tsc -b --pretty false` EXIT 0, `git diff --check` EXIT 0; 2 ảnh đối chiếu `06-lich-phong-ban-luoi-tuan.png` + `07-lich-ca-nhan-luoi-tuan.png` (7 cột, 9 khối pastel/ảnh, 0 console/HTTP error). Không commit/push/merge.
- Nghiệm thu self-service GV/HS 27/11 (từ `frontend`, Node portable 22.20.0): `vitest run` **56 file / 445 test pass** EXIT 0, `npm run lint` EXIT 0, `tsc -b --pretty false` EXIT 0, `git diff --check` EXIT 0 (chỉ warning LF→CRLF); 7 ảnh thật `08`–`14` qua `http://localhost:5173` với `vyvy`/`demo_student` (URL + H1 đúng, dữ liệu `Võ Thị Vy`, `12A1`, `Nguyễn Minh Khang`, `Java cơ bản`, 0 console/HTTP/page error); HEAD `5a4a286`, staged rỗng, 0 file `D`; không commit/push/merge.
- E2E full suite cuối: **125/125 pass, 0 fail, 0 flaky** (2 workers, ~104 s),
  sau đợt sửa **chỉ locator trong `frontend/e2e/*.spec.ts`**. Không có app defect
  thật được xác nhận; live-region a11y của Astryx được giữ nguyên.
- 24/24 ca Sprint 4 Lớp/Giáo viên pass. Phạm vi `TC-ADM-32` chỉ 3 route console
  tester; không chỉnh màn chi tiết phòng ban/giáo viên/lớp học.

### 2.1. Màn Quản lý học sinh (FE) — 26/11/2026

- `/dao-tao/hoc-sinh` (danh sách) và `/dao-tao/hoc-sinh/:id` (hồ sơ) **đã có code trong working tree repo chính** `D:\Final_Project`, không còn chỉ ở worktree; **vẫn chưa commit**.
- Kiểm chứng full từ `frontend`: `vitest run` **28 file / 200 test pass**; `tsc -b --pretty false` EXIT 0; `eslint .` EXIT 0. Không chạy/sửa E2E.
- Gateway `application.yml` + `docker-compose.yml` đã đổi route/ENV cho student; gateway đã build/chạy thật
  ở mục 3 nhưng **chưa smoke riêng endpoint học sinh sau khi đổi route/ENV**.
- `gender`, `version` (optimistic locking), lịch sử thay đổi và danh sách lớp quá khứ **vẫn chờ BE/DB**; FE không bịa dữ liệu.

### 2.2. FE từ BE các nhánh: đã làm / còn chờ (27/11/2026)

Chạy xong **Task 1–6** của `docs/superpowers/plans/2026-11-26-fe-tu-be-cac-nhanh.md`
(theo chế độ subagent-driven: implementer + reviewer riêng cho từng task, controller tự verify).
Mọi task đều **không commit**; HEAD vẫn `5a4a286`, staged rỗng, 0 file `D`. Ledger đầy đủ tại
`.superpowers/sdd/2026-11-26-fe-tu-be-cac-nhanh/progress.md` (kèm snapshot/review package từng task).

**Đã làm (FE-only, working tree repo chính):**
- Task 1: envelope lỗi chuỗi (`features/platform/errorCodes.ts`), alias quyền dotted ↔ UPPERCASE
  (`employee.view ↔ PEOPLE_VIEW`, …), JWT claim `mustChangePassword`, mở guard `/dao-tao`;
  `LoginResponse` vẫn 4 field, interceptor 401/refresh không đổi.
- Task 2: module tổ chức — OWNER toggle / SUPER_ADMIN lock (reason bắt buộc cả lock + unlock),
  lọc menu theo trạng thái module, route `quan-tri/to-chuc/:id/module`.
- Task 3: đổi mật khẩu cưỡng chế từ JWT claim (`ForcePasswordChangeModal`, `POST /auth/change-password`),
  mật khẩu tạm từ create/reset, login 429 copy riêng, policy 12 ký tự / ≤72 byte UTF-8.
- Task 4: Schedule — `fetchSchedules`/CRUD buổi học, room picker (`/room-suggestions`), impacts,
  `/schedules/me` (không `departmentId`), 3 route + 2 item menu dưới `/dao-tao`.
  P4 (27/11) bổ sung `/auto-generate` + nút "Tự động xếp lịch" và cho phép room picker gửi `classId`
  (S7); xem §5.
- Task 5: Facility — CRUD phòng/thiết bị/sự cố tại `/api/departments/{d}/facilities/**`,
  resolve bằng POST, lỗi `"ROOM_IN_USE"` dạng chuỗi, route/menu `to-chuc/co-so-vat-chat` dưới
  `OwnerGuard` (có route phụ `/su-co`); picker **không** lọc `roomType` ở FE.
- Task 6: full verify xanh, cập nhật file này.
- Reviewer độc lập từng task: **0 Critical / 0 Important**; các finding Minor đã ghi vào ledger,
  không mở fix loop (phần lớn là polish UI/copy, cần BE thật hoặc S7 để xử lý có chủ đích).
- Final whole-branch review: 3 Important + 2 Minor (0 Critical) — gate quyền `schedule.create` cho
  room picker, wired module-status filter vào `AdminConsoleLayout`, dùng `scheduleErrorMessage()` cho
  banner gợi ý phòng, giữ cờ đổi mật khẩu khi refresh, và truyền `departmentId` qua 3 link.
  Đã giao **một** fixer cho toàn bộ findings; re-review: **đều resolved, không regression mới**.
- Kiểm chứng sau Task 1–6: **44 file / 348 test pass**, `tsc -b` EXIT 0, `eslint .` EXIT 0
  (có 1 lần flake timing ở `OrganizationModulesPage.test.tsx`, chạy riêng và chạy lại đều xanh).
- Kiểm chứng cuối sau P4 (27/11, từ `D:\Final_Project\frontend`, Node portable 22.20.0):
  **47 file / 374 test pass**, `tsc -b --pretty false` EXIT 0, `eslint .` EXIT 0. Không E2E/DB/build BE.
- Smoke FE thật 27/11: dev server Vite `http://localhost:5173`, đăng nhập `demo_owner` /
  `Demo@123456`, mở `/dao-tao/lich` và `/dao-tao/tu-dong-xep-lich`; browser dùng `localhost`
  (không `127.0.0.1`) để khớp `CORS_ALLOWED_ORIGINS` của gateway. Ảnh chụp tại
  `C:\Users\night\AppData\Local\Temp\opencode\be-runtime\screenshots\`
  (`01-after-login.png`, `02-lich-tuan.png`, `03-auto-schedule.png`).

**P4 MVP xong; còn chờ / BLOCKED (không tự mở):**
- **Phase 0 chưa port đầy đủ**: gateway working tree vẫn thiếu nhiều route so với `origin/main`;
  P4 chỉ bổ sung `schedule-departments`, chưa port phần Facility/outbox. Đã build gateway bằng
  JDK portable 21 và smoke thật qua `http://localhost:8080`; FE đã gọi backend thật (xem §3/§5).
- **P4 auto-submit đã triển khai xong dạng MVP** (xem §5). FE chỉ chọn **1 lớp/lần** và gửi
  `classIds: [classId]`; contract/BE nhận nhiều lớp nhưng mở rộng multi-select để sau. FE shell vẫn
  chỉ ở worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell`, không đụng.
- **Đã chốt** D1, D8, D9, D10, D11, S1, S2, S3, S5, S6, S7 (xem `docs/scope-can-chot-xep-lich.md` §3.3).
  room-suggestions được phép nhận `classId` theo S7; timezone mặc định VN.
- Không gọi `/internal/**`, `/outbox/**`; migration `53_people_subject_category.sql` **DRAFT ONLY**;
  `07_people_department_access.sql` vẫn lỗi DDL, chỉ báo cáo.

## 3. Backend

- BE **đã build thật bằng JDK portable 21** (`C:\Users\night\AppData\Local\Temp\opencode\be-runtime\jdk-21.0.13.1+2`)
  với Maven wrapper; cả 5 jar `IdentityService`, `PeopleService`, `ScheduleService`, `FacilityService`,
  `APIGateway` build EXIT 0 (`PeopleService` dùng `-Dmaven.test.skip=true` do stale `testCompile`
  từ code cũ, không phải working-tree change). Chạy 5 service local với Eureka disabled:
  gateway `:8080`, Identity `:8081`, People `:8082`, Schedule `:8083`, Facility `:8084`.
  Login thật `demo_owner` / `Demo@123456` trả JWT `ORG_OWNER`/`OWNER`, `orgId=eff0ce1e-...`,
  permission `SCHEDULE_CREATE`. Smoke trước P4: `platform_admin` / `123456` trả JWT `SUPER_ADMIN`;
  `GET /organizations`, `/organizations/pending`, `/organizations/options`,
  `/accounts`, `/audit-logs`, `/modules` đều HTTP 200; BR-08 toast + live-region đúng.
- Smoke P4 thật: `POST /api/departments/{dept}/schedules/auto-generate?dryRun=true` cho `12A1`
  trả `25` buổi nháp (không INSERT), `dryRun=false` ghi `25`; `12A2` tương ứng `20/20`;
  `GET /api/departments/{dept}/schedules` trả `45` buổi demo tháng 12/2026 sau khi dọn session legacy.
  Phòng ban demo `965f9d17-8c11-4191-8579-0e617875100e`. Local DB dùng `D:\Final_Project\db.sql`
  làm nguồn canonical vì `01_identity_db.sql`/`03_schedule_db.sql` stale (`module.is_core`,
  `session.teacher_name/room_code/subject_name`).
- Gateway `backend/APIGateway/src/main/resources/application.yml` đã có route
  auth/modules/organizations/accounts/audit-logs + People
  (`/departments/**`, `/positions/**`, `/permissions/**`, `/api/teachers/**`,
  `/api/classes/**`, `/api/students/**`) và P4 bổ sung `schedule-departments`
  (`/api/departments/*/schedules/**` → `${SCHEDULE_SERVICE_URL}`, `StripPrefix=1`).
  Đã truyền `PEOPLE_SERVICE_URL` cho gateway và smoke route schedule/classes thật qua `:8080`.
- Các endpoint console đã có code: `PUT /organizations/{id}/modules`, suspend /
  reactivate, danh sách organization/options/accounts/audit-logs/modules.
- **Vẫn chưa có**: `POST /auth/forgot-password`, `POST /auth/reset-password`
  (D-32/D-33); BE chưa lưu/hiển thị lại `reason` khi từ chối; approve/reject chưa
  đọc `reason`/`notifyEmail`; `GET /modules` public chưa trả `is_core`; chưa gửi
  email mật khẩu tạm; chưa chặn tự đổi vai trò chính mình (D-30).
- Script `07_people_department_access.sql` **lỗi DDL**:
  `ERROR 1064 ... near 'position(id) ON DELETE CASCADE'` (`position` là reserved
  word). Thay đổi đã revert, **chỉ báo cáo, không tự sửa**. Không chạy 06–09 như
  thể đã apply thành công.

## 4. Toolchain đã dùng

- `npm`/`npx`/`node` **không có trong PATH**. Với verify FE P4 và script smoke dùng portable
  `C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64\node.exe` với entry point trong
  `frontend/node_modules` (`22.14.0` lỗi do `undici@8.12.1` yêu cầu `>=22.19.0`).
  Với Playwright/E2E (cuộc cũ) dùng
  `D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe`.
- Runtime BE local: JDK `...\be-runtime\jdk-21.0.13.1+2`, MySQL 8 portable
  `...\be-runtime\mysql\mysql-8.0.46-winx64\bin\mysqld.exe` (tài khoản root local, mật khẩu chỉ lưu trong runtime script, port 3306).
- Chụp ảnh 27/11: Playwright `chromium.launch({ channel: 'chrome', headless: true })`
  vì browser bundled chưa cài. Script tại `...\be-runtime\capture.mjs`; dùng `localhost:5173`.
- `frontend/package-lock.json` chưa regenerate (vẫn có vài chuỗi `antd` dù
  `package.json` đã sạch).

## 5. P4 — Xếp lịch tự động

- **Đã chốt và triển khai xong MVP** (cập nhật 27/11). Người dùng uỷ quyền chọn thay:
  D1 = cùng category hoặc `teacher_subject='APPROVED'`; D8 = `sessions_per_week`
  trên `class_subject` (default curriculum, else 2); D9 = `stage_no` sao từ
  `sequence_no`, nhập tay default 1; D10/D11 = tiết 45 phút, 1 buổi = chuỗi tiết
  liền ≥ `session_minutes`, không qua giờ nghỉ; S1 = cả 2 nguồn, auto khi đủ 6
  nhóm dữ liệu; S2 = chu kỳ theo `start_date`–`end_date`; S3 =
  `max(max_size, sĩ số thực tế)`; S5 = MVP nháp → xem trước → xác nhận dùng
  `dryRun`, không vá/bù/hàng loạt; S6 = tối thiểu môn+category, giáo viên đủ
  điều kiện, phòng active/capacity/roomType, lưới tiết, `class_subject`;
  S7 = port `origin/main` + room-type, bỏ nhánh timezone, **không lấy migration 53**.
  Hợp đồng/greedy/BE kiểm tra lại/LLM chỉ giải thích đã chốt tại
  `docs/scope-can-chot-xep-lich.md` §3.3. Xem plan
  `docs/superpowers/plans/2026-11-27-p4-xep-lich-tu-dong.md`.
- **Kết quả P4 (27/11):** BE có `POST /api/departments/{departmentId}/schedules/auto-generate?dryRun=`
  (mặc định `true`) + route gateway `schedule-departments`; `dryRun` không INSERT, xác nhận chạy lại
  greedy, kiểm tra conflict lần cuối và thử giáo viên/phòng khác; slot 45 phút, không chồng chéo,
  override `sessionsPerWeek`/`sessionMinutes` chỉ khi FE chọn “Nhập tay”. FE có màn nháp → xem
  trước → xác nhận, error code chuỗi, menu/route `/dao-tao/tu-dong-xep-lich`. Verify FE
  **47 file / 374 test pass**, `tsc`/`eslint` EXIT 0; 3 finding review đã sửa
  (alias `schedule.create`, retry khi conflict confirm, chặn slot chồng chéo).
- **Smoke BE/FE thật 27/11 (không còn `static_review_only`):** 5 service + Vite chạy local;
  `dryRun=true`/`false` chạy thật qua gateway (`12A1` 25/25, `12A2` 20/20), `GET .../schedules`
  trả 45 buổi. Dữ liệu mẫu: org `eff0ce1e-...`, account `demo_owner`/`Demo@123456`,
  dept `965f9d17-...`, 2 lớp `12A1`/`12A2`, 4 giáo viên, 3 phòng, lưới 4 tiết 07:30–10:30.
  `ScheduleResponse` được bổ sung `className/teacherName/roomCode/subjectName` và
  `GET .../schedules` giờ dùng thật `from`/`to`/`classId` (chấp nhận cả ISO instant lẫn
  `YYYY-MM-DD`, đổi theo `Asia/Ho_Chi_Minh`) để bảng lịch không hiện UUID và lọc ngày có tác dụng.
  Ảnh: `...\be-runtime\screenshots\02-lich-tuan.png` (tuần 07–13/12/2026, tên môn/giáo viên/phòng
  hiển thị đúng) và `03-auto-schedule.png`. Chưa commit/push/merge.
- **Giới hạn đã ghi nhận:** FE MVP 1 lớp/lần dù contract/BE nhận mảng; nguồn “Chương trình có sẵn”
  không override `class_subject`; `fetchRoomSuggestions(query, includeClassId = false)` là lựa chọn
  tương thích ngược (S7) — `SchedulePage` giữ call cũ, màn auto-schedule không dùng room picker;
  LLM giải thích/chỉnh tay/bù lịch nằm ngoài P4. `dbConflict` join `class` trong schedule DB để lọc
  `org_id`: nếu lớp PeopleService chưa sync sang bảng đó có thể miss conflict/trượt FK — đã kiểm
  chứng với DB local có sync đủ 2 lớp demo; rủi ro vẫn còn với dữ liệu chưa sync.
- Chốt 25/11 (giữ nguyên): lịch **có dùng phòng**; nhận cả 2 nguồn đầu vào
  (chương trình có sẵn hoặc nhập tay); mặc định bật tự động khi dữ liệu đầy đủ
  (chưa định nghĩa tiêu chí); bảng tiết chưa chốt.
- Chốt bổ sung 26/11: phòng là tài nguyên **cấp tổ chức**, do **CSVC quản lý**,
  phòng ban có module lịch dùng mọi phòng active (D7/C1/C3); trùng lịch **chặn
  cứng**, kiểm tra sức chứa, mỗi học sinh **1 lớp**, không kiểm tra trùng học sinh
  giữa các lớp (D4); chỉnh tay sau auto-xếp **vẫn chịu chặn trùng** (S4); solver
  CSP/CP-SAT hoặc tô màu, BE kiểm tra lại, **nháp → xem trước → xác nhận**, LLM
  chỉ giải thích; làm môn học trước, nhóm A/B/C; lấy `main` làm chuẩn khảo sát,
  FE giữ Astryx (không copy nguyên FE main), BE port chọn lọc từ `origin/main` và
  3 nhánh `feature/auto-schedule-*`, không đổi build/lint/CI, chỉ DB local,
  không xóa/reset dữ liệu.
- Khảo sát BE 26/11 (**toàn nhánh**, chỉ fetch object/ref + đọc, không
  checkout/merge/commit, HEAD vẫn `5a4a286`; chi tiết §4.1 scope doc):
  - `origin/main`: đi xa **11 commit** riêng `backend/ScheduleService` — có
    `AutoScheduleController/Service`, DTO, `SessionImpact`, `PeopleClient/FacilityClient`,
    endpoint `/internal/teachers/eligible`; thuật toán **greedy**, phòng lấy theo
    `departmentId`, sức chứa so với `studentCount`.
  - `origin/feature/auto-schedule-room-type` (`a1aff14`): gợi ý/lọc phòng **cấp
    tổ chức** (`roomsOfOrg`, phòng bị chiếm tính toàn org, lọc sức chứa, ưu tiên
    phòng thường), `roomType` + `ROOM_TYPE_MISMATCH`, `SchoolClock`/`app.timezone`,
    test `ScheduleServiceRoomTest` + `SchoolClockTest`. Khớp D7, nhưng auto-schedule
    vẫn lấy phòng theo `departmentId` và vẫn greedy.
  - `origin/feature/auto-schedule-subject-category` (`3732d53`): danh mục môn
    (`subject_category`), `roomRequirement` `ANY`/`COMPUTER`, `confirm=true` khi
    môn đang dùng, migration `53_people_subject_category.sql` (**DRAFT ONLY**);
    chưa nối `roomRequirement` vào auto-schedule. Phục vụ “môn học trước”.
  - `origin/feature/auto-schedule-timezone` (`1330b0e`): **không có BE mới**, chỉ
    thêm bản sao `KE_HOACH_XEP_LICH_TU_DONG.md`; code timezone nằm ở nhánh room-type.
  - Cả 4 ref đều **chưa có** CSP/CP-SAT/tô màu, nháp → xem trước → xác nhận lịch
    hay LLM giải thích. (**Lịch sử 26/11** — P4 27/11 đã tự port chọn lọc theo S7 và tự làm luồng
    nháp → xác nhận; CSP/CP-SAT và LLM vẫn nằm ngoài MVP.)
- Nguồn quyết định: `docs/scope-can-chot-xep-lich.md` (mục §3.2 và §4.1) và
  `D:\Đồ án tốt nghiệp\Tài liệu liên quan dự án\Sprint-van-hanh\KE_HOACH_XEP_LICH_TU_DONG.md`
  (bản 3, 23/11, đọc cùng các mục chốt 25/11 và 26/11).

## 6. Tài liệu tham chiếu còn dùng được

- `docs/e2e-run-2026-11-25.md` — nhật ký triage + kết quả cuối 125/125.
- `docs/ui-conventions.md` — quy ước Astryx v2 (bỏ qua mục 13 "antd + Astryx cùng chạy").
- `docs/sprint4-fe-handoff.md` — contract FE Sprint 4 (đọc cùng `frontend/src/features/sprint4/`).
- `docs/be-co-tren-nhanh-ma-chua-co-hien-tai-de-lam-fe.md` — inventory toàn bộ BE có trên
  các nhánh mà working tree hiện tại chưa có (Identity/Gateway, People, Schedule, Facility;
  kèm endpoint, DTO, error code, env, migration), để làm FE; snapshot 26/11, chưa port.
- `docs/superpowers/plans/2026-11-26-fe-tu-be-cac-nhanh.md` — plan FE từ BE các nhánh (bản rà soát
  26/11; Task 1–6 đã chạy 27/11, xem §2.2; gateway/schedule đã smoke thật 27/11, xem §3/§5).
- `docs/superpowers/plans/2026-11-27-p4-xep-lich-tu-dong.md` — plan P4 dryRun nháp/xem trước/xác nhận
  (MVP đã triển khai 27/11, xem §5).
- `docs/sync-*` — biên bản port BE từ `origin/main` (snapshot, `origin/main` hiện tại `8b15596`).
- `ux-review/` — bằng chứng review UX (snapshot; số liệu cũ chỉ để tra cứu).
- Các file `frontend/docs/superpowers/plans|specs/*` — kế hoạch/đặc tả lịch sử;
  riêng bản 2026-11-25 auto-schedule FE shell mô tả Work đã làm ở worktree.
