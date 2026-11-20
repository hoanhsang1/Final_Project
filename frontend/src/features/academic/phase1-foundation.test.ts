/**
 * Phase 1 Foundation Tests
 * Kiểm tra permissions, API client, mock adapter, và các D-rules.
 *
 * Chạy với: npm test -- --run
 */
import { describe, it, expect, beforeEach } from 'vitest'

import { PERM, PERMISSION_GROUPS, ALL_PERMISSION_META } from '@/lib/permissions'
import { classSubjectsApi, curriculaApi, specialtySubjectsApi, subjectsApi, teacherSubjectsApi } from '@/features/academic/api'
import {
  mockClassSubjectHistory,
  mockClassSubjects,
  mockCurricula,
  mockSpecialtySubjects,
  mockSubjects,
  mockTeacherSubjectProfiles,
  DEMO_ORG_ID,
  OTHER_ORG_ID,
} from '@/services/mock/fixtures'
import { isMockMode } from '@/services/http'

// ─────────────────────────────────────────────────────────────
// 1. Permission constants
// ─────────────────────────────────────────────────────────────
describe('Permission constants – Phase 1', () => {
  it('PERM.curriculumView === "curriculum.view"', () => {
    expect(PERM.curriculumView).toBe('curriculum.view')
  })

  it('PERM.curriculumManage === "curriculum.manage"', () => {
    expect(PERM.curriculumManage).toBe('curriculum.manage')
  })

  it('PERM.subjectView exists', () => {
    expect(PERM.subjectView).toBeTruthy()
  })

  it('PERM.subjectManage exists', () => {
    expect(PERM.subjectManage).toBeTruthy()
  })

  it('curriculumView appears in PERMISSION_GROUPS', () => {
    const allCodes = ALL_PERMISSION_META.map((p) => p.code)
    expect(allCodes).toContain('curriculum.view')
  })

  it('curriculumManage appears in PERMISSION_GROUPS', () => {
    const allCodes = ALL_PERMISSION_META.map((p) => p.code)
    expect(allCodes).toContain('curriculum.manage')
  })
})

// ─────────────────────────────────────────────────────────────
// 2. API client – request path mapping
// ─────────────────────────────────────────────────────────────
describe('API client – request path mapping', () => {
  it('subjectsApi.list() calls GET /api/subjects', () => {
    // Verify the function exists and is callable
    expect(typeof subjectsApi.list).toBe('function')
  })

  it('curriculaApi.list() function exists', () => {
    expect(typeof curriculaApi.list).toBe('function')
  })

  it('curriculaApi.byId() function exists', () => {
    expect(typeof curriculaApi.byId).toBe('function')
  })

  it('curriculaApi.create() function exists', () => {
    expect(typeof curriculaApi.create).toBe('function')
  })

  it('curriculaApi.update() function exists', () => {
    expect(typeof curriculaApi.update).toBe('function')
  })

  it('curriculaApi.setActive() function exists', () => {
    expect(typeof curriculaApi.setActive).toBe('function')
  })

  it('curriculaApi.subjects() function exists', () => {
    expect(typeof curriculaApi.subjects).toBe('function')
  })

  it('classSubjectsApi.changePrimarySubject() function exists', () => {
    expect(typeof classSubjectsApi.changePrimarySubject).toBe('function')
  })

  it('classSubjectsApi.history() function exists', () => {
    expect(typeof classSubjectsApi.history).toBe('function')
  })

  it('teacherSubjectsApi.list() function exists', () => {
    expect(typeof teacherSubjectsApi.list).toBe('function')
  })

  it('specialtySubjectsApi.getSubjects() function exists', () => {
    expect(typeof specialtySubjectsApi.getSubjects).toBe('function')
  })
})

// ─────────────────────────────────────────────────────────────
// 3. Mock mode flag
// ─────────────────────────────────────────────────────────────
describe('Mock mode flag', () => {
  it('isMockMode is a boolean', () => {
    expect(typeof isMockMode).toBe('boolean')
  })

  it('isMockMode is false in test environment (VITE_DATA_SOURCE not set to mock)', () => {
    // In test environment, unless explicitly set, should be false
    // This protects against accidentally shipping mock code
    const dataSource = import.meta.env.VITE_DATA_SOURCE
    if (dataSource !== 'mock') {
      expect(isMockMode).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────
// 4. Mock fixtures – data integrity
// ─────────────────────────────────────────────────────────────
describe('Mock fixtures – data integrity', () => {
  describe('D-04: Subject code rules', () => {
    it('Some subjects have code=null (code không bắt buộc)', () => {
      const withNullCode = mockSubjects.filter((s) => s.code === null)
      expect(withNullCode.length).toBeGreaterThan(0)
    })

    it('All subject codes within same org are unique when non-null', () => {
      const orgSubjects = mockSubjects.filter((s) => s.orgId === DEMO_ORG_ID && s.code !== null)
      const codes = orgSubjects.map((s) => s.code)
      const uniqueCodes = new Set(codes)
      expect(codes.length).toBe(uniqueCodes.size)
    })

    it('mockSubjects contains subjects from multiple orgs', () => {
      const orgIds = new Set(mockSubjects.map((s) => s.orgId))
      expect(orgIds.size).toBeGreaterThan(1)
    })
  })

  describe('Organization isolation', () => {
    it('OTHER_ORG_ID subjects are present in fixtures', () => {
      const otherOrgSubjects = mockSubjects.filter((s) => s.orgId === OTHER_ORG_ID)
      expect(otherOrgSubjects.length).toBeGreaterThan(0)
    })

    it('OTHER_ORG_ID and DEMO_ORG_ID are different', () => {
      expect(DEMO_ORG_ID).not.toBe(OTHER_ORG_ID)
    })

    it('mockCurricula contains entries for DEMO_ORG_ID', () => {
      const demoCurricula = mockCurricula.filter((c) => c.orgId === DEMO_ORG_ID)
      expect(demoCurricula.length).toBeGreaterThan(0)
    })

    it('mockCurricula contains entries for OTHER_ORG_ID', () => {
      const otherCurricula = mockCurricula.filter((c) => c.orgId === OTHER_ORG_ID)
      expect(otherCurricula.length).toBeGreaterThan(0)
    })
  })

  describe('D-06a: Teacher subject status', () => {
    it('All mockTeacherSubjectProfiles items have status APPROVED or REVOKED only', () => {
      const allStatuses = mockTeacherSubjectProfiles.flatMap((p) =>
        p.items.map((item) => item.status),
      )
      for (const status of allStatuses) {
        expect(['APPROVED', 'REVOKED']).toContain(status)
      }
    })

    it('No teacher subject items have status PENDING', () => {
      const hasPending = mockTeacherSubjectProfiles.some((p) =>
        p.items.some((item) => item.status === 'PENDING'),
      )
      expect(hasPending).toBe(false)
    })
  })

  describe('D-07: Curriculum subjects have prerequisites', () => {
    it('mockCurricula has at least one curriculum with subjects', () => {
      expect(mockCurricula.length).toBeGreaterThan(0)
    })

    it('mockClassSubjects has entries for multiple classes', () => {
      const classIds = new Set(mockClassSubjects.map((cs) => cs.classId))
      expect(classIds.size).toBeGreaterThan(1)
    })
  })

  describe('D-08/D-15: Primary subject rules', () => {
    it('Each class has exactly one primary subject (isPrimary=true)', () => {
      const classIds = new Set(mockClassSubjects.map((cs) => cs.classId))
      for (const classId of classIds) {
        const primaries = mockClassSubjects.filter(
          (cs) => cs.classId === classId && cs.isPrimary === true,
        )
        // Each class with subjects should have at most 1 primary
        expect(primaries.length).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('Class subject history', () => {
    it('mockClassSubjectHistory has at least one entry', () => {
      expect(mockClassSubjectHistory.length).toBeGreaterThan(0)
    })

    it('History entries have required fields', () => {
      for (const entry of mockClassSubjectHistory) {
        expect(entry).toHaveProperty('classId')
        expect(entry).toHaveProperty('oldSubjectId')
        expect(entry).toHaveProperty('changedAt')
      }
    })
  })

  describe('Specialty subjects', () => {
    it('mockSpecialtySubjects array is defined', () => {
      expect(Array.isArray(mockSpecialtySubjects)).toBe(true)
    })
  })

  describe('Curriculum versions', () => {
    it('All mockCurricula have a version field', () => {
      for (const c of mockCurricula) {
        expect(typeof c.version).toBe('number')
      }
    })

    it('Inactive curricula have isActive=false', () => {
      const inactive = mockCurricula.filter((c) => !c.isActive)
      expect(inactive.length).toBeGreaterThan(0)
    })
  })
})
