import { useQuery } from '@tanstack/react-query';
import { fetchAccount } from '../../features/admin/adminApi';
import { adminKeys } from '../../features/admin/adminKeys';

/**
 * Container — server state của màn chi tiết tài khoản.
 *
 * `retry: false` vì 404 (không có tài khoản) thử lại cũng vô nghĩa, và retry
 * ẩn mất trạng thái lỗi mà người dùng cần thấy.
 */
export function useAccountDetailQuery(accountId: string) {
  return useQuery({
    queryKey: adminKeys.account(accountId),
    queryFn: () => fetchAccount(accountId),
    enabled: Boolean(accountId),
    retry: false,
  });
}
