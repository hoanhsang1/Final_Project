# Rollback plan — Migration 51/52 (Phase 1 Revision 3)

> **DRAFT — chưa chạy migration nào.** Tài liệu này chỉ mô tả kế hoạch; không có lệnh nào được thực thi.

## 1. Thứ tự rollback

Rollback ngược thứ tự tạo: drop FK → drop unique/index → drop bảng/cột.

| Bước | Việc | Lệnh gợi ý | Ghi chú |
|---|---|---|---|
| R1 | Bỏ FK history | `ALTER TABLE class_subject_history DROP FOREIGN KEY fk_csh_class;` | Bắt buộc trước khi drop bảng |
| R2 | Export history | `SELECT * FROM class_subject_history;` → lưu file | **Bắt buộc** nếu định drop |
| R3 | Drop history | `DROP TABLE class_subject_history;` | Chỉ sau R2 |
| R4 | Drop unique primary | `ALTER TABLE class_subject DROP INDEX uq_class_subject_primary;` | Nếu **giữ** bảng và chỉ bỏ primary: phải drop cột sinh `primary_class_id` **trước** khi drop `is_primary` (cột sinh phụ thuộc `is_primary`); thứ tự: drop index → `DROP COLUMN primary_class_id` → `DROP COLUMN is_primary` |
| R5 | Drop FK class_subject | `ALTER TABLE class_subject DROP FOREIGN KEY fk_class_subject_class, DROP FOREIGN KEY fk_class_subject_subject, DROP FOREIGN KEY fk_class_subject_curriculum, DROP FOREIGN KEY fk_class_subject_teacher;` | — |
| R6 | Drop class_subject | `DROP TABLE class_subject;` | Mất snapshot môn của lớp |
| R7 | Drop teacher_subject / specialty_subject | `DROP TABLE teacher_subject; DROP TABLE specialty_subject;` | — |
| R8 | Drop prerequisite | `DROP TABLE curriculum_subject_prerequisite;` | Trước curriculum_subject |
| R9 | Drop curriculum_subject | `DROP TABLE curriculum_subject;` | — |
| R10 | Drop FK curriculum của lớp | `ALTER TABLE school_class DROP FOREIGN KEY fk_school_class_curriculum;` | — |
| R11 | Drop cột | `ALTER TABLE school_class DROP COLUMN curriculum_id;` | — |
| R12 | Drop curriculum | `DROP TABLE curriculum;` | — |
| R13 | Drop unique lớp | `ALTER TABLE school_class DROP INDEX uq_school_class_id_org;` | Chỉ sau khi mọi FK tổ hợp đã drop |
| R14 | Trả index code (nếu đã đổi) | `ALTER TABLE subject DROP INDEX uq_subject_org_code, ADD INDEX uq_subject_org_code (org_id, code);` | Không mất dữ liệu |

## 2. Dữ liệu có thể mất

- `class_subject_history`: **mất vĩnh viễn** nếu drop mà không export (actor/thời điểm/lý do/nguồn
  không thể tái tạo).
- `class_subject`: mất snapshot môn/giáo viên/số buổi đã cấu hình cho lớp.
- `class_subject.is_primary`: mất dấu primary; có thể suy lại từ `school_class.subject_id` nếu dữ
  liệu còn nhất quán.
- Backfill `source='LEGACY'`: xoá các dòng này sẽ mất bản ghi môn legacy đã tạo từ `school_class`.
- `teacher_subject`/`specialty_subject`: mất cấu hình chuyên môn đã nhập sau migration.

## 3. Điều kiện an toàn để rollback

1. Không còn request đổi môn chính/áp curriculum đang chạy.
2. Đã export `class_subject_history` và `class_subject`.
3. Đã xác nhận `school_class.subject_id` vẫn khớp primary trước khi drop cột/index.
4. Đã drop FK theo đúng thứ tự; không drop index mà FK còn dùng.
5. Có backup DB tại thời điểm trước migration.

## 4. Khi nào forward-fix thay vì rollback

- Migration đã chạy và **đã phát sinh history** hoặc người dùng đã cấu hình `class_subject` mới.
- Chỉ sai constraint/index/backfill cục bộ → viết migration bổ sung (forward-fix) sửa đúng phần sai,
  **không** drop bảng/cột, **không** xoá history.
- Không sửa file 51/52 đã áp dụng; luôn tạo file mới.

## 5. Migration 53

Revision 3 **không** tạo migration 53. Chỉ tạo 53 khi có bằng chứng (query `information_schema` trên
môi trường thật) rằng một bản 52 cũ đã được áp dụng và cần bù phần thiếu.
