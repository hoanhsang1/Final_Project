import {
  Badge,
  Banner,
  Button,
  HStack,
  Stack,
  Table,
  Text,
  pixel,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewTeacherClasses } from '../../features/auth/permissions';
import {
  CLASS_STATUS_BADGE,
  CLASS_STATUS_LABEL,
  labelOf,
} from '../../features/sprint4/labels';
import {
  fetchTeacherSelfClasses,
  isForbiddenError,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { TeacherClass } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>` — xác nhận kiểu
 * dòng mà không nới lỏng DTO (xem `docs/ui-conventions.md` 6.9).
 */
type TeacherClassRow = TeacherClass & Record<string, unknown>;

/**
 * Lớp tôi phụ trách (`/dao-tao/lop-hoc-cua-toi`) — chỉ đọc.
 *
 * Gọi `/api/teachers/me/classes`; KHÔNG gọi danh sách/chi tiết lớp quản lý.
 * Mã lớp dẫn tới màn học sinh của chính giáo viên, không tới `/lop-hoc/:id`.
 * Gate: TEACHER **và** `class.self_view`.
 * 5 state: forbidden / loading / error(+retry) / empty / success.
 */
export default function TeacherMyClassesPage() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewTeacherClasses({ backendRoles, permissions });

  const classesQuery = useQuery({
    queryKey: ['teacher-self-classes'],
    queryFn: fetchTeacherSelfClasses,
    enabled: canView,
  });

  const columns = useMemo<TableColumn<TeacherClassRow>[]>(
    () => [
      {
        key: 'classCode',
        header: MSG_SELF.CLASS_CODE,
        width: pixel(140),
        renderCell: (row) => (
          <AppLink to={`/dao-tao/lop-hoc-cua-toi/${row.id}`} weight="medium">
            {row.classCode || row.id}
          </AppLink>
        ),
      },
      {
        key: 'name',
        header: MSG_SELF.CLASS_NAME,
        width: pixel(180),
        renderCell: (row) => row.name || '—',
      },
      {
        key: 'status',
        header: MSG_SELF.STATUS,
        width: pixel(160),
        renderCell: (row) =>
          row.status ? (
            <Badge
              variant={CLASS_STATUS_BADGE[row.status] ?? 'neutral'}
              label={labelOf(CLASS_STATUS_LABEL, row.status)}
            />
          ) : (
            '—'
          ),
      },
      {
        key: 'closeLabel',
        header: MSG_SELF.CLOSE_STATE,
        width: pixel(170),
        renderCell: (row) => <Text type="body">{row.closeLabel || '—'}</Text>,
      },
      {
        key: 'needsReassignment',
        header: MSG_SELF.NEEDS_REASSIGNMENT,
        width: pixel(180),
        renderCell: (row) =>
          row.needsReassignment ? (
            <Badge variant="warning" label={MSG_SELF.NEEDS_REASSIGNMENT} />
          ) : (
            <Text type="supporting">—</Text>
          ),
      },
    ],
    [],
  );

  if (!canView) return <ForbiddenNotice />;
  if (classesQuery.isLoading) return <PageLoading />;

  if (classesQuery.isError) {
    if (isForbiddenError(classesQuery.error)) return <ForbiddenNotice />;
    return (
      <Banner
        status="error"
        title={MSG_SELF.TEACHER_CLASSES_LOAD_ERROR}
        description={sprint4ErrorMessage(classesQuery.error)}
        collapsible={false}
        role="alert"
        endContent={
          <HStack gap={2}>
            <Button
              variant="secondary"
              size="sm"
              label={MSG_SELF.RETRY}
              onClick={() => void classesQuery.refetch()}
            />
          </HStack>
        }
      />
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_SELF.MY_CLASSES} subtitle={MSG_SELF.MY_CLASSES_HINT} />
      <DetailSection title={MSG_SELF.MY_CLASSES_SECTION}>
        <Table<TeacherClassRow>
          data={(classesQuery.data ?? []) as TeacherClassRow[]}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          emptyState={<EmptyState compact description={MSG_SELF.TEACHER_CLASSES_EMPTY} />}
        />
      </DetailSection>
    </Stack>
  );
}
