import { App } from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';

/**
 * Vùng thông báo ẩn cho trình đọc màn hình (WCAG 4.1.3).
 *
 * `message` của antd chỉ là toast hình ảnh — không có `role`/`aria-live`
 * (đã kiểm tra `rc-notification`), nên mọi phản hồi bất đồng bộ sẽ im lặng
 * với screen reader. Mọi thông báo đi qua `useNotify` vừa hiện toast vừa
 * đọc vào live region này.
 */
let setAnnouncement: ((message: string) => void) | null = null;

/** Phát một câu cho trình đọc màn hình (không hiện UI). */
export function announce(message: string): void {
  setAnnouncement?.(message);
}

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** Đặt một lần trong `main.tsx`, bên trong `<App>` của antd. */
export default function LiveAnnouncer() {
  const [text, setText] = useState('');

  useEffect(() => {
    setAnnouncement = setText;
    return () => {
      setAnnouncement = null;
    };
  }, []);

  // Xoá sau 6s để cùng một câu có thể được đọc lại ở lần thao tác sau.
  useEffect(() => {
    if (!text) return;
    const timer = window.setTimeout(() => setText(''), 6000);
    return () => window.clearTimeout(timer);
  }, [text]);

  return (
    <div aria-live="polite" aria-atomic="true" role="status" style={visuallyHidden}>
      {text}
    </div>
  );
}

/**
 * Thay cho `App.useApp().message` ở các màn Sprint 4: hiện toast + đọc to.
 * Dùng: `const notify = useNotify(); notify.success('…')`.
 */
export function useNotify() {
  const { message } = App.useApp();
  return useMemo(
    () => ({
      success(text: string) {
        message.success(text);
        announce(text);
      },
      error(text: string) {
        message.error(text);
        announce(text);
      },
    }),
    [message],
  );
}
