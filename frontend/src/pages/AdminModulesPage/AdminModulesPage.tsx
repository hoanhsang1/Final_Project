import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  pixel,
  proportional,
  Stack,
  Table,
  Text,
  TextArea,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import {
  adminModulesKey,
  fetchAdminModules,
  lockAdminModule,
  moduleErrorMessage,
  type AdminModuleItem,
  type ModuleStatusCode,
} from '../../features/modules/moduleApi';
import { useNotify } from '../../hooks/useNotify';

const EMPTY_VALUE = '—';

/** `Table` của Astryx buộc `T extends Record<string, unknown>`. */
type ModuleRow = AdminModuleItem & Record<string, unknown>;

const STATUS_LABEL: Record<ModuleStatusCode, string> = {
  active: 'Đang dùng',
  disabled: 'Đang tắt',
  locked: 'Đang bị khoá',
  not_registered: 'Chưa đăng ký',
};

const REASON_REQUIRED = 'Vui lòng nhập lý do';

interface LockDialogState {
  code: string;
  name: string;
  lock: boolean;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn "Module của tổ chức" dành cho SUPER_ADMIN (`/quan-tri/to-chuc/:id/module`).
 *
 * Hiện lý do/thời điểm khoá, cho khoá/mở khoá. `reason` là bắt buộc ở CẢ hai
 * chiều — BE trả `MODULE_LOCK_REASON_REQUIRED` nếu thiếu khi mở khoá. Form chặn
 * ở FE trước khi gọi API.
 */
export default function AdminModulesPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [dialog, setDialog] = useState<LockDialogState | null>(null);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: adminModulesKey(orgId ?? ''),
    queryFn: () => fetchAdminModules(orgId ?? ''),
    enabled: Boolean(orgId),
  });

  const lock = useMutation({
    mutationFn: ({
      code,
      payload,
    }: {
      code: string;
      payload: { lock: boolean; reason: string };
    }) => lockAdminModule(orgId ?? '', code, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminModulesKey(orgId ?? '') });
      notify.success('Đã cập nhật trạng thái khoá module.');
    },
  });

  const openDialog = (state: LockDialogState) => {
    setReason('');
    setFormError(null);
    setDialog(state);
  };

  const closeDialog = () => {
    setDialog(null);
    setReason('');
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!dialog) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setFormError(REASON_REQUIRED);
      return;
    }

    setFormError(null);
    try {
      await lock.mutateAsync({ code: dialog.code, payload: { lock: dialog.lock, reason: trimmed } });
      closeDialog();
    } catch (error) {
      setFormError(moduleErrorMessage(error));
    }
  };

  const columns: TableColumn<ModuleRow>[] = [
    {
      key: 'name',
      header: 'Tên module',
      width: proportional(1, { minWidth: 200 }),
      renderCell: (module) => module.name,
    },
    {
      key: 'code',
      header: 'Mã module',
      width: proportional(1, { minWidth: 180 }),
      renderCell: (module) => module.code,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: pixel(180),
      renderCell: (module) => (
        <HStack gap={2} wrap="wrap">
          <Badge
            variant={
              module.status === 'active'
                ? 'success'
                : module.status === 'locked'
                  ? 'warning'
                  : 'neutral'
            }
            label={STATUS_LABEL[module.status] ?? module.status}
          />
          {module.is_core ? <Badge variant="neutral" label="Lõi" /> : null}
        </HStack>
      ),
    },
    {
      key: 'lock',
      header: 'Lý do / thời điểm',
      width: proportional(1, { minWidth: 240 }),
      renderCell: (module) =>
        module.status === 'locked' ? (
          <Stack direction="vertical" gap={1}>
            <Text type="supporting">Lý do khoá: {module.locked_reason || EMPTY_VALUE}</Text>
            <Text type="supporting">Thời điểm khoá: {formatDateTime(module.locked_at)}</Text>
          </Stack>
        ) : (
          <Text type="supporting">Vô hiệu hóa lúc: {formatDateTime(module.disabled_at)}</Text>
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: pixel(140),
      renderCell: (module) => {
        const isLocked = module.status === 'locked';
        const label = isLocked ? 'Mở khoá' : 'Khoá';
        return (
          <Button
            variant={isLocked ? 'secondary' : 'ghost'}
            size="sm"
            label={label}
            aria-label={`${label} module ${module.name}`}
            // BR-06: module lõi không bị khoá bởi SUPER_ADMIN.
            isDisabled={module.is_core}
            onClick={() =>
              openDialog({ code: module.code, name: module.name, lock: !isLocked })
            }
          />
        );
      },
    },
  ];

  if (list.isError) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title="Module của tổ chức" subtitle="Quản lý module theo từng tổ chức." />
        <Banner
          status="error"
          role="alert"
          collapsible={false}
          title="Không tải được danh sách module của tổ chức."
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label="Thử lại"
              isLoading={list.isFetching}
              onClick={() => void list.refetch()}
            />
          }
        />
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title="Module của tổ chức"
        subtitle="Khoá hoặc mở khoá module theo tổ chức. Mọi thao tác đều cần lý do để ghi vết."
      />

      {list.isPending ? (
        <PageLoading />
      ) : (
        <Table<ModuleRow>
          data={(list.data ?? []) as ModuleRow[]}
          columns={columns}
          idKey="code"
          hasHover
          textOverflow="truncate"
          emptyState={<EmptyState description="Tổ chức chưa đăng ký module nào." compact />}
        />
      )}

      <Dialog
        isOpen={dialog !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        purpose="form"
        width={520}
      >
        <DialogHeader
          title={dialog ? `${dialog.lock ? 'Khoá' : 'Mở khoá'} module ${dialog.name}` : ''}
          onOpenChange={(open) => {
            if (!open) closeDialog();
          }}
        />
        <form
          noValidate
          style={{ marginTop: 'var(--spacing-4)' }}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Stack direction="vertical" gap={4}>
            <Text type="body">
              {dialog?.lock
                ? 'Tổ chức sẽ không bật lại được module này cho đến khi bạn mở khoá.'
                : 'Module sẽ trở về trạng thái trước đó (đang dùng hoặc đang tắt).'}
            </Text>
            <TextArea
              label="Lý do"
              value={reason}
              onChange={setReason}
              rows={3}
              maxLength={500}
              htmlMaxLength={500}
              isDisabled={lock.isPending}
              placeholder="Ghi rõ lý do để phục vụ kiểm toán"
              status={formError ? { type: 'error', message: formError } : undefined}
            />
            <HStack justify="end" gap={2}>
              <Button variant="secondary" size="lg" label="Huỷ" onClick={closeDialog} />
              <Button
                type="submit"
                variant={dialog?.lock ? 'destructive' : 'primary'}
                size="lg"
                label="Xác nhận"
                isLoading={lock.isPending}
                isDisabled={lock.isPending}
              />
            </HStack>
          </Stack>
        </form>
      </Dialog>
    </Stack>
  );
}
