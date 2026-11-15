import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import {
  AppErrorActions,
  default as AppErrorScreen,
  homePathFor,
} from '../AppErrorScreen/AppErrorScreen';
import { useAuthStore } from '../../stores/authStore';

/** Mô tả lỗi an toàn để hiện ở chế độ dev (không lộ stack khi production). */
function describeError(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Không có thông tin lỗi.';
}

/**
 * Lưới an toàn của router: thay trang mặc định "Unexpected Application Error!"
 * bằng thông báo tiếng Việt + nút "Tải lại" / "Về trang chính".
 *
 * Gắn ở route gốc và từng khu vực chính để một màn hỏng không kéo cả app trắng.
 */
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const backendRoles = useAuthStore((s) => s.backendRoles);

  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <AppErrorScreen
      status={notFound ? '404' : '500'}
      title={notFound ? 'Không tìm thấy trang' : 'Ứng dụng gặp sự cố'}
      subTitle={
        notFound
          ? 'Đường dẫn không tồn tại hoặc đã bị di chuyển.'
          : 'Màn hình này không tải được. Bạn có thể tải lại trang hoặc quay về trang chính.'
      }
      actions={
        <AppErrorActions
          onHome={() => navigate(homePathFor(isAuthenticated, backendRoles), { replace: true })}
        />
      }
      details={import.meta.env.PROD ? null : describeError(error)}
    />
  );
}
