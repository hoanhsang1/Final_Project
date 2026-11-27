# Định nghĩa Gói chuẩn / Gói doanh nghiệp — quyết định 26/11/2026

> **Trạng thái:** đã chốt về nghiệp vụ bởi người dùng ngày 26/11/2026; **chưa triển khai code, migration hay onboarding**. Đây là nguồn chuẩn cho cách gọi và tiêu chí phân gói. Các câu hỏi cũ trong `docs/scope-cau-hoi-can-chot.md` vẫn là snapshot thảo luận 16–18/11, đối chiếu vào đây.
>
> **Thuật ngữ:** trong UI/API/DB dùng **“Gói chuẩn”** và **“Gói doanh nghiệp (Enterprise)”**. “Khách thường / khách VIP” chỉ là cách gọi trong trao đổi, không đưa vào mã nguồn hay tên cột.

## 1. Tiêu chí đã chốt

| Gói | Điều kiện |
|---|---|
| **Gói chuẩn** | Tổ chức **chỉ dùng** các module: Quản lý học sinh, Thiết bị, Giáo vụ **và không có phòng ban nào ngoài 3 nhóm chức năng** Học sinh / Thiết bị / Giáo vụ. |
| **Gói doanh nghiệp (Enterprise)** | Tổ chức có **ít nhất một phòng ban thuộc nhóm chức năng khác** (ví dụ: Nhân sự, Tài chính, CNTT), kể cả khi module đang bật vẫn nằm trong tập chuẩn. |

**Không dùng số lượng phòng ban làm ngưỡng.** Ví dụ trong `db.sql`: tổ chức `1111…` có 1 phòng ban (Tổ Toán – Tin) → Gói chuẩn; tổ chức `eff0…` có 2 phòng ban (Tài Chính, CNTT) → Gói doanh nghiệp **vì là phòng ban khác**, không phải vì con số 2.

## 2. Ánh xạ module (đã chốt)

| Nhóm nghiệp vụ người dùng nói | Module code trong hệ thống |
|---|---|
| Quản lý học/sinh viên | `STUDENT_MANAGEMENT` |
| Thiết bị | `EQUIPMENT_MANAGEMENT` (`FACILITY_MANAGEMENT` là tên legacy, xem `module_legacy_map` trong `db.sql`) |
| Giáo vụ | `TEACHER_MANAGEMENT` + `CLASS_MANAGEMENT` + `SCHEDULE_MANAGEMENT` |

## 3. Nguyên tắc xác định hạng (đã chốt)

- **Không thêm cột** `tier` / `package` / `is_vip` / `priority` vào bảng `organization`.
- Hạng được **suy ra từ dữ liệu hiện có** khi cần hiển thị/kiểm tra:
  - module đang bật: `organization_module` (Identity DB);
  - phòng ban: `department` (People DB);
  - nhóm chức năng của từng phòng ban (xem mục 4).
- Không tự ghi đè hạng thủ công, không chạy migration/production trong đợt này.

## 4. Nhóm chức năng của phòng ban — đã chọn hướng 26/11

Để áp được tiêu chí “ngoài 3 nhóm chức năng”, hệ thống phải biết **mỗi phòng ban thuộc nhóm nào**. Hiện bảng `department` chỉ có `id`, `org_id`, `name`, `description`, `created_at` — **chưa có thông tin nhóm**.

Ngoài ra, dữ liệu mẫu trong `db.sql` gán phòng ban **CNTT** với các module `STUDENT_MANAGEMENT`, `SCHEDULE_MANAGEMENT`, `FACILITY_MANAGEMENT` — tức là nếu suy nhóm từ `department_module` thì sẽ **nhầm thành Gói chuẩn**. Cần một nhãn nhóm riêng, không suy từ tên hay module.

**Quyết định:** thêm cột nhóm chức năng trên `department` bằng một **migration mới**, không sửa `07_people_department_access.sql` (file đó vẫn lỗi DDL và chỉ được báo cáo).

File đã được tạo: **`10_department_functional_group.sql`** (tên 08 và 09 đã dùng cho facility/schedule). **Chưa chạy DB.** Câu lệnh cốt lõi:

```sql
ALTER TABLE department
  ADD COLUMN functional_group ENUM('STUDENT','EQUIPMENT','ACADEMIC','OTHER')
  NOT NULL DEFAULT 'OTHER' COMMENT 'Nhóm chức năng phục vụ phân gói';
```

File dùng mẫu idempotent giống `08_facility_department_access.sql` (kiểm tra `information_schema` trước khi `ALTER`). **Điều kiện chạy:** bảng `department` phải tồn tại, tức là `07_people_department_access.sql` phải được sửa/chạy thành công ở đợt khác — file mới này không tự sửa 07.

Ánh xạ giá trị: `STUDENT` = Học sinh, `EQUIPMENT` = Thiết bị, `ACADEMIC` = Giáo vụ (giáo viên + lớp + lịch), `OTHER` = phòng ban khác → **Gói doanh nghiệp**. Dữ liệu cũ mặc định `OTHER` (tức là chưa gán nhóm thì không tự coi là Gói chuẩn).

Phương án đã loại: bảng phụ ánh xạ `department → nhóm`; đếm số phòng ban vượt ngưỡng (không đúng tiêu chí đã chốt).

## 5. Phạm vi đợt này

- Chỉ có định nghĩa/thiết kế này + 1 file SQL mới; **không đổi FE, BE, SQL đang chạy, không commit**.
- Đã tạo `10_department_functional_group.sql` nhưng **chưa chạy DB**; chưa thiết kế màn onboarding/cập nhật nhóm phòng ban; chưa định nghĩa hành vi khi tổ chức đổi hạng.
- Migration mới nằm ở thư mục gốc cho khớp `01`–`09`; khi dọn cấu trúc sau này sẽ `git mv` sang `db/migrations/`. **Không đụng** `07_people_department_access.sql`.
- Cập nhật các ô `[ ]` liên quan trong `docs/scope-cau-hoi-can-chot.md` (mục 1.1–1.3 và 5) thành `[x]` kèm link vào file này sau khi migration và luồng gán nhóm được duyệt.

## 6. Tham chiếu

- `docs/scope-cau-hoi-can-chot.md` — checklist thảo luận 16–18/11 (snapshot, chưa phải quyết định).
- `docs/trang-thai-hien-tai-2026-11-26.md` — trạng thái hiện tại của repo.
- `05_seed_admin.sql` — module code đang seed.
- `db.sql` — `module_legacy_map`, dữ liệu `department`/`department_module` mẫu.
