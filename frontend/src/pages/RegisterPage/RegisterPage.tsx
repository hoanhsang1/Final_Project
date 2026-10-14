import { Alert, Button, Divider, Form, Input, Select, Typography, theme } from 'antd';
import { AuthCard } from '../../components/AuthCard/AuthCard';

const { Title } = Typography;

/**
 * Bám đúng `org_type` trong schema `organization` của repo backend.
 * Nhãn hiển thị bằng tiếng Việt, giá trị gửi lên giữ nguyên tiếng Anh.
 */
const ORG_TYPE_OPTIONS = [
  { value: 'school', label: 'Trường học' },
  { value: 'center', label: 'Trung tâm' },
];

interface RegisterFormValues {
  name: string;
  org_type: 'school' | 'center';
  contact_email: string;
  contact_phone: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const { token } = theme.useToken();

  const handleSubmit = (_values: RegisterFormValues) => {
    // TODO(Sprint 2): gọi API đăng ký tổ chức khi Sang chốt contract.
    // TODO(Sprint 2): thay antd Form bằng React Hook Form + Zod theo AGENTS.md mục 7 / ADR-FE.
    // Sprint 1 chỉ dựng giao diện để chốt design, không gọi API.
  };

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

      <Form<RegisterFormValues> layout="vertical" requiredMark={false} onFinish={handleSubmit}>
        <Title level={5} style={{ marginTop: 0 }}>
          Thông tin tổ chức
        </Title>

        <Form.Item
          label="Tên tổ chức"
          name="name"
          rules={[{ required: true, message: 'Vui lòng nhập tên tổ chức' }]}
        >
          <Input placeholder="Ví dụ: Trường Đại học Bách khoa" />
        </Form.Item>

        <Form.Item
          label="Loại tổ chức"
          name="org_type"
          rules={[{ required: true, message: 'Vui lòng chọn loại tổ chức' }]}
        >
          <Select placeholder="Chọn loại tổ chức" options={[...ORG_TYPE_OPTIONS]} />
        </Form.Item>

        <Form.Item
          label="Email liên hệ"
          name="contact_email"
          rules={[
            { required: true, message: 'Vui lòng nhập email liên hệ' },
            { type: 'email', message: 'Email liên hệ không hợp lệ' },
          ]}
        >
          <Input placeholder="lienhe@truong.edu.vn" />
        </Form.Item>

        <Form.Item
          label="Số điện thoại"
          name="contact_phone"
          rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
        >
          <Input placeholder="Ví dụ: 028 1234 5678" />
        </Form.Item>

        <Divider />

        <Title level={5}>Tài khoản quản trị</Title>

        <Form.Item
          label="Tên đăng nhập"
          name="username"
          rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
        >
          <Input autoComplete="username" placeholder="Ví dụ: nghia.ledai" />
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
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
        >
          <Input.Password autoComplete="new-password" placeholder="Nhập mật khẩu" />
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

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block>
            Gửi đăng ký
          </Button>
        </Form.Item>
      </Form>
    </AuthCard>
  );
}
