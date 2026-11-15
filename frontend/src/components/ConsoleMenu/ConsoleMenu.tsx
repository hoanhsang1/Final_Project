import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import { AppLink } from '../AppLink/AppLink';
import './ConsoleMenu.css';

interface ConsoleMenuProps {
  /** Mục menu do từng console khai báo (`CONSOLE_MENU`, `OWNER_MENU`, …). */
  items: readonly ConsoleMenuItem[];
  /** `aria-label` của `nav` — mỗi khu vực có tên menu riêng. */
  menuAriaLabel: string;
  /** Khóa mục đang được chọn — `null` khi không khớp mục nào (màn chi tiết). */
  selectedKey: string | null;
  /** Gọi khi bấm 1 mục — dùng để đóng Drawer ở màn hình nhỏ. */
  onSelect?: () => void;
}

/**
 * Menu điều hướng của khung console.
 *
 * Dùng CHUNG cho cả cột bên (≥1024px) và `Drawer` (<1024px) để hai chỗ không
 * bao giờ lệch nhau — cả hai đều nhận cùng một mảng `items`.
 *
 * Đây là danh sách liên kết thật (`nav > ul > li > a`), không phải `Menu` của
 * antd: mỗi mục dẫn tới một URL nên `aria-current="page"` đúng ngữ nghĩa, còn
 * `role="menu"` của antd chỉ dành cho menu lệnh.
 *
 * Màu/kích thước lấy từ CSS variable của theme — xem `ConsoleMenu.css`.
 */
export default function ConsoleMenu({
  items,
  menuAriaLabel,
  selectedKey,
  onSelect,
}: ConsoleMenuProps) {
  return (
    <nav aria-label={menuAriaLabel} className="mems-console-menu">
      <ul className="mems-console-menu__list">
        {items.map((item) => {
          const isSelected = selectedKey === item.key;
          return (
            <li key={item.key}>
              <AppLink
                to={item.path}
                className="mems-console-menu__link"
                hasUnderline={false}
                // `Text` bên trong `Link` luôn tự đặt màu + độ đậm, nên phải
                // truyền qua prop thay vì ép bằng CSS — CSS của mình chỉ lo nền
                // và kích thước.
                color={isSelected ? 'accent' : 'primary'}
                weight={isSelected ? 'semibold' : 'medium'}
                aria-current={isSelected ? 'page' : undefined}
                onClick={onSelect}
              >
                {item.icon ? (
                  <span className="mems-console-menu__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span className="mems-console-menu__label">{item.label}</span>
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
