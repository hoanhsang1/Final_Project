# Quy ước giao diện MEMS (v1 — 13/11/2026)

> Mục đích: chặn "giao diện AI" tái phát. Mọi màn hình mới **lắp từ 6 khối ở mục 4**,
> không tự đặt màu / px / radius. Chỉ `src/theme.ts` được chứa giá trị thô.

## 1. Đích thiết kế

Phần mềm quản lý giáo dục **chuyên ngành, đáng tin** — tham chiếu: SMAS, VNEdu.
Không phải landing page, không phải SaaS marketing.

Ba tính từ để tự kiểm: **mật độ** (nhiều dữ liệu, ít khoảng trống chết), **kỷ luật**
(một primary/màn, một radius, một shadow), **chất liệu ngành** (mã lớp, sĩ số, GVCN,
trạng thái lớp — dùng làm cấu trúc, không chỉ là cột).

## 2. Màu — "mực xanh học vụ"

| Vai trò | Hex | Dùng ở đâu |
|---|---|---|
| `brand` | `#0E4A8B` | CTA, link, mục menu đang chọn. Tương phản trên trắng ≈ 8.8:1 |
| `brandHover` | `#1359A5` | hover |
| `brandActive` | `#0A3A6E` | pressed |
| `brandSoft` | `#E9F0F8` | nền mục chọn, hover row, tag nhẹ |
| `canvas` | `#F2F4F7` | nền trang |
| `surface` | `#FFFFFF` | bảng, form, header, sider |
| `text` | `#101828` | chữ chính |
| `textSecondary` | `#475467` | nhãn, mô tả, header bảng |
| `border` | `#E4E7EC` | hairline, divider, viền bảng |
| `borderInput` | `#667085` | viền field (đủ 3:1 — WCAG 1.4.11) |
| `success` / `warning` / `error` | `#067647` / `#B54708` / `#B42318` | chỉ trạng thái |

**Luật màu:** primary chiếm **≤5% diện tích** một màn. Header **không** tô màu brand.
Không gradient. Không màu trang trí. Trạng thái luôn có **chữ + màu** (BR-08).

## 3. Chữ & nhịp

Thang: **12 / 14 / 16 / 24 / 40** (caption → body → section → h1 → hero).
Không có mốc lửng 13/15/17 — hai mốc chỉ hơn kém 2px thì mắt không đọc ra cấp bậc.
Inter (theo design system). Heading `600`; nhấn trong nội dung (nút, số liệu, nhãn
quan trọng) `500`; còn lại `400`. **Không dùng 700.**

- Số liệu (sĩ số, mã lớp, thời gian, phân trang): `font-variant-numeric: tabular-nums`.
- **Không** dùng ALL-CAPS làm nhãn. Không đặt "eyebrow" trên tiêu đề.
- Line-height: body 1.55, heading 1.3. Độ dài dòng ≤ 80 ký tự.

Nhịp 8pt: block 8 · 16 · 24 · 32 · 48. Padding trang: **32 desktop / 16 mobile**.
Khoảng cách section: **32**. Khoảng cách trong block: **16**.

## 4. Sáu khối dùng chung

| Khối | Spec |
|---|---|
| `PageHeader` | H1 24/600 + 1 dòng mô tả (≤1 câu) + `extra` (tối đa 1 primary). Breadcrumb chỉ khi sâu ≥2 cấp. Cách nội dung dưới 24. |
| `Toolbar` | Một hàng: lọc trái, tìm kiếm + primary phải. Cao 36. Không bọc card. |
| `DataTable` | Không card. Header `#F7F8FA` / chữ 12/500 secondary, sticky. Row 42, hairline. Cột đầu = link đậm; cột số căn phải + tabular. |
| `DetailSection` | `h2` 16/600 + hairline dưới + nội dung. **Không** dùng `<Card>` lồng nhau; Card chỉ khi khối là một đối tượng độc lập (form, hộp xác nhận). |
| `EmptyState` | Icon mảnh 32 + 1 câu nêu **việc cần làm** + 1 CTA (nếu có quyền). Không minh hoạ lớn. |
| `ForbiddenNotice` | Nêu thiếu quyền gì + liên hệ ai. Không chỉ "403". |

## 5. Năm luật chống "AI look"

1. **Không card bọc danh sách.** Danh sách = PageHeader + Toolbar + DataTable trên canvas.
2. **Một primary mỗi màn.** Nút còn lại `default`/`text`.
3. **Ba cấp bậc, không hơn.** Trang → Khối → Dòng. Nếu cần cấp 4 → tách trang.
4. **Không hardcode.** `#hex`, `rgba(...)`, `px` lẻ chỉ được nằm trong `theme.ts`.
   Bảng/nút dùng token; style inline chỉ cho `display/gap/width` mang tính layout.
5. **Từ vựng của ngành.** "Sĩ số", "GVCN", "Khai giảng", "Đóng lớp" — không
   "Item", "Record", "Status", "Action".

## 6. Kiểm trước khi merge

- [ ] Che logo: vẫn nhận ra là phần mềm quản lý giáo dục?
- [ ] Đếm primary/màn ≤ 1 · radius ≤ 3 · shadow ≤ 2 · hex ngoài token = 0
- [ ] 5 state: loading (skeleton theo layout) / empty / error (có cách sửa) / success / no-permission
- [ ] 320 / 768 / 1024 / 1440 không tràn ngang; bảng cuộn trong khung của nó
- [ ] Bàn phím: tab thấy focus, Esc đóng modal, Enter submit
- [ ] `prefers-reduced-motion` không còn animation

## 7. Ngoại lệ đã biết

- `LoginPage`, `AuthCard`, `RolePreviewPage` dùng `cardStyle` — màn đăng nhập là
  ngoại lệ hợp lý (một thẻ, một việc), giữ nguyên.
- Bảng dài (`AuditLogPage`) được phép dùng card nếu là khối "một bản ghi mở rộng".

## 8. Mốc tham chiếu (đo, không đoán)

Đo ngày **13/11/2026** bằng `getComputedStyle` trên trang thật (công cụ trình duyệt),
đếm theo *số element đang dùng*, không phải theo cảm nhận:

| | Khan Academy | Brilliant | Udemy |
|---|---|---|---|
| Chữ nền | 14px | **14px** (231 element) | 16px **/300** (182 element) |
| Cỡ chữ | 12/14/16/18/20/24/42 | 12/14/16/20/30/44/54 | 12/14/16/17.6/28 |
| Độ đậm nội dung | 400·500·600·700 (44+42+38) | **chỉ 400·500** | 300·400·500·700 |
| Hairline | `#CBCBCD` | `#E4E4E4` | ~`#DCDAD8` |
| Bo góc | 8px | viên thuốc | 8/4/16 |
| Bóng đổ | **1.2%** element | 3.5%, không có trên nội dung | 1% |
| Header | 60px, phẳng | 55px + hairline 0.8px | 72px, **có bóng** |
| Màu nhấn | 1 (`#5753FA`, nền `#EBF1FD`, viền `#BFCAFF`) | 1 (`#279B8D`) | tím + teal + … |

**Theo:** khung của Khan (14px nền, bo 8px, state = nền nhạt + viền, bóng đổ chỉ ở
overlay) + kỷ luật chữ của Brilliant (400/500 trong nội dung). **Không theo** Udemy:
16px/300 + bóng ở header + tím chợ điện tử đúng là "SaaS look" cần tránh.

Không copy: màu indigo `#5753FA` (giữ `#0E4A8B`), minh hoạ vui, bo viên thuốc
(toolbar 4 control dạng thuốc ăn hết chiều ngang, đọc như app tiêu dùng).

Đo lại bằng:

```js
// trong tab đang mở trang cần đo
const s = getComputedStyle(document.body);
({ font: s.fontFamily, size: s.fontSize, color: s.color })
```

Quy tắc rút ra — dùng khi phân vân, không cần mở lại 3 trang kia:

1. Nền **14px**. 16px chỉ cho màn đọc dài.
2. Nội dung **chỉ 400 và 500**. 600 chỉ cho tiêu đề. Không 700.
3. **Một** màu hairline cho mọi đường kẻ trong một màn.
4. **Bóng đổ = 0** trên bề mặt nội dung. Chỉ overlay (dropdown/modal/skip link).
5. **Một** màu nhấn. Trạng thái = nền nhạt + viền + **chữ**, không phải chỉ màu.
