import { Badge, Button, Card, Heading, HStack, Stack, Text, VStack } from '@astryxdesign/core';
import { useNavigate, useParams } from 'react-router-dom';
import StatusScreen from '../../components/StatusScreen/StatusScreen';
import { logout } from '../../features/auth/authApi';
import { findRole } from '../../features/auth/roles';
import { useAuthStore } from '../../stores/authStore';
import { layoutBackground } from '../../theme';

/**
 * Trang "Bạn đang là …" — hiện có HAI chế độ, phân biệt bằng phiên đăng nhập thật:
 *
 * 1. **Đã đăng nhập** (có phiên trong `authStore`): hiện tên đăng nhập + vai trò lấy
 *    từ chính phiên thật, kèm nút Đăng xuất. Đây là màn hình tạm thay cho trang chủ
 *    theo vai trò (Sprint sau sẽ dựng).
 * 2. **Xem thử** (chưa đăng nhập, người dùng bấm nút chọn vai trò ở trang đăng nhập):
 *    chỉ dựng bố cục để xem trước, KHÔNG xác thực.
 *
 * Đọc thẳng slug trên URL (`/xem-thu/:vaiTro`) nên dán link hoặc F5 vẫn dựng đúng.
 */
export default function RolePreviewPage() {
  const navigate = useNavigate();
  const { vaiTro } = useParams();

  const role = findRole(vaiTro);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const username = useAuthStore((s) => s.username);
  const clearSession = useAuthStore((s) => s.clearSession);

  const handleLogout = async () => {
    // `D-13`: gọi `POST /api/v1/auth/logout` để BE thu hồi refresh token
    // (Sprint 1 chỉ xoá token phía client → refresh token còn sống tới 7 ngày).
    // Lỗi KHÔNG được chặn người dùng thoát phiên → vẫn xoá session phía client.
    try {
      await logout();
    } catch {
      // Bỏ qua lỗi mạng — phiên vẫn phải được xoá ở client.
    }
    clearSession();
    navigate('/dang-nhap');
  };

  const backButton = (
    <Button
      variant="primary"
      size="lg"
      label="Quay lại đăng nhập"
      onClick={() => navigate('/dang-nhap')}
    />
  );

  return (
    <Stack
      direction="vertical"
      align="center"
      justify="center"
      minHeight="100vh"
      padding={6}
      style={{ background: layoutBackground }}
    >
      <Card width="100%" maxWidth={420} padding={6}>
        {role ? (
          <VStack align="center" gap={2}>
            {/* BR-08: trạng thái phải kèm CHỮ, không chỉ dựa vào màu. */}
            {isAuthenticated ? (
              <Badge variant="success" label="Đã đăng nhập" />
            ) : (
              <Badge variant="info" label="Chế độ xem thử — chưa đăng nhập" />
            )}

            <Text type="body" color="secondary">
              {isAuthenticated ? 'Xin chào' : 'Bạn đang là'}
            </Text>
            <Heading level={1}>
              {isAuthenticated ? (username ?? role.label) : role.label}
            </Heading>
            <Text type="body" color="secondary" justify="center">
              {isAuthenticated ? `Vai trò: ${role.label} — ${role.description}` : role.description}
            </Text>

            <HStack gap={2} style={{ marginTop: 'var(--spacing-4)' }}>
              {isAuthenticated && (
                <Button
                  variant="secondary"
                  size="lg"
                  label="Đăng xuất"
                  onClick={() => void handleLogout()}
                />
              )}
              {backButton}
            </HStack>
          </VStack>
        ) : (
          <StatusScreen
            code="404"
            title="Không có vai trò này"
            description="Đường dẫn xem thử không đúng. Hãy quay lại trang đăng nhập."
            action={{ label: 'Quay lại đăng nhập', onClick: () => navigate('/dang-nhap') }}
          />
        )}
      </Card>
    </Stack>
  );
}
