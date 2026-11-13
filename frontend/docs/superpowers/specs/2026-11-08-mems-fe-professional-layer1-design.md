# MEMS FE — Thiết kế giao diện chuyên nghiệp (Lớp 1: Nền tảng & Khung)

**Ngày:** 2026-11-08  
**Phạm vi thiết kế:** Lớp 1 (nền tảng design system + khung/shell/điều hướng), đặt nền cho Lớp 2 (auth + mẫu trang lõi) và Lớp 3 (áp toàn bộ màn).  
**Trạng thái:** Đã duyệt (2026-11-08) — chốt 8.1(a), 8.2 Odoo-style, 8.3 OK. Tiếp theo: `writing-plans` cho Lớp 1.

## 1. Ý định & lý do

MEMS là hệ thống quản lý giáo dục theo module cho **các tổ chức giáo dục** (quản trị hệ thống, chủ tổ chức, cán bộ đào tạo/nhân sự…). Toàn bộ FE hiện dùng React 19 + Vite + Ant Design 5 với theme đỏ-cam/navy cơ bản; giao diện thiên “admin AntD mặc định”, chưa có “dáng” sản phẩm enterprise chuyên nghiệp.

Mục tiêu: đưa FE lên chất lượng chuyên nghiệp kiểu **PowerSchool / Odoo** — rõ ràng, đáng tin cậy, dễ quét dữ liệu nhiều, điều hướng/module nhất quán — triển khai **theo từng lớp, giữ app chạy được**, **không phá contract/logic với BE**.

**Định hướng chất (tham chiếu, không sao chép pixel):**
- *Odoo*: điều hướng theo khu vực/module rõ, khung ứng dụng gọn, bố cục trang có ngữ cảnh + hành động.
- *PowerSchool (SIS/enterprise giáo dục)*: làm việc với dữ liệu có cấu trúc (danh sách, lọc, biểu mẫu, chi tiết) một cách kỷ luật, trạng thái rõ.

## 2. Mục tiêu / Không mục tiêu / Phản mục tiêu

### Mục tiêu
- Trông và cảm giác như **một sản phẩm enterprise** thống nhất (không phải tập màn AntD mặc định).
- **Nhất quán**: token, typography, spacing, mật độ, trạng thái, mẫu trang dùng chung trên toàn FE.
- **Dễ quét dữ liệu**: header trang rõ (tiêu đề/ngữ cảnh/hành động), bảng/biểu mẫu có cấu trúc.
- **Giữ app chạy** qua từng lớp; không thay đổi hành vi nghiệp vụ/contract BE.
- Giữ nền tảng truy cập: `vi_VN`, điều hướng bàn phím/skip link/focus, nhãn rõ, không dùng màu làm tín hiệu duy nhất (các nguyên tắc tốt hiện có).

### Không mục tiêu (Lớp 1)
- Không thiết kế lại/viết lại logic nghiệp vụ, API, RBAC, routing nghiệp vụ.
- Không hoàn thiện giao diện mọi màn chi tiết (đó là Lớp 2–3); Lớp 1 tạo **nền + khung + mẫu**.
- Không nhắm “giống hệt” pixel PowerSchool/Odoo.

### Phản mục tiêu (coi như thất bại dù “chạy được”)
- Giao diện mỗi console/mỗi trang một kiểu, token rải rác/hex hardcode.
- Đập big-bang khiến app không chạy ổn định trong thời gian dài.
- Đổi UI làm vỡ contract/luồng BE, hoặc làm mất `vi_VN`/khả năng truy cập cơ bản.

## 3. Ràng buộc

- **Giữ nguyên contract & hành vi với BE** (endpoint, DTO/field, logic điều hướng theo quyền hiện có, xử lý lỗi/NFR-REL-001, luồng Sprint 4 `version`/409/mismatch…). UI chỉ thay cách trình bày/tương tác bề mặt, không bịa field.
- **Triển khai theo lớp, app luôn chạy được** giữa các lớp.
- **Tự do stack FE** (quyết định của chủ sản phẩm): được thêm/đổi thư viện & cách làm miễn đạt “chất”; chấp nhận thay đổi lớn.
- **Thực tế mã nguồn (rào cản kỹ thuật):** ~49 file import `antd`, ~37 file dùng `theme.useToken`; Table/Form/Modal/Menu/DatePicker/Select + `vi_VN` dùng sâu. Mọi hướng thay thế phải tính đến chi phí này.
- Người dùng đích là tổ chức giáo dục, làm việc trên desktop là chính nhưng vẫn cần dùng được trên màn nhỏ (console đã có responsive sider/drawer).

## 4. Các hướng đã cân nhắc

| Hướng | Mô tả | Đánh đổi | Quyết định |
|---|---|---|---|
| **A. Nâng cấp mạnh trên Ant Design 5** | Giữ AntD 5 (tận dụng component/locale/a11y), xây lại hệ thiết kế + khung + mẫu dùng chung, refactor theo lớp | Kiểm soát pixel-level thấp hơn thay toàn bộ, nhưng đạt “đúng chất” với rủi ro/vỡ luồng thấp | **ĐÃ CHỌN** |
| B. Bỏ AntD, Tailwind + headless/tự dựng | Thay toàn bộ lớp UI | Viết lại Table/Form/DatePicker/Modal/Menu + vi_VN + a11y trên toàn FE; khó giữ app chạy | Loại |
| C. Lai (AntD cho data phức tạp, Tailwind/CSS cho vỏ) | Kết hợp | Hai paradigm styling, kỷ luật cao; lợi ích biên thấp so với A lúc này | Loại |

**Lý do chọn A:** đạt “chất” PowerSchool/Odoo (cấu trúc, mật độ, nhất quán, rõ ràng) chủ yếu nhờ **hệ thiết kế + mẫu trang + khung điều hướng**, không bắt buộc thay engine component. A tương thích với coupling AntD hiện có và chiến lược theo lớp/giữ app chạy. (Quyết định chọn hướng: chủ sản phẩm chọn A.)

## 5. Quyết định thiết kế — Lớp 1

> Ghi chú: các quyết định dưới đây là **đề xuất của tôi (agent)** cho Lớp 1, dựa trên mục tiêu PowerSchool/Odoo + bối cảnh MEMS; **chưa phải** cam kết đã được duyệt cho đến khi bạn phê duyệt tài liệu này. Chi tiết tinh chỉnh (giá trị màu/spacing cụ thể) có thể hiệu chỉnh nhẹ khi hiện thực, miễn giữ đúng “chất” và mục tiêu.

### 5.1 Nguyên tắc hình ảnh (áp dụng xuyên suốt)

- **Enterprise-edu, trung tính & đáng tin:** bề mặt nền trung tính (xám/nguội rất nhạt), nội dung nổi bật bằng độ tương phản và cấu trúc — không “đổ màu” trang trí. Màu nhấn dùng có chủ đích (hành động chính, trạng thái, mục đang chọn).
- **Kỷ luật dữ liệu:** trang = (ngữ cảnh) + **header trang** (tiêu đề, mô tả ngắn tuỳ chọn, hành động chính) + **vùng làm việc** (toolbar lọc/tìm + bảng, hoặc biểu mẫu/chi tiết). Phân cấp rõ, ít nhiễu.
- **Mật độ cân bằng:** đủ gọn cho người xử lý dữ liệu (như SIS/ERP) nhưng vẫn thoáng, đọc được; kiểm soát qua token spacing/size thay vì ad-hoc.
- **Trạng thái là hạng nhất:** mọi vùng dữ liệu có mẫu rõ cho loading / empty / error / success / no-permission; lỗi không giả vờ thành công (giữ NFR-REL-001).
- **Thương hiệu tiết chế:** nhận diện MEMS hiện diện (logo/tên, nhấn màu), nhưng không lấn át dữ liệu. (Tôi đề xuất *giảm* dominance đỏ-cam toàn trang so với hiện tại, chuyển sang nhấn có kiểm soát — *đề xuất của tôi*, có thể điều chỉnh theo ý bạn.)

### 5.2 Hệ token (nguồn sự thật duy nhất, qua `ConfigProvider`)

Tiếp tục chiến lược **token tập trung** (tiến hóa `src/theme.ts`) để đổi giao diện một chỗ lan toàn app. Bỏ các hằng màu cục bộ kiểu `loginFigma` rải rác (chuyển dần ở Lớp 2).

**Đề xuất hướng token (Lớp 1 chốt giá trị cụ thể khi implement):**
- **Nền/bề mặt:** `bgLayout` xám trung tính rất nhạt; `bgContainer` trắng; viền mỏng, tương phản đủ (đặc biệt viền input/control giữ ≥3:1 trên nền).
- **Chữ:** `text` tối trung tính (gần navy/xám đậm, dễ đọc), `textSecondary` rõ ràng; heading có phân cấp vừa phải.
- **Primary (hành động):** **xanh enterprise** (độ bão hòa vừa, tương phản AA với chữ/icon trắng) cho CTA/liên kết/mục chọn — **đã chốt 8.1(a)**. Có thể giữ accent phụ rất tiết chế cho nhận diện nếu cần, nhưng primary là xanh. Semantic success/warning/error tách biệt rõ.
- **Semantic:** `success/warning/error/info` rõ, luôn đi kèm nhãn/chữ/icon (không chỉ màu).
- **Radius & elevation:** bo góc vừa (ít “bong bóng” hơn hiện tại), bóng đổ nhẹ/tầng thấp cho thẻ & lớp nổi — cảm giác phẳng, gọn kiểu ERP.
- **Typography:** giữ **Inter** (đã có, trung tính, phù hợp UI dữ liệu); siết thang size/weight dùng cho page title / section / body / table / caption; số dòng/spacing phục vụ đọc bảng.
- **Component tokens (AntD):** tinh chỉnh Table (header, row hover/stripe nhẹ, mật độ), Button, Input/Select/DatePicker, Menu (mục chọn rõ, gọn), Card/Modal, Tag/Badge (trạng thái), Layout. Mục tiêu: bớt “mặc định AntD”, tăng chất hệ thống.

### 5.3 Khung ứng dụng (Console Shell) & điều hướng

**Hiện trạng:** `ConsoleShell` dùng chung (header + sider cố định ≥1024px + drawer mobile + `Outlet`), mỗi console (Quản trị/Tổ chức/Đào tạo) bọc riêng. Đây là nền để tiến hóa.

**Lớp 1 thay đổi (giữ hành vi/cấu trúc route & guard, giữ app chạy) — 8.2 đã chốt: kiểu Odoo:**
- **App shell kiểu Odoo (enterprise module):** **thanh header ứng dụng** nổi bật, mang định danh MEMS + **ngữ cảnh khu vực/module đang đứng** (Quản trị / Tổ chức / Đào tạo) và (khi có trong state) ngữ cảnh tổ chức/phiên + đăng xuất; header là điểm neo rõ, gọn, chuyên nghiệp. Điều hướng chính vẫn phục vụ các route hiện có — **không đổi URL/IA/guard** (`/quan-tri`, `/to-chuc`, `/dao-tao` và child route).
- **Điều hướng khu vực:** bố cục header/module theo chất Odoo, **nhưng giữ khả năng dùng được trên mobile** (drawer/menu gọn) và không phá luồng hiện tại. Người lập plan sẽ chọn cách thể hiện cụ thể (ví dụ: header app + thanh điều hướng/module; hoặc header đậm + menu phụ gọn) miễn đạt “chất Odoo”, responsive, và route/guard giữ nguyên. Đây là thay đổi cảm nhận lớn hơn “chỉ refresh sider” — thực hiện có kiểm soát trong Lớp 1.
- **Header trang (mẫu dùng chung, áp dần):** component/mẫu `PageHeader` cho trang con: tiêu đề (H1 trang), breadcrumb/ngữ cảnh khi phù hợp, vùng hành động chính/phụ. Lớp 1 tạo mẫu + áp ở vài trang đại diện; Lớp 3 phủ hết.
- **Vùng nội dung:** nền trung tính, bề mặt dùng có chọn lọc (không bọc mọi thứ vào card).

### 5.4 Mẫu trang dùng chung (định nghĩa ở Lớp 1, phủ rộng ở Lớp 2–3)

- **Danh sách dữ liệu:** thanh công cụ (tìm/lọc/hành động) + bảng (AntD `Table`) + phân trang + mẫu empty/loading/error/no-permission.
- **Chi tiết / Biểu mẫu:** bố cục rõ (section), nhãn trường nhất quán, hành động lưu/hủy/xác nhận đặt đúng chỗ; giữ pattern `version`/confirm/mismatch/stale-409 của Sprint 4 (chỉ đổi trình bày).
- **Phản hồi hệ thống:** thông báo/thông lỗi theo `message`/`Alert` có kỷ luật, văn bản tiếng Việt rõ (giữ `sprint4Messages`/mapping lỗi).

### 5.5 Thư viện & kỹ thuật (quyết định Lớp 1)

- **Giữ:** `antd` v5 (+ patch React 19), `@tanstack/react-query`, `zustand`, `axios`, `react-router-dom`, `dayjs`, `vi_VN`, cấu hình test/lint hiện có.
- **Thêm (đề xuất của tôi, cài khi implement):** `@ant-design/icons` (khai báo rõ trong `package.json` — hiện dùng SVG tay/không khai báo trực tiếp) để icon điều hướng/hành động/trạng thái nhất quán. Không thêm Tailwind/CSS framework khác ở Lớp 1 (tránh trộn paradigm) — dùng token + style có kiểm soát.
- **Không làm ở Lớp 1:** thay AntD Table/Form/DatePicker; thêm thư viện UI song song.

### 5.6 Phạm vi chạm vào mã (Lớp 1, dự kiến)

- `src/theme.ts` (và/hoặc tách `theme/`) — thiết kế lại token + component tokens.
- `src/main.tsx` — giữ `ConfigProvider`/`vi_VN`/`App`, gắn theme mới.
- `src/components/ConsoleShell/*` (+ `ConsoleMenu` nếu cần) — làm mới khung/điều hướng/responsive, giữ hành vi (skip link, drawer, logout).
- (Tuỳ chọn Lớp 1) thêm primitive dùng chung: `PageHeader` (hoặc tương đương) đặt dưới `src/components/` để Lớp 2–3 tái dùng.
- Áp thử nghiệm lên **1–2 trang đại diện** (ví dụ một trang danh sách console + trang tổng quan/điểm vào) để kiểm chứng “chất”, chưa phủ hết.

**Không đổi:** `src/router.tsx` (đường dẫn/guard/cấu trúc), `features/*` API/logic, `stores/*`, contract gọi BE.

## 6. Kế hoạch theo lớp (đã chốt hướng)

- **Lớp 1 (lần này):** token/hệ thiết kế + shell/điều hướng + mẫu `PageHeader`/trạng thái + áp điểm đại diện. *Cổng duyệt:* bạn duyệt thiết kế này → lập plan → hiện thực Lớp 1 → xác minh (build/test/chạy) → bạn xem.
- **Lớp 2:** auth (đăng nhập/đăng ký/quên-đặt lại, bỏ `loginFigma` cục bộ, dùng token/mẫu mới) + mẫu danh sách/chi tiết/biểu mẫu lõi dùng chung.
- **Lớp 3:** áp lần lượt `/quan-tri`, `/to-chuc`, `/dao-tao` theo mẫu; giữ nguyên hành vi Sprint 4/BE.

## 7. Phần còn để người thực hiện (builder) quyết định khi lập plan/hiện thực

- Giá trị token cụ thể (hex/spacing) chốt trong code, miễn đạt mục tiêu 5.1–5.2 và tương phản/a11y; chụp/so sánh thị giác khi chạy.
- Cấu trúc file theme (`theme.ts` đơn hay tách module) và cách dọn dần style cục bộ/inline.
- Có/không dùng icon set bổ sung ngoài `@ant-design/icons` (mặc định: không, trừ khi cần rõ).
- Chiến lược kiểm thử trực quan/thủ công cho Lớp 1 (không có yêu cầu thay đổi E2E logic).

## 8. Quyết định đã chốt (2026-11-08)

1. **Màu primary:** **(a) xanh enterprise** — đã chốt.
2. **Điều hướng:** **kiểu Odoo** (bố cục header/module đậm hơn, vẫn responsive & giữ URL/guard) — đã chốt.
3. **Phạm vi Lớp 1:** **nền + khung + mẫu + 1–2 trang đại diện** (chưa phủ hết màn) — **OK**.

---
*Các quyết định chọn hướng (A, theo lớp, tự do stack) là của bạn. Các đề xuất thiết kế cụ thể trong mục 5 là đề xuất của tôi, đánh dấu rõ; sẽ chỉ hiện thực sau khi bạn duyệt tài liệu này.*