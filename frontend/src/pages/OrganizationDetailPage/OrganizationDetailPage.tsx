import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Banner,
  Button,
  HStack,
  MetadataList,
  MetadataListItem,
  pixel,
  proportional,
  Stack,
  Table,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import StatusScreen from '../../components/StatusScreen/StatusScreen';
import SuspendOrganizationModal from '../../components/SuspendOrganizationModal/SuspendOrganizationModal';
import {
  AdminApiError,
  approveOrganization,
  rejectOrganization,
} from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import {
  MSG_ORG,
  msgApproved,
  msgBackendPending,
  msgReactivated,
  msgRejected,
  msgSuspended,
} from '../../features/admin/adminMessages';
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
import { useNotify } from '../../hooks/useNotify';
import ApproveOrganizationModal from './ApproveOrganizationModal';
import ModuleConfigPanel from './ModuleConfigPanel';
import RejectOrganizationModal from './RejectOrganizationModal';
import { useOrganizationDetail } from './use-organization-detail';

/** Giá trị hiển thị khi BE chưa trả dữ liệu — không để trống trơn, không hiện `undefined` (`TC-ORG-25`). */
const EMPTY_VALUE = '—';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn
 * `OrganizationOwner` là interface nên không tự thoả — giao thêm `Record`
 * để thoả ràng buộc mà **không** nới lỏng DTO (xem `docs/ui-conventions.md` §6.11).
 */
type OwnerRow = OrganizationOwner & Record<string, unknown>;

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
  const notify = useNotify();
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
   * `Banner` thay cho toast — toast tự biến mất và bị modal che nên người dùng
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
      notify.error(MSG_ORG.ALREADY_REVIEWED);
      setApproveOpen(false);
      setRejectOpen(false);
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      return;
    }
    if (status === 404) {
      // Modal đóng → lỗi hiện ở trang (Banner phía trên nội dung).
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
      notify.success(msgApproved(orgName));
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
      notify.success(msgRejected(orgName));
      void queryClient.invalidateQueries({ queryKey: adminKeys.pending });
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(id) });
      setRejectOpen(false);
      navigate(backPath);
    },
    onError: handleMutationError,
  });

  const ownerColumns: TableColumn<OwnerRow>[] = [
    {
      key: 'username',
      header: 'Tên đăng nhập',
      width: proportional(1, { minWidth: 160 }),
      renderCell: (row) => row.username,
    },
    {
      key: 'email',
      header: 'Email',
      width: proportional(1, { minWidth: 200 }),
      renderCell: (row) => row.email,
    },
    {
      key: 'status',
      header: 'Trạng thái tài khoản',
      width: pixel(160),
      // BR-08: Badge luôn kèm CHỮ, màu chỉ là tín hiệu phụ.
      renderCell: (row) => {
        const status = accountStatusLabel(row.status);
        return <Badge variant={status.badge} label={status.label} />;
      },
    },
  ];

  if (detailQuery.isPending) {
    return <PageLoading />;
  }

  if (detailQuery.isError) {
    const status = detailQuery.error instanceof AdminApiError ? detailQuery.error.status : null;
    if (status === 404) {
      return (
        <StatusScreen
          code="404"
          title={MSG_ORG.NOT_FOUND}
          description="Tổ chức không tồn tại hoặc đã bị gỡ khỏi hệ thống."
          action={{ label: MSG_ORG.BACK_TO_LIST, onClick: () => navigate(backPath) }}
        />
      );
    }
    return (
      <Banner
        status="error"
        title={MSG_ORG.DETAIL_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại. Thông tin tổ chức chưa được tải."
        collapsible={false}
        role="alert"
        endContent={
          <Button
            variant="secondary"
            size="sm"
            label={MSG_ORG.RETRY}
            isLoading={detailQuery.isFetching}
            onClick={() => void detailQuery.refetch()}
          />
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
    <Stack direction="vertical" gap={4}>
      <PageHeader
        breadcrumb={[{ title: MSG_ORG.LIST_TITLE, href: backPath }, { title: organization.name }]}
        title={organization.name}
        extra={
          <HStack align="center" gap={3} wrap="wrap">
            {/* BR-08: Badge trạng thái luôn kèm chữ. */}
            <Badge variant={orgStatus.badge} label={orgStatus.label} />
            {isPendingOrg ? (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  label={MSG_ORG.APPROVE_TITLE}
                  onClick={() => {
                    setActionError(null);
                    setApproveOpen(true);
                  }}
                />
                <Button
                  variant="destructive"
                  size="lg"
                  label={MSG_ORG.REJECT_TITLE}
                  onClick={() => {
                    setActionError(null);
                    setRejectOpen(true);
                  }}
                />
              </>
            ) : (
              <>
                {/* `C1` — `BR-04`: chữ là "Vô hiệu hoá", không phải "Xoá". */}
                {nextSuspendAction ? (
                  <Button
                    variant={nextSuspendAction === 'suspend' ? 'destructive' : 'secondary'}
                    size="lg"
                    label={nextSuspendLabel}
                    aria-label={`${nextSuspendLabel} tổ chức ${organization.name}`}
                    onClick={() => {
                      setActionError(null);
                      setSuspendAction(nextSuspendAction);
                    }}
                  />
                ) : null}
                {currentStatus === 'rejected' ? (
                  // `Q-18`: BE chưa cho duyệt lại tổ chức đã từ chối → nút tạm khoá,
                  // hiện rõ lý do thay vì ẩn đi (người dùng tự hỏi đi đâu mất).
                  <Button
                    variant="secondary"
                    size="lg"
                    label={MSG_ORG.APPROVE_TITLE}
                    isDisabled
                    tooltip={MSG_ORG.REAPPROVE_DISABLED}
                  />
                ) : null}
              </>
            )}
            <Button
              variant="ghost"
              size="lg"
              label={MSG_ORG.HISTORY}
              onClick={() => navigate(`/quan-tri/to-chuc/${organization.id}/lich-su?from=to-chuc`)}
            />
            <AppLink to={backPath}>{MSG_ORG.BACK_TO_LIST}</AppLink>
          </HStack>
        }
      />

      {/*
        Tổ chức KHÔNG còn `pending` → nói rõ "đã được xử lý" (e2e cũ assert câu này).
        Đặt ngay dưới tiêu đề thay vì chen vào hàng nút — hàng nút đã chật, thêm một
        khối chữ vào giữa các nút sẽ phá thứ tự đọc của trình đọc màn hình.
      */}
      {!isPendingOrg ? (
        <Banner status="info" role="status" title={MSG_ORG.ALREADY_REVIEWED} collapsible={false} />
      ) : null}

      {/* Lỗi thao tác — hiện ở đây CHỈ KHI không có modal nào đang mở (modal đã
          đóng vì 404); lỗi khi modal còn mở nằm trong chính modal đó. */}
      {actionError && !isAnyModalOpen ? (
        <Banner status="error" title={actionError} collapsible={false} role="alert" />
      ) : null}

      {/* Khối 1 — Thông tin tổ chức */}
      <DetailSection title={MSG_ORG.INFO}>
        <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label="Tên tổ chức">{organization.name}</MetadataListItem>
          <MetadataListItem label="Loại">{orgTypeLabel(organization.org_type)}</MetadataListItem>
          <MetadataListItem label="Trạng thái">
            <Badge variant={orgStatus.badge} label={orgStatus.label} />
          </MetadataListItem>
          <MetadataListItem label="Ngày gửi đăng ký">
            {/* `D-19` — BE chưa trả, hiện "—" thay vì bỏ trống. */}
            {formatDateTime(organization.created_at)}
          </MetadataListItem>
          <MetadataListItem label="Email liên hệ">
            {/* `D-11` + `D-19` — BE chưa lưu/trả. */}
            {organization.contact_email || EMPTY_VALUE}
          </MetadataListItem>
          <MetadataListItem label="Số điện thoại">
            {organization.contact_phone || EMPTY_VALUE}
          </MetadataListItem>
          {/* Lý do do người khác nhập ⇒ render TEXT THUẦN, không dangerouslySetInnerHTML. */}
          <MetadataListItem label="Lý do từ chối">
            {organization.rejection_reason || EMPTY_VALUE}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>

      {/* Khối 2 — Người đại diện */}
      <DetailSection title={MSG_ORG.OWNERS}>
        <Table<OwnerRow>
          data={owners as OwnerRow[]}
          columns={ownerColumns}
          idKey="id"
          density="compact"
          emptyState={
            <EmptyState compact headingLevel={3} description="Chưa có người đại diện" />
          }
        />
      </DetailSection>

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
                notify.success(
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
    </Stack>
  );
}
