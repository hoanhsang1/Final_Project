import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Checkbox, Flex, Form, Grid, Input, Typography, theme } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import loginIllustration from '../../assets/auth/login-illustration.png';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { RoleButton } from '../../components/RoleButton/RoleButton';
import { login } from '../../features/auth/authApi';
import { ROLES, rolePreviewPath } from '../../features/auth/roles';
import type { Role } from '../../features/auth/roles';
import { useAuthStore } from '../../stores/authStore';
import { canAccessAcademicArea, isOwnerRole } from '../../features/auth/permissions';
import { color } from '../../theme';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

interface LoginFormValues {
  username: string;
  password: string;
  remember?: boolean;
}

export default function LoginPage() {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isDesktop = screens.lg;
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  /** Lỗi từ backend / lỗi mạng, hiển thị inline trong form. */
  const [formError, setFormError] = useState<string | null>(null);
  /** Thông báo khi đăng nhập OK nhưng vai trò chưa có trang tương ứng. */
  const [notice, setNotice] = useState<string | null>(null);

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

  const handleSubmit = (values: LoginFormValues) => {
    setNotice(null);
    // Backend không có trường "remember" — chỉ gửi 2 field contract yêu cầu.
    loginMutation.mutate({ username: values.username, password: values.password });
  };

  const handleSelectRole = (role: Role) => {
    navigate(rolePreviewPath(role.id));
  };

  const ui = {
    cardRadius: 20,
    controlRadius: 12,
    tabRadius: 14,
    softBg: color.brandSoft,
    tabSelectedBg: '#D1E0FF',
    cardBorder: token.colorBorderSecondary,
    divider: token.colorBorderSecondary,
    textMuted: token.colorTextSecondary,
    textSoft: token.colorTextSecondary,
  };

  const hero = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 1 }}>
      <img
        src={loginIllustration}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -token.paddingXL,
          width: `calc(100% + ${token.paddingXL * 2}px)`,
          height: `calc(100% + ${token.paddingXL * 2}px)`,
          objectFit: 'cover',
          opacity: 0.14,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Text style={{ color: token.colorWhite, fontSize: 30, fontWeight: 700, lineHeight: '36px' }}>MEMS</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 600, letterSpacing: 1.2, marginTop: 4 }}>
          EDUCATION MANAGEMENT
        </Text>
        <div style={{ width: 48, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.7)', marginTop: 28 }} aria-hidden="true" />
        <Title
          level={1}
          style={{ color: token.colorWhite, fontSize: 40, lineHeight: '48px', fontWeight: 700, margin: '20px 0 16px', whiteSpace: 'pre-line' }}
        >
          {'Chào mừng\nquay trở lại!'}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16, lineHeight: '23px', whiteSpace: 'pre-line' }}>
          {'Đăng nhập để tiếp tục quản lý hoạt\nđộng giáo dục của tổ chức trên một\nnền tảng thống nhất.'}
        </Text>
        <Flex vertical gap={24} style={{ marginTop: 40 }}>
          {[
            { n: '01', title: 'Một tài khoản', desc: 'Truy cập không gian quản trị' },
            { n: '02', title: 'Dữ liệu tập trung', desc: 'Thông tin được tổ chức rõ ràng' },
            { n: '03', title: 'An toàn và bảo mật', desc: 'Bảo vệ tài khoản của bạn' },
          ].map((item) => (
            <Flex key={item.n} gap={16} align="flex-start">
              <Text style={{ color: token.colorWhite, fontSize: 15, fontWeight: 700, lineHeight: '20px', minWidth: 24 }}>{item.n}</Text>
              <div>
                <Text style={{ color: token.colorWhite, fontSize: 15, fontWeight: 700, lineHeight: '20px', display: 'block' }}>{item.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: '19px' }}>{item.desc}</Text>
              </div>
            </Flex>
          ))}
        </Flex>
        <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: '18px', marginTop: 'auto', paddingTop: 24 }}>
          MEMS · Hệ thống Quản lý Giáo dục theo Module
        </Text>
      </div>
    </div>
  );

  return (
    <AuthCard variant="split" activeTab="login" title="" subtitle="" hero={hero} rightMaxWidth={1014}>
      <Flex gap={8} align="center" style={{ marginBottom: 16, marginTop: isDesktop ? 8 : 0 }}>
        <Text style={{ fontSize: 14, color: ui.textSoft }}>Tài khoản</Text>
        <Text style={{ fontSize: 14, color: ui.textSoft }}>/</Text>
        <Text style={{ fontSize: 14, color: ui.textSoft, fontWeight: 500 }}>Đăng nhập</Text>
      </Flex>

      <div
        style={{
          background: token.colorBgContainer,
          borderRadius: ui.cardRadius,
          boxShadow: token.boxShadowSecondary,
          border: `1px solid ${ui.cardBorder}`,
          padding: isDesktop ? 40 : 24,
          display: 'flex',
          flexDirection: 'column',
          gap: isDesktop ? 20 : 16,
        }}
      >
        <div>
          <Flex align="center" gap={16} style={{ marginBottom: 8 }}>
            <div
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: token.colorPrimary,
                color: token.colorWhite,
                display: 'grid',
                placeItems: 'center',
                fontSize: 28,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              M
            </div>
            <Title level={1} style={{ margin: 0, fontSize: isDesktop ? 32 : 26, lineHeight: 1.25, color: token.colorTextHeading }}>
              Đăng nhập
            </Title>
          </Flex>
          <Text style={{ display: 'block', fontSize: 16, lineHeight: '24px', color: ui.textMuted }}>
            Chào mừng bạn quay lại hệ thống MEMS
          </Text>
        </div>

        <Flex
          role="tablist"
          aria-label="Chọn loại tài khoản"
          style={{ background: ui.softBg, borderRadius: ui.tabRadius, padding: 4, minHeight: 56, gap: 4 }}
        >
          <div
            role="tab"
            aria-selected="true"
            style={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              minHeight: 48,
              borderRadius: ui.controlRadius,
              background: ui.tabSelectedBg,
              color: token.colorPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Đăng nhập
          </div>
          <Link
            role="tab"
            aria-selected="false"
            to="/dang-ky"
            style={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              minHeight: 48,
              borderRadius: ui.controlRadius,
              color: ui.textMuted,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Đăng ký
          </Link>
        </Flex>

        <div>
          <Text strong style={{ display: 'block', fontSize: 18, lineHeight: '24px', color: token.colorText, marginBottom: 16 }}>
            Thông tin tài khoản
          </Text>

          {formError && (
            <Alert
              type="error"
              showIcon
              message={formError}
              style={{ marginBottom: 20, borderRadius: ui.controlRadius }}
              role="alert"
            />
          )}
          {notice && (
            <Alert
              type="warning"
              showIcon
              message={notice}
              style={{ marginBottom: 20, borderRadius: ui.controlRadius }}
              role="status"
            />
          )}

          <Form<LoginFormValues> layout="vertical" requiredMark={false} onFinish={handleSubmit}>
            {/* Spec Figma ghi nhãn "Email"; BE/contract + tests hiện dùng username/Tên đăng nhập — giữ contract. */}
            <Form.Item
              label={<span style={{ fontSize: 14, fontWeight: 600, color: token.colorText }}>Tên đăng nhập</span>}
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              style={{ marginBottom: 20 }}
            >
              <Input
                autoComplete="username"
                placeholder="Ví dụ: nghia.ledai"
                size="large"
                style={{ borderRadius: ui.controlRadius, height: 48 }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontSize: 14, fontWeight: 600, color: token.colorText }}>Mật khẩu</span>}
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                size="large"
                style={{ borderRadius: ui.controlRadius, height: 48 }}
              />
            </Form.Item>

            <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ marginBottom: 24 }}>
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox style={{ fontSize: 14, color: token.colorText }}>Ghi nhớ tôi</Checkbox>
              </Form.Item>
              <Link to="/quen-mat-khau" style={{ fontSize: 14, fontWeight: 600, color: token.colorLink }}>
                Quên mật khẩu?
              </Link>
            </Flex>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                loading={loginMutation.isPending}
                style={{ height: 48, borderRadius: ui.controlRadius, fontSize: 15, fontWeight: 600, boxShadow: 'none' }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <Text style={{ display: 'block', textAlign: 'center', fontSize: 14, lineHeight: '20px', color: ui.textMuted, marginTop: 24 }}>
            Không chia sẻ mật khẩu với bất kỳ ai.
          </Text>
        </div>

        <div style={{ height: 1, background: ui.divider }} />

        <Flex justify="center" align="center" gap={8} wrap="wrap">
          <Text style={{ fontSize: 14, color: ui.textMuted }}>Chưa có tài khoản?</Text>
          <Link to="/dang-ky" aria-label="Đăng ký tổ chức" style={{ fontSize: 14, fontWeight: 600, color: token.colorLink }}>
            Đăng ký ngay
          </Link>
        </Flex>

        <div style={{ background: ui.softBg, borderRadius: 12, border: `1px solid ${ui.cardBorder}`, padding: '16px 20px' }}>
          <Text strong style={{ display: 'block', fontSize: 14, lineHeight: '20px', color: token.colorText, marginBottom: 4 }}>
            Cần hỗ trợ đăng nhập?
          </Text>
          <Text style={{ fontSize: 14, lineHeight: '20px', color: ui.textMuted }}>
            Liên hệ quản trị viên tổ chức để được trợ giúp.
          </Text>
        </div>

        {/* Giữ luồng xem thử/điều hướng theo role cho Sprint 1 + test contract; không có trong spec Figma. */}
        <div>
          <Text style={{ display: 'block', textAlign: 'center', fontSize: 12, color: ui.textMuted, marginBottom: 10 }}>
            hoặc xem thử theo vai trò
          </Text>
          <Flex vertical gap={token.marginXS}>
            {ROLES.map((role) => (
              <RoleButton key={role.id} role={role} onSelect={handleSelectRole} />
            ))}
          </Flex>
        </div>
      </div>

      <Text style={{ display: 'block', textAlign: 'center', fontSize: 12, lineHeight: '18px', color: ui.textMuted, marginTop: 16, marginBottom: 8 }}>
        © MEMS · Hệ thống Quản lý Giáo dục theo Module
      </Text>
    </AuthCard>
  );
}
