import {
  Banner,
  Button,
  Card,
  CheckboxInput,
  Divider,
  Heading,
  HStack,
  Text,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import loginIllustration from '../../assets/auth/login-illustration.png';
import { AppLink } from '../../components/AppLink/AppLink';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { AuthSwitch } from '../../components/AuthCard/AuthSwitch';
import { RoleButton } from '../../components/RoleButton/RoleButton';
import { login } from '../../features/auth/authApi';
import { ROLES, rolePreviewPath } from '../../features/auth/roles';
import type { Role } from '../../features/auth/roles';
import { useAuthStore } from '../../stores/authStore';
import { canAccessAcademicArea, isOwnerRole } from '../../features/auth/permissions';
import { useFormState } from '../../hooks/useFormState';

type LoginFormValues = {
  username: string;
  password: string;
  remember: boolean;
};

/**
 * Màn đăng nhập `/dang-nhap`.
 *
 * Trạng thái: **idle** (form trống) · **loading** (nút Đăng nhập) ·
 * **error** (`Banner status="error"`, `role="alert"`) · **success** (điều
 * hướng theo vai trò). Không có empty/no-permission — màn công khai.
 *
 * `NFR-REL-001`: lỗi/timeout chỉ hiện banner đỏ và **giữ nguyên** URL; không
 * bao giờ đi tiếp như đăng nhập thành công.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  /** Lỗi từ backend / lỗi mạng, hiển thị inline trong form. */
  const [formError, setFormError] = useState<string | null>(null);
  /** Thông báo khi đăng nhập OK nhưng vai trò chưa có trang tương ứng. */
  const [notice, setNotice] = useState<string | null>(null);

  const form = useFormState<LoginFormValues>(
    { username: '', password: '', remember: false },
    {
      username: (value) => (value.trim() ? undefined : 'Vui lòng nhập tên đăng nhập'),
      password: (value) => (value ? undefined : 'Vui lòng nhập mật khẩu'),
    },
  );

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      setFormError(null);
      setSession(res);

      // Đọc phiên MỚI NHẤT từ store (setSession đã cập nhật xong).
      const state = useAuthStore.getState();
      // SUPER_ADMIN → console quản trị (Sprint 2).
      if (state.backendRoles.includes('SUPER_ADMIN')) {
        navigate('/quan-tri');
        return;
      }
      // OWNER → console tổ chức (Sprint 3). (Giữ nguyên hành vi hiện có.)
      if (isOwnerRole(state.backendRoles)) {
        navigate('/to-chuc');
        return;
      }
      // Sprint 4 (option B): user có quyền PEOPLE_*/CLASS_* (vd HR/STAFF đào tạo) → /dao-tao.
      if (canAccessAcademicArea(state)) {
        navigate('/dao-tao');
        return;
      }
      const role = state.role;
      if (role) {
        navigate(rolePreviewPath(role));
      } else {
        setNotice(
          'Đăng nhập thành công, nhưng vai trò của bạn chưa có màn hình ở giai đoạn này. Vui lòng thử lại sau.',
        );
      }
    },
    onError: (error: Error) => {
      // NFR-REL-001: lỗi thì hiển thị rõ, KHÔNG điều hướng, KHÔNG hiện thành công.
      setFormError(error.message);
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    setNotice(null);
    // Backend không có trường "remember" — chỉ gửi 2 field contract yêu cầu.
    loginMutation.mutate({
      username: form.values.username.trim(),
      password: form.values.password,
    });
  };

  const handleSelectRole = (role: Role) => {
    navigate(rolePreviewPath(role.id));
  };

  const hero = (
    <div className="mems-auth__hero">
      <img
        src={loginIllustration}
        alt=""
        aria-hidden="true"
        className="mems-auth__hero-image"
      />
      <div>
        <Text type="large" weight="semibold" color="inherit" display="block">
          MEMS
        </Text>
        {/* Câu thường thay cho "EDUCATION MANAGEMENT" in hoa + letter-spacing:
            chữ hoa toàn bộ ở 12px đọc chậm hơn và là dấu hiệu landing page. */}
        <Text
          type="supporting"
          color="inherit"
          display="block"
          className="mems-auth__on-brand-muted"
          style={{ marginTop: 'var(--spacing-1)' }}
        >
          Hệ thống quản lý giáo dục theo module
        </Text>
      </div>

      {/* Panel có đúng một câu nói việc người dùng cần làm; khoảng trắng làm
          phần phân cấp thay cho khối "01 / 02 / 03" lợi ích chung chung. */}
      <div>
        <Heading
          level={2}
          type="display-3"
          color="inherit"
          style={{ margin: 0, marginBottom: 'var(--spacing-3)', maxWidth: '16ch' }}
        >
          Quản trị nhà trường trên một hệ thống.
        </Heading>
        <Text
          type="body"
          color="inherit"
          display="block"
          className="mems-auth__on-brand-muted"
          style={{ maxWidth: '30ch' }}
        >
          Đăng nhập bằng tài khoản do quản trị viên tổ chức cấp.
        </Text>
      </div>

      <Text type="supporting" color="inherit" className="mems-auth__on-brand-muted">
        © 2026 MEMS
      </Text>
    </div>
  );

  return (
    <AuthCard variant="split" activeTab="login" title="" subtitle="" hero={hero} rightMaxWidth={1014}>
      <VStack gap={3} className="mems-auth__card">
        <HStack gap={1} align="center">
          <Text type="supporting" color="secondary">
            Tài khoản
          </Text>
          <Text type="supporting" color="secondary">
            /
          </Text>
          <Text type="supporting" weight="medium">
            Đăng nhập
          </Text>
        </HStack>

        <Card padding={6}>
          <VStack gap={4}>
            <div>
              <HStack gap={3} align="center" style={{ marginBottom: 'var(--spacing-2)' }}>
                <div className="mems-auth__mark" aria-hidden="true">
                  M
                </div>
                <Heading level={1}>Đăng nhập</Heading>
              </HStack>
              <Text type="body" color="secondary">
                Chào mừng bạn quay lại hệ thống MEMS
              </Text>
            </div>

            <AuthSwitch current="login" />

            {formError && (
              <Banner
                status="error"
                title={formError}
                collapsible={false}
                role="alert"
                isDismissable
                onDismiss={() => setFormError(null)}
              />
            )}
            {notice && (
              <Banner
                status="warning"
                title={notice}
                collapsible={false}
                role="status"
                isDismissable
                onDismiss={() => setNotice(null)}
              />
            )}

            <form onSubmit={handleSubmit} noValidate>
              <VStack gap={4}>
                {/* Spec Figma ghi nhãn "Email"; BE/contract + tests hiện dùng
                    username/Tên đăng nhập — giữ contract. */}
                <TextInput
                  label="Tên đăng nhập"
                  value={form.values.username}
                  onChange={(value) => form.setValue('username', value)}
                  autoComplete="username"
                  placeholder="Ví dụ: nghia.ledai"
                  size="lg"
                  aria-required="true"
                  status={
                    form.errorOf('username')
                      ? { type: 'error', message: form.errorOf('username') }
                      : undefined
                  }
                />

                <TextInput
                  type="password"
                  label="Mật khẩu"
                  value={form.values.password}
                  onChange={(value) => form.setValue('password', value)}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  size="lg"
                  aria-required="true"
                  status={
                    form.errorOf('password')
                      ? { type: 'error', message: form.errorOf('password') }
                      : undefined
                  }
                />

                <HStack justify="between" align="center" gap={2} wrap="wrap">
                  <CheckboxInput
                    label="Ghi nhớ tôi"
                    value={form.values.remember}
                    onChange={(checked) => form.setValue('remember', checked)}
                  />
                  <AppLink to="/quen-mat-khau" type="body" weight="medium">
                    Quên mật khẩu?
                  </AppLink>
                </HStack>

                <Button
                  type="submit"
                  variant="primary"
                  label="Đăng nhập"
                  width="100%"
                  size="lg"
                  isLoading={loginMutation.isPending}
                />
              </VStack>
            </form>

            <Text type="supporting" color="secondary" style={{ textAlign: 'center' }}>
              Không chia sẻ mật khẩu với bất kỳ ai.
            </Text>
          </VStack>
        </Card>

        <HStack justify="center" align="center" gap={1} wrap="wrap">
          <Text type="body" color="secondary">
            Chưa có tài khoản?
          </Text>
          {/* Không đặt `label` (→ `aria-label`): tên của liên kết phải là chữ
              người dùng nhìn thấy ("Đăng ký ngay"), nếu không sẽ phạm 2.5.3
              Label in Name và điều khiển bằng giọng nói cũng trượt. */}
          <AppLink to="/dang-ky" type="body" weight="medium">
            Đăng ký ngay
          </AppLink>
        </HStack>

        <Card variant="muted" padding={3}>
          <Text type="body" weight="medium" display="block">
            Cần hỗ trợ đăng nhập?
          </Text>
          <Text type="body" color="secondary" style={{ marginTop: 'var(--spacing-1)' }}>
            Liên hệ quản trị viên tổ chức để được trợ giúp.
          </Text>
        </Card>

        <Divider />

        {/* Giữ luồng xem thử/điều hướng theo role cho Sprint 1 + test contract;
            không có trong spec Figma. */}
        <VStack gap={2}>
          <Text type="supporting" color="secondary" style={{ textAlign: 'center' }}>
            hoặc xem thử theo vai trò
          </Text>
          {ROLES.map((role) => (
            <RoleButton key={role.id} role={role} onSelect={handleSelectRole} />
          ))}
        </VStack>

        <Text type="supporting" color="secondary" style={{ textAlign: 'center' }}>
          © MEMS · Hệ thống Quản lý Giáo dục theo Module
        </Text>
      </VStack>
    </AuthCard>
  );
}
