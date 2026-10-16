import axios from 'axios';

/**
 * Axios client dùng chung cho toàn app (ADR-FE-003).
 *
 * baseURL = '' vì mọi request đều đi qua Vite proxy (`/api` → backend),
 * nên không hardcode `localhost:8080` trong code FE. Xem `vite.config.ts`.
 */
export const apiClient = axios.create({
  baseURL: '',
  timeout: 10_000,
});

/** Tên key lưu JWT + refresh token trong localStorage. */
export const ACCESS_TOKEN_KEY = 'mems.accessToken';
export const REFRESH_TOKEN_KEY = 'mems.refreshToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Đánh dấu request đang chờ refresh để tránh refresh song song nhiều request 401 cùng lúc. */
let isRefreshing = false;
/** Hàng đợi các request bị kẹt chờ refresh xong. */
let pendingQueue: Array<() => void> = [];

/** Request interceptor: gắn JWT vào mọi request nếu có. */
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Response interceptor: gặp 401 → gọi refresh → retry request gốc.
 * Refresh thất bại → xoá token (trang đăng nhập tự xử lý điều hướng).
 *
 * ⚠️ Endpoint /api/v1/auth/refresh CHƯA tồn tại trong backend hiện tại.
 * Khối này chỉ chạy khi backend đã có; khi chưa có thì 401 rơi vào nhánh
 * clearTokens() để không bị vòng lặp vô hạn.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const original = error as {
      config?: { _retry?: boolean; headers?: Record<string, string> };
      response?: { status?: number };
    };
    const status = original.response?.status;

    // Chỉ xử lý 401; các lỗi khác để nguyên cho caller tự xử lý.
    if (status !== 401 || !original.config) {
      return Promise.reject(error);
    }

    // Đã thử refresh rồi mà vẫn 401 → dừng, không lặp.
    if (original.config._retry) {
      clearTokens();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Có request khác đang refresh → xếp hàng, đợi xong rồi chạy tiếp.
      return new Promise<void>((resolve) => {
        pendingQueue.push(resolve);
      }).then(() => apiClient(original.config!));
    }

    original.config._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        '/api/v1/auth/refresh',
        { refreshToken },
      );
      setTokens(data.accessToken, data.refreshToken);

      // Gắn token mới vào header rồi replay request gốc.
      original.config.headers = { ...original.config.headers, Authorization: `Bearer ${data.accessToken}` };
      return apiClient(original.config!);
    } catch {
      // Refresh thất bại → xoá token, đá về đăng nhập.
      clearTokens();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
      pendingQueue.forEach((resolve) => resolve());
      pendingQueue = [];
    }
  },
);
