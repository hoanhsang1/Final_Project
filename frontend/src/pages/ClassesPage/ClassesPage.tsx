import {
  Badge,
  Banner,
  Button,
  HStack,
  pixel,
  proportional,
  Selector,
  Stack,
  Table,
  Text,
  TextInput,
  useTablePagination,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewClasses, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_BADGE,
  CLASS_STATUS_LABEL,
  CLOSE_STATE_BADGE,
  CLOSE_STATE_LABEL,
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import { classTotalLabel, MSG_CLASS, MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { fetchClasses, sprint4ErrorMessage } from '../../features/sprint4/sprint4Api';
import type { ClassListItem, ClassStatus } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import { numericStyle } from '../../theme';

/**
 * `Table` của Astryx yêu cầu `T extends Record<string, unknown>`, còn
 * `ClassListItem` là một interface nên không có index signature. Giao thêm
 * `Record<string, unknown>` để thoả ràng buộc mà không phải nới lỏng DTO —
 * `idKey="id"` vẫn được kiểm kiểu trên chính các field thật.
 */
type ClassRow = ClassListItem & Record<string, unknown>;

/** §7 — 4 trạng thái lọc của lớp. */
const STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: 'CHUA_BAT_DAU', label: CLASS_STATUS_LABEL.CHUA_BAT_DAU },
  { value: 'DANG_DIEN_RA', label: CLASS_STATUS_LABEL.DANG_DIEN_RA },
  { value: 'DA_KET_THUC', label: CLASS_STATUS_LABEL.DA_KET_THUC },
  { value: 'DA_HUY', label: CLASS_STATUS_LABEL.DA_HUY },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/**
 * Màn 5 — danh sách lớp học (§6.1).
 *
 * - Lọc `q` + `status` (4 giá trị), phân trang `page`/`size` do server làm.
 * - `status` và `closeState` là hai trục độc lập: cột trạng thái đóng ẩn khi
 *   `NONE` để bảng không nhiễu.
 * - 5 state: loading / empty / error / success / không có quyền.
 */
export default function ClassesPage() {
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

  // Server là nguồn sự thật cho phân trang: dùng số BE trả về, không dùng state
  // cục bộ, để nhãn `aria-rowindex` và số trang khớp dữ liệu đang hiện.
  const currentPage = listQuery.data?.page ?? page;
  const pageSize = listQuery.data?.size ?? size;
  const total = listQuery.data?.total ?? 0;
  const rows = (listQuery.data?.items ?? []) as ClassRow[];

  const pagination = useTablePagination<ClassRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: total,
    pageSize,
    onPageSizeChange: (next) => {
      setSize(next);
      setPage(1);
    },
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    label: MSG_CLASS.PAGINATION_LABEL,
  });

  /** Áp từ khoá đang gõ và quay về trang 1 — dùng cho cả Enter lẫn nút "Tìm". */
  const applySearch = () => {
    setKeyword(keywordInput);
    setPage(1);
  };

  const columns: TableColumn<ClassRow>[] = [
    {
      key: 'classCode',
      header: 'Mã lớp',
      width: pixel(140),
      renderCell: (row) => (
        // Số/ký tự mã cần thẳng cột; `Text` bên trong `Link` không tự đặt
        // `font-variant-numeric` nên style này kế thừa xuống chữ hiển thị.
        <AppLink to={`/dao-tao/lop-hoc/${row.id}`} weight="medium" style={numericStyle}>
          {row.classCode || row.id}
        </AppLink>
      ),
    },
    {
      key: 'name',
      header: 'Tên lớp',
      width: proportional(1, { minWidth: 180 }),
      renderCell: (row) => row.name || '—',
    },
    {
      key: 'academicYear',
      header: 'Năm học',
      width: pixel(120),
      renderCell: (row) => row.academicYear || '—',
    },
    {
      key: 'period',
      header: 'Thời gian',
      width: pixel(210),
      renderCell: (row) => formatPeriod(row.startDate, row.endDate),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: pixel(150),
      renderCell: (row) =>
        row.status ? (
          <Badge
            variant={CLASS_STATUS_BADGE[row.status]}
            label={labelOf(CLASS_STATUS_LABEL, row.status)}
          />
        ) : (
          '—'
        ),
    },
    {
      key: 'closeState',
      header: 'Đóng lớp',
      width: pixel(160),
      // §7 — `NONE` không hiển thị; chỉ PENDING/CLOSED mới có nhãn.
      renderCell: (row) =>
        row.closeState && row.closeState !== 'NONE' ? (
          <Badge
            variant={CLOSE_STATE_BADGE[row.closeState]}
            label={labelOf(CLOSE_STATE_LABEL, row.closeState)}
          />
        ) : null,
    },
    {
      key: 'teacher',
      header: 'Giáo viên',
      width: pixel(220),
      renderCell: (row) =>
        row.teacher?.fullName ? (
          row.teacher.fullName
        ) : (
          <Text type="supporting">{MSG_CLASS.TEACHER_UNASSIGNED}</Text>
        ),
    },
    {
      key: 'studentCount',
      header: 'Sĩ số',
      width: pixel(90),
      align: 'end',
      renderCell: (row) =>
        row.studentCount == null ? '—' : <Text hasTabularNumbers>{row.studentCount}</Text>,
    },
  ];

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_CLASS.TITLE}>
        {canView ? (
          <HStack gap={3} wrap="wrap" justify="between" align="end">
            <Selector
              label={MSG_CLASS.STATUS_ALL}
              isLabelHidden
              hasClear
              placeholder={MSG_CLASS.STATUS_ALL}
              options={STATUS_OPTIONS}
              value={status ?? null}
              width={220}
              onChange={(value) => {
                setStatus((value as ClassStatus | null) ?? undefined);
                setPage(1);
              }}
            />

            <HStack gap={2} wrap="wrap" align="end">
              <TextInput
                type="search"
                label={MSG_CLASS.SEARCH_LABEL}
                isLabelHidden
                startIcon="search"
                enterKeyHint="search"
                hasClear
                placeholder={MSG_CLASS.SEARCH_LABEL}
                value={keywordInput}
                width={300}
                onChange={(value) => {
                  setKeywordInput(value);
                  // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                  if (value === '') {
                    setKeyword('');
                    setPage(1);
                  }
                }}
                onEnter={applySearch}
              />
              <Button variant="secondary" size="lg" label={MSG_S4.SEARCH} onClick={applySearch} />
            </HStack>
          </HStack>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : listQuery.isError ? (
        <Banner
          status="error"
          title={MSG_CLASS.LIST_LOAD_ERROR}
          description={sprint4ErrorMessage(listQuery.error)}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_S4.RETRY}
              onClick={() => listQuery.refetch()}
            />
          }
        />
      ) : listQuery.isLoading ? (
        <PageLoading />
      ) : (
        <Stack direction="vertical" gap={3}>
          <Text type="supporting">{classTotalLabel(total)}</Text>
          <Table<ClassRow>
            data={rows}
            columns={columns}
            idKey="id"
            hasHover
            textOverflow="truncate"
            // `aria-rowindex` phải tính theo trang hiện tại, không phải theo
            // thứ tự trong mảng một trang.
            rowIndexStart={(currentPage - 1) * pageSize + 1}
            rowCount={total}
            emptyState={<EmptyState description={MSG_CLASS.EMPTY} compact />}
            plugins={{ pagination }}
          />
        </Stack>
      )}
    </Stack>
  );
}
