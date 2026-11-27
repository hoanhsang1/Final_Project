import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AdminApiError,
  createAccount,
  resetAccountPassword,
} from './adminApi';
import type { AccountCreatePayload } from './types';

/** Mock HTTP — các route tài khoản mới chưa được port trong working tree này. */
const mockPost = vi.fn();
vi.mock('../../lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const PAYLOAD: AccountCreatePayload = {
  email: 'gv1@school.edu.vn',
  full_name: 'Nguyễn Văn A',
  role: 'TEACHER',
  organization_id: 'org-1',
};

const CREATED = {
  id: 'acc-1',
  username: 'gv1',
  email: PAYLOAD.email,
  full_name: PAYLOAD.full_name,
  organization_id: 'org-1',
  role: 'TEACHER',
  status: 'pending',
  temporaryPassword: 'Tam@12345678',
};

beforeEach(() => {
  mockPost.mockReset();
});

describe('adminApi — tài khoản (contract mới)', () => {
  it('createAccount gọi POST /accounts và trả 201 kèm temporaryPassword', async () => {
    mockPost.mockResolvedValue({ data: CREATED, status: 201 });

    await expect(createAccount(PAYLOAD)).resolves.toEqual(CREATED);
    expect(mockPost).toHaveBeenCalledWith('/api/v1/accounts', PAYLOAD);
  });

  it('resetAccountPassword trả body phẳng {temporaryPassword} từ HTTP 200', async () => {
    mockPost.mockResolvedValue({ data: { temporaryPassword: 'Tam@98765432' }, status: 200 });

    await expect(resetAccountPassword('acc-1')).resolves.toEqual({
      temporaryPassword: 'Tam@98765432',
    });
    expect(mockPost).toHaveBeenCalledWith('/api/v1/accounts/acc-1/reset-password', {});
  });

  it('resetAccountPassword gửi new_password (snake_case) và trả {} khi 200 rỗng', async () => {
    mockPost.mockResolvedValue({ data: {}, status: 200 });

    await expect(resetAccountPassword('acc-1', 'MatKhauMoi123')).resolves.toEqual({});
    expect(mockPost).toHaveBeenCalledWith('/api/v1/accounts/acc-1/reset-password', {
      new_password: 'MatKhauMoi123',
    });
  });

  it('vẫn ném AdminApiError kèm status khi lỗi 409', async () => {
    mockPost.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: 'Username already exists' } },
    });

    const result = resetAccountPassword('acc-1', 'MatKhauMoi123');
    await expect(result).rejects.toBeInstanceOf(AdminApiError);
    await expect(result).rejects.toMatchObject({ status: 409 });
  });
});
