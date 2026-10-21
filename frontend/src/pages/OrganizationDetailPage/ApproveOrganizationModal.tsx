import { Modal, Typography } from 'antd';
import { MSG_ORG } from '../../features/admin/adminMessages';

const { Text } = Typography;

interface ApproveOrganizationModalProps {
  open: boolean;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Số module sẽ được kích hoạt khi duyệt. */
  moduleCount: number;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Modal xác nhận DUYỆT tổ chức — Đặc tả Sprint 2 §3.4.
 *
 * Nội dung nêu rõ tên tổ chức và số module sẽ được kích hoạt (`TC-APPR-01`).
 */
export default function ApproveOrganizationModal({
  open,
  orgName,
  moduleCount,
  loading,
  onCancel,
  onConfirm,
}: ApproveOrganizationModalProps) {
  return (
    <Modal
      open={open}
      title={MSG_ORG.APPROVE_TITLE}
      okText={MSG_ORG.APPROVE}
      cancelText={MSG_ORG.CANCEL}
      confirmLoading={loading}
      // Nút chỉ khoá KHI đang gửi — không tắt trước khi gửi (Đặc tả §3.0).
      okButtonProps={{ disabled: loading }}
      onOk={onConfirm}
      onCancel={onCancel}
      destroyOnHidden
    >
      <Text>
        Bạn sắp duyệt <Text strong>{orgName}</Text>. Toàn bộ <Text strong>{moduleCount}</Text>{' '}
        module đang chọn sẽ được kích hoạt và tài khoản chủ tổ chức sẽ hoạt động.
      </Text>
    </Modal>
  );
}
