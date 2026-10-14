// Bản vá chính thức của antd để Ant Design 5 chạy được trên React 19.
import '@ant-design/v5-patch-for-react-19';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import 'antd/dist/reset.css';
import { router } from './router';
import { themeToken } from './theme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

createRoot(container).render(
  <StrictMode>
    <ConfigProvider locale={viVN} theme={{ token: themeToken }}>
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>,
);
