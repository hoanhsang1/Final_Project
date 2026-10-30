import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Flex, Form, Input, Result, Typography, theme } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { PasswordResetError, requestPasswordReset } from '../../features/auth/authApi';

const { Text } = Typography;

/** Giá trị form — chỉ 1 trường, khai báo để `Form` suy ra type khi `onFinish`. */
interface ForgotPasswordValues {
  email: string;
}

/**
 * Màn Quên mật khẩu `/quen-mat-khau` — bước 1 của luồng đặt lại.
 *
 * Figma: frame `05 · Forgot password` (cùng khung 2 cột với màn đăng nhập).
 *
 * Nguyên tắc chống dò tài khoản: dù email có trong hệ thống hay không, BE trả
 * cùng một kết quả và FE hiện **cùng một thông báo** — người ngoài không dùng
 * màn này để kiểm tra email nào đã đăng ký.
 *
 * Trạng thái: **loading** (nút gửi) · **error** (`Alert` trong form) ·
 * **success** (`Result` "Kiểm tra email"). Không có empty/no-permission — màn
 * công khai, không cần dữ liệu để hiển thị.
 *
 * ⚠️ BE chưa có endpoint `D-32` → bấm gửi sẽ ra `Alert` "chức năng chưa sẵn
 * sàng", KHÔNG giả thành công (`NFR-REL-001`).
 */
export default function ForgotPasswordPage() {
  const { token } = theme.useToken();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
    onSuccess: (_data, email) => {
      setFormError(null);
      setSentTo(email);
    },
    onError: (error) => {
      // NFR-REL-001: lỗi/timeout thì KHÔNG hiện trạng thái thành công.
      setSentTo(null);
      setFormError(
        error instanceof PasswordResetError
          ? error.message
          : 'Không gửi được yêu cầu. Vui lòng thử lại.',
      );
    },
  });

  if (sentTo) {
    return (
      <AuthCard
        activeTab="login"
        title="Kiểm tra email của bạn"
        subtitle="Hướng dẫn đặt lại mật khẩu vừa được gửi đi."
      >
        <Result
          status="success"
          title="Đã gửi yêu cầu đặt lại mật khẩu"
          subTitle={
            <Text>
              Nếu <Text strong>{sentTo}</Text> đã đăng ký tài khoản, bạn sẽ nhận được email kèm
              liên kết đặt lại. Liên kết hiệu lực trong 30 phút.
            </Text>
          }
          extra={<Link to="/dang-nhap">Về trang đăng nhập</Link>}
        />

        <Flex vertical gap={token.marginSM} align="center">
          <Text type="secondary" style={{ textAlign: 'center' }}>
            Không thấy email? Kiểm tra hộp thư rác trước khi yêu cầu lại.
          </Text>
          <Button
            type="link"
            onClick={() => {
              setSentTo(null);
              setFormError(null);
            }}
          >
            Dùng email khác
          </Button>
        </Flex>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      activeTab="login"
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu."
    >
      <Form<ForgotPasswordValues>
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => mutation.mutate(values.email.trim())}
      >
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không đúng định dạng' },
          ]}
        >
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="ten@donvi.edu.vn"
          />
        </Form.Item>

        {formError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={formError}
            style={{ marginBottom: token.margin }}
          />
        )}

        <Form.Item style={{ marginBottom: token.margin }}>
          <Button type="primary" htmlType="submit" block loading={mutation.isPending}>
            Gửi liên kết đặt lại
          </Button>
        </Form.Item>
      </Form>

      <Flex justify="center" gap={token.marginXXS}>
        <Text type="secondary">Nhớ ra mật khẩu?</Text>
        <Link to="/dang-nhap">Đăng nhập</Link>
      </Flex>
    </AuthCard>
  );
}
