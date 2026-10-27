/**
 * Danh sách module LÕI — `BR-06`: 4 module lõi không thể bỏ khỏi cấu hình.
 *
 * ⚠️ Hiện chưa có cột `is_core` trong bảng `module` (`D-15`), nên luật này
 * **không có chỗ biểu diễn trong DB**. FE hardcode ở đúng MỘT hằng số này để
 * chờ Sang thêm `is_core` — sau đó chỉ cần đổi hằng số, không phải sửa UI.
 *
 * Nguồn: SRS §4.1 (4 module lõi) — đã đối chiếu với bảng `module` trong DB.
 */
export const CORE_MODULES: readonly string[] = [
  'STUDENT_MANAGEMENT',
  'TEACHER_MANAGEMENT',
  'CLASS_MANAGEMENT',
  'SCHEDULE_MANAGEMENT',
];

/** Module này có phải module lõi (bị khoá, không cho bỏ) không? */
export function isCoreModule(code: string): boolean {
  return CORE_MODULES.includes(code);
}
