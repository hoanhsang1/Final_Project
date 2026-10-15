import { Button, Card, Flex, Result, Tag, theme, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { findRole } from '../../features/auth/roles';
import { cardStyle, layoutBackground } from '../../theme';

const { Text, Title } = Typography;

/**
 * Trang "Bạn đang là …" — chỉ để xem thử bố cục theo vai trò, **không** xác thực.
 *
 * Đọc thẳng slug trên URL (`/xem-thu/:vaiTro`) nên dán link hoặc F5 vẫn dựng đúng,
 * không phụ thuộc việc người dùng đã bấm nút ở trang đăng nhập hay chưa.
 */
export default function RolePreviewPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const { vaiTro } = useParams();

  const role = findRole(vaiTro);

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
            <Tag color="processing">Chế độ xem thử — chưa kết nối hệ thống</Tag>
            <Text type="secondary">Bạn đang là</Text>
            <Title level={3} style={{ margin: 0 }}>
              {role.label}
            </Title>
            <Text type="secondary" style={{ textAlign: 'center' }}>
              {role.description}
            </Text>
            <div style={{ marginTop: token.margin }}>{backButton}</div>
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
