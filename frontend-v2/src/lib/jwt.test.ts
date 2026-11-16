import { describe, expect, it } from 'vitest'

import { claimsToSession, decodeJwt, isTokenExpired, normalizeScopes } from '@/lib/jwt'

function encode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeToken(payload: Record<string, unknown>): string {
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('decodeJwt', () => {
  it('đọc được payload của token hợp lệ', () => {
    const token = makeToken({ userId: 'u1', username: 'an', roles: ['STAFF'] })
    expect(decodeJwt(token)).toMatchObject({ userId: 'u1', username: 'an', roles: ['STAFF'] })
  })

  it('trả về object rỗng với token hỏng hoặc rỗng', () => {
    expect(decodeJwt(null)).toEqual({})
    expect(decodeJwt('không-phải-jwt')).toEqual({})
    expect(decodeJwt('a.@@@.c')).toEqual({})
  })

  it('giữ đúng tiếng Việt trong claim (giải mã UTF-8)', () => {
    const token = makeToken({
      userId: 'u1',
      username: 'owner01',
      fullName: 'Nguyễn Minh Anh',
      orgName: 'Trường THPT Mẫu MEMS',
    })
    const claims = decodeJwt(token)
    expect(claims.fullName).toBe('Nguyễn Minh Anh')
    expect(claims.orgName).toBe('Trường THPT Mẫu MEMS')
  })
})

describe('claimsToSession', () => {
  it('chuẩn hoá claim thiếu và giữ đúng quyền hiệu lực', () => {
    const session = claimsToSession({
      userId: 'u1',
      username: 'hr01',
      roles: ['MANAGER'],
      permissions: ['employee.view', 'employee.create'],
      permissionScopes: { 'employee.view': ['DEPARTMENT:d1'] },
      delegatedPermissions: ['class.view'],
      departmentId: 'd1',
      orgId: 'o1',
      mustChangePassword: true,
      exp: Math.floor(Date.now() / 1000) + 600,
    })

    expect(session).not.toBeNull()
    expect(session?.user.id).toBe('u1')
    expect(session?.roles).toEqual(['MANAGER'])
    expect(session?.permissions).toEqual(['employee.view', 'employee.create'])
    expect(session?.permissionScopes['employee.view']).toEqual(['DEPARTMENT:d1'])
    expect(session?.delegatedPermissions).toEqual(['class.view'])
    expect(session?.user.mustChangePassword).toBe(true)
    expect(session?.modules).toEqual([])
  })

  it('trả null khi không có định danh người dùng', () => {
    expect(claimsToSession({ username: 'x' })).toBeNull()
  })
})

describe('isTokenExpired', () => {
  it('nhận biết token đã hết hạn', () => {
    const expired = makeToken({ userId: 'u1', exp: Math.floor(Date.now() / 1000) - 60 })
    expect(isTokenExpired(expired)).toBe(true)
  })

  it('token còn hạn thì không bị coi là hết hạn', () => {
    const valid = makeToken({ userId: 'u1', exp: Math.floor(Date.now() / 1000) + 600 })
    expect(isTokenExpired(valid)).toBe(false)
  })

  it('token không có exp được coi là còn hiệu lực phía client', () => {
    expect(isTokenExpired(makeToken({ userId: 'u1' }))).toBe(false)
  })
})

describe('normalizeScopes', () => {
  it('bỏ giá trị không phải mảng chuỗi', () => {
    expect(normalizeScopes({ a: ['ORGANIZATION'], b: 'x', c: [1, 'DEPARTMENT:d1'] })).toEqual({
      a: ['ORGANIZATION'],
      c: ['DEPARTMENT:d1'],
    })
    expect(normalizeScopes(null)).toEqual({})
  })
})
