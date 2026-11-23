// Thêm các matcher của jest-dom vào `expect` (toBeInTheDocument, toBeVisible, ...).
import '@testing-library/jest-dom/vitest';

/**
 * jsdom không cài `HTMLDialogElement#showModal` (chỉ có một class rỗng), trong
 * khi `Drawer`/`Dialog` của Astryx dùng đúng API native đó cho `<dialog>`.
 * Thiếu nó, mọi test mở overlay nhận `showModal is not a function` rồi rơi vào
 * error boundary của router. Bản vá tối thiểu: bật/tắt thuộc tính `open` và phát
 * `close` đúng như trình duyệt.
 */
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(
    this: HTMLDialogElement,
    returnValue?: string,
  ) {
    this.removeAttribute('open');
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.dispatchEvent(new Event('close'));
  };
}

/**
 * jsdom không cài `window.matchMedia`, nhưng một số hook/component responsive
 * cần nó khi chạy trong môi trường test.
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
