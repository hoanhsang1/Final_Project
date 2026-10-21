import { Button, Card, Flex, Result, Space, Tag, theme, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { logout } from '../../features/auth/authApi';
import { findRole } from '../../features/auth/roles';
import { useAuthStore } from '../../stores/authStore';
import { cardStyle, layoutBackground } from '../../theme';

const { Text, Title } = Typography;

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
  const { token } = theme.useToken();
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
    <Button type="primary" onClick={() => navigate('/dang-nhap')}>
      Quay lại đăng nhập
    </Button>
  );

  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}
    >
      <Card style={cardStyle} styles={{ body: { padding: token.paddingLG } }}>
        {role ? (
          <Flex vertical align="center" gap={token.marginXS}>
            {/* BR-08: trạng thái phải kèm CHỮ, không chỉ dựa vào màu. */}
            {isAuthenticated ? (
              <Tag color="success">Đã đăng nhập</Tag>
            ) : (
              <Tag color="processing">Chế độ xem thử — chưa đăng nhập</Tag>
            )}

            <Text type="secondary">{isAuthenticated ? 'Xin chào' : 'Bạn đang là'}</Text>
            <Title level={3} style={{ margin: 0 }}>
              {isAuthenticated ? (username ?? role.label) : role.label}
            </Title>
            <Text type="secondary" style={{ textAlign: 'center' }}>
              {isAuthenticated ? `Vai trò: ${role.label} — ${role.description}` : role.description}
            </Text>

            <Space style={{ marginTop: token.margin }}>
              {isAuthenticated && <Button onClick={handleLogout}>Đăng xuất</Button>}
              {backButton}
            </Space>
          </Flex>
        ) : (
          <Result
            status="404"
            title="Không có vai trò này"
            subTitle="Đường dẫn xem thử không đúng. Hãy quay lại trang đăng nhập."
            extra={backButton}
          />
        )}
      </Card>
    </Flex>
  );
}
