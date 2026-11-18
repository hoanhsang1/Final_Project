import {
  Banner,
  Button,
  CheckboxInput,
  Dialog,
  DialogHeader,
  HStack,
  Text,
  TextArea,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { MSG_ORG } from '../../features/admin/adminMessages';
import { useFormState } from '../../hooks/useFormState';

/** Lý do tối đa — khớp cột `rejection_reason VARCHAR(500)` trong DB. */
const MAX_REASON_LENGTH = 500;

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `SuspendOrganizationModal`).
 *
 * Tên field RIÊNG cho modal này: nếu cả 3 modal cùng dùng `reason` thì `id` của
 * ô nhập trùng nhau → nhãn trỏ nhầm ô của modal khác (a11y).
 */
type RejectFormValues = {
  rejectReason: string;
};

interface RejectOrganizationModalProps {
  open: boolean;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /** Lỗi từ BE — hiện bằng `Banner` trong modal để người dùng đọc được khi bấm lại. */
  error?: string | null;
  onCancel: () => void;
  /** Nhận lý do đã TRIM + `notifyEmail` (`D-27`, C3). */
  onConfirm: (reason: string, notifyEmail: boolean) => void;
}

/**
 * Modal TỪ CHỐI tổ chức — Đặc tả Sprint 2 §3.5.
 *
 * Lý do từ chối là **BẮT BUỘC** (`Q-14`), tối đa 500 ký tự — khớp cột
 * `rejection_reason VARCHAR(500)` trong DB. `maxLength` cho bộ đếm,
 * `htmlMaxLength` chặn cứng ở tầng trình duyệt (`TC-ORG-29`).
 *
 * **C3** — checkbox `notifyEmail` (`D-27`): mặc định **BẬT**, gửi kèm trong body
 * `PATCH …/reject`. BE hiện chưa đọc body này (`D-05` + `D-27`).
 *
 * ⚠️ Lý do là dữ liệu người dùng nhập → khi hiển thị lại phải render bằng TEXT THUẦN,
 * tuyệt đối không `dangerouslySetInnerHTML` (ADR-FE-003).
 */
export default function RejectOrganizationModal({
  open,
  orgName,
  loading,
  error,
  onCancel,
  onConfirm,
}: RejectOrganizationModalProps) {
  const [notifyEmail, setNotifyEmail] = useState(true);

  const form = useFormState<RejectFormValues>(
    { rejectReason: '' },
    {
      // `trim()` ⇒ chỉ gõ toàn dấu cách vẫn tính là TRỐNG (`TC-ORG-28`).
      rejectReason: (value) => {
        if (!value.trim()) return MSG_ORG.REASON_REQUIRED;
        return value.trim().length <= MAX_REASON_LENGTH ? undefined : MSG_ORG.REASON_TOO_LONG;
      },
    },
  );
  // `reset` có identity ổn định — tách ra để effect không phụ thuộc cả object
  // `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Mở modal → xoá ô nhập + về lại mặc định tick (thay `Form.resetFields`).
  useEffect(() => {
    if (open) {
      resetForm();
      setNotifyEmail(true);
    }
  }, [open, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    onConfirm(form.values.rejectReason.trim(), notifyEmail);
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // `form`: bấm ra ngoài KHÔNG đóng để không mất lý do đang nhập; ESC vẫn đóng.
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={MSG_ORG.REJECT_TITLE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {open && error ? (
            <Banner status="error" title={error} collapsible={false} role="alert" />
          ) : null}

          <Text type="body">
            Tổ chức <Text weight="semibold">{orgName}</Text> sẽ không hoạt động và tài khoản chủ tổ
            chức sẽ bị <Text weight="semibold">vô hiệu hoá</Text>.
          </Text>

          <TextArea
            label={MSG_ORG.REASON_LABEL}
            value={form.values.rejectReason}
            onChange={(value) => form.setValue('rejectReason', value)}
            rows={4}
            maxLength={MAX_REASON_LENGTH}
            htmlMaxLength={MAX_REASON_LENGTH}
            isDisabled={loading}
            aria-required="true"
            placeholder="Nêu rõ lý do để tổ chức biết cần bổ sung hồ sơ gì."
            status={
              form.errorOf('rejectReason')
                ? { type: 'error', message: form.errorOf('rejectReason') }
                : undefined
            }
          />

          <CheckboxInput
            label={MSG_ORG.NOTIFY_EMAIL}
            value={notifyEmail}
            onChange={setNotifyEmail}
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              label={MSG_ORG.REJECT}
              isLoading={loading}
              isDisabled={loading}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
