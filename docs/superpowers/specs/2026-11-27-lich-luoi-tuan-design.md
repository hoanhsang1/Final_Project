# Thiết kế ngắn: lưới tuần cho trang lịch (P4)

- Ngày: 2026-11-27
- Trạng thái: chờ duyệt
- Phạm vi: FE only, `/dao-tao/lich` và `/dao-tao/lich-cua-toi`

## Intent / why

Người dùng xem lịch dưới dạng bảng dòng nên không “nhìn ra” lịch. Sau khi so sánh
`https://schedulebuilder.net/` và case study của UT Austin, người dùng chọn phong cách
ScheduleBuilder và **phối màu pastel** của trang này. Mục tiêu là biến buổi học thành
các khối màu nằm đúng ngày/giờ trên lưới tuần, vẫn giữ toàn bộ thao tác hiện có.

## Goals

- Thay bảng bằng lưới 7 cột (T2–CN), trục giờ dọc, mỗi buổi là một khối pastel.
- Đọc được ngay: môn/lớp, giờ, phòng, giáo viên; trạng thái huỷ vẫn nhận ra được.
- Dùng chung cho lịch phòng ban và lịch cá nhân; click khối mở dialog sửa ở trang quản lý.
- Giữ nguyên 5 state (loading/empty/error/success/forbidden), filter, quyền, API.

## Non-goals / anti-goals

- Không kéo-thả (drag/drop), không đổi BE/contract, không thêm dependency.
- Không sửa màn tự xếp lịch, không đổi build/lint/CI, không commit/push/merge.
- Không làm hero/toolbar nổi kiểu landing ScheduleBuilder (đó là phương án B, bị loại).

## Constraints

- FE giữ Astryx cho `PageHeader`, filter, `Dialog`, `Banner`, `Button`, `EmptyState`.
- Chỉ thêm component và CSS riêng cho phần lưới; không copy FE `origin/main`.
- Trang/chạm thử dùng `http://localhost:5173`; gateway chỉ cho origin này.
- Màu lấy trực tiếp từ CSS thực tế của schedulebuilder.net (đã soi computed style).

## Approaches đã cân nhắc

| | A (chọn) | B (loại) |
|---|---|---|
| Làm gì | Giữ khung trang, đổi vùng dữ liệu sang lưới tuần | Làm lại toàn màn theo landing: hero xanh, toolbar nổi, kéo-thả |
| Chi phí | 1 component + helper + 2 page + test | Nhiều logic kéo-thả, kiểm tra conflict, rủi ro cao |
| Kết quả | Đúng nhu cầu “nhìn được lịch”, thao tác cũ nguyên vẹn | Đẹp hơn nhưng vượt yêu cầu |

## Token màu (ScheduleBuilder, đã trích xuất)

| Vai trò | Giá trị |
|---|---|
| Nền trang | `#F9FAFB` |
| Chữ chính | `#0F1729` |
| Chữ phụ | `#6B7280` |
| Đường kẻ ô | `#E5E7EB` |
| Xanh hành động | `#2461DB` |
| Khối xanh / lá / tím / hồng / vàng | `#D6E2F3` / `#D1E5DB` / `#E2D7EF` / `#EED9E4` / `#F1E3C5` |

Font: `Inter` theo sau là font hiện tại của Astryx (không cài font mới).
Khối bo góc `4px`, tiêu đề khối `11px/600`, nhãn giờ `11px/500`.

## Bố cục (wireframe)

```text
┌──────────────────────────────────────────────────────────────┐
│ Lịch phòng ban   [←] Tuần 07–13/12/2026 [→]      [Thêm buổi] │
│ [Từ ngày] [Đến ngày] [Mã lớp] [Tìm]   [Tự xếp lịch]          │
├────────┬───────┬───────┬───────┬───────┬───────┬───────┤
│        │ T2 07 │ T3 08 │ T4 09 │ T5 10 │ T6 11 │ T7 12 │
│ 07:00  │       │       │       │       │       │       │
│ 08:00  │[Toán] │       │[Java] │       │       │       │
│        │ 7:30  │       │ 9:00  │       │       │       │
│ 09:00  │ P101  │       │ P201  │       │       │       │
└────────┴───────┴───────┴───────┴───────┴───────┴───────┘
```

Cột giờ rộng ~64px; 7 cột ngày chia đều; chiều cao 1 giờ = 56px.
Khung giờ 07:00–20:00, độ chính xác 15 phút (đủ cho tiết 45 phút).

## Hành vi đã chốt (các quyết định của người thiết kế)

- **Tuần hiển thị:** component tự chọn tuần của buổi đầu tiên (hoặc tuần hiện tại nếu
  không có dữ liệu), có nút `←`/`→` để đổi tuần. Filter from/to vẫn gửi API như cũ.
- **Màu khối:** băm ổn định từ `subjectName || className || classId` → 5 màu pastel;
  cùng một môn luôn cùng một màu; màu chỉ là tín hiệu phụ, chữ vẫn đầy đủ.
- **Trùng giờ:** xếp các buổi chồng nhau thành nhiều “lane” trong cùng ô, chia đều chiều
  rộng; không giấu buổi nào.
- **Ngoài khung 07:00–20:00 / quá nửa đêm:** kẹp về mép lưới và hiện dòng đếm
  “N buổi ngoài khung giờ” kèm chi tiết bằng `<details>` — không mất dữ liệu.
- **Huỷ:** giữ màu nhưng mờ đi, gạch chữ và viền đứt; vẫn là nút bấm được.
- **Không có quyền sửa:** khối vẫn hiển thị và focus được nhưng không có hành động sửa.
- **Lịch cá nhân:** dùng chung grid, không nút sửa; ưu tiên hiện môn + lớp + giáo viên
  (vì với giáo viên thì “lớp” là thông tin quan trọng nhất).
- **Phím tắt/mouse:** mỗi khối là `<button type=button>` với `aria-label` đầy đủ
  “HH:mm–HH:mm, môn, lớp, giáo viên, phòng, trạng thái”.

## Cấu trúc code dự kiến

- Mới `frontend/src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.tsx` + `.css`.
- Mới `frontend/src/features/schedule/weeklyGrid.ts` (thuần function, dễ test):
  `weekKey`, `shiftWeek`, `layoutWeek`, `pastelFor`.
- Mới test `weeklyGrid.test.ts`.
- Sửa `SchedulePage.tsx`: thay phần render `Table` bằng grid; giữ nguyên dialog/form/
  mutation/filter/link/quyền; click khối → `openEdit(item)`.
- Sửa `MySchedulePage.tsx`: thay `Table` bằng grid, không action.
- Cập nhật test của 2 trang cho khớp cấu trúc mới (không đổi kỳ vọng quyền/API).

## Kiểm tra

- `npm test`, `npm run lint`, `npx tsc -b --pretty false`.
- Chụp lại 2 trang trên `http://localhost:5173` với dữ liệu demo tháng 12/2026
  để đối chiếu trực quan với ScheduleBuilder.
- `git diff --check`; HEAD/staged/không xoá file giữ nguyên; không commit.

## Chưa quyết thêm

Không có — những điểm còn lại là lựa chọn nhỏ của người thiết kế, đã ghi rõ ở trên.
