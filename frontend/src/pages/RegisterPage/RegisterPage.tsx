import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  Result,
  Select,
  Skeleton,
  Typography,
  theme,
} from 'antd';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { register } from '../../features/auth/authApi';
import type { OrgType, RegisterRequest } from '../../features/auth/types';
import { MSG_MOD } from '../../features/admin/adminMessages';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';

const { Title, Text } = Typography;

/**
 * Loại tổ chức — value gửi lên UPPERCASE, khớp đúng OrgType enum backend.
 */
const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: 'SCHOOL', label: 'Trường học' },
  { value: 'CENTER', label: 'Trung tâm' },
];

/**
 * Danh sách module KHÔNG hardcode trong FE nữa (`D-03`) — lấy từ
 * `GET /api/v1/modules`. Trước đây FE tự chế danh sách và có chứa
 * `FACILITY_MANAGEMENT` — mã KHÔNG tồn tại trong DB.
 */

/** Form values phía FE — field name có thể khác contract BE, sẽ map lại trong handleSubmit. */
interface RegisterFormValues {
  organizationName: string;
  orgType: OrgType;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  modules: string[];
}

export default function RegisterPage() {
  const { token } = theme.useToken();

  // `D-03`: danh mục module lấy từ BE (`GET /api/v1/modules`), cache 10 phút.
  const modulesQuery = useQuery({
    queryKey: moduleCatalogKey,
    queryFn: fetchModuleCatalog,
    staleTime: MODULE_CATALOG_STALE_TIME,
  });
  const moduleOptions = (modulesQuery.data ?? []).map((m) => ({
    label: m.name,
    value: m.code,
  }));

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterRequest) => register(payload),
  });

  const handleSubmit = (values: RegisterFormValues) => {
    const payload: RegisterRequest = {
      organizationName: values.organizationName.trim(),
      orgType: values.orgType,
      username: values.username.trim(),
      email: values.email.trim(),
      password: values.password,
      modules: values.modules ?? [],
    };
    registerMutation.mutate(payload);
  };

  // Hiển thị màn hình thành công sau khi đăng ký
  if (registerMutation.isSuccess) {
    return (
      <AuthCard activeTab="register" title="Đăng ký tổ chức" subtitle="">
        <Result
          status="success"
          title="Gửi đăng ký thành công!"
          subTitle={
            <Text>
              Tổ chức của bạn đang ở trạng thái{' '}
              <Text strong>Chờ duyệt</Text>. Admin hệ thống sẽ xem xét và phê
              duyệt trong thời gian sớm nhất. Bạn sẽ nhận thông báo qua email
              khi được duyệt.
            </Text>
          }
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      activeTab="register"
      title="Đăng ký tổ chức"
      subtitle="Tạo tài khoản quản trị cho đơn vị của bạn"
    >
      <Alert
        type="warning"
        showIcon
        message="Sau khi gửi, tổ chức sẽ ở trạng thái Chờ duyệt."
        description="Admin hệ thống phê duyệt xong bạn mới đăng nhập được."
        style={{ marginBottom: token.margin }}
      />

      <Form<RegisterFormValues>
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        disabled={registerMutation.isPending}
      >
        {/* ── Thông tin tổ chức ── */}
        <Title level={5} style={{ marginTop: 0 }}>
          Thông tin tổ chức
        </Title>

        <Form.Item
          label="Tên tổ chức"
          name="organizationName"
          rules={[{ required: true, message: 'Vui lòng nhập tên tổ chức' }]}
        >
          <Input placeholder="Ví dụ: Trường THPT Nguyễn Du" />
        </Form.Item>

        <Form.Item
          label="Loại tổ chức"
          name="orgType"
          rules={[{ required: true, message: 'Vui lòng chọn loại tổ chức' }]}
        >
          <Select placeholder="Chọn loại tổ chức" options={ORG_TYPE_OPTIONS} />
        </Form.Item>

        {modulesQuery.isPending && (
          <Skeleton active paragraph={{ rows: 3 }} style={{ marginBottom: token.margin }} />
        )}

        {modulesQuery.isError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={MSG_MOD.LOAD_FAILED}
            description="Danh mục module không tải được. Vui lòng tải lại trang rồi đăng ký."
            style={{ marginBottom: token.margin }}
          />
        )}

        <Form.Item
          label="Module cần sử dụng"
          name="modules"
          rules={[{ required: true, type: 'array', min: 1, message: 'Vui lòng chọn ít nhất 1 module' }]}
        >
          {/* Danh sách DỌC — dễ đọc và dễ bấm trên màn hình 320px. */}
          <Checkbox.Group>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}>
              {moduleOptions.map((m) => (
                <Checkbox key={m.value} value={m.value}>
                  {m.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </Form.Item>

        <Divider />

        {/* ── Tài khoản quản trị ── */}
        <Title level={5}>Tài khoản quản trị</Title>

        <Form.Item
          label="Tên đăng nhập"
          name="username"
          rules={[
            { required: true, message: 'Vui lòng nhập tên đăng nhập' },
            { min: 3, message: 'Tên đăng nhập tối thiểu 3 ký tự' },
          ]}
        >
          <Input autoComplete="username" placeholder="Ví dụ: nguyen.van.a" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input autoComplete="email" placeholder="ban@truong.edu.vn" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu' },
            { min: 12, message: 'Mật khẩu tối thiểu 12 ký tự' },
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" />
        </Form.Item>

        <Form.Item
          label="Nhập lại mật khẩu"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Vui lòng nhập lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_rule, value: string) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="Nhập lại mật khẩu" />
        </Form.Item>

        {/* Hiển thị lỗi từ server */}
        {registerMutation.isError && (
          <Alert
            type="error"
            showIcon
            message={(registerMutation.error as Error).message}
            style={{ marginBottom: token.margin }}
            role="alert"
          />
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={registerMutation.isPending}
          >
            Gửi đăng ký
          </Button>
        </Form.Item>
      </Form>
    </AuthCard>
  );
}
