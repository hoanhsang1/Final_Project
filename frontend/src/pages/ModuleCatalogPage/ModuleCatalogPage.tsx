import {
  Alert,
  Button,
  Empty,
  Flex,
  Input,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { TableProps } from 'antd';
import { useMemo } from 'react';
import { MSG_MDL } from '../../features/admin/adminMessages';
import { CORE_MODULES } from '../../features/admin/coreModules';
import type { ModuleCatalogItem } from '../../features/modules/moduleApi';
import {
  MODULE_CATEGORY_PARAM,
  MODULE_SEARCH_PARAM,
  useModuleCatalogPage,
} from './use-module-catalog';

const { Text, Title } = Typography;

/** Giá trị hiển thị khi BE chưa trả (`D-28`). */
const EMPTY_VALUE = '—';

/** Lựa chọn bộ lọc phân loại — giá trị lưu trong query param `?loi=`. */
const CATEGORY_OPTIONS = [
  { value: '', label: 'Tất cả module' },
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
 * Trạng thái: **loading** (Skeleton) · **empty** (Empty) · **error** (Alert +
 * Thử lại) · **success**. No-permission do `AdminGuard` chặn trước.
 */
export default function ModuleCatalogPage() {
  const { token } = theme.useToken();
  const { query, category, keyword, setParam } = useModuleCatalogPage();

  const columns = useMemo<TableProps<ModuleCatalogItem>['columns']>(
    () => [
      {
        title: 'Mã module',
        dataIndex: 'code',
        key: 'code',
        sorter: (a, b) => a.code.localeCompare(b.code),
      },
      {
        title: 'Tên module',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name, 'vi'),
      },
      {
        title: MSG_MDL.CATEGORY,
        key: 'category',
        filters: [
          { text: MSG_MDL.CORE, value: 'core' },
          { text: MSG_MDL.OPTIONAL, value: 'mo-rong' },
        ],
        onFilter: (value, record) =>
          value === 'core'
            ? CORE_MODULES.includes(record.code)
            : !CORE_MODULES.includes(record.code),
        render: (_value, record) =>
          CORE_MODULES.includes(record.code) ? (
            // BR-08: Tag LUÔN kèm chữ, không chỉ màu.
            <Tag color="warning">{MSG_MDL.CORE}</Tag>
          ) : (
            <Tag color="default">{MSG_MDL.OPTIONAL}</Tag>
          ),
      },
      {
        title: 'Mô tả',
        dataIndex: 'description',
        key: 'description',
        // `D-28` — BE chưa trả trường này, hiện "—" thay vì để trống.
        render: (value?: string) => value || EMPTY_VALUE,
      },
    ],
    [],
  );

  const catalog = useMemo(() => query.data ?? [], [query.data]);
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

  const hasFilter = category !== null || keyword.trim() !== '';

  if (query.isError) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_MDL.LOAD_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại. Danh sách chưa được tải."
        action={
          <Button onClick={() => query.refetch()} loading={query.isFetching}>
            Thử lại
          </Button>
        }
      />
    );
  }

  return (
    <Flex vertical gap={token.marginMD}>
      <div>
        <Title level={1} style={{ margin: 0 }}>
          {MSG_MDL.TITLE}
        </Title>
        <Text type="secondary">{MSG_MDL.SUBTITLE}</Text>
      </div>

      {/* `D-15`: chưa có cột `is_core` trong DB → phân loại lõi do FE quy định, nói rõ với người dùng. */}
      <Alert type="info" showIcon message={MSG_MDL.IS_CORE_NOTICE} />

      <Flex gap={token.marginSM} wrap>
        <Select
          aria-label={MSG_MDL.CATEGORY}
          value={category ?? ''}
          options={CATEGORY_OPTIONS}
          style={{ minWidth: 180 }}
          onChange={(value) => setParam(MODULE_CATEGORY_PARAM, value || null)}
        />
        <Input.Search
          allowClear
          aria-label="Tìm module"
          placeholder="Tìm theo mã hoặc tên module"
          value={keyword}
          onChange={(event) => setParam(MODULE_SEARCH_PARAM, event.target.value || null)}
          style={{ maxWidth: 320 }}
        />
      </Flex>

      {query.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Table<ModuleCatalogItem>
          rowKey="code"
          columns={columns}
          dataSource={filtered}
          locale={{
            emptyText: (
              <Empty description={hasFilter ? MSG_MDL.NO_MATCH : MSG_MDL.EMPTY} />
            ),
          }}
          pagination={false}
          scroll={{ x: 640 }}
        />
      )}
    </Flex>
  );
}
