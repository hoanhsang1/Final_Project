import {
  Button,
  Dialog,
  DialogHeader,
  HStack,
  MultiSelector,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_MEM, MSG_OWNER } from '../../features/owner/ownerMessages';
import type { Member, Position } from '../../features/owner/types';
import { useFormState } from '../../hooks/useFormState';

interface MemberPositionsModalProps {
  open: boolean;
  member: Member | null;
  positions: Position[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (positionIds: string[]) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `MemberFormModal`).
 */
type FormValues = {
  positionIds: string[];
};

/**
 * Modal đổi chức vụ của một nhân viên — `PUT /departments/{id}/members/{userId}/positions`.
 *
 * Chỉ sửa tập chức vụ; vai trò trong phòng ban do BE quyết định ở luồng khác.
 */
export default function MemberPositionsModal({
  open,
  member,
  positions,
  submitting,
  onCancel,
  onSubmit,
}: MemberPositionsModalProps) {
  const form = useFormState<FormValues>(
    { positionIds: [] },
    {
      positionIds: (value) => (value.length > 0 ? undefined : MSG_MEM.POSITIONS_REQUIRED),
    },
  );
  const resetForm = form.reset;

  // Điền sẵn chức vụ hiện tại mỗi khi mở (thay `Form.setFieldsValue`).
  useEffect(() => {
    if (!open || !member) return;
    resetForm({ positionIds: member.positionIds });
  }, [open, member, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    onSubmit(form.values.positionIds);
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      purpose="form"
      width={520}
    >
      <DialogHeader
        title={MSG_MEM.CHANGE_POSITIONS}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          <MultiSelector
            label={MSG_MEM.POSITIONS}
            placeholder="Chọn chức vụ"
            options={positions.map((p) => ({ value: p.id, label: p.name }))}
            value={form.values.positionIds}
            onChange={(value) => form.setValue('positionIds', value)}
            isDisabled={submitting}
            aria-required="true"
            status={
              form.errorOf('positionIds')
                ? { type: 'error', message: form.errorOf('positionIds') }
                : undefined
            }
          />

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_OWNER.CANCEL} onClick={onCancel} />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              label={MSG_OWNER.SAVE}
              isLoading={submitting}
            />
          </HStack>
        </VStack>
      </form>
    </Dialog>
  );
}
