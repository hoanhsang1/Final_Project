import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsoleMenuItem } from '../../features/admin/consoleMenu';
import { CONSOLE_MENU } from '../../features/admin/consoleMenu';
import type { ModuleStatusMap } from '../../features/modules/moduleApi';
import AdminConsoleLayout from './AdminConsoleLayout';

interface CapturedShell {
  items: readonly ConsoleMenuItem[];
  selectedKey: string | null;
}

const captured: { current: CapturedShell | null } = { current: null };

vi.mock('../ConsoleShell/ConsoleShell', () => ({
  default: ({
    items,
    selectedKey,
  }: {
    items: readonly ConsoleMenuItem[];
    selectedKey: string | null;
  }) => {
    captured.current = { items, selectedKey };
    return <div data-testid="console-shell" />;
  },
}));

vi.mock('../../features/modules/useModuleStatus', () => ({ useModuleStatus: vi.fn() }));

const { useModuleStatus } = await import('../../features/modules/useModuleStatus');
const mockUseModuleStatus = vi.mocked(useModuleStatus);

function mockStatus(statuses: ModuleStatusMap | undefined, isError = false) {
  mockUseModuleStatus.mockReturnValue({
    data: statuses,
    isError,
  } as ReturnType<typeof useModuleStatus>);
}

function renderLayout(path: string): CapturedShell {
  captured.current = null;
  render(
    <MemoryRouter initialEntries={[path]}>
      <AdminConsoleLayout />
    </MemoryRouter>,
  );
  if (!captured.current) throw new Error('ConsoleShell không nhận được props');
  return captured.current;
}

const keysOf = (shell: CapturedShell) => shell.items.map((item) => item.key);

beforeEach(() => {
  mockStatus(undefined);
});

describe('AdminConsoleLayout — lọc menu theo trạng thái module', () => {
  it('CONSOLE_MENU có ít nhất một mục gắn moduleCode để bộ lọc có tác dụng', () => {
    expect(CONSOLE_MENU.some((item) => Boolean(item.moduleCode))).toBe(true);
  });

  it('đang tải (chưa có data) thì giữ nguyên toàn bộ menu', () => {
    const shell = renderLayout('/quan-tri');

    expect(keysOf(shell)).toEqual(CONSOLE_MENU.map((item) => item.key));
    expect(shell.selectedKey).toBe('tong-quan');
  });

  it('fetch status lỗi thì vẫn giữ nguyên menu, không ẩn mục nào', () => {
    mockStatus(undefined, true);

    const shell = renderLayout('/quan-tri/to-chuc');

    expect(keysOf(shell)).toEqual(CONSOLE_MENU.map((item) => item.key));
    expect(shell.selectedKey).toBe('to-chuc');
  });

  it('status not_registered thì ẩn đúng mục có moduleCode đó', () => {
    const target = CONSOLE_MENU.find((item) => item.key === 'to-chuc-tat-ca');
    expect(target?.moduleCode).toBeTruthy();

    mockStatus({ [target!.moduleCode as string]: 'not_registered' });
    const shell = renderLayout('/quan-tri/to-chuc-tat-ca');

    expect(keysOf(shell)).not.toContain('to-chuc-tat-ca');
    expect(shell.items).toHaveLength(CONSOLE_MENU.length - 1);
    // Truyền statuses vào cả activeMenuKey: mục đã ẩn không được chọn.
    expect(shell.selectedKey).not.toBe('to-chuc-tat-ca');
  });

  it('status disabled/locked vẫn giữ mục, partial map không ẩn mục thiếu status', () => {
    const target = CONSOLE_MENU.find((item) => item.moduleCode);
    expect(target?.moduleCode).toBeTruthy();

    mockStatus({ [target!.moduleCode as string]: 'disabled' });
    const shell = renderLayout('/quan-tri');

    expect(keysOf(shell)).toEqual(CONSOLE_MENU.map((item) => item.key));
  });
});
