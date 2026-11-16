import { Alert, Button, Card, Empty, Flex, Space, Spin, Tag, Tooltip, Typography, theme } from 'antd';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader/PageHeader';
import { logout } from '../../features/auth/authApi';
import { fetchMyDelegations, ownerErrorMessage } from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import { MSG_DEL } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import { DELEGATION_UI_ENABLED } from '../../lib/featureFlags';
import { useAuthStore } from '../../stores/authStore';
import { layoutBackground } from '../../theme';

const { Text } = Typography;

function formatDate(value: string | null): string {
  if (!value) return MSG_DEL.WINDOW_FOREVER;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : '—';
}

export default function MyDelegationsPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);

  const delegations = useQuery({
    queryKey: ownerKeys.myDelegations(),
    queryFn: fetchMyDelegations,
    // Cờ tắt → KHÔNG gọi `/api/delegations/me` (route PHẦN 6 có thể chưa deploy).
    enabled: isAuthenticated && DELEGATION_UI_ENABLED,
  });

  if (!isAuthenticated) {
    return <Navigate to="/dang-nhap" replace />;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Bỏ qua lỗi mạng — vẫn xoá phiên cục bộ.
    }
    clearSession();
    navigate('/dang-nhap');
  };

  const items = delegations.data ?? [];

  return (
    <div style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Flex justify="space-between" align="flex-start" gap={token.marginSM} wrap>
          <PageHeader title={MSG_DEL.MY_TITLE} subtitle={MSG_DEL.MY_SUBTITLE} />
          <Button onClick={handleLogout}>Đăng xuất</Button>
        </Flex>

        {DELEGATION_UI_ENABLED && (
          <Alert
            type="info"
            showIcon
            message={MSG_DEL.MY_REVOKED_NOTE}
            style={{ marginBottom: token.margin }}
          />
        )}

        {!DELEGATION_UI_ENABLED ? (
          <Alert type="info" showIcon message={MSG_DEL.MY_DISABLED} />
        ) : delegations.isLoading ? (
          <Flex justify="center" style={{ paddingBlock: token.paddingXL }}>
            <Spin />
          </Flex>
        ) : delegations.isError ? (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={ownerErrorMessage(delegations.error)}
          />
        ) : items.length === 0 ? (
          <Card>
            <Empty description={MSG_DEL.MY_EMPTY} />
          </Card>
        ) : (
          <Flex vertical gap={token.margin}>
            {items.map((item) => (
              <Card key={item.id} size="small">
                <Flex vertical gap={token.marginXS}>
                  <Flex justify="space-between" align="center" wrap gap={token.marginXS}>
                    <Text strong>
                      {MSG_DEL.MY_DELEGATOR}: {item.delegatorName || item.delegatorId}
                    </Text>
                    <Tag color={item.active ? 'success' : 'default'}>
                      {item.active ? MSG_DEL.STATUS_ACTIVE : MSG_DEL.STATUS_EXPIRED}
                    </Tag>
                  </Flex>
                  <Text type="secondary">
                    {MSG_DEL.WINDOW_FROM(formatDate(item.effectiveFrom))} —{' '}
                    {MSG_DEL.WINDOW_UNTIL(formatDate(item.effectiveTo))}
                  </Text>
                  <Space wrap size={4}>
                    {item.permissions.map((code) => (
                      <Tooltip key={code} title={code}>
                        <Tag color="blue">{permissionLabel(code)}</Tag>
                      </Tooltip>
                    ))}
                  </Space>
                  {item.reason && <Text type="secondary">{item.reason}</Text>}
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </div>
    </div>
  );
}
