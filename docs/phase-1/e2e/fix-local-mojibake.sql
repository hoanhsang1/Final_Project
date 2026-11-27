-- Sửa tên bị méo encoding trong dữ liệu seed cũ trên DB local (2026-11-27).
-- Nguồn: các lần seed ngày 2026-11-06 19:31 và 2026-11-20 14:59 chạy qua client
-- không dùng utf8mb4 nên dấu tiếng Việt bị thay bằng '?'. Dữ liệu tạo qua API/FE
-- (ví dụ 2026-11-27) lưu đúng, nên chỉ cần vá các dòng dưới đây.
-- Idempotent: mỗi UPDATE khớp theo id/code và chỉ đổi cột tên/mô tả.
-- Chạy: mysql --default-character-set=utf8mb4 -h127.0.0.1 -P3306 -u... -p... < fix-local-mojibake.sql

USE mems_people_db;

UPDATE subject SET name = 'Mạng máy tính & Truyền thông',
    description = 'Mô hình OSI, TCP/IP, Routing', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'NETWORKING';
UPDATE subject SET name = 'Phát triển Web Fullstack',
    description = 'HTML, CSS, React và Node.js API', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'WEB_DEV';
UPDATE subject SET name = 'Lập trình Python',
    description = 'Cơ bản và nâng cao về ngôn ngữ Python', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'PYTHON';
UPDATE subject SET name = 'Lập trình Di động',
    description = 'Xây dựng ứng dụng di động đa nền tảng', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'MOBILE';
UPDATE subject SET name = 'Cấu trúc dữ liệu & Giải thuật',
    description = 'Danh sách liên kết, Cây, Đồ thị, Sắp xếp', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'DATA_STRUCT';
UPDATE subject SET name = 'An toàn & Bảo mật thông tin',
    description = 'Mật mã học, bảo mật ứng dụng web và mạng', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'CYBER_SEC';
UPDATE subject SET name = 'Tiếng Anh chuyên ngành CNTT',
    description = 'Từ vựng kỹ thuật và giao tiếp trong dự án phần mềm', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'ENGLISH_IT';
UPDATE subject SET name = 'Trí tuệ nhân tạo & Machine Learning',
    description = 'Học máy cơ bản, hồi quy, phân loại dữ liệu', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'AI_ML';
UPDATE subject SET name = 'Cơ sở dữ liệu & SQL',
    description = 'Thiết kế CSDL quan hệ và tối ưu truy vấn', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'DATABASE';
UPDATE subject SET name = 'DevOps & Điện toán đám mây',
    description = 'Docker, CI/CD pipeline, AWS & Cloud', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND code = 'DEVOPS';

UPDATE school_class SET name = 'Lớp Test K27', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND class_code = 'TEST-K27';
UPDATE school_class SET name = 'Lớp Mới Thử Nghiệm', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND class_code = 'TEST-NEW-01';

UPDATE staff_profile SET full_name = 'Nguyễn Văn An', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV002';
UPDATE staff_profile SET full_name = 'Trần Thị Bạch', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV003';
UPDATE staff_profile SET full_name = 'Lê Hoàng Cường', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV004';
UPDATE staff_profile SET full_name = 'Phạm Mỹ Duyên', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV005';
UPDATE staff_profile SET full_name = 'Hoàng Minh Đức', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV006';
UPDATE staff_profile SET full_name = 'Đặng Thúy Hằng', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV007';
UPDATE staff_profile SET full_name = 'Vũ Đình Khôi', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV008';
UPDATE staff_profile SET full_name = 'Bùi Thanh Lan', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV009';
UPDATE staff_profile SET full_name = 'Ngô Quang Minh', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV010';
UPDATE staff_profile SET full_name = 'Phan Thu Phương', updated_at = NOW(3)
WHERE org_id = 'eff0ce1e-1234-4892-a9f7-031383a681a5' AND staff_code = 'GV011';

UPDATE position SET name = 'Nhân viên'
WHERE id = '33333333-3333-4333-8333-333333333007';
UPDATE position SET name = 'Nhân viên cơ sở vật chất'
WHERE id = '33333333-3333-4333-8333-333333333006';

USE mems_facility_db;

UPDATE classroom SET name = 'Phòng Thực hành Máy tính B201', updated_at = NOW(3)
WHERE id = '1084633f-c978-4dbb-b911-d40ddcf16278';
UPDATE classroom SET name = 'Phòng Thực hành Máy tính B202', updated_at = NOW(3)
WHERE id = '032f1dcd-457d-4205-a38c-4830c88eb324';
UPDATE classroom SET name = 'Phòng Thực hành Máy tính B101', updated_at = NOW(3)
WHERE id = '8c305c62-2747-4fb7-8e48-5a8dad6f56f4';
UPDATE classroom SET name = 'Phòng Thực hành Máy tính B102', updated_at = NOW(3)
WHERE id = '2ccaa936-1966-4103-b30f-2dd0fec18dd6';
UPDATE classroom SET name = 'Phòng Thực hành Máy tính 201', updated_at = NOW(3)
WHERE id = '1da597b1-e4e1-11f1-bab4-74d4dd2c201f';
UPDATE classroom SET name = 'Phòng Lý thuyết 202', updated_at = NOW(3)
WHERE id = '1da5ffca-e4e1-11f1-bab4-74d4dd2c201f';
UPDATE classroom SET name = 'Phòng Hội thảo 203', updated_at = NOW(3)
WHERE id = '1da608ff-e4e1-11f1-bab4-74d4dd2c201f';
UPDATE classroom SET name = 'Phòng học 102', updated_at = NOW(3)
WHERE id = '1da6a093-e4e1-11f1-bab4-74d4dd2c201f';
UPDATE classroom SET name = 'Phòng Máy 101', updated_at = NOW(3)
WHERE id = '1da6b4cd-e4e1-11f1-bab4-74d4dd2c201f';
UPDATE classroom SET name = 'Phòng Lý thuyết A101', updated_at = NOW(3)
WHERE id = '38670b27-1c9b-469e-8930-0048b71667e1';
UPDATE classroom SET name = 'Phòng Lý thuyết A102', updated_at = NOW(3)
WHERE id = '4d8fe182-f5c0-4194-b16b-17d5ddd1b947';
UPDATE classroom SET name = 'Phòng Lý thuyết A201', updated_at = NOW(3)
WHERE id = '31e8dc44-3b0f-4138-a209-79dc42ee426c';
UPDATE classroom SET name = 'Phòng Lý thuyết A202', updated_at = NOW(3)
WHERE id = '32018317-7d3c-49c9-9c18-618c273dea3e';
UPDATE classroom SET name = 'Phòng Lý thuyết A301', updated_at = NOW(3)
WHERE id = '89317f79-7adb-4f2f-93d5-2b208a86b2b5';
UPDATE classroom SET name = 'Phòng Lý thuyết A302', updated_at = NOW(3)
WHERE id = '58913c9c-681f-476c-b101-7af5a85607a6';

USE mems_schedule_db;

UPDATE `class` SET name = 'Lớp Test K27'
WHERE id = '04e7bc25-e4e4-11f1-bab4-74d4dd2c201f';
UPDATE `class` SET name = 'Lớp Mới Thử Nghiệm'
WHERE id = 'c9e32fe4-8169-4ed1-8cdb-3c3da6f2cbc2';
