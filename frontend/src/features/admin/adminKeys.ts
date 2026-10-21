/**
 * Query key của TanStack Query cho khu vực quản trị.
 *
 * Cấu trúc cố định để `invalidateQueries` luôn trúng:
 * - danh sách chờ duyệt: `['organizations', 'pending']`
 * - chi tiết tổ chức: `['organizations', <id>]`
 */
export const adminKeys = {
  pending: ['organizations', 'pending'] as const,
  detail: (orgId: string) => ['organizations', orgId] as const,
};
