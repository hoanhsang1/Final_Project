import { Alert, App, Button, Empty, Flex, Input, Select, Skeleton, Table, Tag, Typography, theme } from 'antd';
import type { SelectProps, TableProps } from 'antd';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuspendOrganizationModal from '../../components/SuspendOrganizationModal/SuspendOrganizationModal';
import { AdminApiError } from '../../features/admin/adminApi';
import { MSG_ORG, msgBackendPending, msgReactivated, msgSuspended } from '../../features/admin/adminMessages';
import {
  organizationStatusLabel,
  orgTypeLabel,
} from '../../features/admin/statusLabels';
import { useSuspendOrganization } from '../../features/admin/use-suspend-organization';
import type { OrganizationAction } from '../../features/admin/use-suspend-organization';
import type { OrganizationListItem } from '../../features/admin/types';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  useAllOrganizationsPage,
} from './use-all-organizations';

const { Text, Title } = Typography;

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-20';

/** Giá trị hiển thị khi BE chưa trả (`D-19`). */
const EMPTY_VALUE = '—';

/** Lựa chọn bộ lọc trạng thái — giá trị là ENUM `organization.status`. */
const STATUS_OPTIONS: SelectProps['options'] = [
  { value: '', label: MSG_ORG.ALL_STATUSES },
  { value: 'pending', label: organizationStatusLabel('pending').label },
  { value: 'active', label: organizationStatusLabel('active').label },
  { value: 'rejected', label: organizationStatusLabel('rejected').label },
  { value: 'suspended', label: organizationStatusLabel('suspended').label },
];

/** Lựa chọn bộ lọc loại tổ chức — giá trị là ENUM `organization.org_type`. */
const TYPE_OPTIONS: SelectProps['options'] = [
  { value: '', label: MSG_ORG.ALL_TYPES },
  { value: 'school', label: orgTypeLabel('school') },
  { value: 'center', label: orgTypeLabel('center') },
];

/** Định dạng ngày giờ; trả về "—" khi BE chưa trả (`D-19`). */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn Tất cả tổ chức `/quan-tri/to-chuc/tat-ca`.
 *
 * ⚠️ Endpoint `GET /api/v1/organizations` (`D-20`) CHƯA có ở BE → tới khi Sang
 * làm xong, màn này hiện "Tính năng đang chờ backend" (xem §4.5 của đặc tả),
 * KHÔNG hiện Empty rỗng để tránh hiểu nhầm là không có tổ chức nào.
 *
 * Trạng thái: **loading** (Skeleton) · **empty** (Empty) · **error** (Alert +
 * Thử lại) · **success**. No-permission do `AdminGuard` chặn trước.
 */
export default function AllOrganizationsPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { result, page, size, keyword, status, orgType, sort, updateParams } =
    useAllOrganizationsPage();

  const [suspendTarget, setSuspendTarget] = useState<OrganizationListItem | null>(null);
  const [suspendAction, setSuspendAction] = useState<OrganizationAction>('suspend');
  /**
   * Lỗi của thao tác vô hiệu hoá / kích hoạt lại gần nhất.
   *
   * Chuyển từ `message.error` (toast tự biến mất, bị modal che) sang `Alert`
   * để người dùng đọc được lý do thất bại và bấm thử lại (NFR-REL-001).
   */
  const [actionError, setActionError] = useState<string | null>(null);

  const suspendMutation = useSuspendOrganization(suspendTarget?.id ?? '');

  const handleSuspendError = (error: unknown) => {
    const httpStatus = error instanceof AdminApiError ? error.status : null;
    if (httpStatus === 404) {
      setActionError(msgBackendPending(ENDPOINT_CODE));
      return;
    }
    if (httpStatus === 403) {
      setActionError(MSG_ORG.FORBIDDEN);
      return;
    }
    // NFR-REL-001: lỗi/timeout thì báo lỗi rõ, KHÔNG hiện thành công.
    setActionError(MSG_ORG.SAVE_FAILED);
  };

  const columns = useMemo<TableProps<OrganizationListItem>['columns']>(() => {
    // Sorter điều khiển từ URL (`?sort=name,asc`) để mũi tên bảng luôn khớp
    // với thứ tự đang thực sự áp dụng (không lệch sau khi reload trang).
    const [sortField, sortDirection] = (sort ?? '').split(',');
    const sortOrderFor = (key: string) =>
      sortField === key ? (sortDirection === 'desc' ? 'descend' : 'ascend') : null;

    return [
      {
        title: 'Tên tổ chức',
        dataIndex: 'name',
        key: 'name',
        sorter: true,
        sortOrder: sortOrderFor('name'),
      },
      {
        title: MSG_ORG.FILTER_TYPE,
        dataIndex: 'org_type',
        key: 'org_type',
        render: (value: string) => orgTypeLabel(value),
      },
      { title: 'Người đại diện', dataIndex: 'owner_username', key: 'owner_username' },
      { title: 'Email', dataIndex: 'owner_email', key: 'owner_email' },
      {
        title: MSG_ORG.FILTER_STATUS,
        dataIndex: 'status',
        key: 'status',
        // BR-08: Tag LUÔN kèm chữ, không chỉ màu.
        render: (value: string) => {
          const statusLabel = organizationStatusLabel(value);
          return <Tag color={statusLabel.color}>{statusLabel.label}</Tag>;
        },
      },
      {
        title: 'Ngày gửi',
        dataIndex: 'created_at',
        key: 'created_at',
        sorter: true,
        sortOrder: sortOrderFor('created_at'),
        render: (value: string | null) => formatDateTime(value),
      },
      {
        title: 'Hành động',
        key: 'action',
        render: (_value, record) => {
          // Ma trận đặc tả §3.3: `pending` → chỉ Duyệt/Từ chối ở màn chi tiết;
          // `active`/`rejected` → Vô hiệu hoá; `suspended` → Kích hoạt lại.
          const nextAction: OrganizationAction | null =
            record.status === 'suspended' ? 'reactivate' : record.status === 'pending' ? null : 'suspend';
          const nextLabel =
            nextAction === 'suspend' ? MSG_ORG.SUSPEND : MSG_ORG.REACTIVATE;

          return (
            <Flex gap={token.marginXS} wrap>
              <Button
                type="link"
                aria-label={`Xem chi tiết tổ chức ${record.name}`}
                onClick={() => navigate(`/quan-tri/to-chuc/${record.id}?from=to-chuc-tat-ca`)}
              >
                {MSG_ORG.VIEW}
              </Button>
              {nextAction && (
                <Button
                  type="link"
                  danger={nextAction === 'suspend'}
                  aria-label={`${nextLabel} tổ chức ${record.name}`}
                  onClick={() => {
                    setActionError(null);
                    setSuspendTarget(record);
                    setSuspendAction(nextAction);
                  }}
                >
                  {nextLabel}
                </Button>
              )}
            </Flex>
          );
        },
      },
    ];
  }, [navigate, token.marginXS, sort]);

  const handleTableChange: TableProps<OrganizationListItem>['onChange'] = (
    pag,
    _filters,
    sorter,
  ) => {
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

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend", KHÔNG hiện Empty.
  const isEndpointMissing =
    result.isError &&
    result.error instanceof AdminApiError &&
    result.error.status === 404;

  if (isEndpointMissing) {
    return (
      <Flex vertical gap={token.marginMD}>
        <div>
          <Title level={1} style={{ margin: 0 }}>
            {MSG_ORG.ALL_LIST_TITLE}
          </Title>
          <Text type="secondary">{MSG_ORG.ALL_LIST_SUBTITLE}</Text>
        </div>
        <Alert
          type="info"
          showIcon
          role="status"
          message={msgBackendPending(ENDPOINT_CODE)}
          description="Backend cần thêm endpoint GET /api/v1/organizations để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
          action={
            <Button onClick={() => void result.refetch()} loading={result.isFetching}>
              {MSG_ORG.RETRY}
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
        message={MSG_ORG.LOAD_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
        action={
          <Button onClick={() => void result.refetch()} loading={result.isFetching}>
            {MSG_ORG.RETRY}
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={token.marginMD}>
      <div>
        <Title level={1} style={{ margin: 0 }}>
          {MSG_ORG.ALL_LIST_TITLE}
        </Title>
        <Text type="secondary">{MSG_ORG.ALL_LIST_SUBTITLE}</Text>
      </div>

      {/* Lỗi thao tác — hiện khi modal đã đóng; khi modal còn mở thì lỗi nằm
          trong modal (Alert chồng lên bảng thì người dùng không thấy). */}
      {actionError && suspendTarget === null && (
        <Alert type="error" showIcon role="alert" message={actionError} />
      )}

      <Flex gap={token.marginSM} wrap>
        <Input.Search
          allowClear
          aria-label={MSG_ORG.SEARCH}
          placeholder="Tìm theo tên tổ chức hoặc email"
          defaultValue={keyword}
          onSearch={(value) => updateParams({ q: value.trim() || null })}
          style={{ maxWidth: 320 }}
        />
        <Select
          aria-label={MSG_ORG.FILTER_STATUS}
          value={status?.[0] ?? ''}
          options={STATUS_OPTIONS}
          style={{ minWidth: 170 }}
          onChange={(value) => updateParams({ status: value || null })}
        />
        <Select
          aria-label={MSG_ORG.FILTER_TYPE}
          value={orgType ?? ''}
          options={TYPE_OPTIONS}
          style={{ minWidth: 150 }}
          onChange={(value) => updateParams({ orgType: value || null })}
        />
      </Flex>

      {result.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Table<OrganizationListItem>
          rowKey="id"
          columns={columns}
          dataSource={result.data?.items ?? []}
          loading={result.isFetching}
          locale={{ emptyText: <Empty description={MSG_ORG.ALL_EMPTY} /> }}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: size,
            total: result.data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total) => `Tổng ${total} tổ chức`,
          }}
          // Ở 320px bảng cuộn ngang thay vì vỡ layout.
          scroll={{ x: 980 }}
        />
      )}

      <SuspendOrganizationModal
        open={suspendTarget !== null}
        mode={suspendAction}
        orgName={suspendTarget?.name ?? ''}
        loading={suspendMutation.isPending}
        error={actionError}
        onCancel={() => setSuspendTarget(null)}
        onConfirm={(reason) =>
          suspendMutation.mutate(
            { action: suspendAction, reason },
            {
              onSuccess: () => {
                message.success(
                  suspendAction === 'suspend'
                    ? msgSuspended(suspendTarget?.name ?? '')
                    : msgReactivated(suspendTarget?.name ?? ''),
                );
                setActionError(null);
                setSuspendTarget(null);
              },
              onError: handleSuspendError,
            },
          )
        }
      />
    </Flex>
  );
}
