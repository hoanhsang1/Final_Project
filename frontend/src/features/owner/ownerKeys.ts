/**
 * Query key của TanStack Query cho khu vực Owner.
 *
 * Cấu trúc cố định để `invalidateQueries` luôn trúng:
 * - danh sách phòng ban: `['owner', 'departments']`
 * - nhân viên của phòng ban: `['owner', 'departments', <id>, 'members']`
 * - chức vụ: `['owner', 'positions']`
 * - danh mục quyền: `['owner', 'permissions']`
 *
 * Nhóm `['owner', 'departments']` dùng chung cho danh sách và nhân viên, nên
 * `invalidateQueries({ queryKey: ownerKeys.departments() })` sẽ tải lại cả hai —
 * đúng nghĩa "dữ liệu phòng ban vừa thay đổi".
 */
export const ownerKeys = {
  departments: () => ['owner', 'departments'] as const,
  members: (departmentId: string) => ['owner', 'departments', departmentId, 'members'] as const,
  availablePermissions: (departmentId: string) =>
    ['owner', 'departments', departmentId, 'available-permissions'] as const,
  positions: () => ['owner', 'positions'] as const,
  positionImpact: (positionId: string) => ['owner', 'positions', positionId, 'impact'] as const,
  permissions: () => ['owner', 'permissions'] as const,
  bundles: () => ['owner', 'permission-bundles'] as const,
  generalManagers: () => ['owner', 'general-manager'] as const,
  generalManagerCandidates: () => ['owner', 'general-manager', 'candidates'] as const,
  delegations: () => ['owner', 'delegations'] as const,
  myDelegations: () => ['delegations', 'me'] as const,
};
