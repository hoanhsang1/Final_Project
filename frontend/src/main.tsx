// Bản vá chính thức của antd để Ant Design 5 chạy được trên React 19.
import '@ant-design/v5-patch-for-react-19';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import 'antd/dist/reset.css';
import { router } from './router';
import { fontFamily, themeComponents, themeToken } from './theme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

// Font design system phải áp cả cho markup không phải component antd (antd chỉ set
// font qua class `.ant-*`, phần tử HTML thuần vẫn thừa hưởng từ `body`).
container.style.fontFamily = fontFamily;

// Client dùng chung cho TanStack Query (server state). Không retry khi lỗi 4xx
// (đăng nhập sai mật khẩu là 401 — retry vô nghĩa, chỉ làm người dùng đợi lâu).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: false },
  },
});

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* `App` của antd: để `message`/`notification` đi qua ConfigProvider (đúng token/theme). */}
      <ConfigProvider locale={viVN} theme={{ token: themeToken, components: themeComponents }}>
        <App>
          <RouterProvider router={router} />
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
);
