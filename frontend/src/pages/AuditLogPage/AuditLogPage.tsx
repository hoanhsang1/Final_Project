import {
  Banner,
  Button,
  DateRangeInput,
  HStack,
  Selector,
  Stack,
  TextInput,
} from '@astryxdesign/core';
import type { DateRange, ISODateString } from '@astryxdesign/core';
import { useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import { AUDIT_ACTION_OPTIONS } from '../../features/admin/auditLabels';
import { MSG_AUD, MSG_ORG, msgBackendPending } from '../../features/admin/adminMessages';
import { AdminApiError } from '../../features/admin/adminApi';
import AuditLogTable from '../../components/AuditLogTable/AuditLogTable';
import { AUDIT_PAGE_SIZE, useAuditLogsPage } from './use-audit-logs';

/** Mã endpoint đang chờ — hiện trên UI để Vy đối chiếu với đặc tả §4.2. */
const ENDPOINT_CODE = 'D-22';

/** Ngày ISO chỉ-gồm-ngày (`2026-10-21`) — `DateRangeInput` chỉ nhận dạng này. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Lựa chọn bộ lọc hành động — bỏ mục rỗng vì `Selector hasClear` đã có nút xoá. */
const ACTION_OPTIONS = [...AUDIT_ACTION_OPTIONS];

/**
 * Dựng `DateRange` cho `DateRangeInput` từ 2 tham số URL.
 *
 * `DateRangeInput` bắt buộc CẢ hai đầu — trong khi URL có thể chỉ có một đầu
 * (`allowEmpty` của antd cũ). Chỉ dựng khoảng khi cả `from` và `to` hợp lệ.
 */
function toDateRange(from: string | null, to: string | null): DateRange | null {
  if (!from || !to || !ISO_DATE_PATTERN.test(from) || !ISO_DATE_PATTERN.test(to)) {
    return null;
  }
  return { start: from as ISODateString, end: to as ISODateString };
}

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
  const { result, page, keyword, action, from, to, updateParams } = useAuditLogsPage();

  // Ô nhập tách khỏi tham số URL: gõ chưa xong thì chưa lọc (khớp `Input.Search` cũ).
  const [keywordInput, setKeywordInput] = useState(keyword);

  const applySearch = () => {
    updateParams({ q: keywordInput.trim() || null });
  };

  // 404 từ endpoint COLLECTION = BE chưa làm endpoint → hiện "chờ backend".
  const isEndpointMissing =
    result.isError && result.error instanceof AdminApiError && result.error.status === 404;

  if (isEndpointMissing) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title={MSG_AUD.TITLE} subtitle={MSG_AUD.SUBTITLE} />
        <Banner
          status="info"
          title={msgBackendPending(ENDPOINT_CODE)}
          description="Backend cần thêm endpoint GET /api/v1/audit-logs để màn này hoạt động. Bấm Thử lại sau khi backend cập nhật."
          collapsible={false}
          role="status"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_ORG.RETRY}
              isLoading={result.isFetching}
              onClick={() => void result.refetch()}
            />
          }
        />
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_AUD.TITLE} subtitle={MSG_AUD.SUBTITLE}>
        <HStack gap={3} wrap="wrap" align="end">
          <HStack gap={2} wrap="wrap" align="end">
            <TextInput
              type="search"
              label={MSG_AUD.SEARCH_LABEL}
              isLabelHidden
              startIcon="search"
              enterKeyHint="search"
              hasClear
              placeholder={MSG_AUD.SEARCH_PLACEHOLDER}
              value={keywordInput}
              width={320}
              onChange={(value) => {
                setKeywordInput(value);
                // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                if (value === '') {
                  updateParams({ q: null });
                }
              }}
              onEnter={applySearch}
            />
            <Button
              variant="secondary"
              size="lg"
              label={MSG_AUD.SEARCH_ACTION}
              onClick={applySearch}
            />
          </HStack>

          <Selector
            label={MSG_AUD.FILTER_ACTION}
            isLabelHidden
            hasClear
            placeholder={MSG_AUD.ALL_ACTIONS}
            options={ACTION_OPTIONS}
            value={action?.[0] ?? null}
            width={210}
            onChange={(value) => updateParams({ action: value || null })}
          />

          <DateRangeInput
            label={MSG_AUD.FILTER_RANGE}
            isLabelHidden
            value={toDateRange(from, to)}
            placeholder={MSG_AUD.RANGE_PLACEHOLDER}
            width={260}
            onChange={(value) =>
              updateParams({ from: value?.start ?? null, to: value?.end ?? null })
            }
          />
        </HStack>
      </PageHeader>

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
    </Stack>
  );
}
