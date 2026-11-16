import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Space,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Navigate, useNavigate } from 'react-router-dom';
import { canAccessStudentPortal } from '../../features/auth/permissions';
import { logout } from '../../features/auth/authApi';
import {
  CLASS_STATUS_LABEL,
  CLASS_STATUS_TAG,
  CLOSE_STATE_LABEL,
  CLOSE_STATE_TAG,
  STUDENT_STATUS_LABEL,
  STUDENT_STATUS_TAG,
  formatDate,
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_PORTAL, MSG_S4, MSG_STUDENT } from '../../features/sprint4/sprint4Messages';
import {
  fetchMyStudentClasses,
  fetchMyStudentProfile,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import type { StudentClass } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import { cardStyle, layoutBackground } from '../../theme';

const { Title } = Typography;

const classColumns: ColumnsType<StudentClass> = [
  {
    title: 'Mã lớp',
    dataIndex: 'classCode',
    width: 130,
    render: (value: string | null | undefined) => value || '—',
  },
  {
    title: 'Tên lớp',
    dataIndex: 'name',
    render: (value: string | null | undefined) => value || '—',
  },
  {
    title: 'Môn học',
    dataIndex: 'subjectName',
    width: 170,
    render: (value: string | null | undefined) => value || '—',
  },
  {
    title: 'Giáo viên',
    dataIndex: 'teacherName',
    width: 190,
    render: (value: string | null | undefined) => value || '—',
  },
  {
    title: 'Thời gian',
    key: 'period',
    width: 200,
    render: (_, record) => formatPeriod(record.startDate, record.endDate),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'status',
    width: 140,
    render: (value: string | null | undefined) =>
      value ? (
        <Tag color={CLASS_STATUS_TAG[value]}>{labelOf(CLASS_STATUS_LABEL, value)}</Tag>
      ) : (
        '—'
      ),
  },
  {
    title: 'Đóng lớp',
    dataIndex: 'closeState',
    width: 140,
    render: (value: string | null | undefined) =>
      value && value !== 'NONE' ? (
        <Tag color={CLOSE_STATE_TAG[value]}>{labelOf(CLOSE_STATE_LABEL, value)}</Tag>
      ) : null,
  },
];

/**
 * Quy tắc 12 — cổng riêng của sinh viên.
 * Chỉ gọi các endpoint SELF (`/students/me`), KHÔNG dùng các API quản trị;
 * quyền thật vẫn do backend chặn theo `student.self_view`.
 */
export default function StudentPortalPage() {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const permissions = useAuthStore((s) => s.permissions);
  const clearSession = useAuthStore((s) => s.clearSession);

  const allowed = canAccessStudentPortal(permissions);

  const profileQuery = useQuery({
    queryKey: ['student', 'me'],
    queryFn: fetchMyStudentProfile,
    enabled: isAuthenticated && allowed,
  });

  const classesQuery = useQuery({
    queryKey: ['student', 'me', 'classes'],
    queryFn: fetchMyStudentClasses,
    enabled: isAuthenticated && allowed,
  });

  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace />;
  if (!allowed) {
    return (
      <Navigate to="/dang-nhap" replace state={{ notice: MSG_PORTAL.NO_ACCESS }} />
    );
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

  const profile = profileQuery.data;

  return (
    <Flex
      vertical
      gap={token.marginMD}
      style={{ minHeight: '100vh', background: layoutBackground, padding: token.paddingLG }}
    >
      <Flex align="center" justify="space-between" wrap="wrap" gap={token.marginSM}>
        <Title level={2} style={{ margin: 0 }}>
          {MSG_PORTAL.TITLE}
        </Title>
        <Space wrap>
          <Button onClick={() => navigate('/lich-cua-toi')}>Lịch học của tôi</Button>
          <Button onClick={handleLogout}>{MSG_PORTAL.LOGOUT}</Button>
        </Space>
      </Flex>

      <Card style={cardStyle} title={MSG_PORTAL.PROFILE_SECTION}>
        {profileQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message={MSG_PORTAL.LOAD_ERROR}
            description={sprint4ErrorMessage(profileQuery.error)}
            action={
              <Button size="small" onClick={() => profileQuery.refetch()}>
                {MSG_S4.RETRY}
              </Button>
            }
          />
        ) : (
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Mã sinh viên">
              {profile?.studentCode || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Họ tên">{profile?.fullName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">
              {formatDate(profile?.dateOfBirth)}
            </Descriptions.Item>
            <Descriptions.Item label="Email">{profile?.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{profile?.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Lớp hiện tại">
              {profile?.classCode || MSG_STUDENT.NO_CLASS}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {profile?.status ? (
                <Tag color={STUDENT_STATUS_TAG[profile.status]}>
                  {labelOf(STUDENT_STATUS_LABEL, profile.status)}
                </Tag>
              ) : (
                '—'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card style={cardStyle} title={MSG_PORTAL.CLASSES_SECTION}>
        {classesQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message={MSG_PORTAL.LOAD_ERROR}
            description={sprint4ErrorMessage(classesQuery.error)}
            action={
              <Button size="small" onClick={() => classesQuery.refetch()}>
                {MSG_S4.RETRY}
              </Button>
            }
          />
        ) : (
          <Table<StudentClass>
            rowKey="id"
            size="small"
            loading={classesQuery.isLoading}
            columns={classColumns}
            dataSource={classesQuery.data ?? []}
            locale={{ emptyText: <Empty description={MSG_PORTAL.CLASSES_EMPTY} /> }}
            pagination={false}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </Flex>
  );
}
