# Quy ước giao diện MEMS — v2 (14/11/2026)

> **Đọc gì trước:** sửa code → mục 3, 4, 6. Review → mục 12. Chưa rõ vì sao đổi so với v1 → mục 0.
>
> **Câu chốt:** component lấy từ `@astryxdesign/core`, số đo lấy từ token của nó. Không
> tự đặt màu / px / radius ở call site. Chỉ `astryx-theme.ts` và `theme.ts` được chứa giá trị thô.

## 0. Vì sao v2 thay v1

v1 (13/11) chốt thang chữ **12/14/16/24/40** và **một radius 6px**. Cách đó đúng khi
mọi component là của antd và mình tự dựng theme từ đầu.

Từ P0, toàn bộ component chuyển sang Astryx — thư viện đã có sẵn thang chữ, radius,
spacing và line-height riêng. Nếu vẫn giữ số của v1 thì **mỗi component Astryx phải
ghi đè lại**, tức là tự tạo một bản fork của thư viện: mất công, dễ lệch, và mọi bản
nâng cấp sau này đều phải soát lại.

v2 giữ nguyên *triết lý* của v1 (mật độ, kỷ luật, chất liệu ngành) nhưng lấy **token
thật** của Astryx làm hợp đồng. Ba thay đổi lớn, đều có lý do:

| v1 | v2 | Vì sao |
|---|---|---|
| 12/14/**16**/24/40 | 12/14/**17**/20/24 (+29/35/42 display) | Thang 14 × 1.2 sinh ra 16.8→17, 20.16→20, 24.19→24. Đây là thang lib đang dùng, và line-height của nó rơi đúng lưới 4px. 16px là mốc duy nhất không thuộc thang. |
| radius 6 | 4 / 8 / 12 / 28 | Astryx dùng thang radius. Trong một màn chỉ dùng **tối đa 3** mức: 4 cho dấu nhỏ, 8 cho control, 12 cho khối. 28 chỉ cho sheet toàn trang. |
| shadow 0 trên nội dung | giữ nguyên | Astryx cũng mặc định `elevation="none"` cho Card; bóng chỉ dành cho lớp nổi. |

Thang 17px có vẻ "lạ" so với thói quen 16px, nhưng đó là mốc **1.2 × 14** — cùng một
quy luật với 20 và 24. Giữ 16px sẽ phải ghi đè token của cả `Text`, `Heading`, `Table`,
`Dialog`… và mỗi lần nâng cấp thư viện lại phải kiểm tra ghi đè còn đúng không.

## 1. Đích thiết kế

Phần mềm quản lý giáo dục **chuyên ngành, đáng tin** — tham chiếu SMAS, VNEdu.
Không phải landing page, không phải SaaS marketing.

Ba tính từ để tự kiểm: **mật độ** (nhiều dữ liệu, ít khoảng trống chết), **kỷ luật**
(một primary/màn, một radius cho control, bóng chỉ ở lớp nổi), **chất liệu ngành**
(mã lớp, sĩ số, GVCN, trạng thái lớp — dùng làm cấu trúc, không chỉ là cột).

## 2. Nguồn sự thật

| File | Chứa gì | Ai đọc |
|---|---|---|
| `frontend/src/astryx-theme.ts` | Toàn bộ token màu / chữ / radius của Astryx; tên theme `mems` | Mọi component đã port |
| `frontend/src/theme.ts` | Palette gốc (`color.*`) + `fontPrimary`/`fontFallbacks` + token antd cũ | `astryx-theme.ts` và các trang **chưa** port |
| `frontend/src/main.tsx` | Gắn `Theme mode="light"`, i18n `vi-VN`, font cho `body` | Toàn app |
| `frontend/src/theme.ts` → phần `themeToken`/`themeComponents` | Chỉ còn giá trị cho antd | **Xoá ở P5** |

**Cách dùng token trong code (quan trọng nhất tài liệu này):**

1. Ưu tiên **prop** của component: `status`, `variant`, `type`, `size`, `color`.
2. Cần style một lần → dùng **CSS variable** trong `style`:
   ```tsx
   <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }} />
   ```
3. Cần khoảng cách → dùng **bước** của Stack/Section, không dùng px:
   `gap={3}` = 12px, `gap={4}` = 16px (mỗi bước = 4px).
4. Không có token cho thứ mình cần → **thêm token vào `astryx-theme.ts`**, không
   hardcode ở call site.
5. **Không** dùng `theme.useToken()` (antd). Không import `theme` từ antd trong file mới.

## 3. Màu — "mực xanh học vụ"

Giá trị dưới đây là **nửa sáng** của cặp `light-dark(sáng, tối)` trong
`astryx-theme.ts`. App chỉ render `mode="light"`, nhưng màu được khai dạng cặp để sau
này bật dark mode không phải làm lại.

| Token Astryx | Giá trị sáng | Dùng ở đâu |
|---|---|---|
| `--color-accent` | `#0E4A8B` | CTA, link, mục đang chọn, focus ring. Trên trắng ≈ 8.8:1 |
| `--color-on-accent` | `#FFFFFF` | Chữ trên nền accent |
| `--color-accent-muted` | `color-mix(brand 20%, transparent)` | Nền mục chọn, tag nhẹ, banner info |
| `--color-text-primary` | `#101828` | Chữ chính |
| `--color-text-secondary` | `#475467` | Nhãn, mô tả, header bảng |
| `--color-text-disabled` | `#98A2B3` | Disabled **và placeholder** (Astryx dùng chung token) |
| `--color-background-body` | `#F2F4F7` | Canvas trang |
| `--color-background-card` / `-surface` | `#FFFFFF` | Bảng, form, header, sider |
| `--color-background-popover` | `#FFFFFF` | Dropdown, popover |
| `--color-background-muted` | `#F7F8FA` | Hàng hover / kẻ sọc của bảng, khối phụ |
| `--color-border` | `#E4E7EC` | Hairline, divider, viền bảng. **Không** dùng cho field |
| `--color-border-emphasized` | `#667085` | Viền field — đủ 3:1 (WCAG 1.4.11) |
| `--color-error` / `--color-text-error` | `#B42318` | Viền/icon lỗi · chữ lỗi |
| `--color-success` / `--color-text-success` | `#067647` | Viền/icon · chữ |
| `--color-warning` / `--color-text-warning` | `#B54708` | Viền/icon · chữ |
| `--color-info` / `--color-text-info` | `var(--color-accent)` | MEMS **không** có xanh thông tin riêng (antd cũ đặt `colorInfo = brand`) |
| `--color-skeleton` / `--color-track` | `#EAECF0` | Khung xương, rãnh progress |
| `--color-icon-primary` / `-secondary` | trùng `text-primary` / `text-secondary` | Icon cùng một mực với chữ |

**Luật màu:**

- Primary chiếm **≤ 5% diện tích** một màn. Header **không** tô màu brand.
- Không gradient, không màu trang trí. 8 sắc `blue/cyan/green/…` của Astryx **không**
  dùng cho dữ liệu nghiệp vụ — bảng nhiều màu đọc như dashboard demo.
- Trạng thái chỉ dùng 5 nhóm: `neutral`, `info`, `success`, `warning`, `error`.
- **BR-08:** trạng thái luôn có **chữ + màu**. Không bao giờ chỉ đổi màu chữ/chấm.
- Chữ trên nền phải ≥ 4.5:1; viền/icon mang nghĩa ≥ 3:1.
- Focus ring mặc định 2px accent, offset 3px. **Không** `outline: none` nếu không có
  thay thế rõ ràng.

## 4. Chữ & nhịp

### 4.1 Thang chữ thật (token Astryx)

| Token | px | Line-height (px) | Semantic type | Dùng cho |
|---|---|---|---|---|
| `--font-size-sm` | **12** | 20 (`supporting`) | `Text type="supporting"` | Caption, nhãn phụ, số thứ tự, metadata |
| `--font-size-base` | **14** | 20 (`body`) | `Text type="body"` / `"label"` | Chữ nền, nhãn field, ô bảng |
| `--font-size-lg` | **17** | 24 (`large` / `heading-3`) | `Text type="large"` hoặc `Heading level={3}` | Đoạn nhấn, tiêu đề mục nhỏ |
| `--font-size-xl` | **20** | 28 (`heading-2`) | `Heading level={2}` | Tiêu đề khối (DetailSection) |
| `--font-size-2xl` | **24** | 32 (`heading-1`) | `Heading level={1}` | H1 của trang |
| `--font-size-3xl` | 29 | 36 (`display-3`) | `Text type="display-3"` | Số liệu lớn |
| `--font-size-4xl` | 35 | 44 (`display-2`) | `Text type="display-2"` | Hero/landing (hiếm) |
| `--font-size-5xl` | 42 | 52 (`display-1`) | `Text type="display-1"` | Chỉ màn giới thiệu |

Heading mặc định: `h1=24 · h2=20 · h3=17 · h4=14 · h5=12 · h6=10`.

**Luật chữ:**

- **Không** dùng 13 / 15 / **16** / 18. Nếu một chỗ cần 16px thì đó là dấu hiệu đang
  hardcode hoặc copy từ web khác.
- Một trang **một H1**. Heading không nhảy cấp (`h1 → h3`).
- Weight chỉ **400 / 500 / 600**. `bold` (700) có trong thư viện nhưng **không dùng**.
- Số liệu (sĩ số, mã lớp, thời gian, phân trang) → prop `hasTabularNumbers` của
  `Text`/`Heading`, không tự viết `font-variant-numeric`.
- **Không** ALL-CAPS làm nhãn. Không "eyebrow" trên tiêu đề.
- Độ dài dòng ≤ 80 ký tự (`maxWidth: '76ch'` cho mô tả dài).

### 4.2 Nhịp

Bước spacing của Astryx = 4px. Các bước hay dùng:

| Bước | px | Dùng cho |
|---|---|---|
| 1 | 4 | Khe trong một cụm (icon + chữ) |
| 2 | 8 | Nhãn field → control |
| 3 | 12 | Khe giữa các control trong toolbar |
| 4 | 16 | Trong một khối; padding mobile |
| 6 | 24 | Giữa các khối nhỏ |
| 8 | 32 | Giữa các section; padding desktop |
| 10 | 40 | Đệm cuối trang |

- Padding trang: **32 desktop / 16 mobile**.
- Khoảng cách section: **32**. Khoảng cách trong block: **16**.
- Khoảng cách giữa tiêu đề và nội dung: **12–16**, không phải 24.

### 4.3 Bo góc, bóng, kích thước control

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--radius-inner` | 4px | Dấu nhỏ: checkbox, chấm, tag |
| `--radius-element` | 8px | Button, input, selector — **mọi control** |
| `--radius-container` | 12px | Card, dialog, khối nội dung |
| `--radius-page` | 28px | Bottom sheet / khối toàn trang |
| `--radius-full` | 9999px | Chỉ avatar, pill trạng thái |

Bóng: `--shadow-low/med/high` **chỉ** cho lớp nổi (Dialog, Drawer, Popover, Toast).
Card mặc định `elevation="none"` — không truyền shadow cho bề mặt nội dung.

Control: `size="sm"` 28px · `"md"` 32px · `"lg"` 36px. Dùng đúng **một** cỡ trong
một toolbar; không set `height` tay.

## 5. Năm trạng thái bắt buộc

Mọi màn hình / khối dữ liệu phải xử lý đủ 5 trạng thái, kể cả khi BE chưa trả về.

| Trạng thái | Component | Nội dung | Ghi chú |
|---|---|---|---|
| **Loading** | `Skeleton` theo bố cục thật; `Spinner` chỉ khi inline/trong nút | `role="status"` + `aria-busy` + nhãn ẩn "Đang tải…" | Không dùng một vòng xoay giữa màn trắng |
| **Empty** | `EmptyState` | `title` nêu **việc cần làm**, `description` nêu ngữ cảnh | 1 CTA **chỉ khi** người dùng có quyền |
| **Error** | `Banner status="error"` + nút "Thử lại" ở `endContent` | Nêu lỗi và **cách sửa** | Không nuốt lỗi, không chỉ "Có lỗi xảy ra" |
| **Success** | `Banner status="success"` gắn với khối dữ liệu; toast cho việc tức thời | Động từ đã xong: "Đã lưu lớp", "Đã gửi duyệt" | Phải đọc được bằng screen reader (xem 9) |
| **No-permission** | `ForbiddenNotice` → `Banner status="warning"` | Thiếu quyền gì + liên hệ ai | Không hiện "403" trần |

### NFR-REL-001 — kiểm tra xung đột không được "ăn" thành công

Bài học từ Sprint 4: kiểm tra trùng mã lớp/GVCN là một request riêng. Nếu request đó
lỗi mà UI vẫn hiện dấu "hợp lệ" thì người dùng submit dữ liệu trùng.

Luật bắt buộc:

1. Trạng thái kiểm tra là **ba giá trị riêng**: `idle | checking | ok | error`. Không
   dùng `isLoading` cộng `isValid` rời rạc.
2. Trong `checking`: nút submit **disabled**, hiện chữ trung tính ("Đang kiểm tra…").
   Không hiện badge xanh, không hiện dấu check.
3. Khi check lỗi: `Banner`/`Field status="error"` nêu **không kiểm tra được**, nút submit
   vẫn disabled. Tuyệt đối không rơi về `ok`.
4. Chỉ khi check trả `ok` mới render success. Test phải có ca "API check trả 500 →
   không có chữ 'hợp lệ' trên màn".

## 6. Ánh xạ AntD → Astryx

Đây là bảng tra khi port. Cột cuối là chỗ **dễ sai**, không phải mô tả đầy đủ API.

### 6.1 Layout & điều hướng

| AntD | Astryx | Khác gì |
|---|---|---|
| `Layout` + `Sider/Header/Content/Footer` | `AppShell` + `Layout` + `SideNav` + `TopNav` | Console dùng `ConsoleShell` của mình, không dựng lại |
| `Menu` (+ `SubMenu`) | `SideNav` + `SideNavItem`; nhóm con dùng `Collapsible` | `SideNavItem` nhận `icon`, `href`, `isSelected` |
| `Breadcrumb` | `Breadcrumbs` + `BreadcrumbItem` | Mỗi mục là component, không phải mảng `items` |
| `Tabs` | `TabList` + `Tab` | `value` + `label`; `TabList` giữ state, `Tab` chỉ là nút |
| `Segmented` | `SegmentedControl` + `SegmentedControlItem` | `label` bắt buộc (aria-label) |
| `Steps` | `Stepper` + `Step` | — |
| `Collapse` | `Collapsible` / `CollapsibleGroup` | — |
| `Dropdown` | `DropdownMenu` + `DropdownMenuItem` | — |

### 6.2 Chữ & khối

| AntD | Astryx | Khác gì |
|---|---|---|
| `Typography.Title` | `Heading level={n}` | `level` quyết định cả thẻ HTML lẫn cỡ chữ |
| `Typography.Text` | `Text type=…` | `supporting` = 12, `label` = 14/500, `large` = 17 |
| `Typography.Paragraph` | `Text as="p" type="body"` | — |
| `Typography.Link` | `Link` | Prop là `href`; link nội bộ dùng `Link` của react-router trong `as` |
| `Card` | `Card` | Mặc định đã có viền, `elevation="none"`. **Không** lồng card |
| `Divider` | `Divider` | `variant` để chọn độ đậm |
| `Descriptions` | `MetadataList` + `MetadataListItem` | Item nhận `label` (string) + `children` |
| `Empty` | `EmptyState` | `title` **bắt buộc**; icon là `ReactNode` |
| `Result` | **không có** | Ghép `EmptyState` (404/empty) hoặc `Banner` (lỗi) + `Stack` |
| `Statistic` | **không có** | `Text type="display-3" hasTabularNumbers` + `Text type="supporting"` |
| `Timeline` | **không có** | `Item` + `StatusDot` trong `VStack` |
| `Badge` (đếm) | `Badge label={n}` | Badge là **nhãn**, không phải chấm số |
| `Tag` | `Badge` (nhãn) / `StatusDot` (chấm + label) | Trạng thái nghiệp vụ dùng `StatusDot` + chữ |
| `Avatar` | `Avatar` | `name` để sinh fallback chữ cái |

### 6.3 Form

| AntD | Astryx | Khác gì |
|---|---|---|
| `Form` + `Form.Item` | `Field` + `FormLayout` | Không có `<form>`; `FormLayout` chỉ là `<div>` |
| `Form.Item` (nhãn + lỗi) | `Field` | `label` + `inputID` **bắt buộc**; lỗi qua `status={{ type:'error', message }}` |
| `Input` | `TextInput` | `value` + `label` bắt buộc; `onChange(value, e)` |
| `Input.Password` | `TextInput type="password"` | — |
| `Input.Search` | `TextInput type="search"` + `startIcon` | Không có component Search riêng |
| `Input.TextArea` | `TextArea` | Cùng shape `value` + `label` |
| `InputNumber` | `NumberInput` | `value: number \| null` |
| `Select` | `Selector` | `options` + `label`; `hasClear` đổi value thành `string \| null` |
| `DatePicker` / `RangePicker` | `DateInput` / `DateRangeInput` | Giá trị là **ISO string**, không phải dayjs |
| `Checkbox` | `CheckboxInput` | `value: boolean \| 'indeterminate'` (không phải `checked`) |
| `Radio.Group` | `RadioList` + `RadioListItem` | — |
| `Switch` | `Switch` | `value` (không phải `checked`) |
| `Upload` | `FileInput` | — |
| `Form` submit | `Button type="submit"` trong `<form>` tự viết, hoặc `onClick` | Không có `onFinish` của antd |

**Form state:** dùng hook nội bộ `useFormState` (~80 dòng: `values`, `errors`, `touched`,
`setValue`, `validate`, `reset`). Không cài `react-hook-form`/`zod` — form của dự án
nhỏ, thêm thư viện chỉ để gom 4 state là không đáng.

### 6.4 Phản hồi & lớp nổi

| AntD | Astryx | Khác gì |
|---|---|---|
| `Alert` | `Banner` | `status` + `title`; `collapsible={false}` để **luôn mở**; nội dung thêm ở `description`/`children` |
| `Modal` | `Dialog` (+ `DialogHeader`) | `isOpen` + `onOpenChange`; không có `footer` — tự đặt `HStack` nút |
| `Drawer` | `Drawer` (+ `DrawerHeader`) | — |
| `Popconfirm` | `AlertDialog` | Dùng khi cần chặn thao tác phá huỷ |
| `message` / `notification` | `useToast()` | `toast({ body, type })`; **chỉ có `info` và `error`** |
| `Tooltip` | `Tooltip` | Nội dung ở `content` |
| `Skeleton` | `Skeleton` | `width/height/radius/index`; xếp nhiều cái để tạo hình khối |
| `Spin` | `Spinner` | `size`, `shade`, `label` |
| `Progress` | `ProgressBar` | `label` bắt buộc |
| `Popover` | `Popover` | — |
| `App.useApp()` | `useToast()` | Không còn context `App` |

> **Toast không có `success`.** Với thao tác đã xong mà kết quả nằm ngay trên màn (lưu
> lớp, duyệt giáo viên), dùng `Banner status="success"` trong khối — vừa đúng ngữ
> cảnh, vừa đọc được bằng screen reader. Chỉ dùng toast cho việc không để lại dấu trên
> màn (sao chép, gửi lại email), và khi đó `type: 'info'` + câu nêu rõ "Đã …".

### 6.5 Bảng

| AntD | Astryx | Khác gì |
|---|---|---|
| `Table` | `Table` | `data` + `columns` + `idKey`; cột khai bằng `proportional(n, { minWidth })` / `pixel(n)`; ô qua `renderCell` |
| `Table` props | `density` / `dividers` / `isStriped` / `hasHover` / `textOverflow` / `verticalAlign` | — |
| `Pagination` | `Pagination` | `page` + `totalItems` + `pageSize`, không phải `current/total` |
| `Table.rowSelection` | `TableSelectionToolbar` + plugin | Chỉ dùng khi thật cần thao tác hàng loạt |

Mật độ đo được của `Table`:

| `density` | Padding dọc / ngang mỗi ô | Dùng cho |
|---|---|---|
| `compact` | 4 / 8 px | Danh sách quản trị nhiều dòng |
| `balanced` (mặc định) | 8 / 12 px | Trang chi tiết, bảng trộn nội dung |
| `spacious` | 12 / 16 px | Bảng ít dòng, cần đọc kỹ |

Header bảng của Astryx **trong suốt**, chữ 14/600 màu `text-secondary` — khác v1
(`#F7F8FA`). Giữ mặc định: nền header tự tô là thứ tạo cảm giác "bảng Excel", còn
hairline + weight đã đủ phân cấp.

### 6.6 Tám cạm bẫy hay gặp

1. `Button` **cần `label`**, không phải children: `<Button label="Lưu" />`.
2. `TextInput`/`Selector` **cần `label`** (kể cả khi ẩn): `isLabelHidden` chỉ ẩn thị
   giác, screen reader vẫn đọc.
3. `Selector hasClear` → `value`/`onChange` thành `string | null`. Đổi prop mà không
   đổi type là lỗi TS.
4. `Banner` mặc định **thu gọn được**; muốn luôn mở phải `collapsible={false}`.
5. `Dialog` không có `footer`/`okText`. Nút nằm trong `children`.
6. `useToast` chỉ `info | error` (xem khung trên).
7. `Table` không nhận `dataSource`/`columns[].dataIndex`. Sai tên là mất dữ liệu im lặng.
8. `light-dark()` chạy runtime: **Chrome 123+ / Safari 17.5+ / Firefox 120+**. Bản
   production được LightningCSS polyfill, dev server thì không. Đừng test trên trình
   duyệt cũ rồi kết luận theme sai.

### 6.7 Cạm bẫy phát hiện khi port P2 (4 màn auth)

Ghi lại vì cả 4 màn đều đụng, và P3–P4 sẽ đụng lại.

1. `isRequired`/`isOptional` **chèn chữ vào `<label>`** (" ∙ Bắt buộc"). Không truyền
   hai prop này khi nhãn đã đủ nghĩa; đánh `aria-required` lên input. Truyền vào là
   nhãn đọc khác nhãn nhìn, và mọi `getByLabelText(..., { exact: true })` gãy.
2. `Selector` render **listbox ẩn dùng lại đúng `aria-label`** của nút → `getByLabelText`
   ra 2 node. Truy vấn bằng `getByRole('combobox', { name })`.
3. `Button` đặt `aria-label={label}` khi có `children` ⇒ tên nút là `label`, không phải
   chữ trong children. Nút nhiều dòng (`RoleButton`) phải đặt `label` đúng bằng tên
   hiển thị, nếu không tên đọc và chữ nhìn thấy lệch nhau (2.5.3).
4. `Link` **cũng** có `label` → `aria-label`. Không đặt khi chữ hiển thị khác, cùng lý
   do trên. Chỉ dùng `label` cho link chỉ có icon.
5. `useMediaQuery` (`@astryxdesign/core/hooks`) thay `Grid.useBreakpoint`. jsdom không
   có `matchMedia` nên nó luôn trả `false`: unit test chỉ thấy nhánh hẹp, muốn test
   nhánh rộng phải mock `window.matchMedia`.
6. `Card padding` là `SpacingStep` (0 · 0.5 · 1 · 1.5 · 2 · 3 · 4 · 5 · 6 · 8 · 10),
   **không phải px**; `Skeleton` là **một** khối (`height`, `radius` 0–4) — dựng khung
   xương bằng cách xếp nhiều `Skeleton`, không có bộ khung dựng sẵn.
7. `CheckboxList` chỉ chạy **collection mode** (tự tính `isChecked`) khi có
   `value: string[]`; mỗi `CheckboxListItem` phải có `value` trùng một phần tử của
   mảng đó. Thiếu `value` ở list → mỗi item thành checkbox độc lập, tick không lưu.
8. `Banner` đặt `role="alert"` lên **title + description**, không lên khung — nhờ vậy
   `getByRole('alert')` đọc được nội dung mà không kéo theo nút đóng. Vẫn phải
   `collapsible={false}` để banner không bị thu gọn.
9. `Field` chỉ render `<div>`, **không** render `<form>`: dùng `<form noValidate
   onSubmit>` native + `VStack`. `noValidate` để trình duyệt không tự chặn bằng tooltip
   tiếng Anh trước validator của mình.
10. Form state: `src/hooks/useFormState.ts` (~130 dòng). Không thêm
    `react-hook-form`/`zod` cho form 1–7 trường; hai thư viện đó kéo theo một ngôn ngữ
    khai báo thứ hai nằm cạnh component của Astryx.

## 7. Sáu khối dùng chung (v2)

| Khối | Spec v2 |
|---|---|
| `PageHeader` | `Breadcrumbs` (chỉ khi sâu ≥2 cấp) + `Heading level={1}` (24) + 1 dòng mô tả `Text type="body" color="secondary"` + `extra` (tối đa 1 primary). Cách nội dung dưới 24. |
| `Toolbar` | `Toolbar` của Astryx: `label` (bắt buộc), `startContent` = lọc, `endContent` = tìm kiếm + primary, `size="md"` (32). Không bọc card. Mobile: cho phép `wrap`. |
| `DataTable` | `Table density="compact"` + `dividers="rows"` + `hasHover` + `textOverflow="truncate"`. Cột đầu là link đậm; ô số render `<Text justify="end" hasTabularNumbers>` trong `renderCell`. Phân trang dưới bảng. |
| `DetailSection` | `Heading level={2}` (20) + mô tả `Text type="supporting"` + `Divider`. **Không** `Card` lồng nhau; `Card` chỉ khi khối là một đối tượng độc lập (form, hộp xác nhận). |
| `EmptyState` | `EmptyState` của Astryx: `title` nêu việc cần làm + `description` + `actions` (1 CTA nếu có quyền). Không minh hoạ lớn. |
| `ForbiddenNotice` | `Banner status="warning" collapsible={false}`: thiếu quyền gì + liên hệ ai. Không chỉ "403". |
| `PageLoading` | `Skeleton` theo bố cục + `role="status"`/`aria-busy` + nhãn ẩn. Không dùng `Spinner` giữa màn. |

## 8. Responsive

Breakpoint của Astryx: **sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536**.

- Chế độ `compact` bật khi **rộng < 768** hoặc **cao < 500** (điện thoại nằm ngang).
- Phải kiểm ở **320 / 768 / 1024 / 1440**. 320 là ca xấu nhất: toolbar phải wrap,
  tiêu đề không cắt chữ, dialog rộng `min(560, calc(100vw - 32px))`.
- **Không** để trang cuộn ngang. Bảng được cuộn **trong khung của nó**.
- Cột phụ (mã phụ, ghi chú) ẩn dưới `md`; không ẩn cột mang nghĩa (trạng thái, GVCN).
- Nút hành động chuyển từ `HStack` sang `VStack` khi `compact` nếu nhãn dài.

## 9. Tiếp cận & bàn phím (WCAG 2.1 AA)

- Mọi control có tên đọc được. Nút chỉ có icon phải có `label`.
- Tab đi qua được mọi thứ bấm được; focus nhìn thấy (ring 2px accent).
- `Esc` đóng Dialog/Drawer; `Enter` submit form; focus quay về nút mở sau khi đóng.
- `aria-live="polite"` cho toast/lỗi form (đã có `LiveAnnouncer`), `aria-busy` cho vùng
  đang tải.
- Không dựa vào màu (BR-08). Không dựa vào vị trí ("nút bên phải") trong nhãn.
- `prefers-reduced-motion`: không animation; Astryx tự tôn trọng, đừng thêm transition
  tay.
- Vùng bấm tối thiểu **24×24** (WCAG 2.5.8); control `sm` 28px đã đạt.

## 10. Năm luật chống "AI look"

1. **Không card bọc danh sách.** Danh sách = PageHeader + Toolbar + DataTable trên canvas.
2. **Một primary mỗi màn.** Còn lại `secondary`/`ghost`/`destructive`.
3. **Ba cấp bậc, không hơn.** Trang → Khối → Dòng. Cần cấp 4 → tách trang.
4. **Không hardcode.** `#hex`, `rgba()`, `px` cho màu/chữ chỉ nằm trong theme. Style
   inline chỉ cho layout (`display/gap/width/maxWidth`).
5. **Từ vựng của ngành.** "Sĩ số", "GVCN", "Khai giảng", "Đóng lớp" — không "Item",
   "Record", "Status", "Action".

## 11. Nghiệp vụ bắt buộc hiển thị đúng

- **BR-04:** thao tác ngừng dùng ghi là **"Vô hiệu hoá"**, không ghi "Xoá". Bản ghi
  còn trong danh sách (có thể lọc "Đã vô hiệu hoá"), không biến mất.
- **BR-08:** trạng thái = `StatusDot`/`Badge` + **nhãn chữ**. Mù màu vẫn đọc được.
- **NFR-REL-001:** xem mục 5 — check xung đột lỗi thì **không** hiện thành công.

## 12. Checklist trước khi merge

- [ ] File đã port **không còn** `from 'antd'`; không `theme.useToken()`.
- [ ] Không hex/rgba/px cho màu & chữ; chỉ `var(--color-…)`, `var(--font-size-…)`.
- [ ] Thang chữ đúng 12/14/17/20/24 (display 29/35/42); không 13/15/**16**.
- [ ] Đúng **một** H1; heading không nhảy cấp.
- [ ] Đếm primary/màn ≤ 1 · radius control = 8 · shadow trên nội dung = 0.
- [ ] Đủ 5 state: loading / empty / error / success / no-permission.
- [ ] BR-04 dùng "Vô hiệu hoá"; BR-08 có nhãn chữ; NFR-REL-001 có test ca API lỗi.
- [ ] 320 / 768 / 1024 / 1440 không tràn ngang; bảng cuộn trong khung của nó.
- [ ] Tên đọc = chữ nhìn thấy: không đặt `label` (→ `aria-label`) khác nội dung.
- [ ] Bàn phím: tab thấy focus, Esc đóng dialog, Enter submit, focus quay lại.
- [ ] `prefers-reduced-motion` không còn animation.
- [ ] Che logo: vẫn nhận ra là phần mềm quản lý giáo dục?

## 13. Trạng thái chuyển tiếp (antd + Astryx cùng chạy)

Đang trong lúc port, **cả hai** thư viện cùng tồn tại. Quy tắc để không sinh lỗi khó tìm:

- CSS layer: `reset → astryx-base → astryx-theme`. CSS antd **không** nằm trong layer
  nên **antd thắng** ở selector trùng. Vì vậy **mỗi trang là một trong hai**, không
  trộn component hai bên trong cùng một màn.
- `main.tsx` bọc `Theme` ngoài `ConfigProvider`; `Theme` là theme gốc nên gắn
  `data-theme`/`data-astryx-theme` lên `<html>` — portal của Dialog/Toast vẫn ăn token.
- i18n: Astryx `vi-VN`, antd `vi_VN`. Chuỗi của mình vẫn nằm trong code, không phụ
  thuộc locale của thư viện.
- Font: `document.body.style.fontFamily` áp cho cả portal của hai bên.
- `src/test/setup.ts` giữ patch React 19 của antd **tới P5**.
- Link nội bộ: dùng `components/AppLink` (`<Link as={RouterLink} href={to} />`) thay vì
  `<a>` trần. Không bọc `LinkProvider` toàn cục vì chỉ có vài chỗ cần, và provider toàn
  cục sẽ khiến link ngoài `Router` (test riêng lẻ) chết theo.
- Xoá antd (P5) khi `grep -r "from 'antd'" src` = 0; lúc đó xoá `themeToken`,
  `themeComponents`, patch React 19 và `ConfigProvider`.

## 14. Ngoại lệ đã biết

- `LoginPage` / `AuthCard`: màn đăng nhập là ngoại lệ hợp lý — một thẻ, một việc, có
  ảnh hero. Vẫn dùng token, chỉ khác là được phép "rộng tay" hơn console.
- `AuditLogPage`: bảng dài được phép dùng card nếu khối là "một bản ghi mở rộng".
- Bảng có cột hành động: nút `ghost` + icon, không dùng `primary` trong từng dòng.

## Phụ lục — đo tham chiếu (13/11/2026)

Đo bằng `getComputedStyle` trên trang thật, đếm theo *số element đang dùng*:

| | Khan Academy | Brilliant | Udemy |
|---|---|---|---|
| Chữ nền | 14px | **14px** (231 element) | 16px **/300** (182 element) |
| Cỡ chữ | 12/14/16/18/20/24/42 | 12/14/16/20/30/44/54 | 12/14/16/17.6/28 |
| Độ đậm nội dung | 400·500·600·700 | **chỉ 400·500** | 300·400·500·700 |
| Hairline | `#CBCBCD` | `#E4E4E4` | ~`#DCDAD8` |
| Bo góc | 8px | viên thuốc | 8/4/16 |
| Bóng đổ | **1.2%** element | 3.5%, không có trên nội dung | 1% |
| Header | 60px, phẳng | 55px + hairline 0.8px | 72px, **có bóng** |

**Theo:** khung của Khan (14px nền, bo 8px, state = nền nhạt + viền, bóng chỉ ở
overlay) + kỷ luật chữ của Brilliant (400/500 trong nội dung). **Không theo** Udemy:
16px/300 + bóng ở header + nhiều màu nhấn đúng là "SaaS look" cần tránh.

Không copy: màu indigo `#5753FA` (giữ `#0E4A8B`), minh hoạ vui, bo viên thuốc cho
toolbar (đọc như app tiêu dùng).
