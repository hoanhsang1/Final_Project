import {
  Banner,
  Button,
  Card,
  Divider,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
  VStack,
} from '@astryxdesign/core';
import { AppLink } from '../../components/AppLink/AppLink';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { MSG_ADM, MSG_ORG, MSG_OVW } from '../../features/admin/adminMessages';
import { CONSOLE_MENU } from '../../features/admin/consoleMenu';
import { CORE_MODULES } from '../../features/admin/coreModules';
import { useOverview } from './use-overview';

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
 * Trạng thái: **loading** (PageLoading) · **error** (Banner + Thử lại) · **success**.
 * Không có **empty** — màn tổng quan không có khái niệm dữ liệu rỗng.
 */
export default function OverviewPage() {
  const { pendingQuery, modulesQuery } = useOverview();

  const isLoading = pendingQuery.isPending || modulesQuery.isPending;
  const isError = pendingQuery.isError || modulesQuery.isError;

  if (isLoading) {
    return <PageLoading />;
  }

  if (isError) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader title={MSG_OVW.TITLE} subtitle={MSG_OVW.SUBTITLE} />
        <Banner
          status="error"
          role="alert"
          collapsible={false}
          title={MSG_OVW.LOAD_ERROR}
          description="Kiểm tra kết nối máy chủ rồi thử lại. Số liệu chưa được tải."
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_ORG.RETRY}
              isLoading={pendingQuery.isFetching || modulesQuery.isFetching}
              onClick={() => {
                void pendingQuery.refetch();
                void modulesQuery.refetch();
              }}
            />
          }
        />
      </Stack>
    );
  }

  const pendingCount = pendingQuery.data?.length ?? 0;
  const modules = modulesQuery.data ?? [];
  const moduleCount = modules.length;
  const coreCount = modules.filter((module) => CORE_MODULES.includes(module.code)).length;
  const extraCount = Math.max(moduleCount - coreCount, 0);

  const stats: StatCard[] = [
    {
      key: 'pending',
      title: MSG_OVW.PENDING_CARD,
      value: pendingCount,
      path: '/quan-tri/to-chuc',
      // Đích đến là màn "Tổ chức chờ duyệt" — nêu đúng tên màn, không dùng "Tất cả tổ chức".
      ariaLabel: `${MSG_OVW.PENDING_CARD}: ${pendingCount}. ${MSG_ORG.LIST_TITLE}`,
    },
    {
      key: 'modules',
      title: MSG_OVW.MODULES_TOTAL,
      value: moduleCount,
      path: '/quan-tri/module',
      ariaLabel: `${MSG_OVW.MODULES_TOTAL}: ${moduleCount}. ${MSG_ADM.MENU_MODULES}`,
    },
    {
      key: 'core',
      title: MSG_OVW.MODULES_CORE,
      value: coreCount,
      path: '/quan-tri/module',
      ariaLabel: `${MSG_OVW.MODULES_CORE}: ${coreCount}. ${MSG_ADM.MENU_MODULES}`,
    },
    {
      key: 'extra',
      title: MSG_OVW.MODULES_OPTIONAL,
      value: extraCount,
      path: '/quan-tri/module',
      ariaLabel: `${MSG_OVW.MODULES_OPTIONAL}: ${extraCount}. ${MSG_ADM.MENU_MODULES}`,
    },
  ];

  const shortcuts = CONSOLE_MENU.filter((item) => item.key !== 'tong-quan');

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_OVW.TITLE} subtitle={MSG_OVW.SUBTITLE} />

      <Grid columns={{ minWidth: 220, max: 4 }} gap={4}>
        {stats.map((card) => (
          <AppLink
            key={card.key}
            to={card.path}
            aria-label={card.ariaLabel}
            style={{
              display: 'block',
              textDecoration: 'none',
              color: 'inherit',
              height: '100%',
            }}
          >
            <Card padding={4} width="100%" height="100%">
              <VStack gap={3} style={{ height: '100%' }}>
                <HStack justify="between" align="start" gap={3}>
                  <Text type="supporting" color="secondary">
                    {card.title}
                  </Text>
                  {shortcuts.find((item) => card.path === item.path)?.icon ? (
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'inline-flex',
                        fontSize: 20,
                        color: 'var(--color-accent)',
                        flexShrink: 0,
                      }}
                    >
                      {shortcuts.find((item) => card.path === item.path)?.icon}
                    </span>
                  ) : null}
                </HStack>

                <Heading level={2} type="display-2" style={{ margin: 0 }}>
                  {card.value}
                </Heading>

                <Text type="supporting" weight="medium" color="accent" style={{ marginTop: 'auto' }}>
                  {card.key === 'pending' ? MSG_ORG.LIST_TITLE : MSG_ADM.MENU_MODULES}
                </Text>
              </VStack>
            </Card>
          </AppLink>
        ))}
      </Grid>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3} style={{ margin: 0, fontSize: 'var(--font-size-large, 17px)' }}>
            {MSG_OVW.QUICK_LINKS}
          </Heading>
          <Divider />
          <VStack gap={0}>
            {shortcuts.map((item, index) => (
              <div key={item.key}>
                <AppLink
                  to={item.path}
                  hasUnderline={false}
                  color="primary"
                  weight="medium"
                  style={{
                    display: 'block',
                    paddingBlock: 'var(--spacing-2, 8px)',
                  }}
                >
                  <HStack gap={2} align="center">
                    {item.icon ? (
                      <span aria-hidden="true" style={{ display: 'inline-flex', fontSize: 16 }}>
                        {item.icon}
                      </span>
                    ) : null}
                    <span>{item.label}</span>
                  </HStack>
                </AppLink>
                {index < shortcuts.length - 1 ? <Divider /> : null}
              </div>
            ))}
          </VStack>
        </VStack>
      </Card>

      <Card padding={4}>
        <VStack gap={3}>
          <Heading level={3} style={{ margin: 0, fontSize: 'var(--font-size-large, 17px)' }}>
            Phân loại module
          </Heading>
          <Divider />
          <VStack gap={2}>
            {[
              {
                key: 'core',
                count: coreCount,
                label: MSG_OVW.MODULES_CORE,
                description: 'Các module bắt buộc, không thể bỏ khỏi cấu hình tổ chức.',
              },
              {
                key: 'extra',
                count: extraCount,
                label: MSG_OVW.MODULES_OPTIONAL,
                description: 'Các module có thể bật hoặc tắt theo nhu cầu của tổ chức.',
              },
            ].map((item, index, arr) => (
              <div key={item.key}>
                <HStack justify="between" align="start" gap={3} wrap="wrap">
                  <VStack gap={0.5}>
                    <Text type="body" weight="medium">
                      {item.label}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {item.description}
                    </Text>
                  </VStack>
                  <Text type="body" weight="semibold">
                    {item.count}
                  </Text>
                </HStack>
                {index < arr.length - 1 ? <Divider /> : null}
              </div>
            ))}
          </VStack>
        </VStack>
      </Card>
    </Stack>
  );
}