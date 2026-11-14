import type { ReactNode } from 'react';

export type AuthTab = 'login' | 'register';

export interface AuthCardProps {
  activeTab: AuthTab;
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Thay panel trái mặc định (brand/features). */
  hero?: ReactNode;
  /**
   * 'card' (mặc định): centered, cột phải là Card title/subtitle — Register/Forgot/Reset.
   * 'split': full-viewport 2 cột (hero trái, children phải, không bọc Card) — Login.
   */
  variant?: 'card' | 'split';
  /** Giới hạn bề rộng cột nội dung phải ở variant split. */
  rightMaxWidth?: number;
}
