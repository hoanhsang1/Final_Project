import { Alert, Button, Card, Col, Flex, List, Row, Skeleton, Statistic, Typography, theme } from 'antd';
import { Link } from 'react-router-dom';
import { MSG_ADM, MSG_OVW } from '../../features/admin/adminMessages';
import { CONSOLE_MENU } from '../../features/admin/consoleMenu';
import { CORE_MODULES } from '../../features/admin/coreModules';
import { useOverview } from './use-overview';

const { Title } = Typography;

/** Thẻ số liệu — bấm được, chuyển sang màn tương ứng. */
interface StatCard {
  key: string;
  title: string;
  value: number;
  path: string;
  ariaLabel: string;
}

/**
 * Màn Tổng quan `/quan-tri` — "page chung" của khung console (đặc tả mục 1).
 *
 * Trước đây `/quan-tri` chỉ là `Navigate` redirect sang màn danh sách; giờ là
 * màn thật, cho Admin thấy bức tranh tổng thể trước khi lao vào chi tiết.
 *
 * Trạng thái: **loading** (Skeleton) · **error** (Alert + Thử lại) · **success**.
 * Không có **empty** — màn tổng quan không có khái niệm dữ liệu rỗng.
 * No-permission do `AdminGuard` chặn trước, không tới được màn này.
 */
export default function OverviewPage() {
  const { token } = theme.useToken();
  const { pendingQuery, modulesQuery } = useOverview();

  const isPending = pendingQuery.isPending || modulesQuery.isPending;
  const isError = pendingQuery.isError || modulesQuery.isError;

  const catalog = modulesQuery.data ?? [];
  // `BR-06`: đếm module lõi = số module trong `CORE_MODULES` CÓ MẶT trong danh mục.
  const coreCount = catalog.filter((item) => CORE_MODULES.includes(item.code)).length;

  const cards: StatCard[] = [
    {
      key: 'pending',
      title: MSG_OVW.PENDING_CARD,
      value: pendingQuery.data?.length ?? 0,
      path: '/quan-tri/to-chuc',
      ariaLabel: `${MSG_OVW.PENDING_CARD}: ${pendingQuery.data?.length ?? 0}. ${MSG_ADM.MENU_ORG_ALL}`,
    },
    {
      key: 'modules-total',
      title: MSG_OVW.MODULES_TOTAL,
      value: catalog.length,
      path: '/quan-tri/module',
      ariaLabel: `${MSG_OVW.MODULES_TOTAL}: ${catalog.length}. ${MSG_ADM.MENU_MODULES}`,
    },
    {
      key: 'modules-core',
      title: MSG_OVW.MODULES_CORE,
      value: coreCount,
      path: '/quan-tri/module?loi=core',
      ariaLabel: `${MSG_OVW.MODULES_CORE}: ${coreCount}. ${MSG_ADM.MENU_MODULES}`,
    },
    {
      key: 'modules-optional',
      title: MSG_OVW.MODULES_OPTIONAL,
      value: Math.max(catalog.length - coreCount, 0),
      path: '/quan-tri/module?loi=mo-rong',
      ariaLabel: `${MSG_OVW.MODULES_OPTIONAL}: ${Math.max(catalog.length - coreCount, 0)}. ${MSG_ADM.MENU_MODULES}`,
    },
  ];

  // Lối tắt: bỏ mục "Tổng quan" vì người dùng đang đứng ở đó.
  const quickLinks = CONSOLE_MENU.filter((item) => item.key !== 'tong-quan');

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_OVW.LOAD_ERROR}
        description="Kiểm tra kết nối máy chủ rồi thử lại."
        action={
          <Button
            onClick={() => {
              void pendingQuery.refetch();
              void modulesQuery.refetch();
            }}
            loading={pendingQuery.isFetching || modulesQuery.isFetching}
          >
            Thử lại
          </Button>
        }
      />
    );
  }

  if (isPending) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  return (
    <Flex vertical gap={token.marginLG}>
      <div>
        <Title level={1} style={{ margin: 0 }}>
          {MSG_OVW.TITLE}
        </Title>
        <Typography.Text type="secondary">{MSG_OVW.SUBTITLE}</Typography.Text>
      </div>

      <Row gutter={[token.marginMD, token.marginMD]}>
        {cards.map((card) => (
          <Col key={card.key} xs={12} md={6}>
            <Link to={card.path} aria-label={card.ariaLabel} style={{ display: 'block' }}>
              <Card hoverable styles={{ body: { padding: token.paddingLG } }}>
                <Statistic title={card.title} value={card.value} />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      <Card title={MSG_OVW.QUICK_LINKS}>
        <List
          dataSource={quickLinks}
          renderItem={(item) => (
            <List.Item>
              <Link
                to={item.path}
                aria-label={item.label}
                style={{ color: token.colorLink, width: '100%' }}
              >
                {item.label}
              </Link>
            </List.Item>
          )}
        />
      </Card>
    </Flex>
  );
}
