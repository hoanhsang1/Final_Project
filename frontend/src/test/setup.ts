// Bản vá chính thức của antd để Ant Design 5 chạy được trên React 19.
import '@ant-design/v5-patch-for-react-19';
// Thêm các matcher của jest-dom vào `expect` (toBeInTheDocument, toBeVisible, ...).
import '@testing-library/jest-dom/vitest';

/**
 * jsdom không cài `window.matchMedia`, nhưng antd dùng nó cho responsive observer —
 * thiếu là mọi component antd ném lỗi ngay khi render trong test.
 */
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}
