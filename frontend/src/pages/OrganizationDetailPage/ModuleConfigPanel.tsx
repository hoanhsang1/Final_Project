import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  CheckboxInput,
  HStack,
  Text,
  VStack,
} from '@astryxdesign/core';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import DetailSection from '../../components/DetailSection/DetailSection';
import PageLoading from '../../components/PageLoading/PageLoading';
import { AdminApiError, updateOrganizationModules } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';
import { MSG_MOD, MSG_ORG, msgCoreLocked } from '../../features/admin/adminMessages';
import { isCoreModule } from '../../features/admin/coreModules';
import {
  clearDraft,
  readDraft,
  writeDraft,
  type ModuleConfigDraft,
} from '../../features/admin/moduleConfigDraft';
import { moduleStatusLabel } from '../../features/admin/statusLabels';
import type { OrganizationModule } from '../../features/admin/types';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';
import { useNotify } from '../../hooks/useNotify';

interface ModuleConfigPanelProps {
  orgId: string;
  /** Module tổ chức hiện đang có (từ `GET /organizations/{id}`). */
  modules: OrganizationModule[];
  /**
   * Chỉ `suspended` là không sửa được (§3.3 C2) — `pending`/`active`/`rejected`
   * đều sửa được, kể cả khi tổ chức đã duyệt.
   */
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
  const notify = useNotify();
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
  /**
   * Bản nháp cấu hình — giữ lại lựa chọn khi người dùng rời trang chưa lưu.
   * Đọc 1 lần lúc mount (hoặc khi đổi `orgId`), cập nhật khi lưu/bỏ nháp.
   */
  const [draft, setDraft] = useState<ModuleConfigDraft | null>(() => readDraft(orgId));
  /**
   * Vừa lưu thành công mà refetch còn chạy → lựa chọn vẫn "khác tập gốc",
   * nếu chặn lúc này sẽ hiện hộp thoại "thay đổi chưa lưu" sai.
   */
  const suppressBlockRef = useRef(false);

  // Đồng bộ lựa chọn khi server trả về tập module mới (sau khi lưu thành công).
  useEffect(() => {
    setSelected(JSON.parse(currentKey) as string[]);
    setFormError(null);
  }, [currentKey]);

  const saveMutation = useMutation({
    mutationFn: (codes: string[]) => updateOrganizationModules(orgId, codes),
    onSuccess: () => {
      notify.success(MSG_MOD.SAVED);
      // Đã lên server → nháp không còn giá trị, xoá để không hỏi "áp dụng nháp" nữa.
      clearDraft(orgId);
      setDraft(null);
      // Refetch còn đang chạy → đừng chặn người dùng rời trang với "thay đổi chưa lưu".
      suppressBlockRef.current = true;
      void queryClient.invalidateQueries({ queryKey: adminKeys.detail(orgId) });
    },
    onError: (error) => {
      const status = error instanceof AdminApiError ? error.status : null;
      if (status === 409) {
        notify.error(MSG_ORG.ALREADY_REVIEWED);
        void queryClient.invalidateQueries({ queryKey: adminKeys.detail(orgId) });
        return;
      }
      if (status === 400) {
        setFormError(MSG_MOD.INVALID_MODULE);
        return;
      }
      // NFR-REL-001: lỗi/timeout ⇒ KHÔNG báo thành công, giữ nguyên lựa chọn để
      // người dùng thử lại (trạng thái tick KHÔNG bị coi là đã lưu).
      // Lỗi hiện bằng `Banner` gắn với biểu mẫu thay cho toast dễ bị bỏ lỡ.
      setFormError(MSG_MOD.SAVE_FAILED);
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
  /**
   * Khi `editable = false` (tổ chức không còn `pending`) không có nút Lưu, nên
   * hai thứ sau phải tắt theo — nếu không: bấm "Áp dụng nháp" ⇒ `hasChanges`
   * thật nhưng lưu được đâu ⇒ bị hỏi "chưa lưu" ở mọi lần rời trang, mà nút
   * "Bỏ nháp" lại ẩn theo `!hasChanges` → kẹt cứng.
   */
  /** Cảnh báo chỉ khi đang sửa được, ĐANG có thay đổi và vừa rồi chưa lưu xong. */
  const shouldWarnUnsaved = editable && hasChanges && !suppressBlockRef.current;
  /** Nháp chỉ mời áp dụng khi đang sửa được, chưa sửa gì và nháp khác tập đang lưu. */
  const draftToRestore =
    editable && draft && !hasChanges && !sameCodes(draft.codes, currentCodes) ? draft : null;

  // Tổ chức khác → đọc nháp của tổ chức đó (nháp không được rò sang nhau).
  useEffect(() => {
    setDraft(readDraft(orgId));
  }, [orgId]);

  // Còn thay đổi mà đang sửa được thì ghi nháp liên tục — mất điện/đóng tab vẫn lấy lại được.
  useEffect(() => {
    if (editable && hasChanges) {
      writeDraft(orgId, selected);
    }
  }, [editable, hasChanges, orgId, selected]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldWarnUnsaved && currentLocation.pathname !== nextLocation.pathname,
  );

  // Đóng tab / F5 / gõ URL — trình duyệt hỏi trước khi xoá mất lựa chọn.
  useEffect(() => {
    if (!shouldWarnUnsaved) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Trình duyệt cũ chỉ hiện hộp thoại khi `returnValue` được gán.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [shouldWarnUnsaved]);

  const handleToggle = (code: string, checked: boolean) => {
    suppressBlockRef.current = false;
    setSelected((prev) => (checked ? [...prev, code] : prev.filter((c) => c !== code)));
    setFormError(null);
  };

  const handleApplyDraft = () => {
    if (!draft) {
      return;
    }
    suppressBlockRef.current = false;
    setSelected(draft.codes);
    setFormError(null);
    notify.success(MSG_MOD.DRAFT_APPLIED);
  };

  const handleDiscardDraft = () => {
    clearDraft(orgId);
    setDraft(null);
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

  // Danh mục chưa tải xong / tải lỗi → KHÔNG cho lưu (lưu lên tập thiếu = mất module).
  const catalogNotReady = catalogQuery.isPending || catalogQuery.isError;

  const saveButton = editable ? (
    <Button
      variant="primary"
      size="lg"
      label={MSG_MOD.SAVE}
      onClick={handleSave}
      isLoading={saveMutation.isPending}
      isDisabled={!hasChanges || catalogNotReady}
    />
  ) : undefined;

  return (
    <>
      <DetailSection title={MSG_MOD.TITLE} extra={saveButton}>
        {formError ? (
          <Banner
            status="error"
            title={formError}
            collapsible={false}
            role="alert"
            style={{ marginBottom: 'var(--spacing-4)' }}
          />
        ) : null}

        {/* Nháp từ lần chỉnh sửa trước — chỉ mời khi người dùng chưa sửa gì. */}
        {draftToRestore ? (
          <Banner
            status="info"
            role="status"
            title={MSG_MOD.DRAFT_FOUND}
            description={
              draftToRestore.savedAt
                ? `Ghi lúc ${dayjs(draftToRestore.savedAt).format('HH:mm DD/MM/YYYY')} — áp dụng để làm tiếp phần đang dở.`
                : 'Áp dụng để làm tiếp phần đang dở.'
            }
            collapsible={false}
            endContent={
              <HStack gap={2}>
                <Button variant="secondary" size="sm" label={MSG_MOD.DRAFT_APPLY} onClick={handleApplyDraft} />
                <Button variant="ghost" size="sm" label={MSG_MOD.DRAFT_DISCARD} onClick={handleDiscardDraft} />
              </HStack>
            }
            style={{ marginBottom: 'var(--spacing-4)' }}
          />
        ) : null}

        {/* Trạng thái loading của danh mục — `PageLoading`, không hiện danh sách rỗng. */}
        {catalogQuery.isPending ? (
          <PageLoading />
        ) : (
          <>
            {catalogQuery.isError ? (
              <Banner
                status="warning"
                role="alert"
                title={MSG_MOD.LOAD_FAILED}
                description="Danh mục module chưa tải được nên chưa thể lưu cấu hình. Hãy thử lại."
                collapsible={false}
                endContent={
                  <Button
                    variant="secondary"
                    size="sm"
                    label={MSG_ORG.RETRY}
                    isLoading={catalogQuery.isFetching}
                    onClick={() => void catalogQuery.refetch()}
                  />
                }
                style={{ marginBottom: 'var(--spacing-4)' }}
              />
            ) : null}

            <VStack gap={3}>
              {rows.map((row) => {
                const locked = isLockedCore(row.code);
                const status = row.orgModule ? moduleStatusLabel(row.orgModule.status) : null;

                return (
                  <HStack key={row.code} justify="between" align="center" gap={2} wrap="wrap">
                    <HStack align="center" gap={1} wrap="wrap">
                      {/*
                        `BR-06`: module lõi đang bật bị khoá. `disabledMessage` của
                        Astryx vừa khoá vừa hiện tooltip lý do, và giữ ô trong
                        tab order (`aria-disabled`) để trình đọc màn hình đọc được
                        lý do — không cần bọc `Tooltip` quanh `<span>` như antd.
                      */}
                      <CheckboxInput
                        label={row.name}
                        value={selected.includes(row.code)}
                        isDisabled={locked || !editable}
                        disabledMessage={locked ? msgCoreLocked(row.name) : undefined}
                        onChange={(checked) => handleToggle(row.code, checked)}
                      />
                      {/* Mã module hiện mờ — giúp tester đối chiếu với DB. */}
                      <Text type="supporting">({row.code})</Text>
                    </HStack>
                    {/* BR-08: Badge luôn kèm CHỮ, màu chỉ là tín hiệu phụ. */}
                    {status ? <Badge variant={status.badge} label={status.label} /> : null}
                  </HStack>
                );
              })}
            </VStack>
          </>
        )}
      </DetailSection>

      {/*
        Rời trang khi còn thay đổi chưa lưu — `AlertDialog` của Astryx thay cho
        `modal.confirm` của antd. Điều khiển trực tiếp bằng `blocker.state` nên
        không cần `useEffect` mở hộp thoại (bớt một nguồn trạng thái trùng).
      */}
      <AlertDialog
        isOpen={blocker.state === 'blocked'}
        onOpenChange={(next) => {
          if (!next) blocker.reset?.();
        }}
        title={MSG_MOD.UNSAVED_TITLE}
        description={MSG_MOD.UNSAVED_CONTENT}
        cancelLabel={MSG_MOD.UNSAVED_STAY}
        actionLabel={MSG_MOD.UNSAVED_LEAVE}
        actionVariant="destructive"
        onAction={() => blocker.proceed?.()}
      />
    </>
  );
}
