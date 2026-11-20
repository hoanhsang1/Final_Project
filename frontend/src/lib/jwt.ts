import type { RoleCode, Session } from '@/types/session'

export interface JwtClaims {
  sub?: string
  userId?: string
  username?: string
  roles?: string[]
  role?: string
  permissions?: string[]
  permissionScopes?: Record<string, string[]>
  delegatedPermissions?: string[]
  permissionsStale?: boolean
  departmentId?: string | null
  orgId?: string | null
  mustChangePassword?: boolean
  exp?: number
  iat?: number
  iss?: string
  /**
   * Hai claim dưới đây KHÔNG có trong backend hiện tại; chỉ mock dùng để
   * mô phỏng đề xuất bổ sung (xem docs/INTEGRATION-DEPENDENCIES).
   */
  fullName?: string
  orgName?: string
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const binary = atob(padded)
  // atob trả về chuỗi nhị phân (mỗi ký tự là một byte); phải giải mã UTF-8
  // để giữ đúng tiếng Việt trong claim (họ tên, tên tổ chức).
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Đọc payload JWT. KHÔNG xác minh chữ ký — chỉ dùng cho UX. */
export function decodeJwt(token: string | null | undefined): JwtClaims {
  if (!token) return {}
  const parts = token.split('.')
  if (parts.length < 2) return {}
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]!)) as unknown
    return payload && typeof payload === 'object' ? (payload as JwtClaims) : {}
  } catch {
    return {}
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function normalizeScopes(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object') return {}
  const result: Record<string, string[]> = {}
  for (const [key, scopes] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(scopes)) result[key] = asStringArray(scopes)
  }
  return result
}

export function isTokenExpired(token: string | null | undefined, skewSeconds = 10): boolean {
  const claims = decodeJwt(token)
  if (!claims.exp) return false
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000
}

export function claimsToSession(claims: JwtClaims): Session | null {
  const userId = claims.userId ?? claims.sub
  if (!userId) return null

  return {
    user: {
      id: userId,
      username: claims.username ?? 'người dùng',
      fullName: claims.fullName ?? null,
      email: null,
      organizationId: claims.orgId ?? null,
      organizationName: claims.orgName ?? null,
      departmentId: claims.departmentId ?? null,
      mustChangePassword: claims.mustChangePassword === true,
    },
    roles: asStringArray(claims.roles) as RoleCode[],
    role: claims.role ?? null,
    permissions: asStringArray(claims.permissions),
    permissionScopes: normalizeScopes(claims.permissionScopes),
    delegatedPermissions: asStringArray(claims.delegatedPermissions),
    permissionsStale: claims.permissionsStale === true,
    modules: [],
    expiresAt: claims.exp ? claims.exp * 1000 : undefined,
  }
}
