# DỮ LIỆU MẪU & CÁCH CHẠY ĐỂ TEST XẾP LỊCH TỰ ĐỘNG

Có 3 cách. **Cách A** chạy ngay trên schema cách ly; **Cách C** đã nạp sẵn vào org DEMO trong DB local của bạn; **Cách B** (seed cách ly vào `mems_*`) hiện **chưa chạy được** vì guard phát hiện schema live còn thiếu (xem mục 5).

| | Cách A — schema cách ly | Cách C — org DEMO (đã nạp) | Cách B — seed cách ly vào `mems_*` |
|---|---|---|---|
| DB | 4 schema `mems_e2e_*` (tạo từ cấu trúc live) | `mems_*` local, org DEMO | `mems_*` local |
| Dữ liệu thật | Không đụng | Có, chỉ **thêm** id `d0000000-…` | Có, chỉ **thêm** dòng id `eeeeeeee-` |
| Điều kiện | Có `.env` + 4 schema live để clone cấu trúc | Đã chạy `apply-demo-schema.sql` + `seed-demo-org.sql` | Phải chạy đủ migration 43–59 trước |
| Trạng thái | **Sẵn sàng** | **Sẵn sàng** | **Chưa** (guard sẽ báo thiếu cột/bảng) |
| Cổng | 9080–9084 | 9180–9184 | 9180–9184 |

---

## 1. Tài khoản đăng nhập (dùng chung 2 cách)

| Username | Vai trò | Ghi chú |
|---|---|---|
| `e2e_owner` | OWNER org 1 | Toàn quyền org "E2E Xep lich" |
| `e2e_teacher1` | TEACHER | Chuyên môn Toán; dạy 10A, 10B, 10E, 10X |
| `e2e_teacher2` | TEACHER | Chuyên môn Văn; dạy 10C, 10G |
| `e2e_teacher3` | TEACHER | Chuyên môn Lý + Tin; dạy 10A (Lý), 10F (Tin) |
| `e2e_teacher4` | TEACHER | Chuyên môn Sử; dạy 10D, 10Z, 10O |
| `e2e_student` | STUDENT | Học sinh lớp 10A |
| `e2e_owner2` | OWNER org 2 | Org khác, không thấy dữ liệu org 1 |

Mật khẩu tất cả: **`Sample@123456`** (lấy đúng hash của `sample_owner`).

## 2. Dữ liệu mẫu có gì

- **Org 1 "E2E Xep lich"** — phòng ban `To Hoc vu E2E`; **Org 2 "E2E To chuc 2"** (chỉ có ca học, không có lớp).
- **6 ca/org**: tiết 1–6, 07:30 → 12:25 (buổi 90 phút = 2 tiết liền).
- **7 phòng**: R1 (40 chỗ), R2–R5 (20 chỗ, phòng thường), R6–R7 (40 chỗ, phòng máy).
- **6 môn**: Toán, Văn, Lý, Anh (không có GV đủ điều kiện), Tin (`COMPUTER`), Sử.
- **10 lớp** (mỗi lớp gắn một kịch bản):

| Lớp | Môn / kế hoạch | Dùng để test |
|---|---|---|
| 10A | Toán 2, Văn 2, Lý 2 | T2/T3: tạo nháp 6 buổi, xác nhận, xem lịch |
| 10B | Toán 2, Anh 1 | T4: Anh báo "Không có giáo viên đủ điều kiện", Toán vẫn xếp |
| 10C | Sử 1 | T6/T7/T8/T9/T12 |
| 10D | Sử 2 — **đã có 2 buổi thật** | T14: không sinh yêu cầu mới |
| 10E | Sử 1, 30 HS | T13a: phòng thường kín → dùng phòng máy |
| 10F | Tin 1 | T5: bảo trì R6/R7 → môn Tin không xếp được |
| 10G | Văn 5 buổi / 2 tuần | T11: tạo ô mẫu |
| 10Z | Sử 1, giai đoạn 2 | T11: đúng 1 ngoại lệ ở một tuần |
| 10X | Sử 1 | T6: tạo tay buổi trùng rồi xác nhận → 409 |
| 10O | không môn, **3 buổi thật thứ 5 (12-03) tại R1** | T13a: chiếm phòng |

- 95 học sinh, trong đó `e2e_student` ở 10A.

---

## 3. Cách A — chạy ngay (khuyến nghị)

### 3.1 Chuẩn bị jar (nếu chưa build)

```bash
cd backend/IdentityService   && ./mvnw -o -DskipTests package
cd ../PeopleService          && ./mvnw -o -DskipTests package
cd ../ScheduleService        && ./mvnw -o -DskipTests package
cd ../FacilityService        && ./mvnw -o -DskipTests package
cd ../APIGateway             && ./mvnw -o -DskipTests package
```

### 3.2 Tạo DB mẫu + chạy service + giao diện

```bash
# 1) Tạo 4 schema mems_e2e_* từ cấu trúc live + bù cột thiếu + nạp seed
./docs/phase-1/e2e/setup-e2e-db.sh

# 2) Chạy 5 service native (Eureka tắt, không đụng registry thật)
./docs/phase-1/e2e/run-services.sh

# 3) Cửa sổ khác: chạy FE trỏ vào gateway 9080
cd frontend
VITE_API_PROXY_TARGET=http://localhost:9080 npm run dev
```

Mở `http://localhost:5173`, đăng nhập `e2e_owner` / `Sample@123456`.

Dừng service:

```bash
./docs/phase-1/e2e/stop-services.sh
```

Tạo lại DB sạch (xoá **chỉ 4 schema e2e**):

```bash
./docs/phase-1/e2e/setup-e2e-db.sh --reset
```

### 3.3 Đường dẫn trên giao diện

- Xếp lịch nháp: `/dao-tao/tu-dong-xep-lich`
- Cấu hình lịch (ca, quy tắc lớp, giờ rảnh): `/dao-tao/cau-hinh-lich`
- Màn lịch / lịch của tôi: `/dao-tao/lich`, `/lich-cua-toi`
- Quản lý môn học: `/dao-tao/mon-hoc`

### 3.4 Gợi ý kịch bản test tay

1. Đăng nhập `e2e_owner` → tạo nháp cho **10A** → thấy 6 buổi, không trùng → **Xác nhận** → mở màn Lịch thấy 6 buổi.
2. Đăng nhập `e2e_teacher1` → `/lich-cua-toi` thấy 2 buổi Toán của 10A.
3. Đăng nhập `e2e_student` → `/lich-cua-toi` thấy 6 buổi lớp 10A.
4. Tạo nháp **10B** → panel "Chưa xếp được" báo môn Anh thiếu GV.
5. Bảo trì R6 + R7 (màn phòng học) → tạo nháp **10F** → môn Tin không xếp được.
6. Tạo nháp **10G + 10Z** → đúng 1 ngoại lệ đổi phòng.
7. Tạo nháp **10C**, sửa tay 1 buổi, xác nhận → kiểm tra DB/màn lịch.

---

## 4. Cách C — test trên org DEMO của bạn (đã nạp sẵn 2026-11-27)

Dùng chính DB local `mems_*` và org **DEMO** (owner `AnhSang`). Đã chạy 2 file:

```bash
mysql --default-character-set=utf8mb4 ... < docs/phase-1/e2e/apply-demo-schema.sql
mysql --default-character-set=utf8mb4 ... < docs/phase-1/e2e/seed-demo-org.sql
```

### 4.1 Đã thêm gì (chỉ thêm, id `d0000000-…`)

| Nhóm | Nội dung |
|---|---|
| Schema | 2 cột `teacher_subject.approved_by`, `approved_at`; quyền `schedule.config` cấp cho `ORG_OWNER` + `SUPER_ADMIN` |
| Danh mục môn | 7 danh mục (Toán, Lập trình, CSDL, Mạng & Hệ thống, Ngoại ngữ, AI, Tin học) + **gán danh mục cho 13 môn cũ** (chỉ khi còn NULL) |
| Chuyên môn | 5 chuyên môn gắn danh mục; chuyên môn `English` cũ gắn *Ngoại ngữ* |
| Giáo viên | `demo_gv1..4` (`DEMO-GV1..4`), mật khẩu **`123456abcdef`** như `AnhSang`, vai trò TEACHER, thuộc phòng **CNTT**; chuyên môn: 1=Toán, 2=Lập trình, 3=CSDL+Tin, 4=Mạng |
| Tiết học | 6 tiết 07:30 → 12:25 (org-level) |
| Lớp demo | `XLDEMO1`, `XLDEMO2` — `DANG_DIEN_RA`, 01/12/2026 – 31/01/2027, mỗi lớp 3 môn, 1 môn/lớp bắt buộc **phòng máy** (`TINHOC`) |
| Học sinh | 20 em `DEMOHS01..20`, 10 em/lớp |

Môn của 2 lớp (đã có `sessions_per_week`):

| Lớp | Môn | Buổi/tuần | GV |
|---|---|---|---|
| XLDEMO1 | MATH101 (Toán cao cấp) | 1 | demo_gv1 |
| XLDEMO1 | JAVA | 2 | demo_gv2 |
| XLDEMO1 | DATABASE | 1 | demo_gv3 |
| XLDEMO2 | TINHOC (*bắt buộc phòng máy*) | 1 | demo_gv3 |
| XLDEMO2 | NETWORKING | 2 | demo_gv4 |
| XLDEMO2 | PYTHON | 1 | demo_gv2 |

### 4.2 Chạy

```bash
# Chạy 5 service trỏ vào schema mems_* local, cổng 9180–9184
SCHEMA_PREFIX=mems_ BASE_PORT=9180 ./docs/phase-1/e2e/run-services.sh

# Cửa sổ khác
cd frontend
VITE_API_PROXY_TARGET=http://localhost:9180 npm run dev
```

Đăng nhập `AnhSang` / `123456abcdef` → `/dao-tao/tu-dong-xep-lich` → tạo nháp cho `XLDEMO1`/`XLDEMO2`.

Nếu màn "Cấu hình lịch" báo 403, khởi động lại **IdentityService** một lần để nạp lại catalog quyền.

### 4.3 Giới hạn ở chế độ này

- API `GET /departments/{d}/schedules/impacts` và luồng consumer sự kiện cần bảng `inbox_event`, `session_impact`, `outbox_event` (Facility) — DB local **chưa có**, nên đừng test các phần đó ở đây.
- Dữ liệu cũ có sẵn mojibake (`TEST-K27` tên `Lá»?p Test K27`, `GV011` tên `Phan Thu Ph??ng`) — không sửa; dữ liệu mới ghi đúng UTF-8.

### 4.4 Gỡ dữ liệu mẫu

```bash
mysql --default-character-set=utf8mb4 ... < docs/phase-1/e2e/rollback-demo-org.sql
```

Chỉ xoá id `d0000000-…`, trả `category_id` về NULL và gỡ quyền `schedule.config`. Nếu đã tạo lịch nháp cho 2 lớp demo, xoá nháp trong UI trước.

---

## 5. Cách B — schema `mems_*` local với seed cách ly (đang bị chặn)

### 5.1 Vì sao chưa chạy được

HEAD cần các cột/bảng của migration 43–59. Trên DB local hiện mới có 53, 55, 56, 57, 58, 59; **51/52 chưa chạy được** vì precheck tự abort trên schema cũ, và các bảng/cột tương đương 43–50 cũng chưa có. Vì vậy:

- `seed-local-test-org.sh` sẽ **dừng và liệt kê** cột/bảng còn thiếu.
- Muốn dùng cách B phải viết + chạy migration nâng cấp riêng (chưa có trong đợt này).

### 5.2 Khi schema đã đủ

```bash
# Ghi dữ liệu mẫu (chỉ THÊM, id eeeeeeee-)
./docs/phase-1/e2e/seed-local-test-org.sh --i-approve

# Chạy service trên schema mems_*, cổng 9180-9184
SCHEMA_PREFIX=mems_ BASE_PORT=9180 ./docs/phase-1/e2e/run-services.sh

# FE trỏ vào 9180
cd frontend
VITE_API_PROXY_TARGET=http://localhost:9180 npm run dev
```

Lưu ý: đây là DB local mà tunnel có thể đang trỏ tới. Script không sửa module/role catalog và không xoá dữ liệu, nhưng vẫn là **ghi vào DB thật trên máy** — chỉ chạy khi bạn chủ động.

---

## 6. Dọn dẹp

- Cách A: `setup-e2e-db.sh --reset` (xoá & tạo lại 4 schema e2e).
- Cách B: mọi dòng mẫu có id bắt đầu `eeeeeeee-` (account `e2e_*`). Không có script xoá tự động để tránh xoá nhầm; nếu cần, xoá thủ công theo id sau khi đã sao lưu.
- Cách C: `rollback-demo-org.sql` (xoá đúng id `d0000000-…`).

## 7. Lỗi thường gặp

| Hiện tượng | Xử lý |
|---|---|
| `port 9080 already in use` | Đổi cổng: `BASE_PORT=9280 ./run-services.sh` + đổi `VITE_API_PROXY_TARGET` |
| `missing DB/JWT/internal key in .env` | Kiểm tra `.env` có `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET_BASE64`, `INTERNAL_API_KEY` |
| People chết với `Unknown column 'system_code'` | Đang trỏ nhầm schema live chưa nâng cấp → dùng cách A |
| 401 sau vài phút | Access token chỉ 5 phút, đăng nhập lại |
| Chữ Việt thành `?` | Nạp SQL bằng `--default-character-set=utf8mb4` (script đã đặt sẵn) |
