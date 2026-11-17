# Báo cáo sửa lỗi thực tế và build lại backend — MEMS

Ngày kiểm thử: 17/11/2026 · Nhánh: `fixFlowCreateEmployee` · HEAD: `fe18018`
Môi trường: stack Docker local (gateway 8080, identity 8081, people 8082, schedule 8083,
facility 8084, eureka 8761) → MySQL live `host.docker.internal:3306` qua các DB
`mems_identity_db`, `mems_people_db`, `mems_facility_db`, `mems_schedule_db`.

> Quy ước trạng thái: **FIXED** = đã kiểm thử trên hệ thống đang chạy và lỗi không còn.
> **SOURCE FIXED / LIVE BLOCKED** = đã sửa source nhưng chưa chạy được bước còn thiếu.
> **NOT FIXED** = còn lỗi trên hệ thống đang chạy.

## 1. Các lỗi đã tái hiện

### 1.1. Năm endpoint trả 404 (tái hiện 16/11/2026)

Đăng nhập thật qua gateway live, gọi 5 endpoint từng bị 404:

| Endpoint | Gateway live | Ghi chú |
|---|---|---|
| `GET /transfer-requests/inbox` | 404 | gateway live không có route `/transfer-requests/**` |
| `GET /notifications` | 404 | gateway live không có route `/notifications/**` |
| `GET /users/me/approval-capabilities` | 404 | gateway live không có route `/users/**` |
| `GET /api/v1/modules/status` | 404 khi có token | route có, Identity live thiếu handler `/status` |
| `GET /users/me/permissions` | 404 | gateway live không có route `/users/**` |

Bằng chứng runtime đã lưu trong `docs/bao-cao-fix-404-va-trien-khai.md`: giải nén `app.jar`
trong container cho thấy gateway thiếu 4 route và PeopleService chỉ có 9 controller; gateway
chạy bản HEAD trên cổng 18080 trả 200 cho cả 5 endpoint.

### 1.2. Identity crash khi deploy ảnh HEAD (16/11/2026)

Container `mems-identity-org` khởi động lại liên tục với lỗi:
`Unknown column 'allowed_scopes' in 'field list'` — sau đó là `permission_bundle*`,
`module.is_core`, `organization_module.locked_*`. Login không dùng được.

### 1.3. Schedule 500 sau rebuild (tái hiện 17/11/2026)

Gọi bằng JWT hợp lệ:

```text
GET /api/departments/44444444-...-444444444001/schedules  -> 500 UNCATEGORIZED_EXCEPTION
GET /api/schedules/me                                     -> 500 UNCATEGORIZED_EXCEPTION
```

Log `mems-schedule`:

```text
Caused by: java.sql.SQLSyntaxErrorException: Unknown column 's.department_id' in 'field list'
```

Trình duyệt (owner, `http://localhost:5173/dao-tao/lich-hoc`) hiển thị
`LỖI KẾT NỐI — Không tải được lịch học — Máy chủ gặp sự cố`, không giả lập danh sách rỗng.

### 1.4. Facility trả 400 trước khi module được bật (không phải lỗi)

`GET /api/departments/{id}/facilities` → 400 `MODULE_NOT_ENABLED` khi
`FACILITY_MANAGEMENT` chưa được đăng ký. Đây là hành vi đúng của module tùy chọn.
Sau khi owner bật module, toàn bộ CRUD chạy đúng (mục 7.4).

## 2. Nguyên nhân gốc

| Lỗi | Nguyên nhân gốc |
|---|---|
| 5 endpoint 404 | **Runtime cũ hơn source**: image gateway/people/identity build 13/11/2026, trong khi route/controller được thêm 15–16/11 (`ebbac40`, `e0b6886`, `ef71576`). Source và cấu hình gateway ở HEAD đã đúng; không phải thiếu code. |
| Identity crash-loop | DB live thiếu các cột/bảng mà `IdentityDataInitializer`/`PermissionCatalog` ở HEAD đọc: `permission.allowed_scopes`, `permission_bundle*`, `module.is_core`, `organization_module.locked_*`. DB được bootstrap từ snapshot `DB_11_16.sql` (chỉ là dump `mems_people_db`) nên chưa có migration 17–39. |
| Workflow People/Facility lỗi schema | DB live thiếu bảng/cột của migration 31–37 (`assignment`, `notification`, `transfer_*`, `resignation_request`, `delegation*`, `position.department_id`, `classroom.department_id`, `equipment.department_id`). |
| Schedule 500 | `ScheduleService` (HEAD) đọc/ghi `session.department_id` cho mọi truy vấn lịch, nhưng `mems_schedule_db` chưa bao giờ có cột này. Không có migration nào trước 40 thêm cột; test schema có cột nên test source không phát hiện. |
| Facility 400 | Module tùy chọn mặc định chưa đăng ký (`not_registered`). Không phải lỗi code. |

## 3. Service lỗi

| Service | Lỗi |
|---|---|
| `mems-api-gateway` | Thiếu route `/users/**`, `/transfer-requests/**`, `/notifications/**`, `/permission-bundles/**` ở bản đang chạy. |
| `mems-identity-org` | Thiếu handler `GET /api/v1/modules/status`; crash khi DB thiếu cột cho seed. |
| `mems-people` | Bản đang chạy thiếu controller Transfer/Notification/ApprovalCapability/EffectivePermission/SelfService/Resignation/GeneralManager/Delegation. |
| `mems-schedule` | Query `session.department_id` trên schema không có cột → 500. |
| `mems-facility` | Schema thiếu `department_id` (đã xử lý bằng migration 37); module tắt là hành vi cấu hình. |
| Frontend production (trước đó) | Thiếu `frontend/vercel.json` → API tương đối trả 404/HTML. Đã khôi phục trong source; **không thay đổi cấu hình deploy Vercel trong lần này**. |

## 4. Source đã thay đổi

Không sửa Java trong giai đoạn rebuild này — các lỗi 404 là do runtime cũ, source HEAD đã đúng.

| File | Thay đổi |
|---|---|
| `28_...` → `39_...sql` (12 file, đã có trong repo) | Migration bổ sung schema/quyền còn thiếu; đã chạy đủ 12 file trên DB live ngày 16/11 (người dùng thực thi bằng `scripts\apply-live-migrations.bat`, kết thúc `[OK] Da chay xong 12 migration`). |
| **`40_schedule_department_scope_catchup.sql`** (mới) | Thêm idempotent `session.department_id` + index `idx_session_department(department_id, start_time)` cho `mems_schedule_db`. Không xoá dữ liệu. |
| `scripts/apply-live-migrations.bat` | Bổ sung file 40 vào danh sách (13 file), vẫn dừng ở file lỗi đầu tiên. |
| `scripts/apply-migration-40.bat` (mới) | Chạy riêng migration 40, hỏi username/password MySQL, không cần build lại service. |
| `docs/live-migration-runbook.md` | Bỏ bước backup theo yêu cầu; thêm mục 1.4 (schedule), lệnh chạy và kiểm tra cột; sửa phần rollback DB thành "chỉ drop cột/index đã thêm". |
| `frontend/vercel.json` | Đã khôi phục trước đó (12 rewrite API + SPA fallback loại trừ API). Không sửa thêm, không đổi URL/biến môi trường. |

## 5. Service đã build lại

Ảnh build từ HEAD `fe18018` (không dùng cache source cũ):

| Service | Image | Thời điểm build (UTC) | Trạng thái |
|---|---|---|---|
| identity | `final_project-identity-org-service:head-2026-11-16` | 2026-11-16T16:29:17Z | Started, login 200 |
| people | `final_project-people-service:latest` | 2026-11-16T16:30:46Z | Started |
| gateway | `final_project-api-gateway:latest` | 2026-11-16T16:29:14Z | Started |
| facility | `final_project-facility-service:latest` | 2026-11-16T16:41:22Z | Started |
| schedule | `final_project-schedule-service:latest` | 2026-11-16T16:41:49Z | Started (lỗi schema còn lại) |
| eureka | không rebuild | — | UP |

Kiểm tra đăng ký Eureka (`GET http://localhost:8761/eureka/apps`):

```text
SCHEDULESERVICE 1/1 UP   IDENTITYSERVICE 1/1 UP   FACILITYSERVICE 1/1 UP
PEOPLESERVICE   1/1 UP   APIGATEWAY      1/1 UP   EUREKASERVER    1/1 UP
```

Không còn instance DOWN tồn đọng sau khi restart toàn bộ Docker.

## 6. Container đã cập nhật

- Thứ tự deploy: Identity → People → Facility → Schedule → Gateway, dùng
  `docker compose up -d --no-deps --force-recreate <service>`.
- Gián đoạn đã báo trước: identity ~60s (login/API lỗi trong lúc restart), people/facility/
  schedule ~30s mỗi service, gateway ~10s.
- Trạng thái hiện tại: cả 6 container `Up`; thời điểm start `2026-11-17T11:53:50Z`
  (Docker Desktop bị dừng ngoài phiên và được khởi động lại; container tự lên lại theo
  restart policy, không phải deploy mới).
- Rollback còn sẵn: `mems-backup-people-service:2026-11-13`,
  `mems-backup-facility-service:2026-11-13`, `mems-backup-schedule-service:2026-11-13`,
  `final_project-identity-org-service:rollback-60c8997`.
  Ảnh gateway 13/11 đã bị prune, không còn để tag rollback (chỉ có thể build lại từ commit cũ).

## 7. Kết quả API sau cập nhật

### 7.1. Năm endpoint từng 404 — JWT hợp lệ

| Endpoint | Kết quả 17/11 |
|---|---|
| `GET /transfer-requests/inbox` | **200** (danh sách rỗng — chưa có yêu cầu) |
| `GET /notifications` | **200** |
| `GET /users/me/approval-capabilities` | **200** (`transfer/resignation/classLifecycle/any = true` với owner và trưởng phòng) |
| `GET /api/v1/modules/status` | **200** (7 module) |
| `GET /users/me/permissions` | **200** (danh sách quyền hiệu lực) |

### 7.2. Đăng nhập / phân quyền nền

- `POST /api/v1/auth/login` 200 cho `platform_admin`, `sample_owner`, `sample_hr`,
  `sample_head`, `sample_academic`, `sample_teacher`, `sample_teacher2`.
- `GET /api/v1/modules` 200; `GET /api/v1/audit-logs` 200 với SUPER_ADMIN.
- `GET /departments`, `/positions`, `/teachers`, `/students`, `/classes`,
  `/specialties` 200 với tài khoản có quyền.

### 7.3. Workflow đã chạy

- Nghỉ việc: HR tạo yêu cầu cho `sample_academic` → trưởng phòng nhận thông báo
  `RESIGNATION_REQUESTED` → trưởng phòng từ chối → yêu cầu `REJECTED`, HR nhận
  `RESIGNATION_REJECTED`; `sample_academic` vẫn `ACTIVE` trong danh sách thành viên.
- Tài khoản học sinh: cấp mật khẩu tạm → đăng nhập bị chặn `PASSWORD_CHANGE_REQUIRED`
  ở mọi API tự phục vụ → đổi mật khẩu 204 → đăng nhập lại, `/students/me`,
  `/students/me/classes`, `/users/me/permissions` 200; `/students`, `/classes` 403 đúng.
- Tổng quản lý: `GET /api/general-manager` 200 (rỗng), `/candidates` 200 (5 ứng viên).

### 7.4. CRUD facility (owner bật module tạm thời rồi tắt lại)

| Thao tác | Kết quả |
|---|---|
| Bật `FACILITY_MANAGEMENT` | 204 |
| `GET /api/departments/{id}/facilities` | 200 |
| Tạo phòng | 201 |
| Danh sách phòng | 200 (1) |
| Sửa phòng | 200 (capacity 40 → 45) |
| Tạo thiết bị | 201 |
| Báo sự cố | 201 (`open`) |
| Xử lý sự cố | 200 (`resolved`) |
| Xoá thiết bị / xoá phòng | 204 / 204 |
| Tắt module | 204 |

Lưu ý: `ROOM_MANAGEMENT` và `EQUIPMENT_MANAGEMENT` là mã legacy được migration 29 map về
`FACILITY_MANAGEMENT`, nên PATCH hai mã này thực chất bật/tắt FACILITY (đã đối chiếu audit log).
Đây là thiết kế Q-03 đang chờ quyết định, không phải lỗi mới.

### 7.5. Schedule — **CHƯA FIXED**

`GET /api/departments/{id}/schedules` và `GET /api/schedules/me` vẫn **500**
`Unknown column 's.department_id'` vì migration 40 chưa được chạy trên DB live
(không có credential DB trong phiên này). Sau khi chạy migration 40 chỉ cần gọi lại API,
không cần build lại service.

## 8. Kết quả kiểm thử theo vai trò

| Vai trò / tài khoản | Kết quả 17/11 | Ghi chú |
|---|---|---|
| OWNER (`sample_owner`) | **PASS** | Dashboard `/to-chuc` 200; departments/positions/teachers/students/classes/notifications/permissions 200; module status 200; audit qua SUPER_ADMIN. |
| SUPER_ADMIN (`platform_admin`) | **PASS (platform scope)** | `/api/v1/modules` 200, `/api/v1/audit-logs` 200, `/api/v1/organizations` 200; `/api/v1/modules/status` 403 `ORGANIZATION_REQUIRED` (đúng thiết kế — không thuộc tổ chức). |
| MANAGER — HR (`sample_hr`) | **PASS (có giới hạn đã biết)** | Members 200, resignation list 200, teachers/specialties 200; tạo & duyệt nghỉ việc hoạt động; không có quyền duyệt cấp trưởng phòng. |
| STAFF — giáo vụ (`sample_academic`) | **PASS** | Students/classes/specialties 200; tạo tài khoản học sinh + mật khẩu tạm hoạt động. |
| STAFF — trưởng phòng (`sample_head`) | **PASS một phần** | Classes 200, transfer inbox 200, duyệt/từ chối nghỉ việc đúng policy; `GET /departments/{id}/members` 403 vì thiếu `employee.view` (khoảng trống đã ghi trong `docs/role-function-matrix.md`). |
| TEACHER (`sample_teacher`, `sample_teacher2`) | **PASS** | `/teachers/me` 200, `/teachers/me/classes` 200 (2 lớp), notifications/permissions 200; tự tạo yêu cầu nghỉ việc 403 (chưa hỗ trợ self-service). |
| STUDENT (`khang.nguyen@sample-mems.example`) | **PASS** | Bị chặn khi còn mật khẩu tạm; sau đổi mật khẩu: `/students/me` 200, `/students/me/classes` 200, `/users/me/permissions` 200; danh sách tổ chức 403 đúng. |
| Tổng quản lý | **CHƯA KIỂM THỬ ĐẦY ĐỦ** | Chưa bổ nhiệm GM; chỉ xác nhận API list/candidates 200. Không tự bổ nhiệm vì sẽ tạo chức danh mới trong dữ liệu thật. |

Kiểm thử trình duyệt (Vite `http://localhost:5173`, owner): trang đăng nhập và dashboard
`/to-chuc` tải dữ liệu thật (1 phòng ban, 6 nhân sự, 7 chức vụ); trang lịch hiển thị đúng
trạng thái lỗi máy chủ thay vì dữ liệu giả.

## 9. Lỗi còn lại

| # | Lỗi | Mức độ | Trạng thái |
|---|---|---|---|
| 1 | Schedule 500 do thiếu `session.department_id` | Cao (chặn toàn bộ lịch) | **NOT FIXED** — chờ chạy migration 40 |
| 2 | Identity log WARN khi khởi động: Hibernate `ddl-auto=update` cố `ALTER` các cột `account.id`, `account.org_id`, `organization.id`, `refresh_token.replaced_by` nhưng bị FK chặn | Thấp (service vẫn chạy, login 200) | Chưa xử lý — nên tắt `ddl-auto` ở production |
| 3 | Trưởng phòng không xem được danh sách thành viên phòng ban (403 thiếu `employee.view`) | Trung bình | Khoảng trống nghiệp vụ đã ghi nhận, chưa sửa |
| 4 | Giáo viên/nhân viên không tự tạo yêu cầu nghỉ việc/điều chuyển (403) | Trung bình | Chưa có self-service theo matrix |
| 5 | Không kiểm thử được luồng điều chuyển: tổ chức chỉ có 1 phòng ban, không có phòng đích | Trung bình | Thiếu dữ liệu kiểm thử, không phải lỗi code |
| 6 | Vai trò Tổng quản lý chưa được bổ nhiệm nên chưa kiểm thử quyền sau bổ nhiệm | Trung bình | Chưa thực hiện (tránh thay đổi cơ cấu tổ chức) |
| 7 | `GET /api/v1/subscriptions` trả 404 | Thấp | Endpoint không tồn tại trong source; cần xác nhận có thuộc phạm vi |
| 8 | Trạng thái module tùy chọn bị thay đổi do kiểm thử: `FACILITY_MANAGEMENT` từ `not_registered` → `disabled`; ROOM/EQUIPMENT vẫn `not_registered` | Thấp | Không thể đưa về đúng `not_registered` qua API (API chỉ disable); chức năng vẫn tắt như ban đầu |
| 9 | File JWT trong `.e2e_tmp/tok_*.txt` đang được **track trong git** (commit `fe18018`) | Cao (bảo mật) | Chưa xoá/rotate vì yêu cầu không commit; token ngắn hạn nhưng cần xử lý |
| 10 | Dữ liệu kiểm thử còn lại: 1 sự cố facility đã `resolved` (không có API xoá), audit log các lần bật/tắt module | Thấp | Không ảnh hưởng chức năng |

## 10. Việc cần xác nhận thêm

1. **Chạy migration 40** trên MySQL live:
   `scripts\apply-migration-40.bat` (hỏi username/password MySQL). Sau đó tôi sẽ gọi lại
   `/api/departments/{id}/schedules` và `/api/schedules/me` để xác nhận 200 trước khi đánh dấu FIXED.
2. Có cần đưa `FACILITY_MANAGEMENT` về đúng trạng thái `not_registered` (xoá row
   `organization_module`) hay giữ `disabled`? Việc xoá row cần thao tác DB có kiểm soát.
3. Trưởng phòng có được xem danh sách thành viên phòng ban không (cấp `employee.view` cho
   chức danh trưởng phòng) — thay đổi quyền nghiệp vụ, cần quyết định.
4. Giáo viên/nhân viên có thuộc phạm vi tự gửi yêu cầu nghỉ việc/điều chuyển không.
5. Có cho phép bổ nhiệm thử Tổng quản lý (tạo chức danh "Tổng quản lý" nếu chưa có) rồi bãi nhiệm
   để kiểm thử đầy đủ vai trò này không.
6. Có xoá `.e2e_tmp/tok_*.txt` khỏi git và đổi mật khẩu các tài khoản mẫu không (khuyến nghị).
7. Có cần kiểm thử thêm UI cho từng vai trò (HR, giáo vụ, giáo viên, học sinh) bằng trình duyệt
   sau khi migration 40 hoàn tất không.

---

### Tổng kết trạng thái

| Hạng mục | Trạng thái |
|---|---|
| 5 endpoint từng 404 | **FIXED** (200 với JWT thật, 17/11) |
| Identity khởi động + login | **FIXED** (12 migration đã chạy, login 200) |
| People workflow (nghỉ việc, tài khoản học sinh) | **FIXED** (kiểm thử API thật) |
| Facility CRUD | **FIXED** (sau khi bật module; đã tắt lại) |
| Schedule | **NOT FIXED** — chờ migration 40 |
| Vai trò | 6/8 PASS, 1 PASS một phần, GM chưa kiểm thử |
| Browser | PASS mức smoke (owner dashboard + trạng thái lỗi lịch) |
