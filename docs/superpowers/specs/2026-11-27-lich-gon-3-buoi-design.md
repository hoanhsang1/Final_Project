# Thiết kế: lịch gọn 3 buổi (Sáng / Chiều / Tối)

- Ngày: 2026-11-27
- Trạng thái: đã duyệt 2026-11-27
- Phạm vi: FE only, `/dao-tao/lich` và `/dao-tao/lich-cua-toi`

## Intent / why

Lưới tuần 07:00–20:00 hiện tại chính xác nhưng quá nặng để “quét” một tuần: người dùng
phải đọc trục giờ rồi mới tới buổi học. Họ muốn một chế độ xem gọn hơn, bỏ trục giờ,
gom mỗi ngày vào 3 buổi **Sáng / Chiều / Tối**. Giáo viên là ngoại lệ: họ vẫn cần lưới
theo giờ ở lịch cá nhân. Nhân viên/quản lý được thấy cả hai và tự chuyển.

## Goals

- Thêm chế độ lịch gọn: 3 hàng buổi × 7 cột T2–CN, giữ điều hướng tuần hiện có.
- Mỗi ô đủ 5 thông tin theo kiểu 3 dòng: `giờ · phòng` / `môn · lớp` / `giáo viên`.
- Phân chế độ theo `backendRoles`: `TEACHER` → lưới giờ, `STUDENT` → lịch gọn, còn lại
  (nhân viên/quản lý) → công tắc `Theo giờ | 3 buổi`, mặc định **3 buổi**.
- Giữ nguyên màu pastel theo môn học (`pastelFor()`), không dùng màu cho trạng thái.
- Buổi hủy: mờ + gạch chữ + dải băng chéo mỏng có chữ “Đã hủy”.
- Giữ nguyên filter, phân quyền, dialog sửa/xóa/hủy, 5 state và API hiện có.

## Non-goals / anti-goals

- Không đổi BE/contract/seed/migration; không thêm endpoint `/impacts` hay `/cancel`.
- Không kéo-thả, không đổi build/lint/CI/dependency, không copy FE `origin/main`.
- Không dùng permission quản lý để quyết định chế độ xem của trang self (dùng `backendRoles`).
- Không bỏ hàng Tối dù dữ liệu mẫu hiện không có buổi tối (DB chỉ có 07h–16h).
- Không commit/push/merge; không đụng worktree FE shell; không sửa file SQL bị cấm.

## Constraints

- FE giữ Astryx; component mới chỉ dùng CSS riêng + token cũ (`#F9FAFB`, `#0F1729`,
  `#E5E7EB`, `#2461DB`, 5 pastel). Không cài font hay dependency mới.
- Chạm thử thật trên `http://localhost:5173`; gateway chỉ origin này.
- `backendRoles` là nguồn phân vai trò: TEACHER và STUDENT có cùng self-permission nên
  không suy vai trò từ permission.
- Màu ô lấy trực tiếp từ `pastelFor()` trong `features/schedule/weeklyGrid.ts` để cùng
  một môn luôn cùng một màu ở cả hai chế độ.
- Ảnh đối chiếu trạng thái hủy hiện tại:
  `C:\Users\night\AppData\Local\Temp\opencode\be-runtime\screenshots\15-tiet-hoc-bi-huy.png`
  (đã chụp, DB đã khôi phục `scheduled`).

## Approaches đã cân nhắc

### Bố cục (đã chọn A)

| | A (chọn) | B (loại) | C (loại) |
|---|---|---|---|
| Làm gì | 3 hàng buổi × 7 cột ngày | 7 hàng ngày × 3 cột buổi | 7 thẻ ngày, chỉ liệt kê buổi có học |
| Đánh đổi | Giữ cảm giác bảng, dò theo buổi trên một hàng | Dò theo ngày trước, khó so sánh chéo buổi | Gọn nhất trên mobile, khó quét chéo |

### Kiểu ô (đã chọn 1)

| | 1 (chọn) | 2 (loại) | 3 (loại) |
|---|---|---|---|
| Xếp | `giờ·phòng` / `môn·lớp` / `giáo viên` | `giờ·phòng` / `môn·lớp·GV` | GV / `môn·lớp` / `giờ·phòng` |
| Đánh đổi | Rõ, ô cao hơn | Ô thấp nhưng tên GV bị rút gọn | Ít nghĩa vì GV dùng lưới giờ |

### Màu và trạng thái (đã chốt)

- Giữ **màu = môn học** như hiện tại; không đổi sang màu = trạng thái (endpoint impacts
  chưa có trong working tree). Nhược điểm: 5 màu nên môn khác vẫn có thể trùng màu.
- “Đã hủy” không đổi màu nền: mờ + gạch chữ + **dải băng chéo nối 2 góc đối diện**,
  hướng dưới-trái → trên-phải (`/`), dải mỏng để đỡ che chữ, chữ trắng “Đã hủy” căn giữa.

## Bố cục (wireframe)

```text
        T2              T3            T4            T5    T6  T7  CN
Sáng  07:30–09:00  |      —      | 09:00–10:30 |     —     |  —   —   —
      P201         |             | B101        |
      Java · 12A1  |             | OOP · 12A2  |
      Võ Thị Vy    |             | Nguyễn Nghĩa|
Chiều 14:00–15:30  |      —      |      —      |     —     |  —   —   —
      LAB201       |             |             |
      Toán · 12A2  |             |             |
      Võ Thị Vy    |             |             |
Tối         —      |      —      |      —      |     —     |  —   —   —
```

Toolbar giữ nguyên `[Từ ngày] [Đến ngày] [Tìm]`, thêm công tắc
`[ Theo giờ | 3 buổi ]` cho nhân viên/quản lý. Nhãn tuần và 2 nút Tuần trước/sau
vẫn nằm phía trên lưới, dùng chung cách tính tuần với `weeklyGrid.ts`.

## Hành vi đã chốt

- **Phân chế độ:** `backendRoles.includes('TEACHER')` → lưới giờ (cả hai trang);
  `backendRoles.includes('STUDENT')` → lịch gọn (không công tắc); các vai trò còn lại →
  công tắc, mặc định `3 buổi`.
- **Công tắc:** hai nút trong một `role="group"` có `aria-pressed`; không lưu qua
  localStorage (mỗi lần mở trang lại mặc định 3 buổi).
- **Ánh xạ buổi** theo giờ địa phương của `startTime`: `<12:00` → Sáng,
  `12:00–<18:00` → Chiều, `>=18:00` → Tối. Buổi qua ranh giới tính theo giờ bắt đầu.
- **Nhiều buổi cùng ô:** xếp chồng theo thứ tự `startTime`, ô tự cao; không cắt bớt.
- **Ô trống:** dấu `—` mờ; hàng Tối luôn hiện.
- **Click ô:** trang quản lý mở đúng dialog sửa như lưới giờ (kể cả khi đang ở chế độ
  gọn); trang self không có hành động sửa.
- **Trạng thái hủy:** chuỗi `status` chứa `cancel`/`huỷ`/`huy` → mờ, gạch chữ, dải băng
  chéo “Đã hủy”; `aria-label` vẫn mang đầy đủ giờ/môn/lớp/GV/phòng/status.
- **Không dùng màu để báo trạng thái**; màu vẫn là `pastelFor(item)`.

## Quyết định bổ sung của người viết (có thể sửa khi duyệt)

- Trang `/dao-tao/lich-cua-toi` của nhân viên/quản lý cũng dùng chung công tắc với
  trang quản lý, mặc định 3 buổi — để nhất quán với câu “nhân viên thấy cả 2”.
- Giới hạn buổi: Sáng `05:00–<12:00`, Chiều `12:00–<18:00`, Tối `18:00–<23:59`;
  buổi ngoài khung vẫn xếp theo giờ bắt đầu và không bị mất.
- Dải băng dùng `#B42318`, chữ trắng, cao ~16px, `transform: rotate(-28deg)` với
  `overflow: hidden` trên ô — đủ đọc nhưng không che dòng môn/lớp.

## Cấu trúc code dự kiến

- Mới `frontend/src/features/schedule/compactSchedule.ts`: `buoiOf(startTime)`,
  `layoutCompactWeek(items, weekStart)` (thuần, dễ test), dùng lại `weekKeyOf`,
  `shiftWeek`, `pastelFor`.
- Mới `frontend/src/features/schedule/scheduleViewMode.ts`: `initialScheduleMode(backendRoles)`
  + label công tắc; test riêng.
- Mới `frontend/src/components/CompactScheduleGrid/CompactScheduleGrid.tsx` + `.css`:
  render 3×7, toolbar tuần, ribbon hủy, `aria-label`, `onSelect`.
- Sửa `SchedulePage.tsx`: thêm công tắc và chọn grid; giữ nguyên form/dialog/mutation/filter.
- Sửa `MySchedulePage.tsx`: chọn grid theo vai trò; nhân viên có công tắc.
- Sửa `scheduleMessages.ts`: nhãn công tắc + nhãn dải “Đã hủy”.
- Cập nhật test của 2 trang + test helper mới; không đổi kỳ vọng quyền/API cũ.

## Kiểm tra

- `npx vitest run`, `npm run lint`, `npx tsc -b --pretty false` với PATH Node portable.
- Chụp 2 trang trên `http://localhost:5173` cho `vyvy` (GV → lưới giờ),
  `demo_student` (HS → lịch gọn), `demo_owner` (công tắc, mặc định 3 buổi);
  kiểm tra URL/H1/dữ liệu và `0` console/HTTP≥400/page error.
- `git diff --check`; HEAD/staged/không xoá file giữ nguyên; không commit.

## Chưa quyết thêm

Không có. Các lựa chọn còn lại là chi tiết CSS nhỏ, đã ghi rõ ở phần quyết định bổ sung.
