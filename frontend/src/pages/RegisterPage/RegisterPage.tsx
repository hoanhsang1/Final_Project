import {
  Banner,
  Button,
  CheckboxList,
  CheckboxListItem,
  Divider,
  Heading,
  HStack,
  Selector,
  Skeleton,
  Text,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import { AuthCard } from '../../components/AuthCard/AuthCard';
import { register } from '../../features/auth/authApi';
import type { OrgType, RegisterRequest } from '../../features/auth/types';
import { MSG_MOD } from '../../features/admin/adminMessages';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';
import { useFormState } from '../../hooks/useFormState';

/**
 * Loại tổ chức — value gửi lên UPPERCASE, khớp đúng OrgType enum backend.
 */
const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: 'SCHOOL', label: 'Trường học' },
  { value: 'CENTER', label: 'Trung tâm' },
];

/** Giới hạn độ dài mật khẩu — khớp ràng buộc đăng ký của BE. */
const MIN_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Form values phía FE — field name có thể khác contract BE, sẽ map lại trong handleSubmit. */
type RegisterFormValues = {
  organizationName: string;
  orgType: OrgType | '';
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  modules: string[];
};

/**
 * Màn Đăng ký tổ chức `/dang-ky`.
 *
 * Danh mục module KHÔNG hardcode trong FE (`D-03`) — lấy từ
 * `GET /api/v1/modules`. Trước đây FE tự chế danh sách và có chứa
 * `FACILITY_MANAGEMENT` — mã KHÔNG tồn tại trong DB.
 *
 * Trạng thái:
 * - **loading** — `Skeleton` trong khi tải danh mục module.
 * - **empty** — danh mục rỗng: `Banner` báo chưa có module, không có gì để chọn.
 * - **error** — không tải được danh mục hoặc BE từ chối đăng ký: `Banner` đỏ,
 *   `NFR-REL-001` không hiện thành công.
 * - **success** — `Banner status="success"` + lối về đăng nhập.
 * - **no-permission** — không áp dụng: màn công khai.
 */
export default function RegisterPage() {
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

  const form = useFormState<RegisterFormValues>(
    {
      organizationName: '',
      orgType: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      modules: [],
    },
    {
      organizationName: (value) => (value.trim() ? undefined : 'Vui lòng nhập tên tổ chức'),
      orgType: (value) => (value ? undefined : 'Vui lòng chọn loại tổ chức'),
      username: (value) => {
        if (!value.trim()) return 'Vui lòng nhập tên đăng nhập';
        return value.trim().length >= 3 ? undefined : 'Tên đăng nhập tối thiểu 3 ký tự';
      },
      email: (value) => {
        if (!value.trim()) return 'Vui lòng nhập email';
        return EMAIL_PATTERN.test(value.trim()) ? undefined : 'Email không hợp lệ';
      },
      password: (value) => {
        if (!value) return 'Vui lòng nhập mật khẩu';
        return value.length >= MIN_PASSWORD_LENGTH
          ? undefined
          : `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`;
      },
      confirmPassword: (value, values) => {
        if (!value) return 'Vui lòng nhập lại mật khẩu';
        return value === values.password ? undefined : 'Mật khẩu nhập lại không khớp';
      },
      modules: (value) => (value.length > 0 ? undefined : 'Vui lòng chọn ít nhất 1 module'),
    },
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;

    const payload: RegisterRequest = {
      organizationName: form.values.organizationName.trim(),
      // `orgType` đã qua validator nên chắc chắn khác rỗng.
      orgType: form.values.orgType as OrgType,
      username: form.values.username.trim(),
      email: form.values.email.trim(),
      password: form.values.password,
      modules: form.values.modules,
    };
    registerMutation.mutate(payload);
  };

  // Hiển thị màn hình thành công sau khi đăng ký
  if (registerMutation.isSuccess) {
    return (
      <AuthCard activeTab="register" title="Đăng ký tổ chức" subtitle="">
        <VStack gap={4}>
          <Banner
            status="success"
            title="Gửi đăng ký thành công!"
            description={
              <>
                Tổ chức của bạn đang ở trạng thái <Text weight="semibold">Chờ duyệt</Text>. Admin hệ
                thống sẽ xem xét và phê duyệt trong thời gian sớm nhất. Bạn sẽ nhận thông báo qua
                email khi được duyệt.
              </>
            }
            collapsible={false}
          />
          <HStack justify="center">
            <AppLink to="/dang-nhap" type="body" weight="medium">
              Về trang đăng nhập
            </AppLink>
          </HStack>
        </VStack>
      </AuthCard>
    );
  }

  const isSubmitting = registerMutation.isPending;

  return (
    <AuthCard
      activeTab="register"
      title="Đăng ký tổ chức"
      subtitle="Tạo tài khoản quản trị cho đơn vị của bạn"
    >
      <VStack gap={4}>
        <Banner
          status="warning"
          title="Sau khi gửi, tổ chức sẽ ở trạng thái Chờ duyệt."
          description="Admin hệ thống phê duyệt xong bạn mới đăng nhập được."
          collapsible={false}
        />

        <form onSubmit={handleSubmit} noValidate>
          <VStack gap={4}>
            {/* ── Thông tin tổ chức ── */}
            <Heading level={2}>Thông tin tổ chức</Heading>

            <TextInput
              label="Tên tổ chức"
              value={form.values.organizationName}
              onChange={(value) => form.setValue('organizationName', value)}
              placeholder="Ví dụ: Trường THPT Nguyễn Du"
              isDisabled={isSubmitting}
              aria-required="true"
              status={
                form.errorOf('organizationName')
                  ? { type: 'error', message: form.errorOf('organizationName') }
                  : undefined
              }
            />

            <Selector
              label="Loại tổ chức"
              value={form.values.orgType}
              options={ORG_TYPE_OPTIONS}
              onChange={(value) => form.setValue('orgType', value as OrgType)}
              placeholder="Chọn loại tổ chức"
              isDisabled={isSubmitting}
              status={
                form.errorOf('orgType')
                  ? { type: 'error', message: form.errorOf('orgType') }
                  : undefined
              }
            />

            {modulesQuery.isPending && (
              <VStack gap={2} role="status">
                {/* Nhãn này CỐ Ý khác nhãn của CheckboxList bên dưới: nếu trùng
                    chữ, người dùng nghe/đọc sẽ thấy hai dòng "Module cần sử
                    dụng" liền nhau mà không biết dòng nào là trạng thái. */}
                <Text type="label">Đang tải danh mục module…</Text>
                <Skeleton height={36} radius={2} />
                <Skeleton height={36} radius={2} />
                <Skeleton height={36} radius={2} />
              </VStack>
            )}

            {modulesQuery.isError && (
              <Banner
                status="error"
                title={MSG_MOD.LOAD_FAILED}
                description="Danh mục module không tải được. Vui lòng tải lại trang rồi đăng ký."
                collapsible={false}
                role="alert"
              />
            )}

            {modulesQuery.isSuccess && moduleOptions.length === 0 && (
              <Banner
                status="warning"
                title="Chưa có module nào để chọn"
                description="Quản trị hệ thống cần bật module trước khi tổ chức đăng ký."
                collapsible={false}
              />
            )}

            {/* Danh sách DỌC — dễ đọc và dễ bấm trên màn hình 320px. Vẫn render
                cả khi danh mục chưa tải xong để lỗi "chọn ít nhất 1 module" có
                chỗ hiển thị. */}
            <CheckboxList
              label="Module cần sử dụng"
              value={form.values.modules}
              onChange={(values) => form.setValue('modules', values)}
              isDisabled={isSubmitting}
              status={
                form.errorOf('modules')
                  ? { type: 'error', message: form.errorOf('modules') }
                  : undefined
              }
            >
              {moduleOptions.map((m) => (
                <CheckboxListItem key={m.value} label={m.label} value={m.value} />
              ))}
            </CheckboxList>

            <Divider />

            {/* ── Tài khoản quản trị ── */}
            <Heading level={2}>Tài khoản quản trị</Heading>

            <TextInput
              label="Tên đăng nhập"
              value={form.values.username}
              onChange={(value) => form.setValue('username', value)}
              autoComplete="username"
              placeholder="Ví dụ: nguyen.van.a"
              isDisabled={isSubmitting}
              aria-required="true"
              status={
                form.errorOf('username')
                  ? { type: 'error', message: form.errorOf('username') }
                  : undefined
              }
            />

            <TextInput
              type="email"
              label="Email"
              value={form.values.email}
              onChange={(value) => form.setValue('email', value)}
              autoComplete="email"
              placeholder="ban@truong.edu.vn"
              isDisabled={isSubmitting}
              aria-required="true"
              status={
                form.errorOf('email') ? { type: 'error', message: form.errorOf('email') } : undefined
              }
            />

            <TextInput
              type="password"
              label="Mật khẩu"
              value={form.values.password}
              onChange={(value) => form.setValue('password', value)}
              autoComplete="new-password"
              placeholder={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}
              isDisabled={isSubmitting}
              aria-required="true"
              status={
                form.errorOf('password')
                  ? { type: 'error', message: form.errorOf('password') }
                  : undefined
              }
            />

            <TextInput
              type="password"
              label="Nhập lại mật khẩu"
              value={form.values.confirmPassword}
              onChange={(value) => form.setValue('confirmPassword', value)}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              isDisabled={isSubmitting}
              aria-required="true"
              status={
                form.errorOf('confirmPassword')
                  ? { type: 'error', message: form.errorOf('confirmPassword') }
                  : undefined
              }
            />

            {/* Hiển thị lỗi từ server */}
            {registerMutation.isError && (
              <Banner
                status="error"
                title={(registerMutation.error as Error).message}
                collapsible={false}
                role="alert"
              />
            )}

            <Button
              type="submit"
              variant="primary"
              label="Gửi đăng ký"
              width="100%"
              isLoading={isSubmitting}
            />
          </VStack>
        </form>

        {/* Lối quay lại đăng nhập — trước đây nằm ở cặp tab trên đầu card, nay bỏ tab
            để không lặp với dòng "Chưa có tổ chức? Đăng ký tổ chức" ở màn đăng nhập. */}
        <HStack justify="center" gap={1} wrap="wrap">
          <Text type="body" color="secondary">
            Đã có tài khoản?
          </Text>
          <AppLink to="/dang-nhap" type="body" weight="medium">
            Đăng nhập
          </AppLink>
        </HStack>
      </VStack>
    </AuthCard>
  );
}
