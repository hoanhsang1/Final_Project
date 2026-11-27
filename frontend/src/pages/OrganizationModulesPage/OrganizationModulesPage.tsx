import {
  Badge,
  Banner,
  Button,
  HStack,
  pixel,
  proportional,
  Stack,
  Table,
  Text,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import {
  fetchMyModules,
  moduleErrorMessage,
  myModulesKey,
  toggleMyModule,
  type ModuleStatusCode,
  type OwnerModuleItem,
} from '../../features/modules/moduleApi';
import { useNotify } from '../../hooks/useNotify';

const EMPTY_VALUE = '—';

/** `Table` của Astryx buộc `T extends Record<string, unknown>`. */
type ModuleRow = OwnerModuleItem & Record<string, unknown>;

const STATUS_LABEL: Record<ModuleStatusCode, string> = {
  active: 'Đang bật',
  disabled: 'Đang tắt',
  locked: 'Bị khoá bởi quản trị viên',
  not_registered: 'Chưa đăng ký',
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn "Module tổ chức" của OWNER (`/to-chuc/module`).
 *
 * Chỉ bật/tắt module do tổ chức đăng ký. Module lõi hoặc module bị SUPER_ADMIN
 * khoá thì không cho thao tác; BE vẫn là nơi chặn quyết định. Không dùng
 * optimistic update: khi toggle lỗi thì bảng giữ nguyên trạng thái cũ.
 */
export default function OrganizationModulesPage() {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const [actionError, setActionError] = useState<string | null>(null);

  const list = useQuery({ queryKey: myModulesKey, queryFn: fetchMyModules });

  const toggle = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      toggleMyModule(code, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myModulesKey });
      notify.success('Đã cập nhật trạng thái module.');
    },
  });

  const handleToggle = async (module: OwnerModuleItem) => {
    setActionError(null);
    try {
      await toggle.mutateAsync({ code: module.code, enabled: module.status !== 'active' });
    } catch (error) {
      setActionError(moduleErrorMessage(error));
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
      header: 'Thông tin khoá',
      width: proportional(1, { minWidth: 220 }),
      renderCell: (module) =>
        module.status === 'locked' ? (
          <Stack direction="vertical" gap={1}>
            <Text type="supporting">Lý do khoá: {module.locked_reason || EMPTY_VALUE}</Text>
            <Text type="supporting">Thời điểm khoá: {formatDateTime(module.locked_at)}</Text>
          </Stack>
        ) : (
          EMPTY_VALUE
        ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      width: pixel(120),
      renderCell: (module) => {
        const isActive = module.status === 'active';
        const label = isActive ? 'Tắt' : 'Bật';
        // Core bị BE chặn; module đã bị admin khoá hoặc chưa đăng ký cũng không
        // nên cho OWNER bấm (nút vẫn có nhãn để người dùng hiểu hành động).
        const isDisabled =
          module.is_core || module.status === 'locked' || module.status === 'not_registered';
        return (
          <Button
            variant={isActive ? 'secondary' : 'primary'}
            size="sm"
            label={label}
            aria-label={`${label} module ${module.name}`}
            isDisabled={isDisabled}
            isLoading={toggle.isPending && toggle.variables?.code === module.code}
            onClick={() => void handleToggle(module)}
          />
        );
      },
    },
  ];

  if (list.isError) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title="Module tổ chức" subtitle="Bật/tắt module đã đăng ký của tổ chức." />
        <Banner
          status="error"
          role="alert"
          collapsible={false}
          title="Không tải được danh sách module."
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
        title="Module tổ chức"
        subtitle="Bật/tắt module đã đăng ký của tổ chức. Module lõi và module bị khoá không thay đổi được."
      />

      {actionError ? (
        <Banner status="error" role="alert" collapsible={false} title={actionError} />
      ) : null}

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
    </Stack>
  );
}
