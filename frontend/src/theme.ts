/**
 * Token thiết kế — MEMS (Layer 1+2), hướng "mực xanh học vụ".
 *
 * Đích: phần mềm quản lý giáo dục chuyên ngành, đáng tin (tham chiếu SMAS/VNEdu).
 * Nguồn duy nhất màu/bo góc/font/nhịp cho toàn repo — component KHÔNG hardcode
 * hex/rgba/px (xem `docs/ui-conventions.md`). Đổi giao diện tại đây.
 *
 * Phối màu (phương án A): giữ brand `#0E4A8B`, tăng nhịp nhấn (tông xanh nhạt)
 * và nhịp neutral (lớp canvas/bề mặt/viền) ở mức an toàn, giữ UI tổng thể tương tự.
 *
 * Tương phản (AA): brand #0E4A8B trên trắng ≈ 8.8:1; text phụ #475467 ≈ 8.6:1;
 * borderInput #667085 đủ 3:1 trên trắng và trên canvas (WCAG 1.4.11).
 *
 * Mốc tham chiếu (đo bằng `getComputedStyle` ngày 13/11/2026, xem
 * `docs/ui-conventions.md` mục "Mốc tham chiếu"):
 *   Khan Academy — nền 14px, bo 8px, bóng đổ 1.2% element, 1 màu nhấn.
 *   Brilliant    — nội dung chỉ dùng 400 và 500 (231 element 14/400, 4 element 14/500).
 *   Udemy        — nền 16px/300 + bóng đổ ở header: KHÔNG theo (đó là "SaaS look").
 * Hệ quả ở file này: `typeScale` chỉ có 12/14/16/24/40, `weight` chỉ có 400/500/600,
 * và `boxShadow` của bề mặt nội dung = `none`.
 */
export const color = {
  /** Brand chủ đạo (mực xanh) — CTA, link, mục đang chọn. Giữ nguyên #0E4A8B. */
  brand: '#0E4A8B',
  /** Pressed. */
  brandActive: '#0A3A6E',
  /** Hover. */
  brandHover: '#1359A5',
  /** Nền nhấn nhẹ — mục chọn, row hover, tag nhẹ (nhịp xanh dịu). */
  brandSoft: '#E7F0FA',
  /** Nền nhấn phụ — nhịp xanh rõ hơn một bậc cho điểm nhấn/hover chọn. */
  brandSoftStrong: '#DBE8F6',
  /** Text chính. */
  text: '#101828',
  /** Text phụ — nhãn, mô tả, header bảng. */
  textSecondary: '#475467',
  /** Canvas nền trang (xám lạnh, tạo lớp nền tách khỏi bề mặt trắng). */
  canvas: '#F1F4F8',
  surface: '#FFFFFF',
  /** Hairline — card, divider, bảng. Trang trí, không dùng cho field. */
  border: '#E4E7EC',
  /** Viền nhấn nhẹ — phân tách khối rõ hơn một nhịp nhưng vẫn dịu. */
  borderSubtle: '#E9EDF2',
  /** Nền header bảng / khối lún nhẹ. */
  surfaceSunken: '#F6F8FB',
  /** Viền field: đủ 3:1 trên nền trắng/canvas. */
  borderInput: '#667085',
  error: '#B42318',
  warning: '#B54708',
  success: '#067647',
  /** Chữ gợi ý trong field — nhạt hơn text phụ nhưng vẫn đọc được. */
  placeholder: '#98A2B3',
  /** Hover row/mục menu — xám trung tính, không ngả xanh để không tranh với row đang chọn. */
  hoverSurface: '#F4F7FA',
  /** Hover của mục đang chọn. */
  brandSoftHover: '#DBE8F6',
  /** Chữ trên nền brand (panel đăng nhập). */
  onBrand: '#FFFFFF',
  /** Chữ phụ trên nền brand — vẫn ≥4.5:1 trên #0E4A8B. */
  onBrandMuted: 'rgba(255, 255, 255, 0.78)',
  /** Ô/khối mờ trên nền brand. */
  onBrandSubtle: 'rgba(255, 255, 255, 0.16)',
} as const;

/**
 * Font của design system. Tách `fontPrimary`/`fontFallbacks` vì Astryx nhận font
 * theo hai tham số riêng (`typography.body.family` + `.fallbacks`). `fontFamily`
 * là chuỗi đầy đủ dùng thống nhất trong hệ thống.
 */
export const fontPrimary = 'Inter';
export const fontFallbacks =
  '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
/** Inter là font của design system; fallback về system stack khi offline. */
export const fontFamily = `${fontPrimary}, ${fontFallbacks}`;

/**
 * Thang chữ (px) — **chỉ 5 mốc**. Component dùng các mốc này thay vì tự đặt số.
 *
 * 12 → 14 → 16 → 24 → 40 đúng bằng thang đo được ở Khan Academy (12/14/16/18/20/24
 * nhưng 18–20 chỉ dùng cho khối marketing, không có trong app). Bỏ các mốc lửng 13,
 * 15, 17: mỗi mốc thêm vào là một quyết định nữa phải bảo vệ, và ba mốc lửng cộng
 * lại chỉ hơn kém nhau 2px — mắt không đọc ra cấp bậc, chỉ thấy "hơi lệch".
 */
export const typeScale = {
  /** Hero màn đăng nhập/đăng ký. */
  hero: 40,
  /** Heading trang (H1). */
  h1: 24,
  /** Tiêu đề khối/section (H2), tên sản phẩm trên header. */
  section: 16,
  /** Body / label / mô tả / breadcrumb. */
  body: 14,
  /** Caption — sàn tuyệt đối, không nhỏ hơn. */
  caption: 12,
} as const;

/**
 * Độ đậm — chỉ 3 mức, mỗi mức một vai trò.
 *
 * Đo được: Brilliant dùng 400 cho 231 element nội dung và 500 cho đúng 4 element;
 * ngược lại Khan dùng 44×600 + 42×500 + 38×700 nên "chữ nào cũng đang hét".
 *
 * Ở đây: 600 = tiêu đề trang/khối, 500 = nhấn trong nội dung (nút, số liệu, nhãn
 * quan trọng), 400 = mọi thứ còn lại. Không dùng 700.
 */
export const weight = { regular: 400, medium: 500, strong: 600 } as const;

/** Nhịp 8pt. Dùng cho gap/padding của khối, không dùng cho chi tiết icon. */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

/** Số liệu cần thẳng cột (sĩ số, mã, thời gian) — đặt lên ô hiển thị số. */
export const numericStyle = { fontVariantNumeric: 'tabular-nums' } as const;



/** Nền trang. Dùng chung cho các màn cần canvas nền (trạng thái, xem thử vai trò). */
export const layoutBackground = color.canvas;

/** Thẻ trắng canh giữa — chỉ dùng cho màn đăng nhập / xem thử vai trò. */
export const cardStyle = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 8,
  borderColor: color.border,
  boxShadow: 'none',
} as const;
