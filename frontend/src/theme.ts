import type { ThemeConfig } from 'antd';

/**
 * Nguồn duy nhất của màu sắc / bo góc / font trong toàn repo.
 *
 * Component KHÔNG được hardcode hex hay px (AGENTS.md mục 2) — muốn đổi giao diện
 * thì sửa ở đây rồi nó lan ra qua `ConfigProvider` ở `src/main.tsx`.
 */
export const themeToken: ThemeConfig['token'] = {
  colorPrimary: '#1677ff',
  colorLink: '#1677ff',
  colorBgLayout: '#f1f5fb',
  borderRadius: 10,
  controlHeight: 38,
  fontSize: 14,
  fontFamily: '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

/** Nền trang. Lấy từ token để chỉ có một nguồn sự thật. */
export const layoutBackground = themeToken.colorBgLayout;

/** Thẻ trắng canh giữa — dùng chung cho trang đăng nhập, đăng ký và xem thử. */
export const cardStyle = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(22,119,255,.08)',
} as const;
