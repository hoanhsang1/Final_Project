import { isOwner, isSuperAdmin, WORKSPACES, type WorkspaceId } from '@/lib/nav'
import type { Session } from '@/types/session'

export function canEnter(session: Session, workspaceId: WorkspaceId): boolean {
  const workspace = WORKSPACES.find((item) => item.id === workspaceId)
  return workspace ? workspace.canEnter(session) : false
}

export { defaultRouteFor } from '@/lib/nav'
export { isOwner, isSuperAdmin }
