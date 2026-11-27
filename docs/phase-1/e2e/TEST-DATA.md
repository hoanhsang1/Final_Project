# DỮ LIỆU MẪU & CÁCH CHẠY ĐỂ TEST XẾP LỊCH TỰ ĐỘNG

Có 2 cách. **Cách A dùng được ngay**, không đụng DB thật. Cách B ghi vào `mems_*` local nhưng hiện **chưa chạy được** vì schema live còn thiếu migration (xem mục 4).

| | Cách A — schema cách ly | Cách B — schema `mems_*` local |
|---|---|---|
| DB | 4 schema `mems_e2e_*` (tạo từ cấu trúc live) | `mems_identity_db`, `mems_people_db`, ... |
| Dữ liệu thật | Không đụng | Có, nhưng chỉ **thêm** dòng mới id `eeeeeeee-` |
| Điều kiện | Có `.env` + 4 schema live để clone cấu trúc | Phải chạy đủ migration 43–59 trước |
| Trạng thái | **Sẵn sàng** | **Chưa** (guard sẽ báo thiếu cột/bảng) |
| Cổng | 9080–9084 | 9180–9184 |

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

## 4. Cách B — schema `mems_*` local (đang bị chặn)

### 4.1 Vì sao chưa chạy được

HEAD cần các cột/bảng của migration 43–59. Trên DB local hiện mới có 53, 55, 56, 57, 58, 59; **51/52 chưa chạy được** vì precheck tự abort trên schema cũ, và các bảng/cột tương đương 43–50 cũng chưa có. Vì vậy:

- `seed-local-test-org.sh` sẽ **dừng và liệt kê** cột/bảng còn thiếu.
- Muốn dùng cách B phải viết + chạy migration nâng cấp riêng (chưa có trong đợt này).

### 4.2 Khi schema đã đủ

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

## 5. Dọn dẹp

- Cách A: `setup-e2e-db.sh --reset` (xoá & tạo lại 4 schema e2e).
- Cách B: mọi dòng mẫu có id bắt đầu `eeeeeeee-` (account `e2e_*`). Không có script xoá tự động để tránh xoá nhầm; nếu cần, xoá thủ công theo id sau khi đã sao lưu.

## 6. Lỗi thường gặp

| Hiện tượng | Xử lý |
|---|---|
| `port 9080 already in use` | Đổi cổng: `BASE_PORT=9280 ./run-services.sh` + đổi `VITE_API_PROXY_TARGET` |
| `missing DB/JWT/internal key in .env` | Kiểm tra `.env` có `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET_BASE64`, `INTERNAL_API_KEY` |
| People chết với `Unknown column 'system_code'` | Đang trỏ nhầm schema live chưa nâng cấp → dùng cách A |
| 401 sau vài phút | Access token chỉ 5 phút, đăng nhập lại |
| Chữ Việt thành `?` | Nạp SQL bằng `--default-character-set=utf8mb4` (script đã đặt sẵn) |
