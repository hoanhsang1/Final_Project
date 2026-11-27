import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountResetPasswordModal from './AccountResetPasswordModal';

const onCancel = vi.fn();
const onConfirm = vi.fn();

function renderModal() {
  render(
    <AccountResetPasswordModal
      open
      username="gv1"
      loading={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
}

async function chooseManualAndType(password: string) {
  await userEvent.click(screen.getByRole('radio', { name: 'Đặt mật khẩu mới thủ công' }));
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));
}

beforeEach(() => {
  onCancel.mockReset();
  onConfirm.mockReset();
});

describe('AccountResetPasswordModal — chính sách mật khẩu', () => {
  it('mật khẩu 11 ký tự bị chặn trước khi gọi API', async () => {
    renderModal();

    await chooseManualAndType('MatKhau1234');

    // Astryx phát thêm thông báo vào live-region → có thể trùng chữ; chỉ cần có ít nhất 1.
    expect((await screen.findAllByText(/tối thiểu 12 ký tự/i)).length).toBeGreaterThan(0);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('mật khẩu >72 byte UTF-8 bị chặn trước khi gọi API', async () => {
    renderModal();

    // 37 ký tự é → 74 byte UTF-8 (dù độ dài ký tự vẫn ≥ 12).
    // `fireEvent.change` đặt cả chuỗi một lần — tránh userEvent gõ 37 lần làm
    // test chậm khi chạy cùng 260 test khác trên máy yếu.
    await userEvent.click(screen.getByRole('radio', { name: 'Đặt mật khẩu mới thủ công' }));
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), {
      target: { value: 'é'.repeat(37) },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    expect((await screen.findAllByText(/tối đa 72 byte/i)).length).toBeGreaterThan(0);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('mật khẩu hợp lệ ≥12 ký tự và ≤72 byte thì gọi onConfirm', async () => {
    renderModal();

    await chooseManualAndType('MatKhau12345');

    expect(onConfirm).toHaveBeenCalledWith('manual', 'MatKhau12345');
  });

  it('chế độ gửi email không truyền mật khẩu', async () => {
    renderModal();

    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    expect(onConfirm).toHaveBeenCalledWith('email', undefined);
  });
});
