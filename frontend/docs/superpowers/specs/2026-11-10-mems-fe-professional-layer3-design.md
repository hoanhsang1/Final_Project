# MEMS FE — Lớp 3: khu `/dao-tao` (Teachers) mẫu lõi (spec, chờ duyệt)

> Trạng thái: **ĐỀ XUẤT / CHỜ DUYỆT**. Chưa plan/code. 2026-11-10. Tiếp sau Lớp 1+2 (đã verify: tsc/build/targeted tests xanh). Chọn hướng tối ưu: hoàn thiện nhất quán `/dao-tao`.

## 1. Mục tiêu
Áp pattern Lớp 2 (chỉ presentation) cho **2 trang đại diện** `/dao-tao`:
- **List:** `src/pages/TeachersPage/TeachersPage.tsx` — `PageHeader` + toolbar filter/action + state pattern (error+retry, loading/empty). Giữ modal Tạo giáo viên & Quản lý chuyên môn (logic giữ).
- **Detail:** `src/pages/TeacherDetailPage/TeacherDetailPage.tsx` — `PageHeader` (breadcrumb+title+action) + state pattern. **Giữ nguyên tuyệt đối** logic nghiệp vụ.

## 2. Bất biến
- Không đổi contract/API/DTO, route/guard/URL/IA. Không commit/push/merge.
- Giữ `vi_VN`, a11y (label/`role="alert"`/focus), 5-state awareness. Token-driven, không hardcode màu/px; reduced-motion đã có.
- **TeachersPage giữ nguyên:** `queryKey ['teachers',{page,size,department,status,search}]`, `enabled` (luôn fetch theo code hiện tại), filter/search reset page, columns/link `/dao-tao/giao-vien/${id}` (theo quyền), pagination, mutations createTeacher/createSpecialty + invalidate `['teachers']/['specialties']`, `sprint4ErrorMessage`, `MSG_*`, form validate/payload.
- **TeacherDetailPage giữ nguyên tuyệt đối:** `queryKey ['teacher',id]/['specialties']`, optimistic lock **gửi `version: d.version`**, xử lý **`SPECIALTY_MISMATCH`** (`isMismatchError` → mở confirm modal, `confirm:true`), **stale conflict** (`isStaleConflict`/409 path hiện có → `refetch`/reset edit/mismatch) + `message.error(sprint4ErrorMessage)`, mọi `canEdit`/form validate/payload, không báo thành công sai (NFR-REL-001).

## 3. Thay đổi (presentation-only)
- **TeachersPage:** thay `Title` header bằng `PageHeader title={MSG_TEACHER.TITLE}` với `extra` (nút Quản lý chuyên môn / Tạo — giữ điều kiện `canEdit`); filter vào toolbar (`children`). Error block giữ `Alert`+description+Retry `listQuery.refetch()`. Table loading/empty giữ. Modal/Form giữ nguyên.
- **TeacherDetailPage:** thay header thủ công bằng `PageHeader breadcrumb={[{title:'Giáo viên',href:'/dao-tao/giao-vien'},{title: tên}]} title=... extra=...` (action Sửa/Lưu/Huỷ giữ điều kiện). Loading→`Spin`, Error→`Alert role="alert"`+Retry+Quay lại, not-found giữ. Descriptions/Form/Modal mismatch giữ nguyên.

## 4. Xác minh
- `npx tsc -b` exit 0.
- `npm run build` OK.
- Hồi quy: vitest auth/shell/PageHeader (và test liên quan nếu có) xanh. Ghi rõ `router.test.tsx` pre-existing ngoài scope.
- Tự kiểm diff: `TeacherDetailPage` giữ `version`/`isMismatchError`/confirm/`isStaleConflict`/`refetch`/invalidate; `TeachersPage` giữ queryKey/mutation/paging/link/permission.

## 5. Ngoài scope
Không đụng logic data, không thêm trang (không có Specialty route page), không E2E BE (hoãn), không commit/push.