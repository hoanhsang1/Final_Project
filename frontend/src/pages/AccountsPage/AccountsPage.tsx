import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { SelectProps, TableProps } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountCreateModal from '../../components/AccountCreateModal/AccountCreateModal';
import {
  AdminApiError,
  createAccount,
  fetchOrganizationOptions,
} from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import { MSG_ACC, MSG_ORG, msgBackendPending } from '../../features/admin/adminMessages';
import { ROLE_OPTIONS, roleLabel } from '../../features/admin/roleLabels';
import { accountStatusLabel } from '../../features/admin/statusLabels';
import type { AccountCreatePayload, AccountItem } from '../../features/admin/types';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, useAccountsPage } from './use-accounts';

const { Text, Title } = Typography;

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-24';

/** Giá trị hiển thị khi BE chưa trả. */
const EMPTY_VALUE = '—';

/** Lựa chọn bộ lọc trạng thái — giá trị là ENUM `account.status`. */
const STATUS_OPTIONS: SelectProps['options'] = [
  { value: '', label: MSG_ACC.ALL_STATUSES },
  { value: 'pending', label: accountStatusLabel('pending').label },
  { value: 'active', label: accountStatusLabel('active').label },
  { value: 'locked', label: accountStatusLabel('locked').label },
  { value: 'disabled', label: accountStatusLabel('disabled').label },
];

/** Lựa chọn bộ lọc vai trò — giá trị là **role backend gốc** (`account.role`). */
const ROLE_FILTER_OPTIONS: SelectProps['options'] = [
  { value: '', label: MSG_ACC.ALL_ROLES },
  ...ROLE_OPTIONS,
];

/** Định dạng ngày giờ; trả về "—" khi BE chưa trả. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn Quản lý tài khoản `/quan-tri/tai-khoan` (`UC-19`).
 *
 * ⚠️ Endpoint `GET /api/v1/accounts` (`D-24`) CHƯA có ở BE → tới khi Sang làm
 * xong, màn hiện "Tính năng đang chờ backend" (§4.5), KHÔNG hiện Empty rỗng.
 *
 * Đổi trạng thái tài khoản nằm ở màn **chi tiết** — màn này giữ vai trò liệt kê
 * + lọc + tìm kiếm + **tạo tài khoản** (`D-29`), bấm 1 dòng → chi tiết (`/:id`).
 *
 * Trạng thái: **loading** · **empty** · **error** · **success**. No-permission
 * do `AdminGuard` chặn trước.
 */
export default function AccountsPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { result, page, size, keyword, status, organizationId, role, sort, updateParams } =
    useAccountsPage();

  // Dropdown "Tổ chức" (`D-20b`) — query riêng, lỗi KHÔNG chặn màn (chỉ mất
  // lựa chọn lọc; bảng vẫn hiện bình thường).
  const orgOptionsQuery = useQuery({
    queryKey: adminKeys.options,
    queryFn: fetchOrganizationOptions,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const orgFilterOptions: SelectProps['options'] = [
    { value: '', label: MSG_ACC.ALL_ORGS },
    ...(orgOptionsQuery.data ?? []).map((option) => ({
      value: option.id,
      label: option.name,
    })),
  ];

  // Modal tạo tài khoản (`D-29`) — lỗi hiện TRONG modal, không toast (NFR-REL-001).
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const createMutation = useMutation({
    mutationFn: (payload: AccountCreatePayload) => createAccount(payload),
    onSuccess: () => {
      message.success(MSG_ACC.CREATE_SUCCESS);
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Tạo tài khoản cũng ghi nhật ký hệ thống (`D-22`).
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      const status = error instanceof AdminApiError ? error.status : null;
      if (status === 409) {
        setCreateError(MSG_ACC.DUPLICATE);
      } else if (status === 403) {
        setCreateError(MSG_ORG.FORBIDDEN);
      } else if (status === 404) {
        setCreateError(msgBackendPending('D-29'));
      } else {
        setCreateError(MSG_ACC.CREATE_FAILED);
      }
    },
  });

  const columns = useMemo<TableProps<AccountItem>['columns']>(() => {
    // Sorter điều khiển từ URL (?sort=username,asc) để mũi tên bảng luôn khớp
    // thứ tự đang thực sự áp dụng sau khi reload trang.
    const [sortField, sortDirection] = (sort ?? '').split(',');
    const sortOrderFor = (key: string) =>
      sortField === key ? (sortDirection === 'desc' ? 'descend' : 'ascend') : null;

    return [
      {
        title: 'Tên đăng nhập',
        dataIndex: 'username',
        key: 'username',
        sorter: true,
        sortOrder: sortOrderFor('username'),
        fixed: 'left',
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        render: (value?: string) => value || EMPTY_VALUE,
      },
      {
        title: MSG_ACC.FULL_NAME,
        dataIndex: 'full_name',
        key: 'full_name',
        render: (value?: string | null) => value || EMPTY_VALUE,
      },
      {
        title: MSG_ACC.ORGANIZATION,
        dataIndex: 'organization_name',
        key: 'organization_name',
        render: (value?: string | null) => value || EMPTY_VALUE,
      },
      {
        title: MSG_ACC.ROLE,
        dataIndex: 'role',
        key: 'role',
        render: (value: string) => roleLabel(value),
      },
      {
        title: MSG_ACC.FILTER_STATUS,
        dataIndex: 'status',
        key: 'status',
        // BR-08: Tag LUÔN kèm chữ, không chỉ màu.
        render: (value: string) => {
          const statusLabel = accountStatusLabel(value);
          return <Tag color={statusLabel.color}>{statusLabel.label}</Tag>;
        },
      },
      {
        title: MSG_ACC.CREATED_AT,
        dataIndex: 'created_at',
        key: 'created_at',
        sorter: true,
        sortOrder: sortOrderFor('created_at'),
        render: (value?: string | null) => formatDateTime(value),
      },
      {
        title: MSG_ACC.LAST_LOGIN,
        dataIndex: 'last_login_at',
        key: 'last_login_at',
        render: (value?: string | null) => formatDateTime(value),
      },
      {
        title: 'Hành động',
        key: 'action',
        fixed: 'right',
        render: (_value, record) => (
          <Button
            type="link"
            aria-label={`Xem chi tiết tài khoản ${record.username}`}
            onClick={() => navigate(`/quan-tri/tai-khoan/${record.id}?from=tai-khoan`)}
          >
            {MSG_ORG.VIEW}
          </Button>
        ),
      },
    ];
  }, [navigate, sort]);

  const handleTableChange: TableProps<AccountItem>['onChange'] = (pag, _filters, sorter) => {
    const single = Array.isArray(sorter) ? sorter[0] : sorter;
    const field = single?.field ? String(single.field) : null;
    const order = single?.order;

    updateParams(
      {
        page: pag.current && pag.current > 1 ? String(pag.current) : null,
        size: pag.pageSize && pag.pageSize !== DEFAULT_PAGE_SIZE ? String(pag.pageSize) : null,
        sort: field && order ? `${field},${order === 'ascend' ? 'asc' : 'desc'}` : null,
      },
      { resetPage: false },
    );
  };

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend".
  const isEndpointMissing =
    result.isError && result.error instanceof AdminApiError && result.error.status === 404;

  const header = (
    <div>
      <Title level={1} style={{ margin: 0 }}>
        {MSG_ACC.LIST_TITLE}
      </Title>
      <Text type="secondary">{MSG_ACC.LIST_SUBTITLE}</Text>
    </div>
  );

  if (isEndpointMissing) {
    return (
      <Flex vertical gap={token.marginMD}>
        {header}
        <Alert
          type="info"
          showIcon
          role="status"
          message={msgBackendPending(ENDPOINT_CODE)}
          description="Backend cần thêm endpoint GET /api/v1/accounts để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
          action={
            <Button onClick={() => void result.refetch()} loading={result.isFetching}>
              Thử lại
            </Button>
          }
        />
      </Flex>
    );
  }

  if (result.isError) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_ACC.LOAD_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
        action={
          <Button onClick={() => void result.refetch()} loading={result.isFetching}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={token.marginMD}>
      <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap>
        {header}
        <Button
          type="primary"
          onClick={() => {
            setCreateError(null);
            setCreateOpen(true);
          }}
        >
          {MSG_ACC.CREATE_TITLE}
        </Button>
      </Flex>

      <Flex gap={token.marginSM} wrap>
        <Input.Search
          allowClear
          aria-label={MSG_ACC.SEARCH}
          placeholder="Tìm theo tên đăng nhập, email hoặc họ tên"
          defaultValue={keyword}
          onSearch={(value) => updateParams({ q: value.trim() || null })}
          style={{ maxWidth: 320 }}
        />
        <Select
          aria-label={MSG_ACC.FILTER_ORG}
          value={organizationId ?? ''}
          options={orgFilterOptions}
          loading={orgOptionsQuery.isFetching}
          style={{ minWidth: 200 }}
          onChange={(value) => updateParams({ organizationId: value || null })}
        />
        <Select
          aria-label={MSG_ACC.FILTER_ROLE}
          value={role ?? ''}
          options={ROLE_FILTER_OPTIONS}
          style={{ minWidth: 180 }}
          onChange={(value) => updateParams({ role: value || null })}
        />
        <Select
          aria-label={MSG_ACC.FILTER_STATUS}
          value={status?.[0] ?? ''}
          options={STATUS_OPTIONS}
          style={{ minWidth: 170 }}
          onChange={(value) => updateParams({ status: value || null })}
        />
      </Flex>

      {result.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Table<AccountItem>
          rowKey="id"
          columns={columns}
          dataSource={result.data?.items ?? []}
          loading={result.isFetching}
          locale={{
            emptyText: <Empty description={MSG_ACC.EMPTY} />,
          }}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: size,
            total: result.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total) => `Tổng ${total} tài khoản`,
          }}
          // Ở 320px bảng cuộn ngang thay vì vỡ layout.
          scroll={{ x: 1140 }}
        />
      )}

      <AccountCreateModal
        open={createOpen}
        // Danh sách tổ chức THẬT từ query (bỏ lựa chọn "Tất cả tổ chức").
        orgOptions={(orgOptionsQuery.data ?? []).map((option) => ({
          value: option.id,
          label: option.name,
        }))}
        loading={createMutation.isPending}
        error={createError}
        onCancel={() => setCreateOpen(false)}
        onConfirm={(payload) => createMutation.mutate(payload)}
      />
    </Flex>
  );
}
