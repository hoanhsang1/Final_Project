import { Alert, Button, DatePicker, Flex, Input, Select, Typography, theme } from 'antd';
import type { SelectProps } from 'antd';
import dayjs from 'dayjs';
import { AUDIT_ACTION_OPTIONS } from '../../features/admin/auditLabels';
import { MSG_AUD, msgBackendPending } from '../../features/admin/adminMessages';
import { AdminApiError } from '../../features/admin/adminApi';
import AuditLogTable from '../../components/AuditLogTable/AuditLogTable';
import { AUDIT_PAGE_SIZE, useAuditLogsPage } from './use-audit-logs';

const { Text, Title } = Typography;

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-22';

const ACTION_OPTIONS: SelectProps['options'] = [
  { value: '', label: MSG_AUD.ALL_ACTIONS },
  ...AUDIT_ACTION_OPTIONS,
];

/**
 * Màn Nhật ký hệ thống `/quan-tri/nhat-ky`.
 *
 * ⚠️ Endpoint `GET /api/v1/audit-logs` (`D-22`) CHƯA có ở BE → tới khi Sang làm
 * xong, màn hiện "Tính năng đang chờ backend", KHÔNG hiện Empty rỗng.
 *
 * Trạng thái: **loading** · **empty** · **error** · **success**. No-permission
 * do `AdminGuard` chặn trước.
 */
export default function AuditLogPage() {
  const { token } = theme.useToken();
  const { result, page, keyword, action, from, to, updateParams } = useAuditLogsPage();

  const handleRangeChange = (values: unknown) => {
    const [start, end] = (values ?? []) as Array<dayjs.Dayjs | null>;
    updateParams({
      from: start ? start.format('YYYY-MM-DD') : null,
      to: end ? end.format('YYYY-MM-DD') : null,
    });
  };

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend".
  const isEndpointMissing =
    result.isError && result.error instanceof AdminApiError && result.error.status === 404;

  const header = (
    <div>
      <Title level={1} style={{ margin: 0 }}>
        {MSG_AUD.TITLE}
      </Title>
      <Text type="secondary">{MSG_AUD.SUBTITLE}</Text>
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
          description="Backend cần thêm endpoint GET /api/v1/audit-logs để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
          action={
            <Button onClick={() => void result.refetch()} loading={result.isFetching}>
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

      <Flex gap={token.marginSM} wrap>
        <Input.Search
          allowClear
          aria-label="Tìm trong nhật ký"
          placeholder="Tìm theo tên đối tượng hoặc mô tả"
          defaultValue={keyword}
          onSearch={(value) => updateParams({ q: value.trim() || null })}
          style={{ maxWidth: 320 }}
        />
        <Select
          aria-label={MSG_AUD.FILTER_ACTION}
          value={action?.[0] ?? ''}
          options={ACTION_OPTIONS}
          style={{ minWidth: 210 }}
          onChange={(value) => updateParams({ action: value || null })}
        />
        <DatePicker.RangePicker
          aria-label={MSG_AUD.FILTER_RANGE}
          format="DD/MM/YYYY"
          value={[
            from ? dayjs(from) : null,
            to ? dayjs(to) : null,
          ]}
          onChange={handleRangeChange}
          allowEmpty={[true, true]}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
      </Flex>

      <AuditLogTable
        query={result}
        page={page}
        pageSize={AUDIT_PAGE_SIZE}
        showTarget
        onPaginationChange={(nextPage) =>
          updateParams({ page: nextPage > 1 ? String(nextPage) : null })
        }
        emptyText={MSG_AUD.EMPTY}
        errorText={MSG_AUD.LOAD_ERROR}
      />
    </Flex>
  );
}
