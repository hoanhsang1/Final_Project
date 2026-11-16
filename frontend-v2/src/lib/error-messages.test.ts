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
})
