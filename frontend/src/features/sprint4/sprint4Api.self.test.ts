import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Sprint4ApiError,
  fetchMyClassStudents,
  fetchStudentSelf,
  fetchStudentSelfClasses,
  fetchTeacherSelf,
  fetchTeacherSelfClasses,
} from './sprint4Api';

/** Mock tầng HTTP — kiểm tra URL contract mà không cần gateway chạy. */
const mockGet = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

/** `TeacherDetailResponse` không có classCount/noClass/classLabel — wrapper phải trả nguyên payload. */
const TEACHER_SELF_RESPONSE = {
  userId: 'u-vyvy',
  staffCode: 'GV001',
  fullName: 'Vy Vỹ',
  email: 'vyvy@example.com',
  phone: '0901234567',
  departmentId: 'd-toan',
  specialties: [{ id: 'sp-toan', name: 'Toán' }],
  contractType: 'CO_HUU',
  teachingStatus: 'DANG_DAY',
  positionIds: ['pos-gv'],
  classes: [
    {
      id: 'c-12a1',
      classCode: '12A1',
      name: 'Lớp 12A1',
      status: 'DANG_DIEN_RA',
      closeState: 'NONE',
    },
  ],
  version: 3,
  createdAt: '2026-11-01T03:00:00Z',
  updatedAt: '2026-11-02T03:00:00Z',
};

const TEACHER_CLASSES_RESPONSE = [
  {
    id: 'c-12a1',
    classCode: '12A1',
    name: 'Lớp 12A1',
    status: 'DANG_DIEN_RA',
    closeState: 'NONE',
    needsReassignment: false,
    reassignmentReason: null,
  },
];

/** `StudentResponse` thật có orgId/createdBy — wrapper self không được bỏ các field này. */
const STUDENT_SELF_RESPONSE = {
  id: 's-demo',
  orgId: 'org-1',
  studentCode: 'HS001',
  fullName: 'Demo Student',
  dateOfBirth: '2010-05-01',
  email: 'demo.student@example.com',
  phone: '0901234567',
  status: 'active',
  classId: 'c-12a1',
  classCode: '12A1',
  className: 'Lớp 12A1',
  accountUsername: 'demo_student',
  accountCreatedAt: '2026-11-03T03:00:00Z',
  createdBy: 'u-admin',
  createdAt: '2026-11-01T03:00:00Z',
  updatedAt: '2026-11-02T03:00:00Z',
};

const STUDENT_CLASSES_RESPONSE = [
  {
    id: 'c-12a1',
    classCode: '12A1',
    name: 'Lớp 12A1',
    academicYear: '2026-2027',
    startDate: '2026-09-05',
    endDate: '2027-05-20',
    status: 'DANG_DIEN_RA',
    closeState: 'NONE',
    teacherName: 'Vy Vỹ',
    subjectName: 'Toán',
  },
];

beforeEach(() => {
  mockGet.mockReset();
});

describe('wrapper endpoint self (/me)', () => {
  it('fetchTeacherSelf gọi GET /api/teachers/me và trả nguyên payload', async () => {
    mockGet.mockResolvedValue({ data: TEACHER_SELF_RESPONSE });

    await expect(fetchTeacherSelf()).resolves.toEqual(TEACHER_SELF_RESPONSE);
    expect(mockGet).toHaveBeenCalledWith('/api/teachers/me');
  });

  it('fetchTeacherSelfClasses gọi GET /api/teachers/me/classes và trả mảng thuần', async () => {
    mockGet.mockResolvedValue({ data: TEACHER_CLASSES_RESPONSE });

    await expect(fetchTeacherSelfClasses()).resolves.toEqual(TEACHER_CLASSES_RESPONSE);
    expect(mockGet).toHaveBeenCalledWith('/api/teachers/me/classes');
  });

  it('fetchMyClassStudents mã hoá classId trong URL và trả mảng thuần', async () => {
    mockGet.mockResolvedValue({ data: [STUDENT_SELF_RESPONSE] });

    await expect(fetchMyClassStudents('12A1/#?')).resolves.toEqual([STUDENT_SELF_RESPONSE]);
    expect(mockGet).toHaveBeenCalledWith('/api/classes/me/12A1%2F%23%3F/students');
  });

  it('fetchStudentSelf gọi GET /api/students/me và trả nguyên payload', async () => {
    mockGet.mockResolvedValue({ data: STUDENT_SELF_RESPONSE });

    await expect(fetchStudentSelf()).resolves.toEqual(STUDENT_SELF_RESPONSE);
    expect(mockGet).toHaveBeenCalledWith('/api/students/me');
  });

  it('fetchStudentSelfClasses gọi GET /api/students/me/classes và trả mảng thuần', async () => {
    mockGet.mockResolvedValue({ data: STUDENT_CLASSES_RESPONSE });

    await expect(fetchStudentSelfClasses()).resolves.toEqual(STUDENT_CLASSES_RESPONSE);
    expect(mockGet).toHaveBeenCalledWith('/api/students/me/classes');
  });

  it('lỗi 403 từ wrapper self thành Sprint4ApiError có status 403', async () => {
    mockGet.mockRejectedValue({
      isAxiosError: true,
      response: { status: 403, data: { code: 'FORBIDDEN', message: 'Forbidden' } },
    });

    const error = await fetchTeacherSelf().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(Sprint4ApiError);
    expect(error).toMatchObject({ status: 403 });
  });
});
