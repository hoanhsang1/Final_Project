import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import SessionWatcher from './SessionWatcher';

type RejectedHandler = (error: unknown) => Promise<unknown>;

function renderWatcher(): RejectedHandler {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  render(
    <Wrapper>
      <button type="button">Màn khác</button>
      <SessionWatcher />
    </Wrapper>,
  );

  const calls = vi.mocked(apiClient.interceptors.response.use).mock.calls;
  const entry = calls.find(([, onRejected]) => typeof onRejected === 'function');
  if (!entry) throw new Error('SessionWatcher chưa đăng ký interceptor bắt mã lỗi');
  return entry[1] as RejectedHandler;
}

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ mustChangePassword: false, isAuthenticated: false });
  vi.spyOn(apiClient.interceptors.response, 'use');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SessionWatcher — cờ PASSWORD_CHANGE_REQUIRED', () => {
  it('mã lỗi chuỗi PASSWORD_CHANGE_REQUIRED mở modal bắt đổi, chặn màn khác', async () => {
    const onRejected = renderWatcher();
    const error = {
      response: { status: 403, data: { code: 'PASSWORD_CHANGE_REQUIRED' } },
    };

    await expect(onRejected(error)).rejects.toBe(error);

    await waitFor(() => expect(useAuthStore.getState().mustChangePassword).toBe(true));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('open');
    expect(screen.queryByRole('button', { name: /đóng|close/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Màn khác' })).toBeInTheDocument();
  });

  it('mã số 1006 KHÔNG được coi là PASSWORD_CHANGE_REQUIRED', async () => {
    const onRejected = renderWatcher();
    const error = { response: { status: 403, data: { code: 1006 } } };

    await expect(onRejected(error)).rejects.toBe(error);

    expect(useAuthStore.getState().mustChangePassword).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lỗi refresh 401 không bật cờ bắt đổi mật khẩu', async () => {
    const onRejected = renderWatcher();
    const error = {
      config: {},
      response: { status: 401, data: { code: 'INVALID_REFRESH_TOKEN' } },
    };

    await expect(onRejected(error)).rejects.toBe(error);

    expect(useAuthStore.getState().mustChangePassword).toBe(false);
  });
});
