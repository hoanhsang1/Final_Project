import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  Text,
  TextArea,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_ORG } from '../../features/admin/adminMessages';
import { useFormState } from '../../hooks/useFormState';

/** Lý do tối đa — khớp cột `rejection_reason VARCHAR(500)` trong DB. */
const MAX_REASON_LENGTH = 500;

type SuspendMode = 'suspend' | 'reactivate';

interface SuspendOrganizationModalProps {
  open: boolean;
  /** Chế độ: `suspend` = vô hiệu hoá · `reactivate` = kích hoạt lại. */
  mode: SuspendMode;
  /** Tên tổ chức — hiện trong nội dung modal. */
  orgName: string;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /**
   * Lỗi từ BE — hiển thị bằng `Banner` ngay trong modal.
   *
   * Trước đây lỗi hiện qua `message.error` (toast) nhưng toast tự biến mất sau
   * vài giây và nằm dưới lớp phủ của modal → người dùng dễ bỏ lỡ, không đọc
   * được vì sao thao tác thất bại.
   */
  error?: string | null;
  onCancel: () => void;
  /**
   * Nhận lý do đã TRIM (hoặc `undefined` nếu để trống).
   *
   * `suspend`: lý do BẮT BUỘC (cần audit) · `reactivate`: lý do tuỳ chọn.
   */
  onConfirm: (reason: string | undefined) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentFormModal`).
 *
 * Tên field RIÊNG — không dùng chung `reason` với modal Từ chối / Đổi trạng
 * thái, để nhãn `id` không trùng giữa các modal trên cùng trang (a11y).
 */
type SuspendFormValues = {
  suspendReason: string;
};

/**
 * Modal xác nhận **Vô hiệu hoá / Kích hoạt lại** tổ chức (`C1`, `D-21`).
 *
 * `BR-04`: chữ trên UI là "Vô hiệu hoá", **không** phải "Xoá".
 * Lý do vô hiệu hoá là dữ liệu người dùng nhập → khi hiển thị lại phải render
 * bằng TEXT THUẦN, không `dangerouslySetInnerHTML` (ADR-FE-003).
 */
export default function SuspendOrganizationModal({
  open,
  mode,
  orgName,
  loading,
  error,
  onCancel,
  onConfirm,
}: SuspendOrganizationModalProps) {
  const isSuspend = mode === 'suspend';

  const form = useFormState<SuspendFormValues>(
    { suspendReason: '' },
    {
      // `isSuspend` đọc qua ref của `useFormState` nên luôn là giá trị mới nhất,
      // không dính closure cũ khi chế độ đổi mà modal còn mở.
      suspendReason: (value) => {
        if (isSuspend && !value.trim()) return MSG_ORG.SUSPEND_REASON_REQUIRED;
        return value.trim().length <= MAX_REASON_LENGTH
          ? undefined
          : MSG_ORG.SUSPEND_REASON_TOO_LONG;
      },
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc cả object `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Xoá ô nhập mỗi lần mở (thay `Form.resetFields` + `destroyOnClose`).
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    const reason = form.values.suspendReason.trim();
    onConfirm(reason || undefined);
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // `form`: bấm ra ngoài KHÔNG đóng để không mất dữ liệu đang nhập; ESC vẫn đóng.
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={isSuspend ? MSG_ORG.SUSPEND_TITLE : MSG_ORG.REACTIVATE_TITLE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {/* Chỉ hiện khi modal đang mở — nếu không kiểm tra `open` thì Banner này
              vẫn nằm trong DOM ẩn (role="alert" giả). */}
          {open && error ? (
            <Banner status="error" title={error} collapsible={false} role="alert" />
          ) : null}

          <Text type="body">
            {isSuspend ? (
              <>
                Tổ chức <Text weight="semibold">{orgName}</Text> sẽ bị{' '}
                <Text weight="semibold">vô hiệu hoá</Text>: tài khoản chủ tổ chức bị tạm khoá và tổ
                chức không thể đăng nhập cho tới khi được kích hoạt lại.
              </>
            ) : (
              <>
                Tổ chức <Text weight="semibold">{orgName}</Text> sẽ được{' '}
                <Text weight="semibold">hoạt động trở lại</Text> và tài khoản chủ tổ chức có thể
                đăng nhập bình thường.
              </>
            )}
          </Text>

          <TextArea
            label={MSG_ORG.SUSPEND_REASON_LABEL}
            value={form.values.suspendReason}
            onChange={(value) => form.setValue('suspendReason', value)}
            rows={3}
            maxLength={MAX_REASON_LENGTH}
            isDisabled={loading}
            // `suspend`: BẮT BUỘC nhập lý do (cần audit) · `reactivate`: tuỳ chọn.
            aria-required={isSuspend ? 'true' : undefined}
            placeholder={
              isSuspend
                ? 'Nêu lý do tổ chức bị vô hiệu hoá để lưu vào nhật ký.'
                : 'Nếu có, ghi rõ lý do kích hoạt lại (không bắt buộc).'
            }
            status={
              form.errorOf('suspendReason')
                ? { type: 'error', message: form.errorOf('suspendReason') }
                : undefined
            }
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant={isSuspend ? 'destructive' : 'primary'}
              size="lg"
              label={isSuspend ? MSG_ORG.SUSPEND : MSG_ORG.REACTIVATE}
              isLoading={loading}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
