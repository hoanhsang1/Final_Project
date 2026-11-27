> ✅ **Trạng thái thực tế 2026-11-26:** FE shell `/dao-tao/tu-dong-xep-lich` đã hoàn tất trong worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell` (27 file / 182 unit test pass, `tsc`/`eslint` sạch), **chưa commit**. Các ô `[ ]` trong plan giữ nguyên để đối chiếu bản gốc. P4 BE/solver vẫn BLOCKED, nút submit vẫn disabled. Nguồn chuẩn: `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md`.

# Design ngắn: FE shell tự động xếp lịch (MEMS)

**Trạng thái:** Chờ bạn duyệt (25/11/2026). Chưa commit, chưa viết code product.

## Intent

Tạo sẵn một màn FE trong khu Đào tạo để phần đã chốt có chỗ hiển thị, còn phần chưa chốt và BE thì sửa sau. Màn này là khung nhập liệu, **không phải solver**.

## Goals

- Có route/menu `/dao-tao/tu-dong-xep-lich` dùng chung `AcademicGuard` + `AcademicConsoleLayout`.
- Dùng lại API lấy danh sách lớp hiện có (`fetchClasses`), không bịa endpoint/DTO auto-schedule.
- Phần đã chốt hiện rõ; phần chưa chốt hiện chữ **“Cần xác nhận”**, không tự chọn giá trị.
- Nút “Tạo nháp lịch” tồn tại nhưng **disabled**; không gọi `/auto-generate`, không tạo dữ liệu thật.

## Non-goals / Anti-goals

- Không tính lịch, không giả định ca 45' hay 90'.
- Không đổi build/lint/CI, không thêm thư viện, không đổi schema/quyền.
- Không hiện trạng thái “đã xếp xong” giả; không gọi API thật.

## Constraints

- T1: Astryx/ConsoleShell, không Tailwind/shadcn/antd.
- T2: không copy nguyên FE `origin/main`.
- T3: không port BE auto-schedule lúc này.
- T4/T5: không đổi build/lint/CI; không đụng DB/production migration.
- T6: điểm chưa chốt phải ghi “Cần xác nhận”, không suy đoán.
- BR-08/WCAG 2.1 AA: không dùng màu làm tín hiệu duy nhất; đủ 5 trạng thái UI.

## Approaches

1. **Shell UI + phần đã chốt (chọn).** Tốn ít file nhất, đúng ý “tạo sẵn, sửa sau”. Khóa được giao diện/điều hướng mà không khóa nghiệp vụ chưa chốt.
2. **Shell + mock solver tạm.** Demo được ngay nhưng phải tự chọn 45'/90' hoặc quy tắc phòng → vi phạm T6 và dễ bị hiểu là đã chốt. Loại.
3. **Port khung từ `origin/main`.** Kéo theo Tailwind/Radix/DTO lệch, sửa lại nhiều hơn viết mới. Loại theo T1/T2.

## Phần đã chốt được dùng

- **C1/D7:** lịch có dùng phòng → giữ thông tin “có dùng phòng”.
- **S1:** nhận cả 2 nguồn (chương trình có sẵn / nhập tay); mặc định bật tự động xếp khi người dùng đã set up đầy đủ dữ liệu đầu vào.
- **Chưa chốt:** D11/D10 (bảng tiết & quy đổi buổi↔tiết), phạm vi phòng (C3/D7), D8/D9, tiêu chí “đầy đủ dữ liệu đầu vào”.

## Thiết kế chi tiết

### File sẽ thêm/sửa

| File | Việc |
|---|---|
| `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.tsx` | Màn shell (mới) |
| `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx` | Unit test (mới) |
| `frontend/src/features/schedule/autoScheduleMessages.ts` | Nhãn/messages tiếng Việt (mới) |
| `frontend/src/router.tsx` | `React.lazy` + route con `tu-dong-xep-lich` dưới `/dao-tao` |
| `frontend/src/features/sprint4/academicMenu.ts` | 1 mục menu + `activeAcademicMenuKey` |
| `frontend/src/router.test.tsx` | 1 ca route chưa đăng nhập bị đưa về `/dang-nhap` |

Không thêm file `api.ts`/`types.ts` DTO auto-schedule khi BE chưa chốt contract. Dùng `fetchClasses` có sẵn với `queryKey` riêng `['auto-schedule', 'classes', ...]` để không đụng cache của `ClassesPage`.

### Menu / quyền — quyết định của mình

Nhánh hiện tại chưa có mã `SCHEDULE_*` trong `features/auth/permissions.ts`. Để không đổi mã quyền, mục menu dùng chung `canViewClasses` (giống màn Lớp học). Khi BE chốt `SCHEDULE_CREATE`, chỉ đổi condition này; không sửa guard/layout.

### Giao diện (text sketch)

```text
Tự động xếp lịch
[Có dùng phòng — phạm vi: Cần xác nhận C3/D7]

[Chọn lớp: Selector từ fetchClasses]
[Nguồn đầu vào: SegmentedControl
   Chương trình có sẵn | Nhập tay]
[Từ ngày — Đến ngày: DateRangeInput]
[Ngày học: CheckboxList]

Khi “Nhập tay”:
  [Số buổi/tuần — Cần xác nhận D8]
  [Số phút/buổi / khung giờ — Cần xác nhận D9/D10]

Banner warning (luôn mở):
  “Bảng tiết chưa chốt (D11/D10). Màn này chỉ tạo khung nhập liệu;
   chưa gửi yêu cầu xếp lịch.”

[Tự động xếp: Switch mặc định bật — chờ đủ dữ liệu đầu vào]
[ Tạo nháp lịch ]  ← disabled, có chú thích “Chờ chốt D11/D10 + BE”
```

### Hành vi

- Dùng `useFormState` có sẵn; không cài `react-hook-form`/`zod`.
- 5 trạng thái:
  - loading: `Skeleton` + `role="status"`/`aria-busy`;
  - empty: `EmptyState` “Chưa có lớp để xếp lịch”;
  - error: `Banner status="error"` + “Thử lại”;
  - success: dữ liệu lớp đã tải, form hiển thị;
  - no-permission: `ForbiddenNotice` nếu `canViewClasses` sai.
- `Button` luôn disabled (`aria-disabled` thật, không chỉ CSS) cho đến khi có BE contract + D11/D10. Không có mutation, không toast success.
- `Banner` dùng `collapsible={false}`; nhãn “Cần xác nhận” là chữ, không chỉ màu.

### Test

- `AutoSchedulePage.test.tsx`: mock `fetchClasses`; kiểm tra các nhãn đã chốt, các chỗ “Cần xác nhận”, nút disabled, và **không** có request auto-generate; thêm ca error/empty.
- `router.test.tsx`: `/dao-tao/tu-dong-xep-lich` khi chưa đăng nhập → `/dang-nhap`.
- Không thêm E2E trong slice này (bộ E2E admin đang được dọn riêng).

## Còn lại cho builder sau khi chốt

1. D11/D10: bảng tiết 45' hay 90' và quy đổi buổi↔tiết.
2. C3/D7: phạm vi phòng (tổ chức hay phòng ban).
3. D8/D9 + định nghĩa “đầy đủ dữ liệu đầu vào”.
4. BE contract auto-generate + mã quyền `SCHEDULE_*` (nếu có) → mới bật nút và nối API.
