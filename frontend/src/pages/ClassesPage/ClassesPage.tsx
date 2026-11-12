import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Flex, Input, Select, Table, Tag, Typography, theme } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import { canViewClasses, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_LABEL,
  CLASS_STATUS_TAG,
  CLOSE_STATE_LABEL,
  CLOSE_STATE_TAG,
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_CLASS, MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { fetchClasses, sprint4ErrorMessage } from '../../features/sprint4/sprint4Api';
import type { ClassListItem, ClassStatus } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

/** §7 — 4 trạng thái lọc của lớp. */
const STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: 'CHUA_BAT_DAU', label: CLASS_STATUS_LABEL.CHUA_BAT_DAU },
  { value: 'DANG_DIEN_RA', label: CLASS_STATUS_LABEL.DANG_DIEN_RA },
  { value: 'DA_KET_THUC', label: CLASS_STATUS_LABEL.DA_KET_THUC },
  { value: 'DA_HUY', label: CLASS_STATUS_LABEL.DA_HUY },
];

/**
 * Màn 5 — danh sách lớp học (§6.1).
 *
 * - Lọc `q` + `status` (4 giá trị mới), phân trang `page`/`size`.
 * - `status` và `closeState` là hai trục độc lập: cột trạng thái đóng ẩn khi
 *   `NONE` để bảng không nhiễu.
 * - 5 state: loading / empty / error / success / không có quyền.
 */
export default function ClassesPage() {
  const { token } = theme.useToken();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewClasses(isOwner, permissions);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [status, setStatus] = useState<ClassStatus | undefined>();

  const listQuery = useQuery({
    queryKey: ['classes', { page, size, keyword, status }],
    queryFn: () =>
      fetchClasses({
        page,
        size,
        q: keyword || undefined,
        status,
      }),
    enabled: canView,
  });

  const columns = useMemo<ColumnsType<ClassListItem>>(
    () => [
      {
        title: 'Mã lớp',
        dataIndex: 'classCode',
        width: 130,
        render: (value: string | null | undefined, record) => (
          <Link to={`/dao-tao/lop-hoc/${record.id}`}>{value || record.id}</Link>
        ),
      },
      {
        title: 'Tên lớp',
        dataIndex: 'name',
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Năm học',
        dataIndex: 'academicYear',
        width: 130,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Thời gian',
        key: 'period',
        width: 210,
        render: (_, record) => formatPeriod(record.startDate, record.endDate),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 150,
        render: (value: string | null | undefined) =>
          value ? (
            <Tag color={CLASS_STATUS_TAG[value]}>{labelOf(CLASS_STATUS_LABEL, value)}</Tag>
          ) : (
            '—'
          ),
      },
      {
        title: 'Đóng lớp',
        dataIndex: 'closeState',
        width: 160,
        // §7 — `NONE` không hiển thị; chỉ PENDING/CLOSED mới có nhãn.
        render: (value: string | null | undefined) =>
          value && value !== 'NONE' ? (
            <Tag color={CLOSE_STATE_TAG[value]}>{labelOf(CLOSE_STATE_LABEL, value)}</Tag>
          ) : null,
      },
      {
        title: 'Giáo viên',
        key: 'teacher',
        width: 220,
        render: (_, record) =>
          record.teacher?.fullName ? (
            record.teacher.fullName
          ) : (
            <Text type="secondary">{MSG_CLASS.TEACHER_UNASSIGNED}</Text>
          ),
      },
      {
        title: 'Sĩ số',
        dataIndex: 'studentCount',
        width: 90,
        align: 'right',
        render: (value: number | null | undefined) => (value == null ? '—' : value),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 120,
        render: (_, record) => <Link to={`/dao-tao/lop-hoc/${record.id}`}>Xem chi tiết</Link>,
      },
    ],
    [],
  );

  const onTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setSize(pagination.pageSize);
  };

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader title={MSG_CLASS.TITLE}>
        {canView ? (
          <Flex gap={token.marginSM} wrap="wrap" style={{ marginTop: token.marginXS }}>
            <Select<ClassStatus>
              allowClear
              aria-label={MSG_CLASS.STATUS_ALL}
              placeholder={MSG_CLASS.STATUS_ALL}
              options={STATUS_OPTIONS}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              style={{ minWidth: 200 }}
            />
            <Input.Search
              allowClear
              aria-label={MSG_CLASS.SEARCH_LABEL}
              placeholder={MSG_CLASS.SEARCH_LABEL}
              value={keywordInput}
              onChange={(event) => {
                const next = event.target.value;
                setKeywordInput(next);
                // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                if (next === '') {
                  setKeyword('');
                  setPage(1);
                }
              }}
              onSearch={(value) => {
                setKeyword(value);
                setPage(1);
              }}
              style={{ width: 300 }}
            />
          </Flex>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_CLASS.LIST_LOAD_ERROR}
          description={sprint4ErrorMessage(listQuery.error)}
          action={
            <Button size="small" onClick={() => listQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : (
        <Table<ClassListItem>
          rowKey="id"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          locale={{ emptyText: <Empty description={MSG_CLASS.EMPTY} /> }}
          onChange={onTableChange}
          pagination={{
            current: listQuery.data?.page ?? page,
            pageSize: listQuery.data?.size ?? size,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} lớp`,
          }}
          scroll={{ x: 1240 }}
        />
      )}
    </Flex>
  );
}
