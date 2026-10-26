import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reactivateOrganization, suspendOrganization } from './adminApi';

/** Chế độ thao tác với trạng thái tổ chức (`C1`). */
export type OrganizationAction = 'suspend' | 'reactivate';

/**
 * Mutation dùng CHUNG cho thao tác **Vô hiệu hoá / Kích hoạt lại** tổ chức.
 *
 * Dùng ở 2 chỗ: màn Tất cả tổ chức (nút trên bảng) và màn Chi tiết tổ chức.
 * Thành công → tải lại mọi query nhóm `['organizations']` (danh sách chờ duyệt,
 * tất cả tổ chức, chi tiết, dropdown đều liên quan).
 */
export function useSuspendOrganization(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, reason }: { action: OrganizationAction; reason?: string }) =>
      action === 'suspend'
        ? suspendOrganization(orgId, reason ?? '')
        : reactivateOrganization(orgId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
