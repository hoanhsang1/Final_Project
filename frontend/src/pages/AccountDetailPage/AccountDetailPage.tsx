import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Flex,
  Result,
  Skeleton,
  Tag,
  Typography,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AccountRoleModal from '../../components/AccountRoleModal/AccountRoleModal';
import AccountResetPasswordModal from '../../components/AccountResetPasswordModal/AccountResetPasswordModal';
import type { PasswordResetMode } from '../../components/AccountResetPasswordModal/AccountResetPasswordModal';
import AccountStatusModal from '../../components/AccountStatusModal/AccountStatusModal';
import type { TargetAccountStatus } from '../../components/AccountStatusModal/AccountStatusModal';
import AuditLogTable from '../../components/AuditLogTable/AuditLogTable';
import {
  AdminApiError,
  resetAccountPassword,
  updateAccountRole,
  updateAccountStatus,
} from '../../features/admin/adminApi';
import { MSG_ACC, MSG_ORG, msgAccountStatusUpdated, msgBackendPending } from '../../features/admin/adminMessages';
import { backToListPath } from '../../features/admin/consoleMenu';
import { roleLabel } from '../../features/admin/roleLabels';
import { accountStatusLabel } from '../../features/admin/statusLabels';
import type { AccountStatus } from '../../features/admin/types';
import { useAccountAudit } from './use-account-audit';
import { useAccountDetailQuery } from './use-account-detail';

const { Text, Title } = Typography;

/** Số dòng / trang của khối nhật ký tài khoản. */
const ACCOUNT_AUDIT_PAGE_SIZE = 20;

/** Giá trị hiển thị khi BE chưa trả. */
const EMPTY_VALUE = '—';

/**
 * Trạng thái CHUYỂN TỚI hợp lệ theo trạng thái hiện tại.
 *
 * Không có đường `pending → disabled` (chờ duyệt thì chỉ nên kích hoạt hoặc
 * để nguyên) và không có `disabled → locked` (đã vô hiệu hoá thì mở khoá là
 * vô nghĩa — phải kích hoạt lại trước).
 */
const ALLOWED_TARGETS: Record<AccountStatus, TargetAccountStatus[]> = {
  pending: ['active'],
  active: ['locked', 'disabled'],
  locked: ['active', 'disabled'],
  disabled: ['active'],
};

/** Nhãn nút theo trạng thái chuyển tới (khớp `MSG-ACC-09..13`). */
function targetLabel(from: AccountStatus, to: TargetAccountStatus): string {
  switch (to) {
    case 'active':
      if (from === 'disabled') {
        return MSG_ACC.REACTIVATE;
      }
      return from === 'locked' ? MSG_ACC.UNLOCK : MSG_ACC.ACTIVATE;
    case 'locked':
      return MSG_ACC.LOCK;
    case 'disabled':
      return MSG_ACC.DISABLE;
  }
}

/** Định dạng ngày giờ; trả về "—" khi BE chưa trả. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_VALUE;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : EMPTY_VALUE;
}

/**
 * Màn Chi tiết tài khoản `/quan-tri/tai-khoan/:id`.
 *
 * Nguồn dữ liệu: `GET /api/v1/accounts/{id}` (`D-24b`) + đổi trạng thái
 * `PATCH /api/v1/accounts/{id}/status` (`D-24c`) + đổi vai trò
 * `PATCH /accounts/{id}/role` (`D-30`) + đặt lại mật khẩu
 * `POST /accounts/{id}/reset-password` (`D-31`) + nhật ký
 * `GET /api/v1/audit-logs?accountId=<id>` (`D-22`).
 *
 * ⚠️ Cả 5 endpoint đều CHƯA có ở BE → tới khi Sang làm, màn hiện Result 404
 * (item) hoặc Alert "chờ backend" (nhật ký).
 *
 * Trạng thái: **loading** · **error** · **success** · **no-permission**
 * (guard). **empty** áp dụng cho khối nhật ký.
 */
export default function AccountDetailPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { id: accountId = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [pendingTarget, setPendingTarget] = useState<TargetAccountStatus | null>(null);
  /**
   * Lỗi của thao tác đổi trạng thái gần nhất — hiện bằng `Alert` thay cho
   * `message.error` (toast tự biến mất và bị modal che — NFR-REL-001).
   */
  const [actionError, setActionError] = useState<string | null>(null);

  const backPath = backToListPath(location.search, '/quan-tri/tai-khoan');
  const detailQuery = useAccountDetailQuery(accountId);
  const auditQuery = useAccountAudit(accountId, ACCOUNT_AUDIT_PAGE_SIZE);

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: TargetAccountStatus; reason?: string }) =>
      updateAccountStatus(accountId, status, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  // Đổi vai trò (`D-30`) + đặt lại mật khẩu (`D-31`) — lỗi hiện TRONG modal.
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const roleMutation = useMutation({
    mutationFn: (role: string) => updateAccountRole(accountId, role),
    onSuccess: () => {
      message.success(MSG_ACC.ROLE_UPDATED);
      setRoleOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['accounts'] });
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      const status = error instanceof AdminApiError ? error.status : null;
      if (status === 409) {
        // BE chặn admin tự đổi vai trò của chính mình.
        setRoleError(MSG_ACC.CANNOT_CHANGE_OWN_ROLE);
      } else if (status === 403) {
        setRoleError(MSG_ORG.FORBIDDEN);
      } else if (status === 404) {
        setRoleError(msgBackendPending('D-30'));
      } else {
        setRoleError(MSG_ACC.ROLE_UPDATE_FAILED);
      }
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ newPassword }: { mode: PasswordResetMode; newPassword?: string }) =>
      resetAccountPassword(accountId, newPassword),
    onSuccess: (_data, variables) => {
      message.success(
        variables.mode === 'manual' ? MSG_ACC.PASSWORD_UPDATED : MSG_ACC.RESET_SENT,
      );
      setResetOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error) => {
      const status = error instanceof AdminApiError ? error.status : null;
      if (status === 400) {
        // BE validate mật khẩu < 8 ký tự — cùng câu với validate FE.
        setResetError(MSG_ACC.PASSWORD_TOO_SHORT);
      } else if (status === 403) {
        setResetError(MSG_ORG.FORBIDDEN);
      } else if (status === 404) {
        setResetError(msgBackendPending('D-31'));
      } else {
        setResetError(MSG_ACC.RESET_FAILED);
      }
    },
  });

  const account = detailQuery.data;

  const header = (
    <Flex vertical gap={token.marginXS}>
      <Link to={backPath} aria-label="Quay lại danh sách tài khoản">
        ← Quay lại danh sách
      </Link>
      <Title level={1} style={{ margin: 0 }}>
        {MSG_ACC.DETAIL_TITLE}
      </Title>
      <Text type="secondary">
        {account ? (
          <>
            Tài khoản <Text strong>{account.username}</Text>
          </>
        ) : (
          `Tài khoản ${accountId}`
        )}
      </Text>
    </Flex>
  );

  // 404 từ ITEM endpoint = không tìm thấy đối tượng → Result 404 (khác với
  // collection — xem đặc tả §4.5).
  const isNotFound =
    detailQuery.isError &&
    detailQuery.error instanceof AdminApiError &&
    detailQuery.error.status === 404;

  if (detailQuery.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  if (isNotFound) {
    return (
      <Result status="404" title={MSG_ACC.NOT_FOUND} extra={
        <Link to={backPath}>
          <Button type="primary">{MSG_ACC.LIST_TITLE}</Button>
        </Link>
      } />
    );
  }

  if (detailQuery.isError || !account) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_ACC.DETAIL_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại."
        action={
          <Button onClick={() => void detailQuery.refetch()} loading={detailQuery.isFetching}>
            {MSG_ORG.RETRY}
          </Button>
        }
      />
    );
  }

  const statusLabel = accountStatusLabel(account.status);
  const targets = ALLOWED_TARGETS[account.status] ?? [];

  return (
    <Flex vertical gap={token.marginLG}>
      {header}

      {/* Lỗi đổi trạng thái — hiện khi modal đã đóng, không nằm sau lớp phủ. */}
      {actionError && pendingTarget === null && (
        <Alert type="error" showIcon role="alert" message={actionError} />
      )}

      <Descriptions
        title={MSG_ACC.DETAIL_TITLE}
        bordered
        column={{ xs: 1, sm: 2, lg: 3 }}
        items={[
          { key: 'username', label: 'Tên đăng nhập', children: account.username },
          { key: 'email', label: 'Email', children: account.email || EMPTY_VALUE },
          {
            key: 'full_name',
            label: MSG_ACC.FULL_NAME,
            children: account.full_name || EMPTY_VALUE,
          },
          {
            key: 'organization',
            label: MSG_ACC.ORGANIZATION,
            children: account.organization_name || EMPTY_VALUE,
          },
          { key: 'role', label: MSG_ACC.ROLE, children: roleLabel(account.role) },
          {
            key: 'status',
            label: 'Trạng thái',
            // BR-08: Tag LUÔN kèm chữ, không chỉ màu.
            children: <Tag color={statusLabel.color}>{statusLabel.label}</Tag>,
          },
          {
            key: 'created_at',
            label: MSG_ACC.CREATED_AT,
            children: formatDateTime(account.created_at),
          },
          {
            key: 'last_login_at',
            label: MSG_ACC.LAST_LOGIN,
            children: formatDateTime(account.last_login_at),
          },
        ]}
      />

      <Flex gap={token.marginSM} wrap>
        {targets.map((target) => (
          <Button
            key={target}
            danger={target !== 'active'}
            onClick={() => {
              setActionError(null);
              setPendingTarget(target);
            }}
            aria-label={`${targetLabel(account.status, target)} tài khoản ${account.username}`}
          >
            {targetLabel(account.status, target)}
          </Button>
        ))}
        {/* UC-19 (mở rộng): đổi vai trò + đặt lại mật khẩu — luôn hiển thị. */}
        <Button
          onClick={() => {
            setRoleError(null);
            setRoleOpen(true);
          }}
        >
          {MSG_ACC.CHANGE_ROLE_TITLE}
        </Button>
        <Button
          onClick={() => {
            setResetError(null);
            setResetOpen(true);
          }}
        >
          {MSG_ACC.RESET_TITLE}
        </Button>
      </Flex>

      <div>
        <Title level={2} style={{ margin: 0, marginBlockEnd: token.marginSM }}>
          {MSG_ACC.AUDIT_TITLE}
        </Title>
        <AuditLogTable
          query={auditQuery}
          page={1}
          pageSize={ACCOUNT_AUDIT_PAGE_SIZE}
          showTarget={false}
          emptyText="Chưa có sự kiện nào"
          errorText="Không tải được nhật ký của tài khoản."
        />
      </div>

      <AccountStatusModal
        open={pendingTarget !== null}
        username={account.username}
        currentStatus={account.status}
        targetStatus={pendingTarget ?? 'active'}
        loading={statusMutation.isPending}
        error={actionError}
        onCancel={() => setPendingTarget(null)}
        onConfirm={(reason) =>
          statusMutation.mutate(
            { status: pendingTarget ?? 'active', reason },
            {
              onSuccess: () => {
                message.success(msgAccountStatusUpdated(account.username));
                setActionError(null);
                setPendingTarget(null);
              },
              onError: (error) => {
                const httpStatus = error instanceof AdminApiError ? error.status : null;
                if (httpStatus === 404) {
                  setActionError(msgBackendPending('D-24'));
                } else if (httpStatus === 403) {
                  setActionError(MSG_ORG.FORBIDDEN);
                } else {
                  // NFR-REL-001: lỗi/timeout thì báo lỗi rõ, KHÔNG hiện thành công.
                  setActionError(MSG_ACC.STATUS_UPDATE_FAILED);
                }
              },
            },
          )
        }
      />

      <AccountRoleModal
        open={roleOpen}
        username={account.username}
        currentRole={account.role}
        loading={roleMutation.isPending}
        error={roleError}
        onCancel={() => setRoleOpen(false)}
        onConfirm={(role) => roleMutation.mutate(role)}
      />

      <AccountResetPasswordModal
        open={resetOpen}
        username={account.username}
        loading={resetMutation.isPending}
        error={resetError}
        onCancel={() => setResetOpen(false)}
        onConfirm={(mode, newPassword) => resetMutation.mutate({ mode, newPassword })}
      />
    </Flex>
  );
}
