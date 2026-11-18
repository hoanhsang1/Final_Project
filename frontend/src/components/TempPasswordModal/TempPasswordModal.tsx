import { Banner, Button, Code, Dialog, DialogHeader, HStack, Text, VStack } from '@astryxdesign/core';
import { MSG_MEM } from '../../features/owner/ownerMessages';
import { useNotify } from '../../hooks/useNotify';

interface TempPasswordModalProps {
  open: boolean;
  username: string;
  password: string;
  onClose: () => void;
}

/**
 * Hộp thoại hiện mật khẩu tạm **một lần** sau khi tạo nhân viên.
 *
 * Không có nút đóng: `DialogHeader` cố ý KHÔNG nhận `onOpenChange` nên Astryx
 * không render nút X (khớp `closable={false}` của bản antd). `purpose="form"`
 * chặn bấm ra ngoài nhưng vẫn cho ESC — đúng như `keyboard` mặc định của antd.
 * Lối thoát duy nhất là nút "Tôi đã lưu mật khẩu".
 */
export default function TempPasswordModal({
  open,
  username,
  password,
  onClose,
}: TempPasswordModalProps) {
  const notify = useNotify();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      notify.success(MSG_MEM.COPIED);
    } catch {
      notify.error(MSG_MEM.COPY_FAILED);
    }
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      purpose="form"
      width={520}
    >
      {/* Không truyền `onOpenChange` ⇒ KHÔNG có nút đóng. */}
      <DialogHeader title={MSG_MEM.TEMP_PASSWORD_TITLE} />

      <VStack gap={4} style={{ marginTop: 'var(--spacing-4)' }}>
        <Text type="body">{MSG_MEM.CREATE_HINT}</Text>

        <HStack gap={2} align="center" wrap="wrap">
          <Text type="label">{MSG_MEM.USERNAME}:</Text>
          <Code>{username}</Code>
        </HStack>

        <HStack gap={2} align="center" wrap="wrap">
          <Text type="label">Mật khẩu tạm:</Text>
          <Code>{password}</Code>
        </HStack>

        <HStack>
          <Button
            variant="secondary"
            size="lg"
            label={MSG_MEM.COPY}
            onClick={() => void handleCopy()}
          />
        </HStack>

        {/* Bản antd dùng `Text type="danger"`; Astryx `Text` không có màu `danger`
            nên cảnh báo "chỉ hiện một lần" đi qua `Banner` — vẫn kèm CHỮ (BR-08). */}
        <Banner status="warning" title={MSG_MEM.TEMP_PASSWORD_HINT} collapsible={false} />

        <HStack justify="end">
          <Button
            variant="primary"
            size="lg"
            label={MSG_MEM.TEMP_PASSWORD_ACK}
            onClick={onClose}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
