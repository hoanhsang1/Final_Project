import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ROLES } from '../../features/auth/roles';
import { RoleButton } from './RoleButton';

const teacher = ROLES.find((role) => role.id === 'teacher')!;

it('hiện nhãn và mô tả dạng chữ, không chỉ màu (BR-08)', () => {
  render(<RoleButton role={teacher} onSelect={() => {}} />);

  expect(screen.getByText('Giáo viên')).toBeInTheDocument();
  expect(screen.getByText(/báo sự cố thiết bị/i)).toBeInTheDocument();
});

it('bấm thì gọi onSelect với đúng role', async () => {
  const onSelect = vi.fn();
  render(<RoleButton role={teacher} onSelect={onSelect} />);

  await userEvent.click(screen.getByRole('button', { name: /giáo viên/i }));

  expect(onSelect).toHaveBeenCalledWith(teacher);
});

it('là button thật, thao tác được bằng bàn phím', async () => {
  const onSelect = vi.fn();
  render(<RoleButton role={teacher} onSelect={onSelect} />);

  await userEvent.tab();
  expect(screen.getByRole('button', { name: /giáo viên/i })).toHaveFocus();

  await userEvent.keyboard('{Enter}');

  expect(onSelect).toHaveBeenCalledWith(teacher);
});
