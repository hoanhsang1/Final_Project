import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createStudent,
  deleteStudent,
  fetchStudent,
  fetchStudents,
  updateStudent,
} from './sprint4Api';

/**
 * Mock tầng HTTP (axios client) — kiểm tra contract của API học sinh mà không
 * phụ thuộc mạng hay PeopleService đang chạy. Cùng khuôn với
 * `features/owner/ownerApi.test.ts`.
 */
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

/** `StudentResponse` của PeopleService (đủ field để kiểm tra bước map). */
const STUDENT_RESPONSE = {
  id: 's-1',
  orgId: 'org-1',
  studentCode: 'HS001',
  fullName: 'Nguyễn Văn A',
  dateOfBirth: '2010-05-01',
  email: 'an@example.com',
  phone: '0901234567',
  status: 'active',
  classId: 'c-1',
  classCode: 'L10A',
  className: 'Lớp 10A',
  createdBy: 'u-1',
  createdAt: '2026-11-01T03:00:00Z',
  updatedAt: '2026-11-02T03:00:00Z',
  accountUsername: 'hs.an',
  accountCreatedAt: '2026-11-03T03:00:00Z',
};

/** `StudentListItem` sau khi bỏ `orgId`/`createdBy` và chuẩn hoá field null. */
const STUDENT_ITEM = {
  id: 's-1',
  studentCode: 'HS001',
  fullName: 'Nguyễn Văn A',
  dateOfBirth: '2010-05-01',
  email: 'an@example.com',
  phone: '0901234567',
  status: 'active',
  classId: 'c-1',
  classCode: 'L10A',
  className: 'Lớp 10A',
  accountUsername: 'hs.an',
  accountCreatedAt: '2026-11-03T03:00:00Z',
  createdAt: '2026-11-01T03:00:00Z',
  updatedAt: '2026-11-02T03:00:00Z',
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe('học sinh', () => {
  it('fetchStudents gọi GET /api/students với params và chuẩn hoá phân trang', async () => {
    mockGet.mockResolvedValue({
      data: { items: [STUDENT_RESPONSE], total: 1, page: 1, size: 20 },
    });

    const query = { page: 1, size: 20, q: 'An', status: 'active' };
    await expect(fetchStudents(query)).resolves.toEqual({
      items: [STUDENT_RESPONSE],
      total: 1,
      page: 1,
      size: 20,
      pages: 1,
    });
    expect(mockGet).toHaveBeenCalledWith('/api/students', { params: query });
  });

  it('fetchStudent gọi GET /api/students/{id} và map sang StudentListItem', async () => {
    mockGet.mockResolvedValue({ data: STUDENT_RESPONSE });

    await expect(fetchStudent('s-1')).resolves.toEqual(STUDENT_ITEM);
    expect(mockGet).toHaveBeenCalledWith('/api/students/s-1');
  });

  it('createStudent gửi POST /api/students đúng body', async () => {
    mockPost.mockResolvedValue({ data: STUDENT_RESPONSE });

    const payload = { fullName: 'Nguyễn Văn A' };
    await expect(createStudent(payload)).resolves.toEqual(STUDENT_ITEM);
    expect(mockPost).toHaveBeenCalledWith('/api/students', payload);
  });

  it('updateStudent gửi PUT /api/students/{id} đúng body', async () => {
    mockPut.mockResolvedValue({ data: STUDENT_RESPONSE });

    const payload = { fullName: 'B' };
    await expect(updateStudent('s-1', payload)).resolves.toEqual(STUDENT_ITEM);
    expect(mockPut).toHaveBeenCalledWith('/api/students/s-1', payload);
  });

  it('deleteStudent gọi DELETE /api/students/{id}', async () => {
    mockDelete.mockResolvedValue({ data: undefined });

    await expect(deleteStudent('s-1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/api/students/s-1');
  });
});
