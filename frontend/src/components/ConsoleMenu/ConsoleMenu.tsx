import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import { Link } from 'react-router-dom';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';

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
 * Dùng CHUNG cho cả `Sider` (≥1024px) và `Drawer` (<1024px) để hai chỗ
 * không bao giờ lệch nhau — cả hai đều nhận cùng một mảng `items`.
 *
 * `aria-current="page"` trên mục đang chọn (`WCAG 2.1 AA`).
 */
export default function ConsoleMenu({
  items,
  menuAriaLabel,
  selectedKey,
  onSelect,
}: ConsoleMenuProps) {
  const menuItems: MenuProps['items'] = items.map((item) => ({
    key: item.key,
    label: (
      <Link to={item.path} aria-current={selectedKey === item.key ? 'page' : undefined}>
        {item.label}
      </Link>
    ),
  }));

  return (
    <nav aria-label={menuAriaLabel}>
      <Menu
        mode="inline"
        selectedKeys={selectedKey ? [selectedKey] : []}
        onClick={onSelect}
        items={menuItems}
        style={{ borderInlineEnd: 'none' }}
      />
    </nav>
  );
}
