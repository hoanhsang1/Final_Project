import {
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  Selector,
  Text,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_ACC, MSG_ORG } from '../../features/admin/adminMessages';
import { CREATE_ROLE_OPTIONS, roleLabel } from '../../features/admin/roleLabels';
import { useFormState } from '../../hooks/useFormState';

interface AccountRoleModalProps {
  open: boolean;
  /** Tên đăng nhập — hiện trong nội dung modal. */
  username: string;
  /** Vai trò HIỆN TẠI của tài khoản (`account.role`, role backend gốc). */
  currentRole: string;
  loading: boolean;
  /** Lỗi từ BE — hiển thị bằng `Banner` trong modal (NFR-REL-001). */
  error?: string | null;
  onCancel: () => void;
  /** Nhận vai trò MỚI (role backend gốc) — FE đã chặn vai trò trùng. */
  onConfirm: (role: string) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentFormModal`).
 *
 * Tên field RIÊNG — không trùng `role` của form tạo tài khoản hay `statusReason`
 * của modal trạng thái (nhãn `id` trùng giữa các modal cùng trang là lỗi a11y).
 */
type AccountRoleFormValues = {
  newRole: string;
};

/**
 * Modal **đổi vai trò tài khoản** — `PATCH /accounts/{id}/role` (`D-30`).
 *
 * Validate FE: vai trò mới phải **khác** vai trò hiện tại; danh sách chỉ gồm
 * `CREATE_ROLE_OPTIONS` (không có `SUPER_ADMIN` — Q-35). BE chặn thêm trường
 * hợp admin tự đổi vai trò chính mình (409 → `MSG-ACC-27`).
 */
export default function AccountRoleModal({
  open,
  username,
  currentRole,
  loading,
  error,
  onCancel,
  onConfirm,
}: AccountRoleModalProps) {
  const form = useFormState<AccountRoleFormValues>(
    { newRole: '' },
    {
      // `currentRole` đọc qua ref của `useFormState` nên luôn là giá trị mới nhất,
      // không dính closure cũ khi màn chi tiết refetch đổi vai trò.
      newRole: (value) => {
        if (!value) return MSG_ACC.ROLE_REQUIRED;
        return value === currentRole ? MSG_ACC.ROLE_UNCHANGED : undefined;
      },
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc cả object `form` (đổi mỗi render → effect lặp vô hạn).
  const resetForm = form.reset;

  // Xoá lựa chọn mỗi lần mở (thay `Form.resetFields` + `forceRender`).
  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    onConfirm(form.values.newRole);
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      // `form`: bấm ra ngoài KHÔNG đóng để không mất lựa chọn đang dở; ESC vẫn đóng.
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={`${MSG_ACC.CHANGE_ROLE_TITLE}: ${username}`}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {error ? <Banner status="error" title={error} collapsible={false} role="alert" /> : null}

          <Banner
            status="info"
            collapsible={false}
            title={
              <>
                Vai trò hiện tại: <Text weight="semibold">{roleLabel(currentRole)}</Text>
              </>
            }
          />

          {/* Không có `SUPER_ADMIN` trong danh sách (Q-35). */}
          <Selector
            label={MSG_ACC.ROLE}
            options={[...CREATE_ROLE_OPTIONS]}
            value={form.values.newRole}
            onChange={(value) => form.setValue('newRole', value)}
            placeholder={MSG_ACC.ROLE_REQUIRED}
            isDisabled={loading}
            aria-required="true"
            status={
              form.errorOf('newRole') ? { type: 'error', message: form.errorOf('newRole') } : undefined
            }
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_ORG.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={MSG_ACC.CHANGE_ROLE_TITLE}
              isLoading={loading}
              isDisabled={loading}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
