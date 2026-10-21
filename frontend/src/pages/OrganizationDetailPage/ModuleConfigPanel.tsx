import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Flex,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { AdminApiError, updateOrganizationModules } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import { MSG_MOD, MSG_ORG, msgCoreLocked } from '../../features/admin/adminMessages';
import { isCoreModule } from '../../features/admin/coreModules';
import { moduleStatusLabel } from '../../features/admin/statusLabels';
import type { OrganizationModule } from '../../features/admin/types';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';

const { Text } = Typography;

interface ModuleConfigPanelProps {
  orgId: string;
  /** Module tổ chức hiện đang có (từ `GET /organizations/{id}`). */
  modules: OrganizationModule[];
  /** Chỉ sửa được khi tổ chức còn `pending`. */
  editable: boolean;
}

/** Hai tập mã có cùng phần tử không? (không quan tâm thứ tự) */
function sameCodes(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((code) => set.has(code));
}

/**
 * Khối "Module đã đăng ký" + cấu hình module — `UC-ORG-03` (Đặc tả Sprint 2 §3.6).
 *
 * - Danh mục module lấy từ `GET /api/v1/modules` (`moduleCatalogKey`, cache 10 phút).
 * - Module của tổ chức lấy từ `GET /organizations/{id}` (mảng `modules`).
 * - `BR-06`: 4 module lõi bị KHOÁ, không thể bỏ (danh sách ở `CORE_MODULES`).
 * - Lưu: `PUT /organizations/{id}/modules` với **tập đầy đủ** module mong muốn.
 *
 * ⚠️ Endpoint lưu CHƯA có ở BE (`D-16`) → các ca `TC-MOD-*` là BLOCKED cho tới khi
 * Sang làm xong. Lỗi vẫn được xử lý đúng `NFR-REL-001`: KHÔNG báo thành công.
 */
export default function ModuleConfigPanel({ orgId, modules, editable }: ModuleConfigPanelProps) {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: moduleCatalogKey,
    queryFn: fetchModuleCatalog,
    staleTime: MODULE_CATALOG_STALE_TIME,
  });

  const currentCodes = useMemo(() => modules.map((m) => m.code), [modules]);
  /** Khoá của tập hiện tại — dùng để reset lựa chọn khi server trả dữ liệu mới. */
  const currentKey = JSON.stringify(currentCodes);

  const [selected, setSelected] = useState<string[]>(currentCodes);
  const [formError, setFormError] = useState<string | null>(null);

  // Đồng bộ lựa chọn khi server trả về tập module mới (sau khi lưu thành công).
  useEffect(() => {
    setSelected(JSON.parse(currentKey) as string[]);
    setFormError(null);
  }, [currentKey]);

  const saveMutation = useMutation({
    mutationFn: (codes: string[]) => updateOrganizationModules(orgId, codes),
    onSuccess: () => {
      message.success(MSG_MOD.SAVED);
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(orgId) });
    },
    onError: (error) => {
      const status = error instanceof AdminApiError ? error.status : null;
      if (status === 409) {
        message.warning(MSG_ORG.ALREADY_REVIEWED);
        void queryClient.invalidateQueries({ queryKey: adminKeys.detail(orgId) });
        return;
      }
      if (status === 400) {
        message.error(MSG_MOD.INVALID_MODULE);
        return;
      }
      // NFR-REL-001: lỗi/timeout ⇒ KHÔNG báo thành công, giữ nguyên lựa chọn để
      // người dùng thử lại (trạng thái tick KHÔNG bị coi là đã lưu).
      message.error(MSG_MOD.SAVE_FAILED);
    },
  });

  /** Danh sách hiển thị = hợp của danh mục và module tổ chức đang có. */
  const rows = useMemo(() => {
    const catalog = catalogQuery.data ?? [];
    const catalogByCode = new Map(catalog.map((c) => [c.code, c]));
    const orgByCode = new Map(modules.map((m) => [m.code, m]));
    const codes = Array.from(new Set([...catalog.map((c) => c.code), ...currentCodes])).sort();
    return codes.map((code) => ({
      code,
      name: catalogByCode.get(code)?.name ?? orgByCode.get(code)?.name ?? code,
      orgModule: orgByCode.get(code),
    }));
  }, [catalogQuery.data, currentCodes, modules]);

  /**
   * Module lõi đang BẬT thì bị KHOÁ (không cho bỏ) — `BR-06`.
   *
   * Module lõi mà tổ chức chưa có thì vẫn tick/bỏ được: `BR-06` chỉ cấm
   * "bỏ", không cấm "bật" (`TC-MOD-03`, `TC-MOD-04` cần tới nhánh này).
   *
   * Khoá dựa trên tập module **gốc** của tổ chức, không dựa trên lựa chọn tạm
   * thời — nếu không, tick thêm 1 module lõi sẽ bị khoá ngay, không bỏ lại được.
   */
  const isLockedCore = (code: string) => isCoreModule(code) && currentCodes.includes(code);

  const hasChanges = !sameCodes(selected, currentCodes);

  const handleToggle = (code: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, code] : prev.filter((c) => c !== code)));
    setFormError(null);
  };

  const handleSave = () => {
    setFormError(null);
    // Bỏ hết tick → chặn ở FE, KHÔNG gọi API (BE `@NotEmpty` cũng sẽ trả 400).
    if (selected.length === 0) {
      setFormError(MSG_MOD.REQUIRED);
      return;
    }
    saveMutation.mutate(selected);
  };

  const saveButton = editable ? (
    <Button
      type="primary"
      onClick={handleSave}
      loading={saveMutation.isPending}
      disabled={!hasChanges}
    >
      {MSG_MOD.SAVE}
    </Button>
  ) : null;

  return (
    <Card title={MSG_MOD.TITLE} extra={saveButton}>
      {catalogQuery.isPending && <Skeleton active paragraph={{ rows: 4 }} />}

      {catalogQuery.isError && (
        <Alert
          type="warning"
          showIcon
          role="alert"
          message={MSG_MOD.LOAD_FAILED}
          style={{ marginBottom: token.margin }}
        />
      )}

      {formError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={formError}
          style={{ marginBottom: token.margin }}
        />
      )}

      <Flex vertical gap={token.marginSM}>
        {rows.map((row) => {
          const locked = isLockedCore(row.code);
          const status = row.orgModule ? moduleStatusLabel(row.orgModule.status) : null;
          const checkbox = (
            <Checkbox
              checked={selected.includes(row.code)}
              disabled={locked || !editable}
              onChange={(event) => handleToggle(row.code, event.target.checked)}
            >
              {row.name}
            </Checkbox>
          );

          return (
            <Flex key={row.code} justify="space-between" align="center" gap={token.marginSM} wrap>
              <Flex align="center" gap={token.marginXS} wrap>
                {locked ? (
                  // Tooltip cần bọc trong <span> vì phần tử disabled không bắt sự kiện chuột.
                  <Tooltip title={msgCoreLocked(row.name)}>
                    <span>{checkbox}</span>
                  </Tooltip>
                ) : (
                  checkbox
                )}
                {/* Mã module hiện mờ — giúp tester đối chiếu với DB. */}
                <Text type="secondary">({row.code})</Text>
              </Flex>
              {status && <Tag color={status.color}>{status.label}</Tag>}
            </Flex>
          );
        })}
      </Flex>
    </Card>
  );
}
