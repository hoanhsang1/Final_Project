> ⚠️ **Snapshot lịch sử — đối chiếu 2026-11-26.** Mọi trạng thái/số liệu/lệnh bên dưới là tại thời điểm soạn, không phải hiện tại. Nguồn chuẩn hiện tại: `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md`; quyết định P4: `D:\Final_Project\docs\scope-can-chot-xep-lich.md`. Giữ lại để tra cứu, không xoá.

# 01 — Báo cáo review UX (chạy app thật + dump)

> **Người review:** AI agent, góc nhìn "người dùng lần đầu" (first-time user).
> **Phạm vi:** toàn bộ route của FE ở nhánh `feat/astryx-migration` (đang chuyển Ant Design → `@astryxdesign/core`).
> **Cách làm:** chạy app thật (Vite dev, `http://127.0.0.1:5173`), **giả lập toàn bộ API bằng `page.route`** (BE không chạy), dump cấu trúc trang ra text (`ux-review/dumps/`, 87 file), rồi đối chiếu với mã nguồn.
> **Ràng buộc đã tuân thủ (giai đoạn review):** KHÔNG sửa file source dự án · KHÔNG đổi API/hợp đồng/nghiệp vụ/phân quyền · KHÔNG cài thêm thư viện · KHÔNG gọi API thật ghi dữ liệu · mọi thứ ghi trong `ux-review/`.
>
> **Cập nhật (giai đoạn sửa lỗi P1):** sau khi review xong, người dùng đã **cho phép sửa file source** cho 3 lỗi P1. Đã sửa **R-01, R-03, R-05** và **xác minh bằng đo lại** (mục "✅ Đã sửa" trong từng mục + `_probe-p1-before.log` / `_probe-p1-after.log`). Các lỗi còn lại **chưa sửa**. Không đổi API/hợp đồng/nghiệp vụ/phân quyền, không cài thêm thư viện.
>
> **Cập nhật (giai đoạn sửa lỗi P2):** sửa tiếp **R-04** (5 màn 403/404 dựng lại bằng Astryx — hết chữ tiếng Anh cho trình đọc màn hình, có `h1`) và **R-07** (nút Sửa/Xoá ở màn Chức vụ nêu tên từng dòng, hộp xác nhận xoá nêu tên chức vụ). Xác minh bằng `probe-p2-verify.mjs` → `_probe-p2-after.log` + chạy lại toàn bộ 87 dump. Chi tiết ở mục "✅ Đã sửa (P2)" trong R-04/R-07.
>
> **Cập nhật (giai đoạn sửa lỗi P3):** sửa **R-06** (thay antd `Skeleton` — vốn để lại `<h3>`/`<ul>` rỗng trong cây trợ năng — bằng component Astryx `PageLoading` ở **10 file**) và **R-08** (thẻ "Tổ chức chờ duyệt" ở màn Tổng quan nêu **đúng** đích đến). **R-02** (nhãn icon antd tiếng Anh "search"/"left"/"right"/"Close") **không sửa được sạch khi còn antd** (xem mục R-02) → **chờ port** và xác minh ở P5. Chi tiết ở mục "✅ Đã sửa (P3)" trong R-06/R-08.
>
> **Cập nhật (giai đoạn sửa lỗi P4 — N-01/N-02):** người dùng chọn **sửa cả hai** mục "Không hợp lý nếu là bản hoàn chỉnh" ở màn Đăng ký tổ chức. **N-01** — banner lỗi danh mục module có thêm nút "Thử lại" (`endContent`, gọi `modulesQuery.refetch()`), câu chữ bỏ "tải lại trang". **N-02** — nút "Gửi đăng ký" **tắt** khi danh mục tải xong nhưng rỗng. Không đổi API/hợp đồng/nghiệp vụ/phân quyền; không cài thêm thư viện. Xác minh bằng đo lại (dump `05`/`06`) + `tsc`/`eslint`/`vitest`/`build`. Chi tiết ở mục "✅ Đã sửa (P4)" trong N-01/N-02.

---

## 0. Cách đọc báo cáo

- Mỗi vấn đề có **mã** (`R-xx` = lỗi thật, `N-xx` = không hợp lý nếu là bản hoàn chỉnh, `D-xx` = có thể là chủ đích, `Q-xx` = chưa rõ).
- **"Tình trạng"** — chọn đúng **1** trong 4 nhãn:
  - `Lỗi thật` — sai rõ ràng, không phụ thuộc giai đoạn.
  - `Không hợp lý nếu là bản hoàn chỉnh` — chấp nhận được khi đang xây, nhưng không nên có ở bản phát hành.
  - `Có thể là chủ đích` — có dấu hiệu là tạm/thử nghiệm/chưa tới sprint. **Không tính vào bảng ưu tiên**, đưa vào danh sách câu hỏi.
  - `Chưa rõ, cần team xác nhận` — không đủ bằng chứng để kết luận.
- Mỗi vấn đề trình bày **2 góc nhìn**: **(A)** nếu đây là sản phẩm hoàn chỉnh, **(B)** ở giai đoạn hiện tại có thể là chủ đích/tạm thời.
- Bằng chứng luôn kèm `file:dòng` và **tên file dump** (`dumps/xx-....txt`). Đọc dump bằng công cụ đọc file (không `cat`/`type`) để tránh lỗi mã hoá tiếng Việt.

---

## 1. Tóm tắt điều hành

Đã dump **87 lượt** (desktop 1366×768, mobile 375×667, narrow 320×640) cho 24 route + các trạng thái rỗng/lỗi/đang tải/không đủ quyền. **0 lỗi script.**

Kết luận chính:

1. **Phần đã port sang Astryx chất lượng tốt**: 5 trạng thái có mặt, nút/ô nhập có tên tiếng Việt, thông báo lỗi dùng `role="alert"`, responsive không tràn ngang (kể cả 320px).
2. **Phần còn antd đang lộ tiếng Anh ra cho cả người dùng thường lẫn trình đọc màn hình** — đây là nhóm lỗi nặng nhất và dễ thấy nhất với "người dùng lần đầu": `Page Size`, `20 / page`, `Previous Page`, nút icon đọc là "search"/"left"/"right", hộp thoại đóng đọc là "Close".
3. **`antd/dist/reset.css` vẫn đang được nạp dù comment nói đã bỏ** → đè kiểu chữ của Heading Astryx trên **mọi trang đã port** (đậm 500 thay vì 600, thêm lề dưới 12px).
4. **3 trang Tổ chức tràn ngang cả trang ở 375/320px** (bảng antd không nằm trong vùng cuộn). Các trang **đã** port không bị → hướng đi đúng.
5. Ngoài ra: 403/404 lộ chữ tiếng Anh cho trình đọc màn hình; trang Chức vụ có thao tác xoá **không nêu tên đối tượng**; skeleton antd để lại tiêu đề/danh sách rỗng trong cây trợ năng.

**Số lượng:** 8 lỗi thật · 2 "không hợp lý nếu là bản hoàn chỉnh" · 5 "có thể là chủ đích" (→ câu hỏi) · 4 "chưa rõ".

**Đã sửa (3 lỗi P1):** R-01 (pagination antd về tiếng Việt), R-03 (bỏ `antd/dist/reset.css`, Heading Astryx đúng 600/0px), R-05 (3 trang Tổ chức hết tràn ngang ở 320/375px, desktop không đổi). Chi tiết + bằng chứng trước/sau ở mục 3; kiểm tra chất lượng `tsc`/`eslint`/`vitest`/`vite build` đều đạt.

**Đã sửa (2 lỗi P2):** R-04 (5 màn 403/404 — Admin/Owner/Academic guard, 404 vai trò, 404 trang — dựng lại bằng component Astryx dùng chung `StatusScreen`: có `h1`, **không** còn SVG tiếng Anh "Unauthorized"/"No Found"; kèm 3 màn chi tiết chưa port dùng cùng `Result` 404), R-07 (nút Sửa/Xoá ở màn Chức vụ có `aria-label` nêu tên từng dòng + hộp xác nhận xoá nêu tên chức vụ). Bằng chứng: `probe-p2-verify.mjs` → `_probe-p2-after.log`; dump `37/38/39/12/41` có `h1` và 0 phần tử antd ở 3 màn 403.

**Đã sửa (2 lỗi P3):** R-06 (thay antd `Skeleton` bằng Astryx `PageLoading` ở **10 file** — hết `<h3>`/`<ul>` rỗng trong cây trợ năng; dump `25` giờ chỉ còn `h1` + `[status] Đang tải…`), R-08 (thẻ "Tổ chức chờ duyệt" ở màn Tổng quan nêu đúng đích đến — dump `13` giờ `"Tổ chức chờ duyệt: 2. Tổ chức chờ duyệt"`). **R-02 chờ port** (nhãn icon antd nằm trong `rc-dialog`/`rc-pagination`/`antd/es/input/Search` — không có prop sửa sạch).

**Đã sửa (2 mục P4 — N-01/N-02):** N-01 (màn Đăng ký: banner lỗi danh mục module có nút "Thử lại" gọi `refetch` — dump `05` giờ có `button "Thử lại"`), N-02 (màn Đăng ký: nút "Gửi đăng ký" **tắt** khi danh mục tải xong nhưng rỗng — dump `06` giờ `{disabled}`). Không đổi API/nghiệp vụ; thêm 2 test `RegisterPage.modules.test.tsx`.

---

## 2. Bảng ưu tiên

> Chỉ gồm vấn đề cần **hành động** (loại "Có thể là chủ đích"). Ưu tiên: **P1** = nên sửa trước khi phát hành cho người dùng thật · **P2** = nên sửa sớm · **P3** = nhỏ, sửa khi rảnh.

| # | Mã | Vấn đề | Tình trạng | Ảnh hưởng | Bằng chứng chính |
|---|----|--------|-----------|-----------|------------------|
| 1 | R-01 | Pagination/chuỗi antd hiện **tiếng Anh** ("Page Size", "20 / page", "Previous Page", "Next Page") | Lỗi thật — ✅ **ĐÃ SỬA** | Mọi trang chưa port (Quản trị, Tổ chức) | dump `16`, `21`, `23`; `frontend/src/main.tsx:28` (locale); probe `_probe-locale.log`, `_probe-a11y.log` |
| 2 | R-03 | `antd/dist/reset.css` vẫn nạp → **đè Heading Astryx** (đậm 500 vs 600, lề dưới 12px) | Lỗi thật — ✅ **ĐÃ SỬA** | Mọi trang đã port | `frontend/src/main.tsx:12-19` (comment, reset import đã xoá); probe `_probe-heading.log` |
| 3 | R-05 | **Tràn ngang cả trang** ở 375/320px trên 3 trang Tổ chức | Lỗi thật — ✅ **ĐÃ SỬA** | Điện thoại; vi phạm NFR responsive | dump `26-narrow`, `28-mobile/narrow`, `29-mobile/narrow` |
| 4 | R-04 | 403/404 lộ **chữ tiếng Anh cho trình đọc màn hình** ("Unauthorized", "No Found") | Lỗi thật — ✅ **ĐÃ SỬA** | WCAG 2.1 AA; mọi màn 403/404 | dump `37`, `38`, `39`, `12`, `41`; `antd/es/result/unauthorized.js:7`, `noFound.js:7` |
| 5 | R-07 | Chức vụ: nút **"Sửa chức vụ"/"Xoá" không phân biệt dòng**, hộp xác nhận xoá **không nêu tên** chức vụ | Lỗi thật — ✅ **ĐÃ SỬA** | Thao tác phá huỷ; WCAG 4.1.2/2.4.6 | dump `28`; `PositionsPage.tsx:116,127` vs `DepartmentsPage.tsx:104-129` |
| 6 | R-02 | Nút chỉ-icon của antd có **tên truy cập tiếng Anh** ("search", "left", "right", "Close") | Lỗi thật — ⏸ **CHỜ PORT** (P5) | WCAG 2.1 AA; mọi trang antd | probe `_probe-a11y.log` (`searchAria`, `paginationAria`); `rc-dialog/es/Dialog/Content/Panel.js:111` |
| 7 | R-06 | Skeleton antd để lại `<h3>` rỗng + `<ul>` rỗng trong cây trợ năng | Lỗi thật — ✅ **ĐÃ SỬA** | Nhẹ; trình đọc màn hình | dump `25` |
| 8 | R-08 | Thẻ số liệu "Tổ chức chờ duyệt" nêu **sai đích đến** trong tên truy cập | Lỗi thật — ✅ **ĐÃ SỬA** | Nhẹ; trình đọc màn hình | dump `13`; `OverviewPage.tsx:45`; `adminMessages.ts:22` |
| 9 | N-01 | Đăng ký: danh mục module lỗi → banner bảo "tải lại trang", **không có nút "Thử lại"** | Không hợp lý nếu là bản hoàn chỉnh — ✅ **ĐÃ SỬA** | Người đăng ký tổ chức | dump `05`; `RegisterPage.tsx:222-231` |
| 10 | N-02 | Đăng ký: danh mục module **rỗng** nhưng nút "Gửi đăng ký" vẫn bật | Không hợp lý nếu là bản hoàn chỉnh — ✅ **ĐÃ SỬA** | Người đăng ký tổ chức | dump `06`; `RegisterPage.tsx:114,232-237` |

---

## 3. Lỗi thật (chi tiết)

### R-01 — Pagination/chuỗi antd hiện tiếng Anh

- **Tình trạng:** `Lỗi thật`
- **Mô tả:** Ở các trang còn dùng antd, phần chân bảng hiển thị `Page Size` và `20 / page` (tiếng Anh). Trình đọc màn hình còn đọc `Previous Page` / `Next Page`. Người dùng Việt thấy chữ Anh ngay giữa bảng dữ liệu.
- **Bằng chứng:**
  - dump `16-quan-tri-tat-ca-to-chuc--desktop.txt:40,46` → `<ul> Tổng 3 tổ chức120 / page`, `input[search] "Page Size"`.
  - dump `21-quan-tri-tai-khoan--desktop.txt:43,49` và `23-quan-tri-nhat-ky--desktop.txt:43`.
  - probe `_probe-a11y.log` (`paginationAria`) → `listitem "Previous Page" … button "left"`, `combobox "Page Size"`, `text: 20 / page`.
- **Nguyên nhân đã xác minh (không phải phỏng đoán):** `frontend/src/main.tsx:24` viết `import viVN from 'antd/locale/vi_VN'`. Qua Vite, gói này là **CommonJS**, nên giá trị nhận được là **namespace CJS lồng nhau** `{ __esModule: true, default: localeValues }`. Kết quả: `viVN.Pagination === undefined` → rc-pagination rơi về **en_US**.
  - Bằng chứng: `_probe-locale.log` → `hasPagination: false`, `looksLikeCjsNamespace: true`, `nestedPaginationItemsPerPage: "/ trang"`.
  - `_vite-dep-vi_VN.js` (file Vite sinh ra) dòng cuối: `export default require_vi_VN();`.
  - `_main-transformed.txt:1,24`: `const viVN = __vite__cjsImport7_antd_locale_vi_VN;`.
- **Góc nhìn (A):** lỗi rõ, không chấp nhận được ở bản phát hành.
- **Góc nhìn (B):** không thể là chủ đích — đây là hệ quả kỹ thuật của interop CJS, không phải lựa chọn.
- **Đề xuất (KHÔNG thực hiện):** đổi sang `import viVN from 'antd/es/locale/vi_VN'` (ESM thuần), hoặc unwrap `mod.default ?? mod`. Chú ý: chỉ sửa được khi trang còn dùng antd; khi P5 gỡ antd thì vấn đề tự hết.
- **Cần xác minh thêm:** sau khi sửa, kiểm lại `Page Size` → `/ trang` và các chuỗi antd khác (DatePicker, Popconfirm…) trên các trang chưa port.
- **✅ Đã sửa (P1):** đổi `import viVN from 'antd/locale/vi_VN'` (dòng cũ `:24`) thành `import viVN from 'antd/es/locale/vi_VN'` (nay ở `main.tsx:28`) — bản **ESM** giữ đủ `Pagination.items_per_page = '/ trang'`; thêm comment giải thích lý do để tránh tái phát. `antd` không có `exports` map nên subpath resolve trực tiếp; `antd/es/locale/vi_VN.d.ts` tồn tại, `tsconfig.app.json` dùng `moduleResolution: "bundler"` nên `tsc` chấp nhận.
  - **Trước** (`_probe-a11y.log`): `listitem "Previous Page"`, `listitem "Next Page"`, `combobox "Page Size"`, `text: 20 / page`.
  - **Sau** (`_probe-a11y-after.log`, `_probe-p1-after.log`): `listitem "Trang Trước"`, `listitem "Trang Kế"`, `combobox "kích thước trang"`, `text: 20 / trang`; dump `21-quan-tri-tai-khoan--desktop.txt` → `<ul> Tổng 2 tài khoản 1 20 / trang`.
  - **Lưu ý:** sửa R-01 **không** tự sửa R-02 (icon `search`/`left`/`right` vẫn tiếng Anh; nút đóng Modal còn `aria-label="Close"` ở chính nút, chỉ `<span>` con đổi thành "Đóng").

### R-02 — Nút chỉ-icon của antd có tên truy cập tiếng Anh

- **Tình trạng:** `Lỗi thật`
- **Mô tả:** Các nút chỉ có icon (nút "tìm" của ô tìm kiếm, nút chuyển trang trước/sau, nút đóng hộp thoại) **không có `aria-label` tiếng Việt**. Tên truy cập được suy ra từ `aria-label` của chính icon, mà antd đặt tên icon bằng **tiếng Anh** → trình đọc màn hình đọc "search", "left", "right", "Close".
- **Bằng chứng:** probe `_probe-a11y.log`:
  - `searchAria` → `- searchbox "Tìm kiếm"` + `- button "search": - img "search"` (nút tìm đọc là "search").
  - `paginationAria` → `button "left"`, `button "right"`.
  - `iconOnlyButtons` → `button.ant-modal-close` có `aria-label="Close"`; `button.ant-input-clear-icon` dựa vào `aria-label="close-circle"`.
  - `outerHTML` của nút tìm: `<button class="…ant-input-search-button"><span class="ant-btn-icon"><span role="img" aria-label="search" …`.
- **Góc nhìn (A):** vi phạm WCAG 2.1 AA (4.1.2 Tên/ vai trò/ giá trị; 3.1.1 Ngôn ngữ của trang) — nhãn điều khiển bằng tiếng Anh trong giao diện tiếng Việt.
- **Góc nhìn (B):** đây là hành vi mặc định của `@ant-design/icons`, không phải chủ đích của dự án — nhưng dự án vẫn phải bù `aria-label`.
- **Đề xuất (KHÔNG thực hiện):** đặt `aria-label` tiếng Việt cho mọi nút icon (`Tìm`, `Trang trước`, `Trang sau`, `Đóng`) và cho nút đóng Modal. Lưu ý R-01 sửa xong **không** tự sửa R-02 (tên icon không phụ thuộc locale).
- **⏸ Chờ port (P5) — KHÔNG sửa được sạch khi còn antd:** đã kiểm tra mã nguồn antd/rc-* (bằng chứng `file:dòng`), cả 4 loại nút đều nằm **bên trong** thư viện, **không có prop** nào để đặt tên tiếng Việt:
  - **Nút đóng Modal** — `rc-dialog/es/Dialog/Content/Panel.js:111` **hardcode** `"aria-label": "Close"`; `antd/es/modal/Modal.js` không có prop `closeAriaLabel` (đã grep: 0 kết quả). `useClosable.js:99-101` chỉ đặt `aria-label` cho **icon bên trong** (lấy từ `locale.close` = "Đóng"), nhưng nút ngoài vẫn là "Close" → tên truy cập của nút là "Close".
  - **Nút prev/next phân trang** — `rc-pagination/es/Pagination.js:399-425`: chỉ `li` có `title` (từ `locale.prev_page`/`next_page`), **nút bên trong không có `aria-label`** → tên lấy từ icon `left`/`right`. Không có prop đặt tên nút.
  - **Nút tìm của ô tìm kiếm** — `antd/es/input/Search.js:84,112`: khi `enterButton` không truyền, chỉ render `<SearchOutlined/>` (icon có `aria-label="search"`).
  - **Nút xoá của ô nhập** (`allowClear`) — icon `close-circle`; không có prop đặt tên.
  - → Cách sửa duy nhất "sạch" là **port sang Astryx** (Astryx `TextInput`/`Table`/`Dialog` đều đặt tên tiếng Việt qua `label`/`aria-label`). Đây là các trang chưa port (P3c→P5). **Xác minh ở P5:** khi `grep -r "from 'antd'" src` = 0 thì R-02 tự hết; sẽ chạy lại `probe-a11y-names.mjs`.

### R-03 — `antd/dist/reset.css` vẫn nạp và đè Heading Astryx

- **Tình trạng:** `Lỗi thật`
- **Mô tả:** `main.tsx:12` ghi rõ "KHÔNG import `antd/dist/reset.css` nữa", nhưng `main.tsx:28` **vẫn** `import 'antd/dist/reset.css'`. Reset của antd **không nằm trong `@layer`** nào, mà CSS không layer **luôn thắng** CSS có layer → nó đè `Heading` của Astryx (đang ở layer `astryx-base`).
- **Bằng chứng:**
  - `frontend/src/main.tsx:12` (comment) vs `:28` (import thật); `_main-transformed.txt:28` xác nhận import tồn tại trong bundle.
  - probe `_probe-heading.log`: h1 (`.astryx-heading`) có `fontWeight: "500"` và `marginBottom: "12px"`.
  - `antd/dist/reset.css`: `h1,h2,h3,h4,h5,h6 { margin-top:0; margin-bottom:.5em; font-weight:500 }` (rule không layer, thắng layer).
  - Astryx định nghĩa: `--text-heading-1-weight: var(--font-weight-semibold)` = `600`; và **không** đặt margin cho heading (`astryx.css`: "không có rule margin nào gắn với `astryx-heading`").
- **Góc nhìn (A):** tiêu đề mọi trang đã port đang **nhạt hơn** thiết kế (500 thay vì 600) và **thừa 12px** lề dưới. Sai lệch thiết kế toàn cục.
- **Góc nhìn (B):** không phải chủ đích — chính comment trong code nói phải bỏ.
- **Đề xuất (KHÔNG thực hiện):** xoá `import 'antd/dist/reset.css'` (dòng 28) — đúng như comment dòng 12 mô tả; Astryx `reset.css` đã dọn đủ cho cả hai bên.
- **✅ Đã sửa (P1):** xoá `import 'antd/dist/reset.css';` khỏi `frontend/src/main.tsx` (comment dòng 12–19 giờ khớp đúng với code).
  - **Trước** (`_probe-p1-before.log`): h1 `.astryx-heading` có `fontWeight: "500"`, `marginBottom: "12px"`; có 1 stylesheet chứa rule `h1{font-weight:500}` (dấu vết reset antd).
  - **Sau** (`_probe-p1-after.log`): h1 `fontWeight: "600"`, `marginBottom: "0px"`; **không còn** stylesheet nào chứa `h1{font-weight:500}` (`antdResetStillPresent: false`). Đo được **không cần** bật/tắt gì thêm — đúng như khi tắt reset thủ công trong trình duyệt ở bước chẩn đoán.
  - **Không hồi quy:** `html`/`body` vẫn `height: 768px` (Astryx `reset.css` lo), không phụ thuộc `html,body{height:100%}` của reset antd.

### R-04 — 403/404 lộ chữ tiếng Anh cho trình đọc màn hình

- **Tình trạng:** `Lỗi thật`
- **Mô tả:** Màn 403 và 404 dùng `Result` của antd. Hình minh hoạ của `Result` là một SVG có thẻ `<title>` **tiếng Anh**, nằm trong cây trợ năng → trình đọc màn hình đọc "Unauthorized" / "No Found" trước nội dung tiếng Việt.
- **Bằng chứng:**
  - dump `37-403-quan-tri--desktop.txt:22` → `[ant-result] Unauthorized403Bạn không có quyền…`.
  - dump `38-403-to-chuc--desktop.txt:22`, `39-403-dao-tao--desktop.txt:22` (cùng "Unauthorized").
  - dump `12-xem-thu-sai-slug--desktop.txt:22`, `41-khong-tim-thay--desktop.txt:22` → `No Found…`.
  - Nguồn: `node_modules/antd/es/result/unauthorized.js:7` → `<title>Unauthorized</title>`; `noFound.js:7` → `<title>No Found</title>` ("No Found" là lỗi chính tả của antd); `serverError.js:7` → `<title>Server Error</title>`.
- **Góc nhìn (A):** vi phạm WCAG 2.1 AA (3.1.1 ngôn ngữ; 4.1.2). Thêm nữa, các trang này **không có heading** (`h1`) — dump `37`, `41` mục "Tiêu đề (heading)" = "(không có)".
- **Góc nhìn (B):** không phải chủ đích; các trang 403/404 **chưa được port** sang Astryx (Astryx không có `Result`, phải tự dựng).
- **Đề xuất (KHÔNG thực hiện):** khi port, tự dựng màn 403/404 bằng Astryx (`Heading` + `Text` + `Button`), bỏ SVG tiếng Anh; thêm `h1`.
- **✅ Đã sửa (P2):** tạo component dùng chung **`frontend/src/components/StatusScreen/StatusScreen.tsx`** (Astryx: `VStack` + `Heading level={1}` + `Text` + `Button`) — chỉ có chữ, **không SVG**, `h1` là tiêu đề tiếng Việt. Thay `Result` của antd ở **5 màn theo bằng chứng dump**:
  - `components/AdminGuard/AdminGuard.tsx` (403 `/quan-tri`), `components/OwnerGuard/OwnerGuard.tsx` (403 `/to-chuc`), `components/AcademicGuard/AcademicGuard.tsx` (403 `/dao-tao`) → `code="403"`, `title` = chính chuỗi `NO_PERMISSION` sẵn có (giữ nguyên nội dung hiển thị), `fullHeight`.
  - `pages/NotFoundPage/NotFoundPage.tsx` (404), `pages/RolePreviewPage/RolePreviewPage.tsx` (404 slug vai trò) → `code="404"`, giữ nguyên `title`/mô tả cũ.
  - Ba guard giờ **không còn import antd** (chỉ dùng Astryx).
  - **Mở rộng cùng lỗi (phát hiện khi rà):** 3 màn chi tiết chưa port cũng dùng `Result` 404 → thay bằng `StatusScreen`: `pages/AccountDetailPage/AccountDetailPage.tsx`, `pages/DepartmentDetailPage/DepartmentDetailPage.tsx`, `pages/OrganizationDetailPage/OrganizationDetailPage.tsx`. `grep "<Result"` trong `frontend/src` = **0**.
  - **Trước** (dump cũ): `37`/`38`/`39` → `[ant-result] Unauthorized403…`; `12`/`41` → `No Found…`; mục "Tiêu đề (heading)" = "(không có)".
  - **Sau** (`probe-p2-verify.mjs` → `_probe-p2-after.log`): cả 5 route `englishLeak: false`, `svgTitles: []`; mỗi màn có `h1` đúng (`Bạn không có quyền truy cập khu vực quản trị.` / `…quản lý tổ chức.` / `…khu vực này.` / `Không có vai trò này` / `Không tìm thấy trang`). Dump `37/38/39` → "Số phần tử antd: 0", `## Tiêu đề (heading)` có `h1: …`.
  - **Không phá test:** `router.test.tsx` (`getByText('Không tìm thấy trang')`, `getByText('Bạn không có quyền truy cập khu vực quản lý tổ chức.')`) và `OwnerGuard.test.tsx`, `RolePreviewPage.test.tsx` đều pass; `tsc`/`eslint`/`vitest`(167)/`build` EXIT 0.

### R-05 — Tràn ngang cả trang ở 375/320px trên 3 trang Tổ chức

- **Tình trạng:** `Lỗi thật`
- **Mô tả:** Ở khổ điện thoại (375px) và rất hẹp (320px), **cả trang** rộng hơn viewport (cuộn ngang toàn trang) trên 3 trang Tổ chức. Bảng antd rộng hơn màn hình nhưng **không nằm trong vùng cuộn riêng** nên đẩy cả trang.
- **Bằng chứng:** cột "Tràn ngang" trong `dumps/_index.md` (5 dòng "CÓ"):
  - `26-to-chuc-phong-ban--narrow.txt` → rộng hơn **32px** (viewport 320). Phần tử vượt mép: `<table> rộng 336px, mép phải 352px`.
  - `28-to-chuc-chuc-vu--mobile.txt` → **+247px**; `28-...--narrow.txt` → **+302px**.
  - `29-to-chuc-chi-tiet-phong-ban--mobile.txt` → **+235px**; `29-...--narrow.txt` → **+290px**.
- **Đối chiếu (quan trọng):** các trang **đã port** ở cùng khổ **không** tràn: `16`, `21`, `30`, `33`, `34`, `35` đều ghi "Tràn ngang: không (trang vừa khít viewport 320px)". Astryx `Table` bọc bảng trong một khung cuộn — thấy rõ ở dump `34-dao-tao-lop-hoc-rong--desktop.txt:29-30`: `<div role="group"> Bảng … 1054px` chứa `<table> … 1270px` mà trang vẫn không tràn.
- **Góc nhìn (A):** vi phạm ràng buộc responsive bắt buộc (320/768/1024/1440, "không tràn ngang; bảng cuộn trong khung").
- **Góc nhìn (B):** các trang này **chưa port**; nhưng đây vẫn là lỗi hiện hữu với người dùng, không phải lựa chọn.
- **Đề xuất (KHÔNG thực hiện):** khi port 3 trang này sang Astryx, dùng `Table` của Astryx (đã tự cuộn trong khung) — không cần chỉnh gì thêm. Trước khi port, có thể bọc `Table` antd trong `div` có `overflow-x:auto` nếu cần chữa cháy.
- **✅ Đã sửa (P1):** thêm `scroll={{ x: N }}` cho 3 `Table` antd còn thiếu — `DepartmentsPage.tsx` (`x: 640`), `PositionsPage.tsx` (`x: 860`), `DepartmentDetailPage.tsx` (`x: 760`). Đây là **cách làm sẵn có của codebase**: 8 file antd khác đã dùng `scroll={{ x }}` (vd `AccountsPage.tsx:336` → `x: 1140`). Chọn `N ≤ 1054` để ở desktop bảng vẫn rộng đúng bằng khung (không đổi bố cục).
  - **Cơ chế (đã xác minh trong `node_modules/rc-table/es/Table.js:446-463`):** `scroll.x` đặt `min-width` cho bảng và cho khung `.ant-table-content{overflow:auto}` cuộn riêng. `table-layout` chỉ thành `fixed` khi có **cột `fixed`**, **`scroll.y`**, hoặc **`ellipsis`**; `scroll.x` đơn thuần vẫn là `auto` → **bề rộng cột theo nội dung được giữ nguyên**. (Điều này giải thích vì sao `AccountsPage` ra `fixed`: nó có cột `fixed: 'left'/'right'` — `AccountsPage.tsx:141,194`.)
  - **Trước** (`_probe-p1-before.log`, 320px): `26` phòng ban tràn **+32px** (bảng 336, cột "Thao tác" 136), `28` chức vụ tràn **+284px** (bảng 588).
  - **Sau** (`_probe-p1-after.log`, 320px): cả 3 trang `overflow: 0`; bảng 640/860/760 nằm trong khung `contentOverflowX: auto`.
  - **Desktop 1366 không đổi:** phòng ban `[262,278,208,305]`, chức vụ `[131,111,431,123,257]` — **khớp chính xác** baseline trước khi sửa; chi tiết phòng ban `[142,233,124,157,397]` (bảng 1054).
  - **Chạy lại toàn bộ 87 dump:** **không còn dump nào** ghi "Tràn ngang: CÓ" (trước đó có 5 dòng).

### R-06 — Skeleton antd để lại tiêu đề/danh sách rỗng trong cây trợ năng

- **Tình trạng:** `Lỗi thật` (nhẹ)
- **Mô tả:** Khi trang Quản lý tài khoản đang tải, skeleton của antd render một `<h3>` rỗng và một `<ul>` rỗng vào cây trợ năng → trình đọc màn hình gặp phần tử tiêu đề/danh sách không có nội dung.
- **Bằng chứng:** dump `25-quan-tri-tai-khoan-dang-tai--desktop.txt:42-43` → `<h3>  @280,250 401x18`, `<ul>  @280,296 1054x270`; mục "Tiêu đề (heading)" dòng 60 ghi `h3: ` (rỗng).
- **Góc nhìn (A):** không nên có ở bản phát hành (rác trong cây trợ năng).
- **Góc nhìn (B):** do `Skeleton` của antd, trang chưa port.
- **Đề xuất (KHÔNG thực hiện):** khi port, thay bằng skeleton/`PageLoading` của Astryx (đã kiểm: `PageLoading` dùng `role="status"`, không sinh heading rỗng).
- **✅ Đã sửa (P3):** thay antd `Skeleton` bằng component Astryx **`components/PageLoading/PageLoading.tsx`** (`role="status"` + `aria-busy` + khung xương `aria-hidden`, chữ "Đang tải…" chỉ cho trình đọc màn hình) ở **10 file**:
  - `pages/AccountsPage`, `pages/OverviewPage`, `pages/ModuleCatalogPage`, `pages/AllOrganizationsPage`, `pages/PendingOrganizationsPage`, `pages/AccountDetailPage`, `pages/DepartmentDetailPage`, `pages/OrganizationDetailPage`, `pages/OrganizationDetailPage/ModuleConfigPanel`, `components/AuditLogTable`.
  - `RegisterPage` **không** thuộc R-06: `Skeleton` ở đó là của **Astryx** (`@astryxdesign/core`, không sinh `<h3>`/`<ul>`).
  - Bỏ `Skeleton` khỏi câu lệnh `import … from 'antd'` ở cả 10 file (`grep Skeleton` giờ chỉ còn trong `RegisterPage` + `PageLoading`, đều là Astryx).
  - **Trước** (dump `25-quan-tri-tai-khoan-dang-tai--desktop.txt`): dòng 42-43 `<h3>  @280,238 401x18` + `<ul>  @280,284 1054x270`; mục "Tiêu đề (heading)" có `h3: ` (rỗng).
  - **Sau** (dump `25`): dòng 42 `<div role="status"> Đang tải… @280,238 1054x218`; mục "Tiêu đề (heading)" **chỉ còn** `h1: Quản lý tài khoản`; mục "Thông báo / trạng thái" có `[status] Đang tải…`. Số phần tử antd: 97 → 93.
  - **Cập nhật e2e kèm theo:** `e2e/pending-organizations.spec.ts` (`TC-ORG-14`) đổi selector `.ant-skeleton` → `getByRole('status')` (khớp `PageLoading`), vì trang này vừa đổi khung chờ.
  - **Chạy lại toàn bộ 87 dump:** 0 dòng "Tràn ngang: CÓ"; chỉ 5 file đổi (dump `13`×3, `25`, `38` — `38` chỉ lệch 3px bề rộng nút do render font, không liên quan).

### R-07 — Chức vụ: nút sửa/xoá không phân biệt dòng, xác nhận xoá không nêu tên

- **Tình trạng:** `Lỗi thật`
- **Mô tả:** Trên trang Chức vụ, mỗi dòng có nút "Sửa chức vụ" và "Xoá" **giống hệt nhau** (không kèm tên chức vụ). Người dùng trình đọc màn hình nghe hai nút "Sửa chức vụ" / hai nút "Xoá" mà không biết nút nào thuộc dòng nào. Hộp xác nhận xoá cũng chỉ hỏi "Xoá chức vụ?" + "Thao tác này không hoàn tác được." — **không nêu tên chức vụ sắp bị xoá**.
- **Bằng chứng:**
  - dump `28-to-chuc-chuc-vu--desktop.txt:36-39` → `button "Sửa chức vụ"` ×2, `button "Xoá"` ×2 (không có tên chức vụ).
  - `frontend/src/pages/PositionsPage/PositionsPage.tsx:116` (nút sửa, **không** `aria-label`) và `:127` (nút xoá, **không** `aria-label`); `:119-124` `Popconfirm` dùng `description={MSG_POS.DELETE_CONFIRM}` (không có tên).
  - **Đối chiếu ngược — Phòng ban làm ĐÚNG:** dump `26-to-chuc-phong-ban--desktop.txt:35-36` → `button "Sửa phòng ban Tổ Toán"`, `button "Xoá phòng ban Tổ Toán"`; `DepartmentsPage.tsx:111,118,127` có `aria-label={`${MSG_DEPT.EDIT} ${department.name}`}` và mô tả `Phòng ban "${department.name}" sẽ bị xoá. …`.
- **Góc nhìn (A):** vi phạm WCAG 2.1 AA (4.1.2; 2.4.6 nhãn/mục đích) và là rủi ro an toàn — thao tác **phá huỷ** mà không xác định đối tượng.
- **Góc nhìn (B):** không phải chủ đích — chính trang Phòng ban cho thấy dự án biết cách làm đúng.
- **Đề xuất (KHÔNG thực hiện):** thêm tên chức vụ vào `aria-label` hai nút và vào mô tả `Popconfirm`, giống hệt cách `DepartmentsPage` đang làm.
- **✅ Đã sửa (P2):** làm đúng theo mẫu `DepartmentsPage`:
  - `pages/PositionsPage/PositionsPage.tsx` — nút sửa: `aria-label={`${MSG_POS.EDIT} ${position.name}`}`, nhãn hiển thị đổi sang `MSG_POS.EDIT_SHORT` ("Sửa", khớp Phòng ban); nút xoá: `aria-label={`${MSG_POS.DELETE} chức vụ ${position.name}`}`; `Popconfirm.description` = `Chức vụ "${position.name}" sẽ bị xoá. ${MSG_POS.DELETE_CONFIRM}`.
  - `features/owner/ownerMessages.ts` — thêm `EDIT_SHORT: 'Sửa'` cho `MSG_POS` (trước đó chỉ `MSG_DEPT` có).
  - **Sau** (`_probe-p2-after.log`): nhãn nút = `Sửa chức vụ Giáo viên`, `Xoá chức vụ Giáo viên`, `Sửa chức vụ Tổ trưởng`, `Xoá chức vụ Tổ trưởng`; hộp xác nhận = `Xoá chức vụ? Chức vụ "Giáo viên" sẽ bị xoá. Thao tác này không hoàn tác được. Huỷ Xoá`.
  - **Dump** `28-to-chuc-chuc-vu--desktop.txt` (sau) → `button "Sửa chức vụ Giáo viên"`, `button "Xoá chức vụ Giáo viên"` (trước: `button "Sửa chức vụ"` ×2, `button "Xoá"` ×2).

### R-08 — Thẻ số liệu "Tổ chức chờ duyệt" nêu sai đích đến

- **Tình trạng:** `Lỗi thật` (nhẹ)
- **Mô tả:** Trang Tổng quan có 4 thẻ số liệu bấm được. Thẻ "Tổ chức chờ duyệt" có tên truy cập là `"Tổ chức chờ duyệt: 2. Tất cả tổ chức"`, nhưng nó **dẫn tới `/quan-tri/to-chuc`** (màn "Tổ chức chờ duyệt"), không phải màn "Tất cả tổ chức" (`/quan-tri/to-chuc/tat-ca`). Người dùng trình đọc màn hình bị chỉ sai chỗ đến.
- **Bằng chứng:**
  - dump `13-quan-tri-tong-quan--desktop.txt:35,53` → `a "Tổ chức chờ duyệt: 2. Tất cả tổ chức" @280,202`.
  - `frontend/src/pages/OverviewPage/OverviewPage.tsx:41-46` → thẻ `pending` có `path: '/quan-tri/to-chuc'` nhưng `ariaLabel: \`${MSG_OVW.PENDING_CARD}: … . ${MSG_ADM.MENU_ORG_ALL}\``.
  - `frontend/src/features/admin/adminMessages.ts:22` → `MENU_ORG_ALL: 'Tất cả tổ chức'`.
  - (3 thẻ còn lại đúng: đích đến "Danh mục module" khớp `MENU_MODULES`.)
- **Góc nhìn (A):** nhãn sai — nên dùng tên màn đích thật.
- **Góc nhìn (B):** có thể là lỗi sao chép nhãn, không phải chủ đích.
- **Đề xuất (KHÔNG thực hiện):** đổi `MENU_ORG_ALL` → hằng số tên màn "Tổ chức chờ duyệt" trong `ariaLabel` của thẻ `pending`.
- **✅ Đã sửa (P3):** `pages/OverviewPage/OverviewPage.tsx:45` đổi `MSG_ADM.MENU_ORG_ALL` ("Tất cả tổ chức") → **`MSG_ORG.LIST_TITLE`** (`MSG-ORG-18`, "Tổ chức chờ duyệt") — đúng tên màn đích `/quan-tri/to-chuc`; thêm comment giải thích. Thêm `MSG_ORG` vào câu lệnh import.
  - **Trước** (dump `13-quan-tri-tong-quan--desktop.txt:35,53`): `a "Tổ chức chờ duyệt: 2. Tất cả tổ chức"`.
  - **Sau** (dump `13`): `a "Tổ chức chờ duyệt: 2. Tổ chức chờ duyệt"` (đích đến nêu đúng; 3 thẻ còn lại vẫn đúng `Danh mục module`).

---

## 4. Không hợp lý nếu là bản hoàn chỉnh (chi tiết)

### N-01 — Đăng ký: danh mục module lỗi, không có nút "Thử lại"

- **Tình trạng:** `Không hợp lý nếu là bản hoàn chỉnh` — ✅ **ĐÃ SỬA (P4)**
- **Mô tả:** Khi `GET /api/v1/modules` lỗi 500, banner lỗi hiện ra nhưng **không có nút thử lại**; câu chữ yêu cầu người dùng **tải lại cả trang**. Mọi màn lỗi khác trong app đều có nút "Thử lại".
- **Bằng chứng (trước):** dump `05-register-module-loi--desktop.txt:23,50` → `role="alert"` "Không tải được danh sách module. Danh mục module không tải được. **Vui lòng tải lại trang rồi đăng ký.**" — **không** có nút "Thử lại" trong danh sách điều khiển (dòng 33-41). So sánh: dump `24-quan-tri-tong-quan-loi--desktop.txt:37,44` có `button "Thử lại"`. Nguồn: `RegisterPage.tsx:222-231`.
- **Góc nhìn (A):** không nên — bắt người dùng F5 để thử lại là bước lùi so với phần còn lại của app.
- **Góc nhìn (B):** có thể là lựa chọn tối giản có chủ đích cho trang công khai.
- **Đề xuất:** thêm nút "Thử lại" gọi `modulesQuery.refetch()`, giống các trang khác.
- **✅ Đã sửa (P4):** thêm nút "Thử lại" (`variant="secondary" size="sm"`) vào `endContent` của `Banner`, gọi `void modulesQuery.refetch()`; đổi câu chữ mô tả thành "Danh mục module không tải được. **Vui lòng thử lại.**" (bỏ "tải lại trang"). Hằng `MSG_MOD.RETRY` thêm ở `adminMessages.ts`. Bám đúng mẫu `ClassesPage`/`TeachersPage`. **Bằng chứng sau:** dump `05` → `button "Thử lại" @1144,444 69x28`; test `RegisterPage.modules.test.tsx` (N-01) kiểm `getByRole('alert')` + bấm "Thử lại" gọi lại `fetchModuleCatalog`.

### N-02 — Đăng ký: danh mục module rỗng nhưng vẫn bật nút "Gửi đăng ký"

- **Tình trạng:** `Không hợp lý nếu là bản hoàn chỉnh` — ✅ **ĐÃ SỬA (P4)**
- **Mô tả:** Khi danh mục module **rỗng** ("Chưa có module nào để chọn"), nút "Gửi đăng ký" **vẫn bật**. Bấm vào sẽ báo lỗi "Vui lòng chọn ít nhất 1 module" — nhưng **không có module nào để chọn** → ngõ cụt. Trong khi đó module là **bắt buộc** (`modules: value.length > 0 ? undefined : 'Vui lòng chọn ít nhất 1 module'`).
- **Bằng chứng (trước):** dump `06-register-module-rong--desktop.txt:22,28,33,38` → `Module cần sử dụng`, `button "Gửi đăng ký"` (**không** `{disabled}`), banner "Chưa có module nào để chọn … Quản trị hệ thống cần bật module trước khi tổ chức đăng ký." Nguồn: `RegisterPage.tsx:114` (bắt buộc) và `:232-237` (banner rỗng).
- **Góc nhìn (A):** nên **tắt** nút "Gửi đăng ký" khi danh mục rỗng (hoặc ẩn cả form) để người dùng không đi vào ngõ cụt.
- **Góc nhìn (B):** banner đã giải thích lý do → có thể coi là tạm chấp nhận; nhưng nút vẫn bật là điểm trừ.
- **Đề xuất:** `disabled` nút gửi khi `moduleOptions.length === 0`.
- **✅ Đã sửa (P4):** `isDisabled={hasNoModuleToSelect}` với `hasNoModuleToSelect = modulesQuery.isSuccess && moduleOptions.length === 0` — chỉ tắt khi danh mục **đã tải xong và rỗng** (đang tải/lỗi thì không tắt). **Bằng chứng sau:** dump `06` → `button "Gửi đăng ký" … {disabled}`; test `RegisterPage.modules.test.tsx` (N-02) mock danh mục rỗng → kiểm nút có `aria-disabled="true"`.

---

## 5. Có thể là chủ đích (KHÔNG tính ưu tiên) → câu hỏi cho team

| Mã | Thứ | Bằng chứng | Vì sao có thể là chủ đích |
|----|-----|-----------|---------------------------|
| D-01 | Trang Đăng nhập có khối "hoặc xem thử theo vai trò" + **5 nút vai trò** (Admin hệ thống / Chủ tổ chức / Cán bộ quản lý / Giáo viên / Sinh viên) | dump `01-login-default--desktop.txt:26-30` (5 nút cao 58px) | Code ghi rõ `RolePreviewPage` là **màn tạm để xem trước, KHÔNG xác thực** (`RolePreviewPage.tsx:14-17`); đây là công cụ demo. |
| D-02 | Màn "Tính năng đang chờ backend (D-20)" hiện cho người dùng | dump `17-quan-tri-tat-ca-to-chuc-cho-be--desktop.txt:34` | `docs/api.md` ghi endpoint chưa có (`D-20`); đây là màn chờ có chủ đích. |
| D-03 | Danh mục module chỉ để **xem**, không có nút bật/tắt | dump `20-quan-tri-danh-muc-module--desktop.txt` (không có nút bật/tắt) | `ModuleCatalogPage.tsx:38` ghi BE chưa có API bật/tắt → read-only là chủ đích. |
| D-04 | Trang chủ theo vai trò chưa có; `/xem-thu/:vaiTro` là màn tạm | dump `11-xem-thu-hop-le--desktop.txt:29` ("Chế độ xem thử — chưa đăng nhập") | `RolePreviewPage.tsx:14-15` ghi "Sprint sau sẽ dựng". |
| D-05 | Lệch phong cách nút/bảng giữa trang Astryx và trang antd | đối chiếu dump `30`/`33` (Astryx) với `26`/`28`/`29` (antd) | `docs/ui-conventions.md:490` cho phép "lai" (hybrid) tới P4. |

---

## 6. Chưa rõ, cần team xác nhận

| Mã | Thứ | Bằng chứng | Cần xác nhận |
|----|-----|-----------|--------------|
| Q-01 | Phòng ban/Chức vụ dùng chữ **"Xoá"** và gọi `DELETE /departments/{id}`, `DELETE /positions/{id}` cứng — trong khi Admin tài khoản đã dùng "Vô hiệu hoá" | dump `26-to-chuc-phong-ban--desktop.txt:36`, `28-to-chuc-chuc-vu--desktop.txt:37`; `ownerMessages.ts:61,66,134,137`; `ownerApi` gọi `DELETE`; `authApi.ts:48` ghi chú "BR-04: dùng chữ 'Vô hiệu hoá', KHÔNG dùng 'Xoá'" | **BR-04 có áp cho Phòng ban/Chức vụ không?** Nếu có → cả chữ và API đều sai; nếu không → giữ nguyên. (Cần BE/nghiệp vụ xác nhận — **dừng**, không tự sửa.) |
| Q-02 | Vai trò `ORG_ADMIN`, `FACILITY_STAFF` chưa có màn hình; đăng nhập vào sẽ hiện banner "vai trò chưa có màn hình" | dump `03-login-vai-tro-chua-co-man--desktop.txt:21`; `backendRoles.ts:24` (`// TODO(Sprint sau)`) | Vai trò này thuộc sprint nào? Ở bản phát hành thì ẩn hay giữ banner? |
| Q-03 | Người dùng **đã đăng nhập** nhưng sai quyền bị đưa về `/dang-nhap` ("Về trang đăng nhập") **mà không đăng xuất** | dump `37-403-quan-tri--desktop.txt:13,16`; `AdminGuard.tsx:37-39` | Với người đã đăng nhập, nên "Về trang chủ" thay vì "Về trang đăng nhập"? Hay cố ý để họ đăng nhập tài khoản khác? |
| Q-04 | Trang `Quên mật khẩu` khi endpoint chưa có (`D-32`) hiện banner "chức năng chưa sẵn sàng" | dump `08-quen-mat-khau-chua-co--desktop.txt` | Ở bản phát hành mà BE vẫn chưa xong thì giữ banner hay ẩn mục "Quên mật khẩu?" |

---

## 7. Câu hỏi cho team (tổng hợp)

1. **BR-04 cho Phòng ban/Chức vụ** — áp dụng hay không? (Q-01) → quyết định chữ "Xoá" và API `DELETE` đúng hay sai.
2. `/xem-thu/:vaiTro` + khối "xem thử theo vai trò" ở trang Đăng nhập (D-01, D-04): giữ tới sprint nào? Ở bản phát hành có ẩn khỏi người dùng thật không?
3. Trang chủ theo vai trò dự kiến sprint nào? Sau đăng nhập, người dùng sẽ về đâu?
4. Các màn "Tính năng đang chờ backend" (`D-20`…`D-31`) — khi phát hành mà BE chưa xong thì ẩn menu hay giữ màn chờ? (D-02)
5. `ModuleCatalogPage` read-only: có dự kiến cho bật/tắt module không? (D-03)
6. Vai trò `ORG_ADMIN`/`FACILITY_STAFF` thuộc sprint nào? (Q-02)
7. Người đã đăng nhập nhưng sai quyền: nên đi đâu? (Q-03)
8. `PROJECT_CONTEXT.md` §2.3 (ghi "Ant Design 5" + "React Hook Form + Zod") có cập nhật sang Astryx + `useFormState` không? Hiện gây hiểu nhầm cho người mới.
9. Đăng ký tổ chức khi danh mục module rỗng: có mong muốn **chặn** đăng ký (tắt nút gửi) không? (N-02) → **đã quyết ở P4:** **tắt** nút "Gửi đăng ký" khi danh mục tải xong nhưng rỗng (xem N-02).

---

## 8. Điểm tốt đã xác nhận (không cần sửa)

- **Trang auth đã port sạch antd:** dump `01`, `02`, `04`, `07`, `09` → "Số phần tử antd (.ant-*) trên trang: 0".
- **Lỗi đăng nhập dùng `role="alert"`:** dump `02-login-sai-mat-khau--desktop.txt:21` → `<div role="alert"> Sai tên đăng nhập hoặc mật khẩu.` (đúng NFR, không hiện success khi lỗi).
- **Vai trò chưa có màn hình dùng `role="status"`** (không phải `alert`): dump `03-...:21` → hợp lý vì không phải lỗi.
- **Chưa đăng nhập vào `/quan-tri` → tự chuyển `/dang-nhap`** (không lộ màn quản trị): dump `40-quan-tri-chua-dang-nhap--desktop.txt`.
- **403 giữ nguyên URL** (không đẩy về trang khác): dump `37`, `38`, `39` → "URL thực tế" trùng "URL yêu cầu".
- **Responsive ở khổ hẹp của trang đã port:** `<aside>` giới thiệu ở trang auth tự ẩn ở 320px (dump `07-...--narrow.txt` không tràn); bảng Astryx cuộn trong khung (dump `34`).
- **5 trạng thái có mặt trên các màn Sprint 4 đã port:** loading (dump `36`), empty (dump `31`, `34`), success (dump `30`, `33`), no-permission (dump `39`), error (xem Phụ lục A — một số chưa dump, xem giới hạn).

---

## 9. Đã kiểm và LOẠI (tránh dương tính giả)

Ghi lại để lần sau không báo lại:

- **`<div role="status"> Đang tải @-1,-1 1x1`** trên các trang bảng Astryx (dump `31:35`, `34:31`, `36:34`) **KHÔNG phải lỗi**: đây là vùng thông báo (live region) của Astryx, tự xoá sau `CLEAR_DELAY_MS = 2000` (`@astryxdesign/core/dist/hooks/useAnnounce.js`). Dump chụp ở mốc ~900ms nên còn thấy.
- **`<table> [table 0 cột, N dòng]`** trên các màn chi tiết (dump `18:42`, `22:38`, `32:40`, `35:38`) **KHÔNG phải lỗi dữ liệu**: đây là `Descriptions` của antd render bằng bảng lồng nhau; script dump đếm `thead th` nên ra 0 cột. Hạn chế của script, không phải lỗi app.
- **Nút phân trang hiện `button ""`** trong dump text **KHÔNG phải "không có tên"**: xác minh bằng `ariaSnapshot` thật (probe `_probe-a11y.log`) cho thấy tên là **"left"/"right"** (tiếng Anh) — đã gộp vào R-02, không báo riêng là "thiếu nhãn".
- **Tràn ngang ở trang Đăng nhập/Quên mật khẩu 320px:** đã kiểm — KHÔNG tràn (aside giới thiệu tự ẩn). Không báo.

---

## Phụ lục A — Ma trận phủ 5 trạng thái

Ký hiệu: ✓ = đã dump · ✗ = **chưa dump** (khoảng trống, cần xác minh thêm) · – = không áp dụng.
Nguồn: `dumps/_index.md` (87 file).

| Route | loading | empty | error | success | no-permission |
|-------|:---:|:---:|:---:|:---:|:---:|
| `/dang-nhap` | ✗ | – | ✓ (401 `02`) | ✗ | – |
| `/dang-ky` | ✗ | ✓ (module rỗng `06`) | ✓ (module 500 `05`) | ✓ (`04`) | – |
| `/quen-mat-khau` | ✗ | – | ✓ (404 chưa có `08`) | ✗ | – |
| `/dat-lai-mat-khau` | – | – | ✓ (thiếu token `09`, hết hạn `10`) | ✗ | – |
| `/xem-thu/:vaiTro` | – | – | ✓ (slug sai `12`) | ✓ (`11`) | – |
| `/quan-tri` | ✗ | – | ✓ (500 `24`) | ✓ (`13`) | ✓ (`37`) |
| `/quan-tri/to-chuc` | ✗ | ✓ (`15`) | ✗ | ✓ (`14`) | ✓ (guard `37`) |
| `/quan-tri/to-chuc/tat-ca` | ✗ | ✗ | ✓ (404 chờ BE `17`) | ✓ (`16`) | ✓ (guard `37`) |
| `/quan-tri/to-chuc/:id` | ✗ | – | ✗ | ✓ (`18`) | ✓ (guard `37`) |
| `/quan-tri/to-chuc/:id/lich-su` | ✗ | ✗ | ✗ | ✓ (`19`) | ✓ (guard `37`) |
| `/quan-tri/module` | ✗ | ✗ | ✗ | ✓ (`20`) | ✓ (guard `37`) |
| `/quan-tri/tai-khoan` | ✓ (`25`) | ✗ | ✗ | ✓ (`21`) | ✓ (guard `37`) |
| `/quan-tri/tai-khoan/:id` | ✗ | – | ✗ | ✓ (`22`) | ✓ (guard `37`) |
| `/quan-tri/nhat-ky` | ✗ | ✗ | ✗ | ✓ (`23`) | ✓ (guard `37`) |
| `/to-chuc` | ✗ | ✓ (`27`) | ✗ | ✓ (`26`) | ✓ (`38`) |
| `/to-chuc/chuc-vu` | ✗ | ✗ | ✗ | ✓ (`28`) | ✓ (guard `38`) |
| `/to-chuc/phong-ban/:id` | ✗ | ✗ | ✗ | ✓ (`29`) | ✓ (guard `38`) |
| `/dao-tao/giao-vien` | ✓ (`36`) | ✓ (`31`) | ✗ | ✓ (`30`) | ✓ (`39`) |
| `/dao-tao/giao-vien/:id` | ✗ | ✗ (noClass) | ✗ | ✓ (`32`) | ✓ (guard `39`) |
| `/dao-tao/lop-hoc` | ✗ | ✓ (`34`) | ✗ | ✓ (`33`) | ✓ (`39`) |
| `/dao-tao/lop-hoc/:id` | ✗ | – | ✗ | ✓ (`35`) | ✓ (guard `39`) |
| `/khong-ton-tai` | – | – | ✓ (`41`) | – | – |

**Khoảng trống đáng lưu ý (cần xác minh):**
- Trạng thái **error (500)** mới phủ cho `/quan-tri` và `/dang-ky`. **Chưa** phủ cho 14 màn còn lại → chưa kiểm được "lỗi/timeout không hiện success" (NFR-REL-001) ở các màn đó.
- Trạng thái **loading** mới phủ 3 màn (`/quan-tri/tai-khoan`, `/dao-tao/giao-vien`, `/dang-ky` ngầm).
- **empty** chưa phủ cho: tất cả tổ chức, danh mục module, tài khoản, nhật ký, lịch sử tổ chức, chi tiết giáo viên (noClass), các tab chi tiết lớp.
- **no-permission** đã phủ đủ 3 khu vực lớn (quan-tri/to-chuc/dao-tao) + 403 tại chỗ.

---

## Phụ lục B — Danh mục bằng chứng

**Dump text (87 file):** `ux-review/dumps/*.txt` + `dumps/_index.md` (có cột "Tràn ngang").
**Script dump:** `ux-review/ux-dump.mjs` (chạy lại: `& $node "ux-review\ux-dump.mjs"`; lọc: `UX_ONLY`, `UX_CHANNEL`, `UX_BASE`).

**Probe chẩn đoán (chạy lại được):**

| File | Nội dung | Kết quả |
|------|----------|---------|
| `probe-antd-locale.mjs` → `_probe-locale.log` | Dạng giá trị của `import 'antd/locale/vi_VN'` | `looksLikeCjsNamespace: true`, `hasPagination: false`, `nestedPaginationItemsPerPage: "/ trang"` |
| `probe-heading-css.mjs` → `_probe-heading.log` | `reset.css` antd có đè Heading Astryx không | h1 `fontWeight 500`, `marginBottom 12px`; rule antd reset hiện diện |
| `probe-a11y-names.mjs` → `_probe-a11y.log` | Tên truy cập thật (ARIA) của nút icon/pagination | `button "search"`, `button "left"`, `button "right"`, `aria-label="Close"`; `listitem "Previous Page"` |

**Probe cho 3 lỗi P1 (trước/sau khi sửa):**

| File | Nội dung | Kết quả |
|------|----------|---------|
| `probe-p1-impact.mjs` → `_probe-p1-before.log` | Đo **TRƯỚC** khi sửa: R-03 (h1 500/12px), R-05 (tràn 32/284px ở 320px; bề rộng cột desktop) | h1 `500`/`12px`; phòng ban +32px, chức vụ +284px; desktop `[262,278,208,305]` / `[131,111,431,123,257]` |
| `probe-p1-verify.mjs` → `_probe-p1-after.log` | Đo **SAU** khi sửa: R-01 (chữ phân trang), R-03 (h1), R-05 (tràn + cột desktop) | `20 / trang`; h1 `600`/`0px`, `antdResetStillPresent: false`; tràn `0` ở cả 3 trang; desktop **không đổi** |
| `probe-dept-narrow.mjs` → `_probe-dept.log` | Tái hiện **chính xác** R-05 trang Phòng ban ở 320px (dùng đúng regex chặn API như `ux-dump.mjs`) | tràn 32px, bảng 336px, cột "Thao tác" 136px, `.ant-space` 120px `nowrap` |
| `_probe-a11y-after.log` | Chạy lại `probe-a11y-names.mjs` sau khi sửa | pagination `"Trang Trước"`/`"Trang Kế"`/`"kích thước trang"`/`20 / trang` |

**Probe cho 2 lỗi P2 (sau khi sửa):**

| File | Nội dung | Kết quả |
|------|----------|---------|
| `probe-p2-verify.mjs` → `_probe-p2-after.log` | R-04: 5 màn 403/404 có `h1`, không SVG/chữ tiếng Anh; R-07: nhãn nút + nội dung hộp xác nhận xoá màn Chức vụ | cả 5 route `englishLeak: false`, `svgTitles: []`; nhãn `Sửa chức vụ Giáo viên`…; xác nhận `Chức vụ "Giáo viên" sẽ bị xoá.` |

**Nhật ký kiểm tra chất lượng (sau khi sửa P1):** `_verify-tsc.log` (`tsc -b` EXIT 0) · `_verify-eslint.log` (`eslint . --max-warnings=0` EXIT 0) · `_verify-vitest.log` (24 file / 167 test pass) · `_verify-build.log` (`vite build` EXIT 0) · `_dump-rerun.log` (dump lại 87 file, EXIT 0).

**Nhật ký kiểm tra chất lượng (sau khi sửa P2):** `_p2-tsc.log` (EXIT 0) · `_p2-eslint.log` (EXIT 0) · `_p2-vitest.log` (24 file / 167 test pass) · `_p2-build.log` (EXIT 0) · `_p2-dump.log` (dump lại 87 file, EXIT 0) · `_p2-a11y.log` (chạy lại `probe-a11y-names.mjs` — R-02 vẫn còn, đúng như dự kiến).

**Nhật ký kiểm tra chất lượng (sau khi sửa P3):** `tsc -b` EXIT 0 · `_p3-eslint.log` (`eslint . --max-warnings=0` EXIT 0) · `_p3-vitest.log` (24 file / 167 test pass) · `_p3-build.log` (`vite build` EXIT 0) · `_p3-dump.log` (dump lại 87 file, EXIT 0). E2E `pending-organizations.spec.ts` cập nhật selector (chưa chạy được vì BE không chạy).

**Nhật ký kiểm tra chất lượng (sau khi sửa P4 — N-01/N-02):** `_n-tsc.log` (`tsc -b` EXIT 0) · `_n-eslint.log` (`eslint . --max-warnings=0` EXIT 0) · `_n-vitest.log` (**25 file / 169 test** pass — thêm `RegisterPage.modules.test.tsx`) · `_n-build.log` (`vite build` EXIT 0) · `_n-dump.log` (dump lại 87 file, EXIT 0; 0 dòng "Tràn ngang: CÓ"; chỉ `05`/`06`/`38` đổi).

**File nguồn đối chiếu:** `frontend/src/main.tsx` (:12-19 comment, :24-28 locale import — **đã sửa**; dòng `import 'antd/dist/reset.css'` đã xoá) · `frontend/src/pages/DepartmentsPage/DepartmentsPage.tsx` (:194 `scroll` — **đã thêm**) · `frontend/src/pages/PositionsPage/PositionsPage.tsx` (:192 `scroll` — **đã thêm**; cột thao tác `aria-label`/`Popconfirm.description` — **đã sửa R-07**) · `frontend/src/features/owner/ownerMessages.ts` (`MSG_POS.EDIT_SHORT` — **đã thêm**) · `frontend/src/components/StatusScreen/StatusScreen.tsx` (**mới** — màn 403/404 dùng chung) · `frontend/src/components/{AdminGuard,OwnerGuard,AcademicGuard}/*.tsx` (**đã sửa R-04**) · `frontend/src/pages/{NotFoundPage,RolePreviewPage,AccountDetailPage,DepartmentDetailPage,OrganizationDetailPage}/*.tsx` (**đã sửa R-04**) · `frontend/src/pages/DepartmentDetailPage/DepartmentDetailPage.tsx` (:246 `scroll` — **đã thêm**) · `frontend/src/pages/OverviewPage/OverviewPage.tsx` (:41-46 — **đã sửa R-08**: dùng `MSG_ORG.LIST_TITLE`; :97 `PageLoading` — **đã sửa R-06**) · `frontend/src/features/admin/adminMessages.ts` (:22 `MENU_ORG_ALL`, :86 `ALL_LIST_TITLE`; :174 `MSG_MOD.RETRY` — **đã thêm (P4)**) · `frontend/src/components/PageLoading/PageLoading.tsx` (khung chờ dùng chung — **đã dùng cho R-06**) · **10 file thay `Skeleton`→`PageLoading` (R-06):** `frontend/src/pages/{AccountsPage,OverviewPage,ModuleCatalogPage,AllOrganizationsPage,PendingOrganizationsPage,AccountDetailPage,DepartmentDetailPage,OrganizationDetailPage}/`, `frontend/src/pages/OrganizationDetailPage/ModuleConfigPanel.tsx`, `frontend/src/components/AuditLogTable/AuditLogTable.tsx` · `frontend/e2e/pending-organizations.spec.ts` (`TC-ORG-14` selector — **đã sửa kèm R-06**) · `frontend/src/pages/RegisterPage/RegisterPage.tsx` (:114, :222-237 — **đã sửa N-01/N-02 (P4)**: nút "Thử lại" ở `endContent`; `hasNoModuleToSelect` → `isDisabled`) · `frontend/src/pages/RegisterPage/RegisterPage.modules.test.tsx` (**mới (P4)** — test N-01/N-02) · `node_modules/antd/es/result/{unauthorized,noFound,serverError}.js` · `node_modules/rc-table/es/Table.js` (:446-463 logic `table-layout`) · `node_modules/rc-dialog/es/Dialog/Content/Panel.js` (:111 `aria-label="Close"`) · `node_modules/rc-pagination/es/Pagination.js` (:399-425 nút prev/next) · `node_modules/antd/es/input/Search.js` (:84, :112 nút tìm).

---

## Phụ lục C — Nhật ký thử & giới hạn

**Đã thử:** dev server Vite chạy nền (HTTP 200 trên `http://127.0.0.1:5173`); chạy dump full 87 lượt (EXIT=0, 0 lỗi script); 3 probe chẩn đoán (EXIT=0); **sửa 3 lỗi P1 rồi đo lại** (probe trước/sau, dump lại full, `tsc`/`eslint`/`vitest`/`build` đều EXIT 0); **sửa 2 lỗi P2 rồi đo lại** (`probe-p2-verify.mjs`, dump lại full 87, `tsc`/`eslint`/`vitest`/`build` đều EXIT 0); **sửa 2 lỗi P3 rồi đo lại** (dump lại full 87, `tsc`/`eslint`/`vitest`/`build` đều EXIT 0; kiểm mã nguồn antd/rc-* để kết luận R-02 chờ port); **sửa 2 mục N-01/N-02 (P4) rồi đo lại** (dump lại full 87, `tsc`/`eslint`/`vitest`/`build` đều EXIT 0; thêm 2 test mới ở `RegisterPage.modules.test.tsx`).
**Kẹt gặp phải:** không. Không có bước nào vượt quá 3 lần thử.
  - Một lần **sai kết luận tạm thời** đã tự bắt và sửa: probe đầu tiên chặn API bằng glob `**/api/**` không khớp `/departments` (không có tiền tố `/api`) nên trang ở trạng thái đang tải → tưởng Phòng ban *không* tràn. Viết `probe-dept-narrow.mjs` dùng đúng regex như `ux-dump.mjs` để tái hiện → xác nhận R-05 là **thật**. Các probe P1 sau đó dùng regex không neo đầu chuỗi (Playwright khớp trên URL đầy đủ).

**Giới hạn của lần review này:**
1. **BE không chạy** → mọi dữ liệu là **giả lập bằng `page.route`**; không kiểm chứng được hành vi thật của BE (mã lỗi, phân trang thật, thời gian phản hồi).
2. **Không đọc được hình ảnh** → đánh giá dựa trên cây cấu trúc + toạ độ + `innerText` + mã nguồn CSS, **không** đánh giá được màu sắc tương phản thực tế (cần công cụ đo contrast riêng để kết luận WCAG 1.4.3/1.4.11).
3. **Nhiều khoảng trống trạng thái** (Phụ lục A) → các kết luận về error/loading/empty chỉ đúng với những màn đã dump.
4. **Hai câu hỏi đang chờ Sang (BE) trả lời:** (a) có thêm `actorName` không; (b) mã module là `STUDENT_MANAGEMENT` hay `CLASS_MANAGEMENT`. Không ảnh hưởng kết luận UX ở trên.
5. **Đã thực hiện:** 7 lỗi + 2 mục không-hợp-lý (P1: R-01, R-03, R-05; P2: R-04, R-07; P3: R-06, R-08; **P4: N-01, N-02**) — xem mục "✅ Đã sửa". **Chờ port (P5):** R-02 (nhãn icon antd — không sửa sạch được khi còn antd; xem mục R-02).


---

## Cập nhật P5-D — Gỡ Ant Design khỏi frontend (2026-11-19, chưa commit)

- **Kết quả gỡ phụ thuộc trong mã nguồn:** `git grep -n "from 'antd'" -- frontend/src` = 0; `git grep -n "@ant-design" -- frontend/src` = 0. Đã bỏ `antd`, `@ant-design/v5-patch-for-react-19`, `@ant-design/icons` khỏi `frontend/package.json` và loại bỏ import/usage antd khỏi `main.tsx`, `router.tsx`, `theme.ts`, `OverviewPage`, `OwnerGuard.test.tsx`, `test/setup.ts` và các menu (`consoleMenu.ts`, `ownerMenu.ts`, `academicMenu.ts` — icon SVG nội bộ, không thêm dependency).
- **E2E/probe:** đã cập nhật selector E2E để không phụ thuộc `.ant-*`/DOM antd (`admin-console.spec.ts`, `admin-console-extended.spec.ts`, `approve-reject.spec.ts`, `ux-console.spec.ts`, `module-config.spec.ts`, `organization-detail.spec.ts`, `auth-password-reset.spec.ts`); `ux-review/probe-a11y-names.mjs` được viết lại để kiểm tra R-02 theo DOM hiện tại. **Chưa chạy probe/E2E trên môi trường dev server trong phiên này** (probe/E2E dùng mock `page.route`, không gọi API thật ghi dữ liệu).
- **R-02 (tên truy cập icon/nút/ô tìm kiếm/phân trang):** chuyển sang DOM Astryx nên không còn phụ thuộc nhãn hardcode của antd; **cần xác minh thực tế** khi có dev server (chạy lại `probe-a11y-names.mjs` và/hoặc E2E liên quan) vì tên truy cập phụ thuộc cách component Astryx render.
- **`AccountStatusModal`:** nút xác nhận dùng nhãn trạng thái đích (`targetLabel.label`, ví dụ "Vô hiệu hoá"/"Khoá"/"Kích hoạt"…) thay vì nhãn chung chung; giữ tiếng Việt, phù hợp ngữ cảnh thao tác (không đổi nghiệp vụ/phân quyền).
- **Xác minh tự động (frontend, Node Playwright driver):** `tsc -b` pass, `eslint . --max-warnings=0` pass, `vitest run --no-file-parallelism` pass (**25 file / 169 test**), `vite build` pass.
- **Còn lại / cần xác minh:** `frontend/package-lock.json` vẫn còn tham chiếu `antd` (2 vị trí chuỗi `"antd"`), **chưa dọn tự động** vì không có `npm`/`pnpm`/`yarn` trong PATH — tránh chỉnh tay lock rủi ro. Cần BE/nghiệp vụ xác nhận như đã nêu (Q-01 BR-04, `actorName`, module code, approve/reject reason/notifyEmail, payload member, `audit_log.entity_type/action`, CORS/gateway, mail) — không đoán/không đổi.
