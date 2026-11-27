import { describe, expect, it } from 'vitest'

import { translateError } from '@/lib/error-messages'

describe('translateError', () => {
  it('dịch mã lỗi nghiệp vụ sang tiếng Việt', () => {
    expect(translateError({ code: 'DEPARTMENT_NOT_EMPTY', status: 409 })).toContain('còn nhân sự')
    expect(translateError({ code: 'INVALID_CREDENTIALS', status: 401 })).toContain(
      'không đúng',
    )
    expect(translateError({ code: 'SELF_APPROVAL_NOT_ALLOWED', status: 403 })).toContain(
      'tự duyệt',
    )
  })

  it('không hiển thị nguyên văn message tiếng Anh của backend', () => {
    const message = translateError({
      code: 'SOMETHING_NEW',
      status: 400,
      message: 'Unexpected internal failure',
    })
    expect(message).not.toContain('Unexpected internal failure')
    expect(message).toContain('chưa hợp lệ')
  })

  it('rơi về thông điệp theo HTTP status', () => {
    expect(translateError({ status: 404 })).toContain('Không tìm thấy')
    expect(translateError({ status: 503 })).toContain('tạm thời')
  })

  it('không có status nghĩa là lỗi kết nối', () => {
    expect(translateError({})).toContain('Không kết nối được')
  })

  it('mã giáo viên không hợp lệ có thông điệp riêng', () => {
    expect(translateError({ code: 'TEACHER_NOT_AVAILABLE', status: 409 })).toContain('Đang dạy')
  })

  it('dịch lỗi phòng học sang tiếng Việt', () => {
    expect(translateError({ code: 'ROOM_TYPE_MISMATCH', status: 409 })).toContain('phòng máy')
    expect(translateError({ code: 'ROOM_NOT_AVAILABLE', status: 409 })).toContain('không khả dụng')
  })

  it('dịch lỗi danh mục môn học sang tiếng Việt', () => {
    expect(translateError({ code: 'SUBJECT_CATEGORY_EXISTS', status: 409 })).toContain(
      'đã tồn tại',
    )
    expect(translateError({ code: 'SUBJECT_CATEGORY_INVALID', status: 400 })).toContain(
      'không hợp lệ',
    )
    expect(translateError({ code: 'ROOM_REQUIREMENT_INVALID', status: 400 })).toContain('Phòng máy')
    expect(
      translateError({ code: 'SUBJECT_USAGE_CONFIRMATION_REQUIRED', status: 409 }),
    ).toContain('Xác nhận')
  })

  it('dịch lỗi giáo viên không đủ điều kiện dạy môn', () => {
    const message = translateError({ code: 'SUBJECT_MISMATCH', status: 409 })
    expect(message).toContain('không đủ điều kiện')
    expect(message).toContain('Đang dạy')
    expect(translateError({ code: 'SPECIALTY_NOT_FOUND', status: 404 })).toContain(
      'Không tìm thấy',
    )
  })

  it('dịch lỗi tiên quyết môn học sang tiếng Việt', () => {
    expect(translateError({ code: 'PREREQUISITE_CYCLE', status: 400 })).toContain('vòng lặp')
    expect(translateError({ code: 'PREREQUISITE_STAGE_INVALID', status: 400 })).toContain(
      'sau giai đoạn',
    )
  })
})
