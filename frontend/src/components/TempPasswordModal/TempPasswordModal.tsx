import { Button, Modal, Space, Typography, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { MSG_MEM } from '../../features/owner/ownerMessages';

interface TempPasswordModalProps {
  open: boolean;
  username: string;
  password: string;
  onClose: () => void;
}

export default function TempPasswordModal({ open, username, password, onClose }: TempPasswordModalProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      message.success(MSG_MEM.COPIED);
    } catch {
      message.error(MSG_MEM.COPY_FAILED);
    }
  };

  return (
    <Modal
      open={open}
      title={MSG_MEM.TEMP_PASSWORD_TITLE}
      closable={false}
      maskClosable={false}
      footer={
        <Button type="primary" onClick={onClose}>
          {MSG_MEM.TEMP_PASSWORD_ACK}
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          {MSG_MEM.CREATE_HINT}
        </Typography.Text>
        <div>
          <Typography.Text strong>{MSG_MEM.USERNAME}: </Typography.Text>
          <Typography.Text code>{username}</Typography.Text>
        </div>
        <div>
          <Typography.Text strong>Mật khẩu tạm: </Typography.Text>
          <Typography.Text code copyable>{password}</Typography.Text>
        </div>
        <Button icon={<CopyOutlined />} onClick={() => void handleCopy()}>
          {MSG_MEM.COPY}
        </Button>
        <Typography.Text type="danger">{MSG_MEM.TEMP_PASSWORD_HINT}</Typography.Text>
      </Space>
    </Modal>
  );
}
