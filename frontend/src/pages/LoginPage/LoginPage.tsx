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
import { color, typeScale, weight } from '../../theme';

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

  /**
   * Chỉ bo góc + màu, và **tất cả** lấy từ `theme.ts`.
   *
   * Bản cũ giữ một bộ số riêng: bo 20/12/14 và `#D1E0FF` viết tay. Kết quả là
   * màn đăng nhập bo góc tròn hơn hẳn phần còn lại của hệ thống — cùng một app
   * mà hai ngôn ngữ hình khối, mắt đọc ra ngay là "ghép từ hai nguồn".
   */
  const ui = {
    cardRadius: token.borderRadiusLG,
    controlRadius: token.borderRadius,
    tabRadius: token.borderRadiusLG,
    softBg: color.brandSoft,
    tabSelectedBg: color.surface,
    cardBorder: token.colorBorderSecondary,
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
        <Text
          style={{
            color: color.onBrand,
            fontSize: typeScale.section,
            fontWeight: weight.strong,
            lineHeight: 1.2,
          }}
        >
          MEMS
        </Text>
        {/* Câu thường thay cho "EDUCATION MANAGEMENT" in hoa + letter-spacing:
            chữ hoa toàn bộ ở 12px đọc chậm hơn và là dấu hiệu landing page. */}
        <Text style={{ color: color.onBrandMuted, fontSize: typeScale.caption, marginTop: token.marginXXS }}>
          Hệ thống quản lý giáo dục theo module
        </Text>

        {/* Bỏ khối "01 / 02 / 03" ba lợi ích chung chung. Panel giờ có đúng một
            câu nói việc người dùng cần làm. Khoảng trắng làm phần phân cấp. */}
        <div style={{ marginTop: 'auto' }}>
          <Title
            level={2}
            style={{
              color: color.onBrand,
              fontSize: typeScale.h1,
              lineHeight: 1.25,
              fontWeight: weight.strong,
              letterSpacing: '-0.02em',
              margin: 0,
              marginBottom: token.marginSM,
              maxWidth: '16ch',
            }}
          >
            Quản trị nhà trường trên một hệ thống.
          </Title>
          <Text
            style={{
              color: color.onBrandMuted,
              fontSize: typeScale.body,
              maxWidth: '30ch',
              display: 'block',
            }}
          >
            Đăng nhập bằng tài khoản do quản trị viên tổ chức cấp.
          </Text>
        </div>

        <Text
          style={{
            color: color.onBrandMuted,
            fontSize: typeScale.caption,
            marginTop: 'auto',
            paddingTop: token.paddingLG,
          }}
        >
          © 2026 MEMS
        </Text>
      </div>
    </div>
  );

  return (
    <AuthCard variant="split" activeTab="login" title="" subtitle="" hero={hero} rightMaxWidth={1014}>
      <Flex
        gap={token.marginXS}
        align="center"
        style={{ marginBottom: token.margin, marginTop: isDesktop ? token.marginXS : 0 }}
      >
        <Text style={{ fontSize: typeScale.caption, color: ui.textSoft }}>Tài khoản</Text>
        <Text style={{ fontSize: typeScale.caption, color: ui.textSoft }}>/</Text>
        <Text style={{ fontSize: typeScale.caption, color: ui.textSoft, fontWeight: weight.medium }}>
          Đăng nhập
        </Text>
      </Flex>

      <div
        style={{
          background: token.colorBgContainer,
          borderRadius: ui.cardRadius,
          boxShadow: token.boxShadowSecondary,
          border: `${token.lineWidth}px solid ${ui.cardBorder}`,
          padding: isDesktop ? token.paddingXL : token.paddingLG,
          display: 'flex',
          flexDirection: 'column',
          gap: isDesktop ? token.margin : token.marginSM,
        }}
      >
        <div>
          <Flex align="center" gap={token.marginSM} style={{ marginBottom: token.marginXS }}>
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 36,
                borderRadius: ui.controlRadius,
                background: token.colorPrimary,
                color: token.colorWhite,
                display: 'grid',
                placeItems: 'center',
                fontSize: typeScale.section,
                fontWeight: weight.strong,
                flexShrink: 0,
              }}
            >
              M
            </div>
            <Title level={1} style={{ margin: 0, fontSize: typeScale.h1, lineHeight: 1.25, color: token.colorTextHeading }}>
              Đăng nhập
            </Title>
          </Flex>
          <Text style={{ display: 'block', fontSize: typeScale.body, lineHeight: 1.5, color: ui.textMuted }}>
            Chào mừng bạn quay lại hệ thống MEMS
          </Text>
        </div>

        <Flex
          role="tablist"
          aria-label="Chọn loại tài khoản"
          style={{
            background: ui.softBg,
            borderRadius: ui.tabRadius,
            padding: token.paddingXXS,
            gap: token.paddingXXS,
          }}
        >
          <div
            role="tab"
            aria-selected="true"
            style={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              minHeight: token.controlHeightLG,
              borderRadius: ui.controlRadius,
              background: ui.tabSelectedBg,
              color: token.colorPrimary,
              fontSize: typeScale.body,
              fontWeight: weight.medium,
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
              minHeight: token.controlHeightLG,
              borderRadius: ui.controlRadius,
              color: ui.textMuted,
              fontSize: typeScale.body,
              fontWeight: weight.medium,
              textDecoration: 'none',
            }}
          >
            Đăng ký
          </Link>
        </Flex>

        <div>
          {formError && (
            <Alert
              type="error"
              showIcon
              message={formError}
              style={{ marginBottom: token.margin, borderRadius: ui.controlRadius }}
              role="alert"
            />
          )}
          {notice && (
            <Alert
              type="warning"
              showIcon
              message={notice}
              style={{ marginBottom: token.margin, borderRadius: ui.controlRadius }}
              role="status"
            />
          )}

          <Form<LoginFormValues> layout="vertical" requiredMark={false} onFinish={handleSubmit}>
            {/* Spec Figma ghi nhãn "Email"; BE/contract + tests hiện dùng username/Tên đăng nhập — giữ contract. */}
            <Form.Item
              label="Tên đăng nhập"
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              style={{ marginBottom: token.margin }}
            >
              <Input
                autoComplete="username"
                placeholder="Ví dụ: nghia.ledai"
                size="large"
                style={{ borderRadius: ui.controlRadius }}
              />
            </Form.Item>

            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
              style={{ marginBottom: token.margin }}
            >
              <Input.Password
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                size="large"
                style={{ borderRadius: ui.controlRadius }}
              />
            </Form.Item>

            <Flex
              justify="space-between"
              align="center"
              wrap="wrap"
              gap={token.marginXS}
              style={{ marginBottom: token.marginLG }}
            >
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox style={{ fontSize: typeScale.body, color: token.colorText }}>Ghi nhớ tôi</Checkbox>
              </Form.Item>
              <Link
                to="/quen-mat-khau"
                style={{ fontSize: typeScale.body, fontWeight: weight.medium, color: token.colorLink }}
              >
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
                style={{
                  height: token.controlHeightLG,
                  borderRadius: ui.controlRadius,
                  fontSize: typeScale.body,
                  boxShadow: 'none',
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <Text
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: typeScale.caption,
              lineHeight: 1.5,
              color: ui.textMuted,
              marginTop: token.marginLG,
            }}
          >
            Không chia sẻ mật khẩu với bất kỳ ai.
          </Text>
        </div>

        <div style={{ height: token.lineWidth, background: token.colorBorderSecondary }} />

        <Flex justify="center" align="center" gap={token.marginXS} wrap="wrap">
          <Text style={{ fontSize: typeScale.body, color: ui.textMuted }}>Chưa có tài khoản?</Text>
          <Link
            to="/dang-ky"
            aria-label="Đăng ký tổ chức"
            style={{ fontSize: typeScale.body, fontWeight: weight.medium, color: token.colorLink }}
          >
            Đăng ký ngay
          </Link>
        </Flex>

        <div
          style={{
            background: ui.softBg,
            borderRadius: ui.controlRadius,
            border: `${token.lineWidth}px solid ${ui.cardBorder}`,
            paddingBlock: token.paddingSM,
            paddingInline: token.padding,
          }}
        >
          <Text
            style={{
              display: 'block',
              fontSize: typeScale.body,
              fontWeight: weight.medium,
              lineHeight: 1.5,
              color: token.colorText,
              marginBottom: token.marginXXS,
            }}
          >
            Cần hỗ trợ đăng nhập?
          </Text>
          <Text style={{ fontSize: typeScale.body, lineHeight: 1.5, color: ui.textMuted }}>
            Liên hệ quản trị viên tổ chức để được trợ giúp.
          </Text>
        </div>

        {/* Giữ luồng xem thử/điều hướng theo role cho Sprint 1 + test contract; không có trong spec Figma. */}
        <div>
          <Text
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: typeScale.caption,
              color: ui.textMuted,
              marginBottom: token.marginXS,
            }}
          >
            hoặc xem thử theo vai trò
          </Text>
          <Flex vertical gap={token.marginXS}>
            {ROLES.map((role) => (
              <RoleButton key={role.id} role={role} onSelect={handleSelectRole} />
            ))}
          </Flex>
        </div>
      </div>

      <Text
        style={{
          display: 'block',
          textAlign: 'center',
          fontSize: typeScale.caption,
          lineHeight: 1.5,
          color: ui.textMuted,
          marginTop: token.margin,
          marginBottom: token.marginXS,
        }}
      >
        © MEMS · Hệ thống Quản lý Giáo dục theo Module
      </Text>
    </AuthCard>
  );
}
