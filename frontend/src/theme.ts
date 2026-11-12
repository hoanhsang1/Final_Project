import type { ThemeConfig } from 'antd';

/**
 * Token thiết kế — MEMS (Layer 1+2: blue enterprise, Odoo-clean).
 * Nguồn duy nhất màu/bo góc/font/motion cho toàn repo (ConfigProvider, main.tsx).
 * Component KHÔNG hardcode hex/px (AGENTS.md). Đổi giao diện tại đây.
 *
 * Tương phản (AA): brand #155EEF trên trắng ~4.6:1; borderInput đủ 3:1 (WCAG 1.4.11).
 */
export const color = {
  /** Brand chủ đạo (enterprise blue) — CTA, link, selected */
  brand: '#155EEF',
  /** Nhấn */
  brandActive: '#1849A9',
  /** Hover */
  brandHover: '#2970FF',
  /** Nền nhấn nhẹ */
  brandSoft: '#EFF4FF',
  /** Text chính */
  text: '#101828',
  /** Text phụ */
  textSecondary: '#475467',
  /** Canvas nền trang */
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  /** Border nhẹ — card, divider, table */
  border: '#EAECF0',
  /** Viền field: đủ 3:1 trên nền trắng/canvas */
  borderInput: '#667085',
  error: '#D92D20',
  warning: '#DC6803',
  success: '#079455',
} as const;

/** Inter là font của design system; fallback về system stack khi offline. */
export const fontFamily =
  'Inter, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Thang chữ của design system (px). Component dùng các mốc này thay vì tự đặt số.
 */
export const typeScale = {
  /** Hero màn đăng nhập/đăng ký */
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

  controlHeight: 40,
  controlHeightLG: 48,

  sizeUnit: 4,
  sizeStep: 4,

  boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.06)',
  boxShadowSecondary: '0 1px 2px rgba(16, 24, 40, 0.06)',

  // Motion tinh tế 150–200ms (Layer 2); vẫn tôn trọng prefers-reduced-motion (index.css).
  motion: true,
  motionDurationFast: '0.1s',
  motionDurationMid: '0.15s',
  motionDurationSlow: '0.2s',
};

/** Token riêng của component — Odoo-clean enterprise, gắn ở `ConfigProvider`. */
export const themeComponents: ThemeConfig['components'] = {
  Button: {
    controlHeight: 40,
    controlHeightLG: 44,
    controlHeightSM: 30,
    borderRadius: 8,
    fontWeight: 600,
    paddingInline: 16,
    primaryShadow: 'none',
    defaultShadow: 'none',
    dangerShadow: 'none',
  },
  Input: {
    controlHeight: 40,
    controlHeightLG: 44,
    borderRadius: 8,
    paddingInline: 12,
    activeShadow: `0 0 0 2px ${color.brandSoft}`,
  },
  InputNumber: {
    controlHeight: 40,
    borderRadius: 8,
  },
  Select: {
    controlHeight: 40,
    borderRadius: 8,
    optionSelectedBg: color.brandSoft,
  },
  DatePicker: {
    controlHeight: 40,
    borderRadius: 8,
  },
  Card: {
    borderRadiusLG: 10,
    paddingLG: 20,
    headerBg: 'transparent',
  },
  Modal: {
    borderRadiusLG: 12,
  },
  Table: {
    headerBg: '#F9FAFB',
    headerColor: color.text,
    headerSplitColor: 'transparent',
    rowHoverBg: '#F9FAFB',
    rowSelectedBg: color.brandSoft,
    rowSelectedHoverBg: '#D1E0FF',
    borderColor: color.border,
    cellPaddingBlock: 12,
    cellPaddingInline: 14,
  },
  Menu: {
    itemBorderRadius: 8,
    itemHeight: 40,
    itemMarginInline: 8,
    itemMarginBlock: 2,
    itemSelectedBg: color.brandSoft,
    itemSelectedColor: color.brand,
    itemHoverBg: '#F9FAFB',
    itemHoverColor: color.text,
    activeBarBorderWidth: 0,
    iconSize: 16,
  },
  Layout: {
    headerBg: color.surface,
    siderBg: color.surface,
    bodyBg: color.canvas,
    headerPadding: '0 20px',
  },
  Tabs: {
    itemSelectedColor: color.brand,
    inkBarColor: color.brand,
    titleFontSize: 14,
  },
  Alert: {
    borderRadiusLG: 8,
  },
  Tag: {
    borderRadiusSM: 6,
  },
  Divider: {
    colorSplit: color.border,
  },
  Form: {
    labelColor: color.text,
    labelFontSize: 14,
    verticalLabelPadding: '0 0 6px',
    itemMarginBottom: 16,
  },
  Breadcrumb: {
    fontSize: 13,
  },
  Drawer: {
    paddingLG: 16,
  },
};

/** Nền trang. Lấy từ token để chỉ có một nguồn sự thật. */
export const layoutBackground = themeToken.colorBgLayout;

/** Thẻ trắng canh giữa — dùng chung cho trang xem thử vai trò. */
export const cardStyle = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 10,
  borderColor: color.border,
  boxShadow: '0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.06)',
} as const;
