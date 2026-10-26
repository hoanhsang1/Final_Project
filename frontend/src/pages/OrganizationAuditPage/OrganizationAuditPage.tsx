import { Alert, Button, Flex, Typography, theme } from 'antd';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import AuditLogTable from '../../components/AuditLogTable/AuditLogTable';
import { AdminApiError } from '../../features/admin/adminApi';
import { MSG_HIS, msgBackendPending } from '../../features/admin/adminMessages';
import { backToListPath } from '../../features/admin/consoleMenu';
import { useOrganizationDetail } from '../OrganizationDetailPage/use-organization-detail';
import {
  ORG_AUDIT_PAGE_SIZE,
  useOrganizationAudit,
} from './use-organization-audit';

const { Text, Title } = Typography;

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-22';

/**
 * Màn Lịch sử duyệt tổ chức `/quan-tri/to-chuc/:id/lich-su`.
 *
 * Nguồn dữ liệu: `GET /api/v1/audit-logs?organizationId=<id>` (`D-22`) — dùng
 * chung endpoint với màn Nhật ký hệ thống (`D-23` đã bỏ, đặc tả §8 #1).
 *
 * Trang lấy tên tổ chức từ query chi tiết (đã cache khi bấm từ màn chi tiết →
 * không phát sinh thêm request ở luồng bình thường).
 *
 * Trạng thái: **loading** · **empty** · **error** · **success**. No-permission
 * do `AdminGuard` chặn trước.
 */
export default function OrganizationAuditPage() {
  const { token } = theme.useToken();
  const { id: orgId = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const [page, setPage] = useState(1);

  const backPath = backToListPath(location.search, '/quan-tri/to-chuc');
  const detailQuery = useOrganizationDetail(orgId);
  const auditQuery = useOrganizationAudit(orgId, page);

  const orgName = detailQuery.data?.organization?.name ?? '';
  const header = (
    <div>
      <Link to={backPath} aria-label="Quay lại danh sách tổ chức">
        ← Quay lại danh sách
      </Link>
      <Title level={1} style={{ marginBlock: token.marginXS, marginBlockStart: token.marginSM }}>
        {MSG_HIS.TITLE}
      </Title>
      <Text type="secondary">
        {orgName ? (
          <>
            Tổ chức <Text strong>{orgName}</Text>
          </>
        ) : (
          `Tổ chức ${orgId}`
        )}
      </Text>
    </div>
  );

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend".
  const isEndpointMissing =
    auditQuery.isError &&
    auditQuery.error instanceof AdminApiError &&
    auditQuery.error.status === 404;

  if (isEndpointMissing) {
    return (
      <Flex vertical gap={token.marginMD}>
        {header}
        <Alert
          type="info"
          showIcon
          role="status"
          message={msgBackendPending(ENDPOINT_CODE)}
          description="Backend cần thêm endpoint GET /api/v1/audit-logs để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
          action={
            <Button onClick={() => void auditQuery.refetch()} loading={auditQuery.isFetching}>
              Thử lại
            </Button>
          }
        />
      </Flex>
    );
  }

  return (
    <Flex vertical gap={token.marginMD}>
      {header}
      <AuditLogTable
        query={auditQuery}
        page={page}
        pageSize={ORG_AUDIT_PAGE_SIZE}
        onPaginationChange={setPage}
        emptyText={MSG_HIS.EMPTY}
        errorText={MSG_HIS.LOAD_ERROR}
      />
    </Flex>
  );
}
