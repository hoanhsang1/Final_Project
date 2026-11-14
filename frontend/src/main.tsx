// Bản vá chính thức của antd để Ant Design 5 chạy được trên React 19.
import '@ant-design/v5-patch-for-react-19';
// Hai stylesheet của Astryx: `reset` dọn mặc định trình duyệt, `astryx.css` chứa
// class đã compile sẵn cho cả 124 component. Không cần plugin StyleX/Babel.
//
// Cả hai tự khai báo thứ tự layer `reset → astryx-base → astryx-theme`, nên thứ
// tự import không quan trọng. CSS của antd không nằm trong layer nào → antd luôn
// thắng ở các trang chưa chuyển. Đó chính là điều kiện để hai bên chạy song song
// trong lúc migration.
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { InternationalizationProvider, Theme } from '@astryxdesign/core';
import viVNAstryx from '@astryxdesign/core/locales/vi-VN.generated.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import 'antd/dist/reset.css';
import { memsTheme } from './astryx-theme';
import './index.css';
import LiveAnnouncer from './components/LiveAnnouncer/LiveAnnouncer';
import { router } from './router';
import { fontFamily, themeComponents, themeToken } from './theme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

// Font design system phải áp cả cho markup không phải component (antd chỉ set
// font qua class `.ant-*`, Astryx set qua token của component). Phần tử HTML
// thuần vẫn thừa hưởng từ `body`.
//
// Đặt trên `body` chứ không chỉ `#root`: Modal/Dropdown/Tooltip của antd và
// Dialog/Toast của Astryx render qua portal vào `document.body`, nằm NGOÀI
// `#root`. Chỉ set `#root` thì mọi lớp nổi rơi về `sans-serif`
// — chữ hơi khác kiểu và không ai biết vì sao. Đo bằng `getComputedStyle` mới thấy.
document.body.style.fontFamily = fontFamily;

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
    {/*
      Astryx bọc ngoài cùng: `Theme` là theme GỐC nên nó đồng bộ `data-astryx-theme`
      + `data-theme` lên `<html>`, nhờ vậy portal (Dialog, Toast) cũng ăn token.
      `mode="light"` cố định chế độ sáng — app không có dark mode, và nếu để
      `system` thì `light-dark()` trong CSS sẽ đổi màu theo cài đặt của máy.
    */}
    <InternationalizationProvider locale="vi-VN" messages={{ 'vi-VN': viVNAstryx }}>
      <Theme theme={memsTheme} mode="light">
        <QueryClientProvider client={queryClient}>
          {/* `App` của antd: để `message`/`notification` đi qua ConfigProvider (đúng token/theme). */}
          <ConfigProvider locale={viVN} theme={{ token: themeToken, components: themeComponents }}>
            <App>
              {/* Vùng aria-live dùng chung: mọi toast của useNotify đều được đọc to. */}
              <LiveAnnouncer />
              <RouterProvider router={router} />
            </App>
          </ConfigProvider>
        </QueryClientProvider>
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
);
