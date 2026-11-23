// Hai stylesheet của Astryx: `reset` dọn mặc định trình duyệt, `astryx.css` chứa
// class đã compile sẵn cho component. Không cần plugin StyleX/Babel.
//
// Cả hai tự khai báo thứ tự layer `reset → astryx-base → astryx-theme`, nên thứ
// tự import không quan trọng.
import { InternationalizationProvider, Theme } from '@astryxdesign/core';
import '@astryxdesign/core/astryx.css';
import viVNAstryx from '@astryxdesign/core/locales/vi-VN.generated.js';
import '@astryxdesign/core/reset.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { memsTheme } from './astryx-theme';
import './index.css';
import { router } from './router';
import { fontFamily } from './theme';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

// Font design system phải áp cả cho markup không phải component (Astryx set
// qua token của component). Phần tử HTML thuần vẫn thừa hưởng từ `body`.
//
// Đặt trên `body` chứ không chỉ `#root`: Dialog/Toast của Astryx render qua
// portal vào `document.body`, nằm NGOÀI `#root`.
document.body.style.fontFamily = fontFamily;

// Bù các khoá mà gói Astryx CHƯA dịch sang `vi-VN`.
//
// Cách kiểm: đối chiếu `dist/i18n/generated-english/<Component>/<Component>.generated.js`
// với `dist/i18n/generated-locales/vi-VN.generated.js`. Khoá thiếu ở vi-VN sẽ rơi
// về tiếng Anh (`resolve.js` bước 5) — hiện ra màn hình chứ không báo lỗi.
//
// Đã xác minh:
//  - `MultiSelector` thiếu `selectedCount` → trigger hiện "1 selected" sau khi
//    chọn (mọi `MultiSelector` dùng `triggerDisplay="count"` mặc định).
//  - `InputClearButton` thiếu `tooltip` → nút xoá nhanh của field `hasClear`
//    (có giá trị) hiện tooltip "Clear" khi hover/focus, và gắn luôn vào
//    `aria-describedby`. App dùng `hasClear` ở các trang Đào tạo.
// Bù tại ĐÂY, KHÔNG sửa `node_modules` (file generated, mất khi cập nhật gói).
const astryxViOverrides = {
  '@astryx.multiSelector.selectedCount': 'Đã chọn {count}',
  // Chỉ nêu HÀNH ĐỘNG, không lặp nhãn field (theo chú thích trong
  // `InputClearButton.js`: nhãn field đã nằm cạnh biểu tượng).
  //
  // Chọn "Xóa" (dấu ở `o`) chứ KHÔNG phải "Xoá" như chữ do app tự viết: đây là
  // cách viết mà chính gói Astryx dùng cho MỌI nút xoá nhanh — tên đọc được của
  // cùng nút này là `@astryx.textInput.clearLabel` = "Xóa {label}". Giữ khớp để
  // tên đọc được và tooltip không lệch nhau (WCAG 2.5.3 — label in name).
  '@astryx.inputClearButton.tooltip': 'Xóa',
};

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
    <InternationalizationProvider
      locale="vi-VN"
      messages={{ 'vi-VN': { ...viVNAstryx, ...astryxViOverrides } }}
    >
      <Theme theme={memsTheme} mode="light">
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
);
