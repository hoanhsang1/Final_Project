import { describe, expect, it } from 'vitest'

import { enabledModuleCodes } from '@/lib/modules'

describe('enabledModuleCodes', () => {
  it('chỉ giữ module có trạng thái active', () => {
    expect(
      enabledModuleCodes([
        { code: 'STUDENT_MANAGEMENT', status: 'active' },
        { code: 'SCHEDULE_MANAGEMENT', status: 'disabled' },
        { code: 'FACILITY_MANAGEMENT', status: 'locked' },
        { code: 'EQUIPMENT_MANAGEMENT', status: 'not_registered' },
      ]),
    ).toEqual(['STUDENT_MANAGEMENT'])
  })

  it('không có module nào thì trả mảng rỗng', () => {
    expect(enabledModuleCodes([])).toEqual([])
  })
})
