import { Button, Text, VStack } from '@astryxdesign/core';
import type { Role } from '../../features/auth/roles';

export interface RoleButtonProps {
  role: Role;
  onSelect: (role: Role) => void;
}

/**
 * Một nút chọn tác nhân.
 *
 * BR-08: nút luôn có NHÃN CHỮ, không dùng màu hay icon làm tín hiệu duy nhất.
 * `label` của Astryx vừa là nội dung, vừa là tên cho trình đọc màn hình: khi
 * `children` khác `label`, Astryx đặt `aria-label={label}` — nhờ vậy tên nút
 * vẫn là "Giáo viên" dù bên trong có thêm dòng mô tả.
 *
 * Không dùng `Avatar`: nút của Astryx bọc nội dung trong `<span>`, đặt `<div>`
 * của Avatar vào đó là lồng sai loại nội dung. Chữ cái đầu nằm trong CSS nếu
 * sau này cần, còn hiện tại nhãn chữ đã đủ phân biệt.
 */
export function RoleButton({ role, onSelect }: RoleButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      label={role.label}
      width="100%"
      onClick={() => onSelect(role)}
      style={{
        height: 'auto',
        justifyContent: 'flex-start',
        paddingBlock: 'var(--spacing-2)',
        textAlign: 'start',
      }}
    >
      <VStack as="span" gap={0.5} align="stretch">
        <Text as="span" type="body" weight="medium">
          {role.label}
        </Text>
        <Text as="span" type="supporting" color="secondary">
          {role.description}
        </Text>
      </VStack>
    </Button>
  );
}
