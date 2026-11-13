import { Alert } from 'antd';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';

/** Trạng thái "không có quyền" (một trong 5 state bắt buộc). */
export default function ForbiddenNotice({ title = MSG_S4.NO_PERMISSION }: { title?: string }) {
  return (
    <Alert
      type="warning"
      showIcon
      role="status"
      message={title}
      description={MSG_S4.NO_PERMISSION_HINT}
    />
  );
}
