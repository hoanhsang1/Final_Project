import { AppLink } from '../AppLink/AppLink';
import type { AuthTab } from './types';

const ITEMS: readonly { tab: AuthTab; to: string; label: string }[] = [
  { tab: 'login', to: '/dang-nhap', label: 'Đăng nhập' },
  { tab: 'register', to: '/dang-ky', label: 'Đăng ký' },
];

/**
 * Cặp chuyển giữa hai màn công khai.
 *
 * Bản cũ dựng `role="tablist"` giả: mục "Đăng nhập" là `<div>`, mục "Đăng ký"
 * là link, và cả hai cùng `aria-selected` — sai cả về ngữ nghĩa lẫn hành vi
 * (tab phải đổi nội dung tại chỗ, còn đây là hai URL khác nhau). Nay là hai
 * liên kết thật; mục đang mở đánh `aria-current="page"`, đúng cách đánh dấu
 * trang hiện tại trong điều hướng.
 */
export function AuthSwitch({ current }: { current: AuthTab }) {
  return (
    <nav className="mems-auth__switch" aria-label="Chuyển giữa đăng nhập và đăng ký">
      {ITEMS.map((item) => (
        <AppLink
          key={item.tab}
          to={item.to}
          className="mems-auth__switch-item"
          color="inherit"
          type="body"
          weight="medium"
          aria-current={item.tab === current ? 'page' : undefined}
        >
          {item.label}
        </AppLink>
      ))}
    </nav>
  );
}
