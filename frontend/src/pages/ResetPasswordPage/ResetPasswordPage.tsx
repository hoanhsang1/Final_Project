import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Flex, Form, Input, Result, Typography, theme } from 'antd';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { PasswordResetError, resetPassword } from '../../features/auth/authApi';

const { Text } = Typography;

/** Độ dài tối thiểu của mật khẩu mới — khớp ràng buộc `D-31`/`D-33` (≥ 8). */
const MIN_PASSWORD_LENGTH = 8;
/** BCrypt chỉ dùng 72 byte đầu — chặn ở FE cho khớp BE. */
const MAX_PASSWORD_LENGTH = 72;

interface ResetPasswordValues {
  newPassword: string;
  confirmPassword: string;
}

/**
 * Màn Đặt lại mật khẩu `/dat-lai-mat-khau?token=…` — bước 2 của luồng.
 *
 * Figma: các frame `06/07/08 · Reset password` (nhập mật khẩu mới, mật khẩu
 * không khớp, đặt lại thành công) + `23.29` (liên kết hết hạn).
 *
 * Token lấy từ query param vì email gửi ra một **liên kết** — dán link vào
 * trình duyệt hoặc F5 vẫn dùng được. Không có token → màn nhắc xin liên kết mới
 * thay vì hiện form vô nghĩa.
 *
 * Trạng thái: **loading** · **error** (`Alert`, kèm lối xin liên kết mới khi
 * token hết hạn) · **success** (`Result`) · nhánh thiếu token. No-permission
 * không áp dụng — màn công khai.
 *
 * ⚠️ BE chưa có endpoint `D-33` → 404 → hiện "chức năng chưa sẵn sàng",
 * KHÔNG giả thành công (`NFR-REL-001`).
 */
export default function ResetPasswordPage() {
  const { token } = theme.useToken();
  const [searchParams] = useSearchParams();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<PasswordResetError | null>(null);

  const resetToken = (searchParams.get('token') ?? '').trim();

  const mutation = useMutation({
    mutationFn: (newPassword: string) => resetPassword(resetToken, newPassword),
    onSuccess: () => {
      setFormError(null);
      setDone(true);
    },
    onError: (error) => {
      setDone(false);
      setFormError(
        error instanceof PasswordResetError
          ? error
          : new PasswordResetError('unknown', 'Không đặt lại được mật khẩu. Vui lòng thử lại.'),
      );
    },
  });

  if (!resetToken) {
    return (
      <AuthCard
        activeTab="login"
        title="Đặt lại mật khẩu"
        subtitle="Cần liên kết trong email để tiếp tục."
      >
        <Result
          status="warning"
          title="Thiếu liên kết đặt lại mật khẩu"
          subTitle="Liên kết trong email có thể đã bị cắt khi sao chép, hoặc bạn mở sai địa chỉ."
          extra={<Link to="/quen-mat-khau">Yêu cầu liên kết mới</Link>}
        />
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        activeTab="login"
        title="Đặt lại mật khẩu thành công"
        subtitle="Mật khẩu mới đã được lưu."
      >
        <Result
          status="success"
          title="Bạn có thể đăng nhập bằng mật khẩu mới"
          subTitle="Vì lý do an toàn, các phiên đăng nhập cũ trên thiết bị khác sẽ hết hiệu lực."
          extra={<Link to="/dang-nhap">Về trang đăng nhập</Link>}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      activeTab="login"
      title="Đặt mật khẩu mới"
      subtitle="Mật khẩu cần ít nhất 8 ký tự. Không dùng lại mật khẩu cũ."
    >
      <Form<ResetPasswordValues>
        layout="vertical"
        requiredMark={false}
        onFinish={(values) => mutation.mutate(values.newPassword)}
      >
        <Form.Item
          label="Mật khẩu mới"
          name="newPassword"
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            {
              min: MIN_PASSWORD_LENGTH,
              message: `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự`,
            },
            {
              max: MAX_PASSWORD_LENGTH,
              message: `Mật khẩu không được vượt quá ${MAX_PASSWORD_LENGTH} ký tự`,
            },
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="Nhập mật khẩu mới" />
        </Form.Item>

        <Form.Item
          label="Nhập lại mật khẩu"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Vui lòng nhập lại mật khẩu' },
            ({ getFieldValue }) => ({
              validator(_rule, value: string) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" />
        </Form.Item>

        {formError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={formError.message}
            style={{ marginBottom: token.margin }}
          />
        )}

        {formError?.kind === 'expired' && (
          <Flex justify="center" style={{ marginBottom: token.margin }}>
            <Link to="/quen-mat-khau">Yêu cầu liên kết mới</Link>
          </Flex>
        )}

        <Form.Item style={{ marginBottom: token.margin }}>
          <Button type="primary" htmlType="submit" block loading={mutation.isPending}>
            Lưu mật khẩu mới
          </Button>
        </Form.Item>
      </Form>

      <Flex justify="center" gap={token.marginXXS}>
        <Text type="secondary">Không muốn đổi?</Text>
        <Link to="/dang-nhap">Về trang đăng nhập</Link>
      </Flex>
    </AuthCard>
  );
}
