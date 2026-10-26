/**
 * Query key của TanStack Query cho khu vực quản trị.
 *
 * Cấu trúc cố định để `invalidateQueries` luôn trúng:
 * - danh sách chờ duyệt: `['organizations', 'pending']`
 * - chi tiết tổ chức: `['organizations', <id>]`
 * - danh sách tất cả tổ chức: `['organizations', 'list', <query>]`
 * - dropdown tổ chức: `['organizations', 'options']`
 * - danh sách tài khoản: `['accounts', 'list', <query>]`
 * - chi tiết tài khoản: `['accounts', <id>]`
 * - nhật ký hệ thống: `['audit-logs', <query>]`
 *
 * Lưu ý: key nhóm `['organizations', …]` chung cho cả list/pending/detail →
 * `invalidateQueries({ queryKey: ['organizations'] })` sẽ tải lại tất cả,
 * đúng ý nghĩa "dữ liệu tổ chức vừa thay đổi".
 */
export const adminKeys = {
  pending: ['organizations', 'pending'] as const,
  detail: (orgId: string) => ['organizations', orgId] as const,
  list: (query: object) => ['organizations', 'list', query] as const,
  options: ['organizations', 'options'] as const,
  accounts: (query: object) => ['accounts', 'list', query] as const,
  account: (accountId: string) => ['accounts', accountId] as const,
  auditLogs: (query: object) => ['audit-logs', query] as const,
};
