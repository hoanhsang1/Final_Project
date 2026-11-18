import {
  Banner,
  Button,
  CheckboxInput,
  Dialog,
  DialogHeader,
  HStack,
  Text,
  VStack,
} from '@astryxdesign/core';
import { useEffect, useState } from 'react';
import { MSG_ORG } from '../../features/admin/adminMessages';

interface ApproveOrganizationModalProps {
  open: boolean;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Số module sẽ được kích hoạt khi duyệt. */
  moduleCount: number;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /** Lỗi từ BE — hiện bằng `Banner` trong modal thay cho toast dễ bị bỏ lỡ. */
  error?: string | null;
  onCancel: () => void;
  /** `notifyEmail` — `D-27` (C3): BE gửi email cho chủ tổ chức nếu `true`. */
  onConfirm: (notifyEmail: boolean) => void;
}

/**
 * Modal xác nhận DUYỆT tổ chức — Đặc tả Sprint 2 §3.4.
 *
 * Nội dung nêu rõ tên tổ chức và số module sẽ được kích hoạt (`TC-APPR-01`).
 *
 * **C3** — checkbox `notifyEmail` (`D-27`): mặc định **BẬT**, gửi kèm trong body
 * `PATCH …/approve`. BE hiện chưa đọc body này (`D-05` + `D-27`) nên nó chưa
 * làm thay đổi gì ở backend — FE gửi đúng contract để sẵn sàng khi Sang sửa.
 */
export default function ApproveOrganizationModal({
  open,
  orgName,
  moduleCount,
  loading,
  error,
  onCancel,
  onConfirm,
}: ApproveOrganizationModalProps) {
  // Mặc định tick — người dùng phải chủ động BỎ tick thì mới không gửi email.
  const [notifyEmail, setNotifyEmail] = useState(true);

  // Mở modal → về lại mặc định (không nhớ lựa chọn lần trước của lần duyệt khác).
  useEffect(() => {
    if (open) {
      setNotifyEmail(true);
    }
  }, [open]);

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // `form`: bấm ra ngoài KHÔNG đóng để không mất lựa chọn đang đặt; ESC vẫn đóng.
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={MSG_ORG.APPROVE_TITLE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <VStack gap={4} style={{ marginTop: 'var(--spacing-4)' }}>
        {/* Chỉ hiện khi modal đang mở — `Dialog` trả `null` lúc đóng nên guard này
            giữ cho ý định rõ ràng và an toàn nếu Astryx đổi cách mount. */}
        {open && error ? (
          <Banner status="error" title={error} collapsible={false} role="alert" />
        ) : null}

        <Text type="body">
          Bạn sắp duyệt <Text weight="semibold">{orgName}</Text>. Toàn bộ{' '}
          <Text weight="semibold">{moduleCount}</Text> module đang chọn sẽ được kích hoạt và tài
          khoản chủ tổ chức sẽ hoạt động.
        </Text>

        <CheckboxInput label={MSG_ORG.NOTIFY_EMAIL} value={notifyEmail} onChange={setNotifyEmail} />

        <HStack justify="end" gap={2}>
          <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
          {/* Nút chỉ khoá KHI đang gửi — không tắt trước khi gửi (Đặc tả §3.0). */}
          <Button
            variant="primary"
            size="lg"
            label={MSG_ORG.APPROVE}
            isLoading={loading}
            isDisabled={loading}
            onClick={() => onConfirm(notifyEmail)}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
