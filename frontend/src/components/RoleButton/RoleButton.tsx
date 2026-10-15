import { Avatar, Button, Flex, theme, Typography } from 'antd';
import type { Role } from '../../features/auth/roles';

export interface RoleButtonProps {
  role: Role;
  onSelect: (role: Role) => void;
}

const { Text } = Typography;

/**
 * Một nút chọn tác nhân.
 *
 * BR-08: nút luôn có NHÃN CHỮ, không dùng màu hay icon làm tín hiệu duy nhất.
 * Mọi kích thước/màu lấy từ token của antd — không hardcode hex/px (AGENTS.md mục 2).
 */
export function RoleButton({ role, onSelect }: RoleButtonProps) {
  const { token } = theme.useToken();

  return (
    <Button
      type="default"
      block
      htmlType="button"
      onClick={() => onSelect(role)}
      style={{
        height: 'auto',
        padding: token.paddingSM,
        textAlign: 'left',
        whiteSpace: 'normal',
      }}
    >
      <Flex align="center" gap={token.marginSM} style={{ width: '100%' }}>
        <Avatar aria-hidden="true" style={{ backgroundColor: token.colorPrimary, flexShrink: 0 }}>
          {role.label.charAt(0)}
        </Avatar>
        <Flex vertical style={{ flex: 1, minWidth: 0 }}>
          <Text strong>{role.label}</Text>
          <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
            {role.description}
          </Text>
        </Flex>
      </Flex>
    </Button>
  );
}
