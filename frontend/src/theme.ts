import type { ThemeConfig } from 'antd';

/**
 * Token thiết kế — trích từ Figma `MEMS — Registration UI & Design System`
 * (frame `01 · Design System`: Brand/600, Brand/700, Text/Primary, Surface/Canvas…).
 *
 * Đây là nguồn duy nhất của màu sắc / bo góc / font trong toàn repo.
 * Component KHÔNG được hardcode hex hay px (AGENTS.md mục 2) — muốn đổi giao diện
 * thì sửa ở đây rồi nó lan ra qua `ConfigProvider` ở `src/main.tsx`.
 *
 * Lệch có chủ đích so với Figma (xem `Design-System-Figma-Mapping.md` §7):
 * - `borderInput` đậm hơn `#D6DFED` để viền field đạt 3:1 (WCAG 1.4.11).
 */
export const color = {
  /** Brand / 600 */
  brand: '#215CE8',
  /** Brand / 700 — trạng thái nhấn */
  brandActive: '#1747C2',
  /** Nhấn/hover sáng hơn Brand 600 */
  brandHover: '#3B70EB',
  /** Brand / 050 — nền nhấn nhẹ */
  brandSoft: '#EBF2FF',
  /** Text / Primary */
  text: '#142447',
  /** Text / Secondary */
  textSecondary: '#63718F',
  /** Surface / Canvas */
  canvas: '#F5F7FB',
  surface: '#FFFFFF',
  /** Border / Default — card, divider */
  border: '#D6DFED',
  /** Viền field: đậm hơn Figma để đạt 3:1 trên nền trắng (3.23) và trên canvas (3.01) */
  borderInput: '#8290A9',
  error: '#BF2936',
  warning: '#A66B09',
  success: '#15803D',
} as const;

/** Inter là font của design system; fallback về system stack khi offline. */
export const fontFamily =
  'Inter, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Thang chữ của design system (px). Component dùng các mốc này thay vì tự đặt số
 * — đổi thiết kế chỉ sửa một chỗ.
 */
export const typeScale = {
  /** Hero màn đăng nhập/đăng ký (Figma ~46px) */
  hero: 46,
  /** Heading trang */
  h1: 30,
  /** Section title */
  section: 20,
  /** Body / label */
  body: 15,
  /** Caption — sàn tuyệt đối, không nhỏ hơn */
  caption: 12,
} as const;

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

  colorBgLayout: color.canvas,
  colorBgContainer: color.surface,
  colorBorder: color.borderInput,
  colorBorderSecondary: color.border,

  fontFamily,
  fontSize: 15,
  lineHeight: 1.5,

  // Thang heading theo design system: trang 30, section 20, phụ 18/16.
  fontSizeHeading1: 30,
  fontSizeHeading2: 20,
  fontSizeHeading3: 18,
  fontSizeHeading4: 16,
  fontSizeHeading5: 15,
  lineHeightHeading1: 1.3,
  lineHeightHeading2: 1.35,

  borderRadius: 8,
  borderRadiusLG: 12,
  borderRadiusSM: 6,
  borderRadiusXS: 4,

  // Input/Button cao 44 (Figma), các control khác 40.
  controlHeight: 40,
  controlHeightLG: 48,

  sizeUnit: 4,
  sizeStep: 4,

  boxShadow: '0 8px 30px rgba(20, 36, 71, 0.08)',
  boxShadowSecondary: '0 4px 16px rgba(20, 36, 71, 0.06)',
};

/** Token riêng của component — cùng nguồn Figma, gắn ở `ConfigProvider`. */
export const themeComponents: ThemeConfig['components'] = {
  Button: {
    controlHeight: 44,
    controlHeightLG: 48,
    controlHeightSM: 32,
    borderRadius: 12,
    fontWeight: 500,
    paddingInline: 20,
    primaryShadow: 'none',
    defaultShadow: 'none',
    dangerShadow: 'none',
  },
  Input: {
    controlHeight: 44,
    controlHeightLG: 48,
    borderRadius: 10,
    paddingInline: 14,
    activeShadow: `0 0 0 2px ${color.brandSoft}`,
  },
  Select: {
    controlHeight: 44,
    borderRadius: 10,
  },
  Card: {
    borderRadiusLG: 20,
    paddingLG: 24,
    headerBg: 'transparent',
  },
  Modal: {
    borderRadiusLG: 20,
  },
  Table: {
    headerBg: color.canvas,
    headerColor: color.text,
    headerSplitColor: 'transparent',
    rowHoverBg: color.brandSoft,
    borderColor: color.border,
  },
  Menu: {
    itemBorderRadius: 10,
    itemHeight: 44,
    itemMarginInline: 8,
    itemSelectedBg: color.brandSoft,
    itemSelectedColor: color.brand,
    itemHoverBg: color.canvas,
  },
  Layout: {
    headerBg: color.surface,
    siderBg: color.surface,
    bodyBg: color.canvas,
  },
  Tabs: {
    itemSelectedColor: color.brand,
    inkBarColor: color.brand,
    titleFontSize: 15,
  },
  Alert: {
    borderRadiusLG: 12,
  },
  Tag: {
    borderRadiusSM: 8,
  },
  Divider: {
    colorSplit: color.border,
  },
  Form: {
    labelColor: color.text,
    labelFontSize: 14,
    verticalLabelPadding: '0 0 6px',
  },
};

/** Nền trang. Lấy từ token để chỉ có một nguồn sự thật. */
export const layoutBackground = themeToken.colorBgLayout;

/** Thẻ trắng canh giữa — dùng chung cho trang xem thử vai trò. */
export const cardStyle = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 20,
  borderColor: color.border,
  boxShadow: '0 8px 30px rgba(20, 36, 71, 0.08)',
} as const;
