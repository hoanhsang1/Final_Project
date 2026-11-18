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
  TextInput,
  useTableSortable,
  useTableSortableState,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useMemo } from 'react';
import EmptyState from '../../components/EmptyState/EmptyState';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { MSG_MDL, MSG_ORG } from '../../features/admin/adminMessages';
import { CORE_MODULES } from '../../features/admin/coreModules';
import type { ModuleCatalogItem } from '../../features/modules/moduleApi';
import {
  MODULE_CATEGORY_PARAM,
  MODULE_SEARCH_PARAM,
  useModuleCatalogPage,
} from './use-module-catalog';

/** Giá trị hiển thị khi BE chưa trả (`D-28`). */
const EMPTY_VALUE = '—';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `ModuleCatalogItem`
 * là interface nên không tự thoả — giao thêm `Record` để thoả ràng buộc mà
 * **không** nới lỏng DTO (xem `docs/ui-conventions.md` §6.11).
 */
type ModuleRow = ModuleCatalogItem & Record<string, unknown>;

/** Hai cột cho sắp xếp phía client. */
type ModuleSortKey = 'code' | 'name';

/** Lựa chọn bộ lọc phân loại — giá trị lưu trong query param `?loi=`. */
const CATEGORY_OPTIONS = [
  { value: 'core', label: MSG_MDL.CORE },
  { value: 'mo-rong', label: MSG_MDL.OPTIONAL },
];

/**
 * Màn Danh mục module `/quan-tri/module`.
 *
 * **Read-only**: BE chưa có API bật/tắt module toàn cục, nên màn này chỉ để
 * Admin xem module nào có trong hệ thống và module nào là module lõi (`BR-06`).
 *
 * Bộ lọc lưu trong URL (`?loi=core&q=...`) để deep-link được.
 *
 * Trạng thái: **loading** (PageLoading) · **empty** (EmptyState) · **error**
 * (Banner + Thử lại) · **success**. No-permission do `AdminGuard` chặn trước.
 */
export default function ModuleCatalogPage() {
  const { query, category, keyword, setParam } = useModuleCatalogPage();

  const catalog = useMemo(() => (query.data ?? []) as ModuleRow[], [query.data]);
  const normalizedKeyword = keyword.trim().toLowerCase();

  // Bộ lọc client-side: danh mục module rất nhỏ (≤ 10 module) nên không cần server.
  const filtered = useMemo(
    () =>
      catalog.filter((item) => {
        const matchCategory =
          category === 'core'
            ? CORE_MODULES.includes(item.code)
            : category === 'mo-rong'
              ? !CORE_MODULES.includes(item.code)
              : true;
        const matchKeyword =
          normalizedKeyword === '' ||
          item.code.toLowerCase().includes(normalizedKeyword) ||
          item.name.toLowerCase().includes(normalizedKeyword);
        return matchCategory && matchKeyword;
      }),
    [catalog, category, normalizedKeyword],
  );

  // Sắp xếp phía client (`NFR-PER-001`) — `useTableSortableState` giữ state và
  // trả dữ liệu đã sắp; plugin `sort` chỉ vẽ nút trên header.
  const { sortedData, sortConfig } = useTableSortableState<ModuleRow, ModuleSortKey>({
    data: filtered,
    comparators: {
      code: (a, b) => a.code.localeCompare(b.code),
      name: (a, b) => a.name.localeCompare(b.name, 'vi'),
    },
  });
  const sortPlugin = useTableSortable<ModuleRow, ModuleSortKey>(sortConfig);

  const columns: TableColumn<ModuleRow>[] = [
    {
      key: 'code',
      header: 'Mã module',
      width: proportional(1, { minWidth: 180 }),
      sortable: true,
      renderCell: (row) => row.code,
    },
    {
      key: 'name',
      header: 'Tên module',
      width: proportional(1, { minWidth: 200 }),
      sortable: true,
      renderCell: (row) => row.name,
    },
    {
      key: 'category',
      header: MSG_MDL.CATEGORY,
      width: pixel(120),
      renderCell: (row) =>
        CORE_MODULES.includes(row.code) ? (
          // BR-08: Badge LUÔN kèm chữ, không chỉ màu.
          <Badge variant="warning" label={MSG_MDL.CORE} />
        ) : (
          <Badge variant="neutral" label={MSG_MDL.OPTIONAL} />
        ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      width: proportional(1, { minWidth: 200 }),
      // `D-28` — BE chưa trả trường này, hiện "—" thay vì để trống.
      renderCell: (row) => row.description || EMPTY_VALUE,
    },
  ];

  const hasFilter = category !== null || keyword.trim() !== '';

  if (query.isError) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title={MSG_MDL.TITLE} subtitle={MSG_MDL.SUBTITLE} />
        <Banner
          status="error"
          role="alert"
          collapsible={false}
          title={MSG_MDL.LOAD_ERROR}
          description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_ORG.RETRY}
              isLoading={query.isFetching}
              onClick={() => void query.refetch()}
            />
          }
        />
      </Stack>
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_MDL.TITLE} subtitle={MSG_MDL.SUBTITLE}>
        <HStack gap={3} wrap="wrap" align="end">
          <Selector
            label={MSG_MDL.CATEGORY}
            isLabelHidden
            hasClear
            placeholder="Tất cả module"
            options={CATEGORY_OPTIONS}
            value={category}
            width={180}
            onChange={(value) => setParam(MODULE_CATEGORY_PARAM, value || null)}
          />
          <TextInput
            type="search"
            label="Tìm module"
            isLabelHidden
            startIcon="search"
            enterKeyHint="search"
            hasClear
            placeholder="Tìm theo mã hoặc tên module"
            value={keyword}
            width={320}
            onChange={(value) => setParam(MODULE_SEARCH_PARAM, value || null)}
          />
        </HStack>
      </PageHeader>

      {query.isPending ? (
        <PageLoading />
      ) : (
        <Table<ModuleRow>
          data={sortedData}
          columns={columns}
          idKey="code"
          hasHover
          textOverflow="truncate"
          emptyState={
            <EmptyState description={hasFilter ? MSG_MDL.NO_MATCH : MSG_MDL.EMPTY} compact />
          }
          plugins={{ sort: sortPlugin }}
        />
      )}
    </Stack>
  );
}
