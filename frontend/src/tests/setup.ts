import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom không có các API trình duyệt mà component dùng.
afterEach(() => {
  cleanup()
  localStorage.clear()
})

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
}

// Radix use-size (Checkbox) đo kích thước phần tử bằng ResizeObserver.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom thiếu Pointer Capture API mà Radix Select gọi khi mở danh sách.
if (!window.Element.prototype.hasPointerCapture) {
  window.Element.prototype.hasPointerCapture = () => false
  window.Element.prototype.setPointerCapture = () => {}
  window.Element.prototype.releasePointerCapture = () => {}
}
