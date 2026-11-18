import {
  Banner,
  Button,
  CheckboxList,
  CheckboxListItem,
  Dialog,
  DialogHeader,
  HStack,
  TextArea,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { FormEvent } from 'react';
import { useEffect } from 'react';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type { Permission, Position, PositionPayload } from '../../features/owner/types';
import { useFormState } from '../../hooks/useFormState';

interface PositionFormModalProps {
  open: boolean;
  position: Position | null;
  permissions: Permission[];
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PositionPayload) => void;
}

/**
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` (xem `DepartmentsPage`).
 */
type FormValues = {
  name: string;
  description: string;
  permissions: string[];
};

export default function PositionFormModal({
  open,
  position,
  permissions,
  submitting,
  error,
  onCancel,
  onSubmit,
}: PositionFormModalProps) {
  const isEditing = position !== null;

  const form = useFormState<FormValues>(
    { name: '', description: '', permissions: [] },
    {
      name: (value) => {
        if (!value.trim()) return MSG_POS.NAME_REQUIRED;
        return value.trim().length <= 200 ? undefined : MSG_POS.NAME_TOO_LONG;
      },
      description: (value) =>
        value.trim().length <= 1000 ? undefined : MSG_POS.DESCRIPTION_TOO_LONG,
      permissions: (value) => (value.length > 0 ? undefined : MSG_POS.PERMISSIONS_REQUIRED),
    },
  );
  const resetForm = form.reset;

  useEffect(() => {
    if (!open) return;
    if (position) {
      resetForm({
        name: position.name,
        description: position.description ?? '',
        permissions: position.permissions,
      });
    } else {
      resetForm();
    }
  }, [open, position, resetForm]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    onSubmit({
      name: form.values.name.trim(),
      description: form.values.description.trim() || undefined,
      permissions: form.values.permissions,
    });
  };

  return (
    <Dialog
      isOpen={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      purpose="form"
      width={560}
    >
      <DialogHeader
        title={isEditing ? MSG_POS.EDIT : MSG_POS.CREATE}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
      />

      <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
        <VStack gap={4}>
          {error ? (
            <Banner status="error" title={error} collapsible={false} role="alert" />
          ) : null}

          <TextInput
            label={MSG_POS.NAME}
            value={form.values.name}
            onChange={(value) => form.setValue('name', value)}
            autoComplete="off"
            isDisabled={submitting}
            aria-required="true"
            status={
              form.errorOf('name') ? { type: 'error', message: form.errorOf('name') } : undefined
            }
          />

          <TextArea
            label={MSG_POS.DESCRIPTION}
            value={form.values.description}
            onChange={(value) => form.setValue('description', value)}
            rows={3}
            maxLength={1000}
            isDisabled={submitting}
            status={
              form.errorOf('description')
                ? { type: 'error', message: form.errorOf('description') }
                : undefined
            }
          />

          {/* Danh sách DỌC — dễ đọc và dễ bấm ở 320px. `CheckboxList` chạy ở chế
              độ collection vì có `value: string[]` (xem `docs/ui-conventions.md` §6.7). */}
          <CheckboxList
            label={MSG_POS.PERMISSIONS}
            value={form.values.permissions}
            onChange={(values) => form.setValue('permissions', values)}
            isDisabled={submitting}
            status={
              form.errorOf('permissions')
                ? { type: 'error', message: form.errorOf('permissions') }
                : undefined
            }
          >
            {permissions.map((p) => (
              <CheckboxListItem
                key={p.code}
                value={p.code}
                label={`${permissionLabel(p.code)} (${p.description})`}
              />
            ))}
          </CheckboxList>

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
