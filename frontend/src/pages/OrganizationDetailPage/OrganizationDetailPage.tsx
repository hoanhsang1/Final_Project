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
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import SuspendOrganizationModal from '../../components/SuspendOrganizationModal/SuspendOrganizationModal';
import {
  AdminApiError,
  approveOrganization,
  rejectOrganization,
} from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import { MSG_ORG, msgApproved, msgBackendPending, msgRejected, msgReactivated, msgSuspended } from '../../features/admin/adminMessages';
import { backToListPath } from '../../features/admin/consoleMenu';
import {
  accountStatusLabel,
  isPendingStatus,
  organizationStatusLabel,
  orgTypeLabel,
} from '../../features/admin/statusLabels';
import { useSuspendOrganization } from '../../features/admin/use-suspend-organization';
import type { OrganizationAction } from '../../features/admin/use-suspend-organization';
import type { OrganizationOwner, OrgStatus } from '../../features/admin/types';
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
  const location = useLocation();
  const queryClient = useQueryClient();
  const { id = '' } = useParams<{ id: string }>();

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendAction, setSuspendAction] = useState<OrganizationAction | null>(null);
  /**
   * Lỗi của thao tác cuối (duyệt / từ chối / vô hiệu hoá).
   *
   * `NFR-REL-001`: lỗi hoặc timeout KHÔNG được hiện thành công. Hiển thị bằng
   * `Alert` thay cho toast — toast tự biến mất và bị modal che nên người dùng
   * không đọc được lý do thất bại.
   */
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal đang mở thì lỗi phải nằm TRONG modal; modal đã đóng (404/409) thì lỗi
  // hiện ở trang — tránh cùng một câu xuất hiện 2 lần trong DOM.
  const isAnyModalOpen = approveOpen || rejectOpen || suspendAction !== null;

  /**
   * Đường về danh sách — đọc `?from=` để quay về đúng nhóm mà Admin đã tới:
   * tới từ "Tất cả tổ chức" → về đó, không thì về "Tổ chức chờ duyệt".
   * Áp dụng cho breadcrumb, link "Quay lại" và CẢ sau khi duyệt/từ chối xong.
   */
  const backPath = backToListPath(location.search, '/quan-tri/to-chuc');

  const detailQuery = useOrganizationDetail(id);
  const suspendMutation = useSuspendOrganization(id);

  const orgName = detailQuery.data?.organization.name ?? '';
  const moduleCount = detailQuery.data?.modules.length ?? 0;
  // So sánh không phân biệt hoa/thường — BE trả chữ thường nhưng `docs/api.md` có sai lệch (`D-08`).
  const isPendingOrg = isPendingStatus(detailQuery.data?.organization.status);
  const currentStatus: OrgStatus = detailQuery.data?.organization.status ?? 'pending';

  // Ma trận đặc tả §3.3 — nút trạng thái tổ chức.
  // `pending` → Duyệt/Từ chối · `active`/`rejected` → Vô hiệu hoá · `suspended` → Kích hoạt lại.
  const nextSuspendAction: OrganizationAction | null =
    currentStatus === 'suspended' ? 'reactivate' : currentStatus === 'pending' ? null : 'suspend';
  const nextSuspendLabel =
    nextSuspendAction === 'suspend' ? MSG_ORG.SUSPEND : MSG_ORG.REACTIVATE;

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
      // Modal đóng → lỗi hiện ở trang (Alert phía trên nội dung).
      setActionError(MSG_ORG.NOT_FOUND);
      setApproveOpen(false);
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      return;
    }
    if (status === 403) {
      setActionError(MSG_ORG.FORBIDDEN);
      return;
    }
    // Lỗi mạng / timeout / lỗi lạ: giữ modal mở, KHÔNG điều hướng.
    setActionError(MSG_ORG.SAVE_FAILED);
  };

  const approveMutation = useMutation({
    mutationFn: (notifyEmail: boolean) => approveOrganization(id, notifyEmail),
    onSuccess: () => {
      message.success(msgApproved(orgName));
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      setApproveOpen(false);
      navigate(backPath);
    },
    onError: handleMutationError,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ reason, notifyEmail }: { reason: string; notifyEmail: boolean }) =>
      rejectOrganization(id, reason, notifyEmail),
    onSuccess: () => {
      message.success(msgRejected(orgName));
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      setRejectOpen(false);
      navigate(backPath);
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
            <Link to={backPath}>
              <Button type="primary">{MSG_ORG.BACK_TO_LIST}</Button>
            </Link>
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

  const handleSuspendError = (error: unknown) => {
    const status = error instanceof AdminApiError ? error.status : null;
    if (status === 404) {
      setActionError(msgBackendPending('D-21'));
      return;
    }
    if (status === 403) {
      setActionError(MSG_ORG.FORBIDDEN);
      return;
    }
    // NFR-REL-001: lỗi/timeout thì báo lỗi rõ, KHÔNG hiện thành công.
    setActionError(MSG_ORG.SAVE_FAILED);
  };

  return (
    <Flex vertical gap={token.marginLG}>
      <Breadcrumb
        items={[
          { title: <Link to={backPath}>{MSG_ORG.LIST_TITLE}</Link> },
          { title: organization.name },
        ]}
      />

      {/* Lỗi thao tác — hiện ở đây CHỈ KHI không có modal nào đang mở (modal đã
          đóng vì 404); lỗi khi modal còn mở nằm trong chính modal đó. */}
      {actionError && !isAnyModalOpen && (
        <Alert type="error" showIcon role="alert" message={actionError} />
      )}

      <Flex justify="space-between" align="center" wrap gap={token.margin}>
        <Flex align="center" gap={token.marginSM} wrap>
          <Title level={1} style={{ margin: 0 }}>
            {organization.name}
          </Title>
          <Tag color={orgStatus.color}>{orgStatus.label}</Tag>
        </Flex>

        <Flex align="center" gap={token.marginSM} wrap>
          {isPendingOrg ? (
            <>
              <Button
                type="primary"
                onClick={() => {
                  setActionError(null);
                  setApproveOpen(true);
                }}
              >
                {MSG_ORG.APPROVE_TITLE}
              </Button>
              <Button
                danger
                onClick={() => {
                  setActionError(null);
                  setRejectOpen(true);
                }}
              >
                {MSG_ORG.REJECT_TITLE}
              </Button>
            </>
          ) : (
            <>
              {/* Trạng thái KHÔNG phải pending → nói rõ "đã được xử lý" (e2e cũ assert câu này),
                  kèm nút đổi trạng thái theo ma trận đặc tả §3.3. */}
              <Alert type="info" showIcon message={MSG_ORG.ALREADY_REVIEWED} />
              {/* `C1` — `BR-04`: chữ là "Vô hiệu hoá", không phải "Xoá". */}
              {nextSuspendAction && (
                <Button
                  danger={nextSuspendAction === 'suspend'}
                  onClick={() => {
                    setActionError(null);
                    setSuspendAction(nextSuspendAction);
                  }}
                  aria-label={`${nextSuspendLabel} tổ chức ${organization.name}`}
                >
                  {nextSuspendLabel}
                </Button>
              )}
              {currentStatus === 'rejected' && (
                // `Q-18`: BE chưa cho duyệt lại tổ chức đã từ chối → nút tạm khoá,
                // hiện rõ lý do thay vì ẩn đi (người dùng tự hỏi đi đâu mất).
                <Button disabled title={MSG_ORG.REAPPROVE_DISABLED}>
                  {MSG_ORG.APPROVE_TITLE}
                </Button>
              )}
            </>
          )}
          <Button
            type="link"
            onClick={() => navigate(`/quan-tri/to-chuc/${organization.id}/lich-su?from=to-chuc`)}
          >
            {MSG_ORG.HISTORY}
          </Button>
          <Link to={backPath}>{MSG_ORG.BACK_TO_LIST}</Link>
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
      {/*
        C2 — cấu hình module **sau khi duyệt** (§3.3 + `D-26`): chỉ `suspended`
        là không sửa được, thay cho "chỉ khi còn `pending`" của Sprint 2 gốc
        (`Q-16`). BE chưa làm `D-16` → lưu ở org active sẽ hiện lỗi/409.
      */}
      <ModuleConfigPanel
        orgId={organization.id}
        modules={modules}
        editable={organization.status !== 'suspended'}
      />

      <ApproveOrganizationModal
        open={approveOpen}
        orgName={organization.name}
        moduleCount={moduleCount}
        loading={approveMutation.isPending}
        error={actionError}
        onCancel={() => setApproveOpen(false)}
        onConfirm={(notifyEmail) => approveMutation.mutate(notifyEmail)}
      />

      <RejectOrganizationModal
        open={rejectOpen}
        orgName={organization.name}
        loading={rejectMutation.isPending}
        error={actionError}
        onCancel={() => setRejectOpen(false)}
        onConfirm={(reason, notifyEmail) => rejectMutation.mutate({ reason, notifyEmail })}
      />

      <SuspendOrganizationModal
        open={suspendAction !== null}
        mode={suspendAction ?? 'suspend'}
        orgName={organization.name}
        loading={suspendMutation.isPending}
        error={actionError}
        onCancel={() => setSuspendAction(null)}
        onConfirm={(reason) =>
          suspendMutation.mutate(
            { action: suspendAction ?? 'suspend', reason },
            {
              onSuccess: () => {
                message.success(
                  suspendAction === 'suspend' ? msgSuspended(orgName) : msgReactivated(orgName),
                );
                setActionError(null);
                setSuspendAction(null);
              },
              onError: handleSuspendError,
            },
          )
        }
      />
    </Flex>
  );
}
