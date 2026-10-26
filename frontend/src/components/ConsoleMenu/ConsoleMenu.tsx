import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { Link } from 'react-router-dom';
import { MSG_ADM } from '../../features/admin/adminMessages';
import { CONSOLE_MENU } from '../../features/admin/consoleMenu';

interface ConsoleMenuProps {
  /** Khóa mục đang được chọn — `null` khi không khớp mục nào (màn chi tiết). */
  selectedKey: string | null;
  /** Gọi khi bấm 1 mục — dùng để đóng Drawer ở màn hình nhỏ. */
  onSelect?: () => void;
}

/**
 * Menu điều hướng của khung console quản trị.
 *
 * Dùng CHUNG cho cả `Sider` (≥1024px) và `Drawer` (<1024px) để hai chỗ
 * không bao giờ lệch nhau — menu được dựng từ `CONSOLE_MENU`.
 *
 * `aria-current="page"` trên mục đang chọn (`WCAG 2.1 AA`).
 */
export default function ConsoleMenu({ selectedKey, onSelect }: ConsoleMenuProps) {
  const items: MenuProps['items'] = CONSOLE_MENU.map((item) => ({
    key: item.key,
    label: (
      <Link to={item.path} aria-current={selectedKey === item.key ? 'page' : undefined}>
        {item.label}
      </Link>
    ),
  }));

  return (
    <nav aria-label={MSG_ADM.MENU_ARIA}>
      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        onClick={onSelect}
        items={items}
        style={{ borderInlineEnd: 'none' }}
      />
    </nav>
  );
}
