import type { ThemeConfig } from 'antd';

/**
 * Token thiết kế — MEMS (Layer 1+2), hướng "mực xanh học vụ".
 *
 * Đích: phần mềm quản lý giáo dục chuyên ngành, đáng tin (tham chiếu SMAS/VNEdu).
 * Nguồn duy nhất màu/bo góc/font/nhịp cho toàn repo — component KHÔNG hardcode
 * hex/rgba/px (xem `docs/ui-conventions.md`). Đổi giao diện tại đây.
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
  /** Brand chủ đạo (mực xanh) — CTA, link, mục đang chọn. */
  brand: '#0E4A8B',
  /** Pressed. */
  brandActive: '#0A3A6E',
  /** Hover. */
  brandHover: '#1359A5',
  /** Nền nhấn nhẹ — mục chọn, row hover, tag nhẹ. */
  brandSoft: '#E9F0F8',
  /** Text chính. */
  text: '#101828',
  /** Text phụ — nhãn, mô tả, header bảng. */
  textSecondary: '#475467',
  /** Canvas nền trang (xám lạnh, không phải trắng ngà). */
  canvas: '#F2F4F7',
  surface: '#FFFFFF',
  /** Hairline — card, divider, bảng. Trang trí, không dùng cho field. */
  border: '#E4E7EC',
  /** Nền header bảng / hover row. */
  surfaceSunken: '#F7F8FA',
  /** Viền field: đủ 3:1 trên nền trắng/canvas. */
  borderInput: '#667085',
  error: '#B42318',
  warning: '#B54708',
  success: '#067647',
  /** Chữ gợi ý trong field — nhạt hơn text phụ nhưng vẫn đọc được. */
  placeholder: '#98A2B3',
  /** Hover row/mục menu — xám trung tính, không ngả xanh để không tranh với row đang chọn. */
  hoverSurface: '#F5F7FA',
  /** Hover của mục đang chọn. */
  brandSoftHover: '#DCE8F5',
  /** Chữ trên nền brand (panel đăng nhập). */
  onBrand: '#FFFFFF',
  /** Chữ phụ trên nền brand — vẫn ≥4.5:1 trên #0E4A8B. */
  onBrandMuted: 'rgba(255, 255, 255, 0.78)',
  /** Ô/khối mờ trên nền brand. */
  onBrandSubtle: 'rgba(255, 255, 255, 0.16)',
} as const;

/**
 * Font của design system. Tách `fontPrimary`/`fontFallbacks` vì Astryx nhận font
 * theo hai tham số riêng (`typography.body.family` + `.fallbacks`), còn antd nhận
 * cả chuỗi. `fontFamily` vẫn là nguồn duy nhất để hai bên không lệch nhau.
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

export const themeToken: ThemeConfig['token'] = {
  colorPrimary: color.brand,
  colorPrimaryHover: color.brandHover,
  colorPrimaryActive: color.brandActive,
  colorPrimaryBg: color.brandSoft,
  colorLink: color.brand,
  colorLinkHover: color.brandHover,
  colorInfo: color.brand,
  colorSuccess: color.success,
  colorWarning: color.warning,
  colorError: color.error,

  colorText: color.text,
  colorTextHeading: color.text,
  colorTextSecondary: color.textSecondary,
  colorTextDescription: color.textSecondary,
  colorTextPlaceholder: color.placeholder,

  colorBgLayout: color.canvas,
  colorBgContainer: color.surface,
  colorBgElevated: color.surface,
  /** Viền field (3:1). Viền trang trí dùng `colorBorderSecondary`. */
  colorBorder: color.borderInput,
  colorBorderSecondary: color.border,

  fontFamily,
  fontSize: typeScale.body,
  lineHeight: 1.55,
  fontWeightStrong: weight.strong,

  fontSizeHeading1: typeScale.h1,
  fontSizeHeading2: typeScale.section,
  fontSizeHeading3: typeScale.body,
  fontSizeHeading4: typeScale.body,
  fontSizeHeading5: typeScale.caption,
  lineHeightHeading1: 1.3,
  lineHeightHeading2: 1.35,

  borderRadius: 6,
  borderRadiusLG: 8,
  borderRadiusSM: 4,
  borderRadiusXS: 2,

  controlHeight: 36,
  controlHeightLG: 44,
  controlHeightSM: 28,
  controlOutline: color.brandSoft,
  controlOutlineWidth: 3,

  sizeUnit: 4,
  sizeStep: 4,
  sizeXXS: 4,
  sizeXS: 8,
  sizeSM: 12,
  size: 16,
  sizeMD: 20,
  sizeLG: 24,
  sizeXL: 32,

  /**
   * Bề mặt nội dung **không đổ bóng**: đo được ở Khan chỉ 1.2% element có bóng,
   * và toàn bộ số đó là menu nổi/overlay. Bóng trên card/bảng là thứ tạo cảm
   * giác "SaaS nhựa". Phân cấp bằng hairline + khoảng trắng.
   */
  boxShadow: 'none',
  /** Chỉ dùng cho lớp nổi thật (dropdown, popover, modal) — nơi cần tách khỏi nền. */
  boxShadowSecondary: '0 8px 24px rgba(16, 24, 40, 0.12)',

  // Motion tinh tế; vẫn tôn trọng prefers-reduced-motion (index.css).
  motion: true,
  motionDurationFast: '0.1s',
  motionDurationMid: '0.15s',
  motionDurationSlow: '0.2s',
};

/** Token riêng của component — mật độ cao, viền mảnh, không đổ bóng. */
export const themeComponents: ThemeConfig['components'] = {
  Button: {
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
    borderRadius: 6,
    fontWeight: weight.medium,
    paddingInline: 14,
    primaryShadow: 'none',
    defaultShadow: 'none',
    dangerShadow: 'none',
    defaultBorderColor: color.borderInput,
    defaultColor: color.text,
  },
  Input: {
    controlHeight: 36,
    borderRadius: 6,
    paddingInline: 12,
    activeShadow: `0 0 0 3px ${color.brandSoft}`,
    hoverBorderColor: color.brandHover,
    activeBorderColor: color.brand,
  },
  InputNumber: {
    controlHeight: 36,
    borderRadius: 6,
  },
  Select: {
    controlHeight: 36,
    borderRadius: 6,
    optionSelectedBg: color.brandSoft,
    optionSelectedColor: color.brand,
  },
  DatePicker: {
    controlHeight: 36,
    borderRadius: 6,
  },
  Card: {
    borderRadiusLG: 8,
    paddingLG: 20,
    headerBg: 'transparent',
    headerFontSize: 15,
    headerHeight: 48,
    boxShadowTertiary: 'none',
  },
  Modal: {
    borderRadiusLG: 8,
    titleFontSize: 17,
  },
  Table: {
    headerBg: color.surfaceSunken,
    headerColor: color.textSecondary,
    headerSplitColor: 'transparent',
    headerBorderRadius: 0,
    rowHoverBg: color.hoverSurface,
    rowSelectedBg: color.brandSoft,
    rowSelectedHoverBg: color.brandSoftHover,
    borderColor: color.border,
    /** 10 thay vì 11 → hàng ≈ 42px, mật độ đo được của bảng Khan (~40). */
    cellPaddingBlock: 10,
    cellPaddingInline: 16,
    footerBg: color.surfaceSunken,
  },
  Menu: {
    itemBorderRadius: 6,
    itemHeight: 36,
    itemMarginInline: 8,
    itemMarginBlock: 2,
    itemColor: color.textSecondary,
    itemSelectedBg: color.brandSoft,
    itemSelectedColor: color.brand,
    itemHoverBg: color.hoverSurface,
    itemHoverColor: color.text,
    activeBarBorderWidth: 0,
    iconSize: 16,
    subMenuItemBg: 'transparent',
  },
  Layout: {
    headerBg: color.surface,
    siderBg: color.surface,
    bodyBg: color.canvas,
    headerHeight: 56,
    headerPadding: '0 24px',
    triggerBg: color.surfaceSunken,
  },
  Tabs: {
    itemSelectedColor: color.brand,
    inkBarColor: color.brand,
    titleFontSize: 14,
    horizontalItemGutter: 24,
    horizontalItemPadding: '10px 0',
  },
  Alert: {
    borderRadiusLG: 6,
  },
  Tag: {
    borderRadiusSM: 4,
    defaultBg: color.canvas,
    defaultColor: color.textSecondary,
  },
  Divider: {
    colorSplit: color.border,
  },
  Form: {
    labelColor: color.text,
    labelFontSize: typeScale.body,
    labelHeight: 20,
    verticalLabelPadding: '0 0 6px',
    itemMarginBottom: 20,
  },
  Breadcrumb: {
    fontSize: typeScale.caption,
    itemColor: color.textSecondary,
    linkColor: color.textSecondary,
    linkHoverColor: color.brand,
    separatorColor: color.placeholder,
  },
  Drawer: {
    paddingLG: 20,
  },
  Descriptions: {
    labelBg: color.surfaceSunken,
    titleMarginBottom: 12,
  },
  Pagination: {
    itemSize: 32,
  },
};

/** Nền trang. Lấy từ token để chỉ có một nguồn sự thật. */
export const layoutBackground = themeToken.colorBgLayout;

/** Thẻ trắng canh giữa — chỉ dùng cho màn đăng nhập / xem thử vai trò. */
export const cardStyle = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 8,
  borderColor: color.border,
  boxShadow: 'none',
} as const;
