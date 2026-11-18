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
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { accountStatusLabel } from '../../features/admin/statusLabels';
import type { AccountStatus } from '../../features/admin/types';
import { useFormState } from '../../hooks/useFormState';

/** Lý do tối đa — khớp `rejection_reason VARCHAR(500)` trong DB. */
const MAX_REASON_LENGTH = 500;

/** Trạng thái CHUYỂN TỚI — không có `pending` (không thể tự đưa tài khoản về chờ duyệt). */
export type TargetAccountStatus = Exclude<AccountStatus, 'pending'>;

interface AccountStatusModalProps {
  open: boolean;
  /** Tên đăng nhập — hiện trong nội dung modal. */
  username: string;
  /** Trạng thái HIỆN TẠI của tài khoản. */
  currentStatus: AccountStatus;
  /** Trạng thái CHUYỂN TỚI. */
  targetStatus: TargetAccountStatus;
  /** Đang gửi yêu cầu → nút xác nhận khoá + loading. */
  loading: boolean;
  /**
   * Lỗi từ BE — hiển thị bằng `Banner` trong modal.
   *
   * Toast `message.error` tự biến mất và bị modal che → chuyển vào đây để
   * người dùng đọc được lý do thất bại và thử lại (NFR-REL-001).
   */
  error?: string | null;
  onCancel: () => void;
  /** Nhận lý do đã TRIM (hoặc `undefined` nếu để trống — lý do TUỲ CHỌN). */
  onConfirm: (reason: string | undefined) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentFormModal`).
 *
 * Tên field RIÊNG — không dùng chung `reason` với modal Từ chối / Vô hiệu hoá
 * tổ chức, nếu không nhãn `id` trùng giữa các modal trên cùng trang (a11y).
 */
type AccountStatusFormValues = {
  statusReason: string;
};

/**
 * Modal xác nhận **đổi trạng thái tài khoản** — `PATCH /accounts/{id}/status` (`D-24c`).
 *
 * `BR-04`: chữ trên UI là "Vô hiệu hoá", **không** phải "Xoá".
 * Lý do là dữ liệu người dùng nhập → hiển thị lại phải render TEXT THUẦN,
 * không `dangerouslySetInnerHTML` (ADR-FE-003 §9).
 *
 * Lý do **TUỲ CHỌN** (đặc tả §4.4): nếu có thì ≤ 500 ký tự.
 */
export default function AccountStatusModal({
  open,
  username,
  currentStatus,
  targetStatus,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountStatusModalProps) {
  const form = useFormState<AccountStatusFormValues>(
    { statusReason: '' },
    {
      statusReason: (value) =>
        value.trim().length <= MAX_REASON_LENGTH ? undefined : MSG_ACC.STATUS_REASON_TOO_LONG,
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc cả object `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Xoá ô nhập mỗi lần mở (thay `Form.resetFields` + `forceRender`).
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const currentLabel = accountStatusLabel(currentStatus);
  const targetLabel = accountStatusLabel(targetStatus);
  const isDangerous = targetStatus === 'disabled' || targetStatus === 'locked';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    const reason = form.values.statusReason.trim();
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
        title={`${MSG_ACC.CHANGE_STATUS}: ${username}`}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {/* Lỗi xếp trên thông tin hành động (NFR-REL-001). */}
          {error ? <Banner status="error" title={error} collapsible={false} role="alert" /> : null}

          <Banner
            status={isDangerous ? 'warning' : 'info'}
            collapsible={false}
            title={
              <>
                Chuyển tài khoản <Text weight="semibold">{username}</Text> từ{' '}
                <Text weight="semibold">{currentLabel.label}</Text> sang{' '}
                <Text weight="semibold">{targetLabel.label}</Text>.
              </>
            }
          />

          <TextArea
            label={MSG_ACC.STATUS_REASON_LABEL}
            value={form.values.statusReason}
            onChange={(value) => form.setValue('statusReason', value)}
            rows={3}
            // `maxLength` = hiện bộ đếm; `htmlMaxLength` = chặn cứng như `maxLength`
            // của antd (`showCount` + `maxLength` trước đây).
            maxLength={MAX_REASON_LENGTH}
            htmlMaxLength={MAX_REASON_LENGTH}
            isDisabled={loading}
            placeholder="Ghi chú lý do (không bắt buộc) — được lưu vào nhật ký."
            status={
              form.errorOf('statusReason')
                ? { type: 'error', message: form.errorOf('statusReason') }
                : undefined
            }
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
            {/* Nhãn nút = trạng thái đích ("Vô hiệu hoá" / "Khoá" / "Kích hoạt"…) —
                khớp `okText={targetLabel.label}` của bản antd (e2e TC-ACC-05 bám tên này). */}
            <Button
              type="submit"
              variant={isDangerous ? 'destructive' : 'primary'}
              size="lg"
              label={targetLabel.label}
              isLoading={loading}
              isDisabled={loading}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
