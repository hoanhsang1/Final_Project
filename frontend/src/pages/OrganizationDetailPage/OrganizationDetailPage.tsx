import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Result,
  Skeleton,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { TableProps } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AdminApiError, approveOrganization, rejectOrganization } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import { MSG_ORG, msgApproved, msgRejected } from '../../features/admin/adminMessages';
import {
  accountStatusLabel,
  isPendingStatus,
  organizationStatusLabel,
  orgTypeLabel,
} from '../../features/admin/statusLabels';
import type { OrganizationOwner } from '../../features/admin/types';
import ApproveOrganizationModal from './ApproveOrganizationModal';
import ModuleConfigPanel from './ModuleConfigPanel';
import RejectOrganizationModal from './RejectOrganizationModal';
import { useOrganizationDetail } from './use-organization-detail';

const { Title } = Typography;

/** Giá trị hiển thị khi BE chưa trả dữ liệu — không để trống trơn, không hiện `undefined` (`TC-ORG-25`). */
const EMPTY_VALUE = '—';

/** Định dạng ngày giờ; trả về "—" khi BE chưa trả (`D-19`). */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn chi tiết tổ chức — `UC-ORG-02` (Đặc tả Sprint 2 §3.3).
 *
 * Ba khối: thông tin tổ chức · người đại diện · module đã đăng ký.
 * Thanh hành động: Duyệt / Từ chối (chỉ khi còn `pending`) + quay lại danh sách.
 */
export default function OrganizationDetailPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id = '' } = useParams<{ id: string }>();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const detailQuery = useOrganizationDetail(id);

  const orgName = detailQuery.data?.organization.name ?? '';
  const moduleCount = detailQuery.data?.modules.length ?? 0;
  // So sánh không phân biệt hoa/thường — BE trả chữ thường nhưng `docs/api.md` có sai lệch (`D-08`).
  const isPendingOrg = isPendingStatus(detailQuery.data?.organization.status);

  /** Xử lý lỗi chung cho duyệt / từ chối — `NFR-REL-001`: lỗi KHÔNG báo thành công. */
  const handleMutationError = (error: unknown) => {
    const status = error instanceof AdminApiError ? error.status : null;

    if (status === 409) {
      // Tổ chức đã được xử lý ở tab/máy khác → đóng modal, tải lại danh sách + chi tiết
      // (nếu không invalidate detail thì nút "Duyệt"/"Từ chối" còn hiện → bấm lại mới 409).
      message.warning(MSG_ORG.ALREADY_REVIEWED);
      setApproveOpen(false);
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      return;
    }
    if (status === 404) {
      message.error(MSG_ORG.NOT_FOUND);
      setApproveOpen(false);
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      return;
    }
    if (status === 403) {
      message.error(MSG_ORG.FORBIDDEN);
      return;
    }
    // Lỗi mạng / timeout / lỗi lạ: giữ modal mở, KHÔNG điều hướng.
    message.error(MSG_ORG.SAVE_FAILED);
  };

  const approveMutation = useMutation({
    mutationFn: () => approveOrganization(id),
    onSuccess: () => {
      message.success(msgApproved(orgName));
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      setApproveOpen(false);
      navigate('/quan-tri/to-chuc');
    },
    onError: handleMutationError,
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectOrganization(id, reason),
    onSuccess: () => {
      message.success(msgRejected(orgName));
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      setRejectOpen(false);
      navigate('/quan-tri/to-chuc');
    },
    onError: handleMutationError,
  });

  const ownerColumns: TableProps<OrganizationOwner>['columns'] = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Trạng thái tài khoản',
      dataIndex: 'status',
      key: 'status',
      // BR-08: Tag luôn kèm CHỮ.
      render: (value: string) => {
        const status = accountStatusLabel(value);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
  ];

  if (detailQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  if (detailQuery.isError) {
    const status = detailQuery.error instanceof AdminApiError ? detailQuery.error.status : null;
    if (status === 404) {
      return (
        <Result
          status="404"
          title={MSG_ORG.NOT_FOUND}
          subTitle="Tổ chức không tồn tại hoặc đã bị gỡ khỏi hệ thống."
          extra={
            <Button type="primary" onClick={() => navigate('/quan-tri/to-chuc')}>
              {MSG_ORG.BACK_TO_LIST}
            </Button>
          }
        />
      );
    }
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_ORG.DETAIL_ERROR}
        action={
          <Button onClick={() => detailQuery.refetch()} loading={detailQuery.isFetching}>
            {MSG_ORG.RETRY}
          </Button>
        }
      />
    );
  }

  const { organization, owners, modules } = detailQuery.data;
  const orgStatus = organizationStatusLabel(organization.status);

  return (
    <Flex vertical gap={token.marginLG}>
      <Breadcrumb
        items={[
          { title: <Link to="/quan-tri/to-chuc">{MSG_ORG.LIST_TITLE}</Link> },
          { title: organization.name },
        ]}
      />

      <Flex justify="space-between" align="center" wrap gap={token.margin}>
        <Flex align="center" gap={token.marginSM} wrap>
          <Title level={2} style={{ margin: 0 }}>
            {organization.name}
          </Title>
          <Tag color={orgStatus.color}>{orgStatus.label}</Tag>
        </Flex>

        <Flex align="center" gap={token.marginSM} wrap>
          {isPendingOrg ? (
            <>
              <Button type="primary" onClick={() => setApproveOpen(true)}>
                {MSG_ORG.APPROVE_TITLE}
              </Button>
              <Button danger onClick={() => setRejectOpen(true)}>
                {MSG_ORG.REJECT_TITLE}
              </Button>
            </>
          ) : (
            <Alert type="info" showIcon message={MSG_ORG.ALREADY_REVIEWED} />
          )}
          <Link to="/quan-tri/to-chuc">{MSG_ORG.BACK_TO_LIST}</Link>
        </Flex>
      </Flex>

      {/* Khối 1 — Thông tin tổ chức */}
      <Card title={MSG_ORG.INFO}>
        <Descriptions
          size="small"
          bordered
          column={{ xs: 1, sm: 2 }}
          items={[
            { key: 'name', label: 'Tên tổ chức', children: organization.name },
            { key: 'type', label: 'Loại', children: orgTypeLabel(organization.org_type) },
            {
              key: 'status',
              label: 'Trạng thái',
              children: <Tag color={orgStatus.color}>{orgStatus.label}</Tag>,
            },
            {
              key: 'created_at',
              label: 'Ngày gửi đăng ký',
              // `D-19` — BE chưa trả, hiện "—" thay vì bỏ trống.
              children: formatDateTime(organization.created_at),
            },
            {
              key: 'contact_email',
              label: 'Email liên hệ',
              // `D-11` + `D-19` — BE chưa lưu/trả.
              children: organization.contact_email || EMPTY_VALUE,
            },
            {
              key: 'contact_phone',
              label: 'Số điện thoại',
              children: organization.contact_phone || EMPTY_VALUE,
            },
            {
              key: 'rejection_reason',
              label: 'Lý do từ chối',
              // Lý do do người khác nhập ⇒ render TEXT THUẦN, không dangerouslySetInnerHTML.
              children: organization.rejection_reason || EMPTY_VALUE,
            },
          ]}
        />
      </Card>

      {/* Khối 2 — Người đại diện */}
      <Card title={MSG_ORG.OWNERS}>
        <Table<OrganizationOwner>
          rowKey="id"
          size="small"
          columns={ownerColumns}
          dataSource={owners}
          pagination={false}
          locale={{ emptyText: <Empty description="Chưa có người đại diện" /> }}
          scroll={{ x: 520 }}
        />
      </Card>

      {/* Khối 3 — Module đã đăng ký + cấu hình module */}
      <ModuleConfigPanel orgId={organization.id} modules={modules} editable={isPendingOrg} />

      <ApproveOrganizationModal
        open={approveOpen}
        orgName={organization.name}
        moduleCount={moduleCount}
        loading={approveMutation.isPending}
        onCancel={() => setApproveOpen(false)}
        onConfirm={() => approveMutation.mutate()}
      />

      <RejectOrganizationModal
        open={rejectOpen}
        orgName={organization.name}
        loading={rejectMutation.isPending}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
      />
    </Flex>
  );
}
