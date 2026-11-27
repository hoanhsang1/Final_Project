# Lưới tuần lịch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay bảng danh sách bằng lưới tuần 7 cột, khối buổi học pastel kiểu ScheduleBuilder, dùng chung cho lịch phòng ban và lịch cá nhân.

**Architecture:** Một helper thuần `weeklyGrid.ts` chuyển `ScheduleItem[]` thành bố cục ngày/giờ (kèm lane chồng lấn, cắt khung giờ, màu băm ổn định). Component `WeeklyScheduleGrid` chỉ lo render + điều hướng tuần + a11y. Hai page giữ nguyên query/filter/phân quyền/dialog, chỉ đổi vùng render dữ liệu.

**Tech Stack:** React 19 + TypeScript, Astryx UI, Vitest + Testing Library, CSS thuần (không dependency mới).

**Spec:** `docs/superpowers/specs/2026-11-27-lich-luoi-tuan-design.md`

## Global Constraints

- Không commit, push, merge; HEAD phải vẫn là `5a4a286`, staged `0`, file bị xoá `0`.
- FE giữ Astryx; không copy FE từ `origin/main`; không đổi build/lint/CI; không thêm dependency.
- Không đổi BE/contract; API vẫn `GET /api/departments/{dept}/schedules` và `GET /api/schedules/me`.
- Trang chạy/verify tại `http://localhost:5173` (không dùng `127.0.0.1`).
- Không dùng từ “VIP”; không đụng `07_people_department_access.sql`; không đụng worktree FE shell.
- Nhãn tiếng Việt giữ nguyên từ `scheduleMessages.ts`; màu/token lấy đúng spec.
- Mỗi khối là `<button>` có `aria-label` dạng `HH:mm–HH:mm, {môn}, {lớp}, {giáo viên}, {phòng}, {trạng thái}`.

## Review Focus

- Buổi nằm ngoài 07:00–20:00 hoặc qua nửa đêm → kẹp về mép lưới, đếm vào `outOfRangeCount`, không mất/không crash. Test: `weeklyGrid.test.ts` → `clips sessions outside the window and counts them`.
- Hai buổi trùng giờ cùng ngày → chia lane, cả hai đều render được. Test: `weeklyGrid.test.ts` → `assigns separate lanes to overlapping sessions`.
- Buổi bị huỷ → vẫn hiện nhưng mờ/gạch chữ, vẫn focus được. Test: `WeeklyScheduleGrid.test.tsx` → `renders a cancelled session as a muted, strike-through button`.
- Không có `schedule.update` → click khối không mở dialog sửa; có quyền thì nút Huỳ/Xoá vẫn dùng được trong dialog. Test: `SchedulePage.test.tsx` → `only schedule.view: block is not editable` và `cancel/delete from the edit dialog`.
- Thay bảng nhưng mất 5 state → loading/empty/error/forbidden vẫn như cũ. Tests: `SchedulePage.test.tsx` và `MySchedulePage.test.tsx` (các test `loading`, `empty`, `error`, `forbidden` hiện có).

---

### Task 1: Helper bố cục lịch tuần

**Files:**
- Create: `frontend/src/features/schedule/weeklyGrid.ts`
- Test: `frontend/src/features/schedule/weeklyGrid.test.ts`

**Interfaces:**
- Consumes: `ScheduleItem` từ `frontend/src/features/schedule/types.ts`.
- Produces:
  - `GRID_START_HOUR = 7`, `GRID_END_HOUR = 20`, `HOUR_HEIGHT_PX = 56`.
  - `PASTEL_COLORS: readonly string[]` = `['#D6E2F3','#D1E5DB','#E2D7EF','#EED9E4','#F1E3C5']`.
  - `weekKeyOf(value: string): string` — trả thứ Hai `YYYY-MM-DD` theo giờ local.
  - `shiftWeek(weekStart: string, deltaWeeks: number): string` — trả thứ Hai sau `deltaWeeks`.
  - `pastelFor(item: ScheduleItem): string` — băm ổn định từ `subjectName || className || classId`.
  - `layoutWeek(items: ScheduleItem[], weekStart: string): WeekLayout`, với:
    - `PositionedSession = { item: ScheduleItem; lane: number; laneCount: number; topPercent: number; heightPercent: number; clipped: boolean }`
    - `WeekDay = { key: string; label: string; dateLabel: string; sessions: PositionedSession[] }`
    - `WeekLayout = { days: WeekDay[]; weekStart: string; weekEnd: string; outOfRangeCount: number }`

- [ ] **Step 1: Viết test cho `weekKeyOf`/`shiftWeek`/`pastelFor`**

```ts
import { describe, expect, it } from 'vitest';
import { PASTEL_COLORS, pastelFor, shiftWeek, weekKeyOf } from './weeklyGrid';
import type { ScheduleItem } from './types';

const item = (over: Partial<ScheduleItem> = {}): ScheduleItem => ({
  id: 's1', classId: 'c1', className: '12A1',
  startTime: '2026-12-07T07:30:00', endTime: '2026-12-07T08:15:00',
  subjectName: 'Java cơ bản', status: 'scheduled', ...over,
});

describe('weeklyGrid', () => {
  it('maps a date to its Monday and shifts weeks', () => {
    expect(weekKeyOf('2026-12-09T09:00:00')).toBe('2026-12-07');
    expect(shiftWeek('2026-12-07', 1)).toBe('2026-12-14');
    expect(shiftWeek('2026-12-14', -1)).toBe('2026-12-07');
  });

  it('uses a stable pastel per subject', () => {
    expect(PASTEL_COLORS).toContain(pastelFor(item()));
    expect(pastelFor(item())).toBe(pastelFor(item({ id: 's2', className: '12A2' })));
  });
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd frontend && npx vitest run src/features/schedule/weeklyGrid.test.ts`
Expected: FAIL — module `./weeklyGrid` không tồn tại.

- [ ] **Step 3: Implement `weeklyGrid.ts`**

Khai báo đúng các hằng và signature ở Interfaces. `weekKeyOf` dùng
`dayjs(value).subtract((dayjs(value).day() + 6) % 7, 'day').format('YYYY-MM-DD')`
(giờ local, thứ Hai = 0). `pastelFor` cộng mã UTF-16 của chuỗi
`subjectName || className || classId || ''`, lấy modulo 5. `layoutWeek` lọc item theo ngày trong tuần, sort theo start, với mỗi ngày:
  - chuyển giờ thành phút từ 00:00; `topPercent = (clampedStart - 7*60) / 780 * 100`; `heightPercent = Math.max((clampedEnd - clampedStart) / 780 * 100, 2)`.
  - `clipped = start < 420 || end > 1200`; `outOfRangeCount` đếm item có `clipped` hoặc end <= start.
  - xếp lane: sort theo start; giữ `cluster: PositionedSession[]` và `laneEnds: number[]`.
    Với mỗi item: nếu cluster đang có và `start >= Math.max(...laneEnds)` thì chốt
    cluster (gán `laneCount = laneEnds.length` cho mọi item trong cluster), reset
    cluster/laneEnds; sau đó chọn `lane` đầu tiên có `laneEnds[lane] <= start` và
    cập nhật `laneEnds[lane] = end`, nếu không có thì `lane = laneEnds.length` và
    push `end`. Cuối vòng chốt cluster cuối cùng.
  - `label` = `T2`…`CN`; `dateLabel` = `DD/MM`.

- [ ] **Step 4: Viết test bổ sung cho layout và chạy lại**

```ts
  it('assigns separate lanes to overlapping sessions', () => {
    const a = item({ id: 'a', startTime: '2026-12-07T07:30:00', endTime: '2026-12-07T09:00:00' });
    const b = item({ id: 'b', startTime: '2026-12-07T08:15:00', endTime: '2026-12-07T09:45:00', subjectName: 'CSDL' });
    const t2 = layoutWeek([a, b], '2026-12-07').days[0];
    expect(t2.sessions).toHaveLength(2);
    expect(new Set(t2.sessions.map((s) => s.lane)).size).toBe(2);
    expect(t2.sessions.every((s) => s.laneCount === 2)).toBe(true);
  });

  it('clips sessions outside the window and counts them', () => {
    const early = item({ id: 'e', startTime: '2026-12-07T06:00:00', endTime: '2026-12-07T07:30:00' });
    const late = item({ id: 'l', startTime: '2026-12-07T19:30:00', endTime: '2026-12-08T00:30:00' });
    const result = layoutWeek([early, late], '2026-12-07');
    expect(result.outOfRangeCount).toBe(2);
    expect(result.days[0].sessions.every((s) => s.clipped)).toBe(true);
  });
});
```

Run: `cd frontend && npx vitest run src/features/schedule/weeklyGrid.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Kiểm tra type**

Run: `cd frontend && npx tsc -b --pretty false`
Expected: EXIT 0.

---

### Task 2: Component `WeeklyScheduleGrid`

**Files:**
- Create: `frontend/src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.tsx`
- Create: `frontend/src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.css`
- Test: `frontend/src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.test.tsx`

**Interfaces:**
- Consumes: `ScheduleItem`, mọi export từ Task 1, `EmptyState` của dự án.
- Produces:
  - `WeeklyScheduleGrid({ items, initialWeek?, onSelect?, showTeacher?, emptyText })`.
  - `initialWeek` mặc định `weekKeyOf(items[0]?.startTime ?? new Date().toISOString())`.
  - Component tự giữ state tuần, nút `Tuần trước` / `Tuần sau`, nhãn `Tuần DD/MM–DD/MM/YYYY`.

- [ ] **Step 1: Viết test component**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WeeklyScheduleGrid from './WeeklyScheduleGrid';
import type { ScheduleItem } from '../../features/schedule/types';

const base: ScheduleItem[] = [
  { id: 's1', classId: 'c1', className: '12A1', teacherId: 't1', teacherName: 'Võ Thị Vy',
    roomId: 'r1', roomCode: 'P201', subjectName: 'Java cơ bản',
    startTime: '2026-12-07T07:30:00', endTime: '2026-12-07T09:00:00', status: 'scheduled' },
];

it('renders day headers and an accessible session button', () => {
  const onSelect = vi.fn();
  render(<WeeklyScheduleGrid items={base} emptyText="Trống" onSelect={onSelect} />);
  expect(screen.getByRole('columnheader', { name: 'T2' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /07:30–09:00, Java cơ bản, 12A1, Võ Thị Vy, P201, scheduled/ })).toBeInTheDocument();
});

it('renders a cancelled session as a muted, strike-through button', () => {
  render(<WeeklyScheduleGrid items={[{ ...base[0], status: 'cancelled' }]} emptyText="Trống" />);
  const block = screen.getByRole('button', { name: /cancelled/ });
  expect(block).toHaveClass('weekly-block--cancelled');
});

it('moves to the next week', async () => {
  render(<WeeklyScheduleGrid items={base} emptyText="Trống" />);
  expect(screen.getByText(/Tuần 07\/12–13\/12\/2026/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Tuần sau' }));
  expect(screen.getByText(/Tuần 14\/12–20\/12\/2026/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Java cơ bản/ })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd frontend && npx vitest run src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement component + CSS**

Dùng `<table>` có `<thead>` gồm 1 `<th aria-label="Giờ">` + 7 `<th scope="col">` (`T2`…`CN`) và `<tbody><tr>` gồm 1 `<th scope="row">` chứa 13 nhãn giờ `07:00`…`20:00` + 7 `<td>` mỗi ô `position:relative; height: calc(13 * 56px)`. Trong mỗi `<td>` render các nút từ `layoutWeek(...).days[n].sessions`, `style` lấy `topPercent`/`heightPercent`/`lane`/`laneCount` và `backgroundColor: pastelFor(item)`. Nút là `<button type="button" className="weekly-block ...">`, `aria-label` đúng dạng ở Global Constraints; `onClick` chỉ gọi `onSelect` khi có. Thêm dòng `<details>` khi `outOfRangeCount > 0` với nội dung `${n} buổi ngoài khung giờ`. Dùng `EmptyState` khi `items.length === 0`. CSS: kẻ ô bằng `linear-gradient`, màu từ spec, bo góc 4px, font 11px/600, `.weekly-block--cancelled` mờ + `text-decoration: line-through` + viền đứt, `:focus-visible` có outline xanh `#2461DB`, `overflow-x:auto` cho màn nhỏ.

- [ ] **Step 4: Chạy lại test component**

Run: `cd frontend && npx vitest run src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.test.tsx`
Expected: PASS (3 test).

---

### Task 3: Đổi `SchedulePage` sang lưới + giữ thao tác

**Files:**
- Modify: `frontend/src/pages/SchedulePage/SchedulePage.tsx`
- Test: `frontend/src/pages/SchedulePage/SchedulePage.test.tsx`

**Interfaces:**
- Consumes: `WeeklyScheduleGrid` (Task 2), các API/mutation hiện có của page.
- Produces: trang lịch phòng ban render grid; click khối mở dialog sửa; Huỳ/Xoá chuyển vào footer dialog.

- [ ] **Step 1: Cập nhật test cho cấu trúc mới**

Trong `SchedulePage.test.tsx`: thay các `findByRole('row', { name: /10A1/ })` bằng `findByRole('button', { name: /10A1/ })`; thay kỳ vọng `07:30 01/12/2026` / `P101` / `Toán` bằng một kỳ vọng trên `aria-label`:

```ts
const block = await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT/ });
expect(block).toBeInTheDocument();
```

Thêm test:

```ts
it('only schedule.view: block is not editable', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(['schedule.view']);
  const block = await screen.findByRole('button', { name: /10A1/ });
  await userEvent.click(block);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('cancel/delete from the edit dialog', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  mockCancel.mockResolvedValue({ ...SESSION, status: 'CANCELLED' });
  mockDelete.mockResolvedValue(undefined);
  renderPage(['schedule.view', 'schedule.update', 'schedule.cancel_session', 'schedule.delete']);
  await userEvent.click(await screen.findByRole('button', { name: /10A1/ }));
  const dialog = screen.getByRole('dialog');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Huỳ buổi' }));
  await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('d1', 's1'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Xoá buổi' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('d1', 's1'));
});
```

Giữ nguyên các test loading/empty/error/forbidden/filter/room-picker/link.

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd frontend && npx vitest run src/pages/SchedulePage/SchedulePage.test.tsx`
Expected: FAIL — vẫn render bảng, không có nút khối.

- [ ] **Step 3: Sửa page**

Bỏ import `Table`, `TableColumn`, `pixel`, `proportional`, `Badge`, `formatDateTime` nếu không còn dùng; thêm import `WeeklyScheduleGrid`. Xoá khối `rows`/`columns` và nhánh `<Table>`; nhánh success render:

```tsx
<WeeklyScheduleGrid
  items={listQuery.data ?? []}
  emptyText={MSG_SCHEDULE.EMPTY}
  onSelect={canUpdate ? openEdit : undefined}
/>
```

Trong `Dialog`, thêm footer actions khi `canCancel`/`canDelete`: nút `variant="ghost"` `Huỳ buổi` gọi `cancelMut.mutate(editing.id)`, nút `Xoá buổi` gọi `setPendingDelete(editing)`, cả hai ẩn khi `editing === null`. Giữ nút `Hủy`/`Lưu` hiện có.

- [ ] **Step 4: Chạy test page**

Run: `cd frontend && npx vitest run src/pages/SchedulePage/SchedulePage.test.tsx`
Expected: PASS (tất cả test trong file).

---

### Task 4: Đổi `MySchedulePage` sang lưới

**Files:**
- Modify: `frontend/src/pages/MySchedulePage/MySchedulePage.tsx`
- Test: `frontend/src/pages/MySchedulePage/MySchedulePage.test.tsx`

**Interfaces:**
- Consumes: `WeeklyScheduleGrid` (Task 2).
- Produces: lịch cá nhân render grid, không action sửa.

- [ ] **Step 1: Cập nhật test**

Thay `findByRole('row', { name: /10A1/ })` bằng `findByRole('button', { name: /10A1/ })` và kỳ vọng chi tiết bằng `aria-label` `/07:30–09:00, Toán, 10A1, Tôi, P101, CONFIRMED/`. Giữ nguyên test loading/empty/error/forbidden/filter.

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd frontend && npx vitest run src/pages/MySchedulePage/MySchedulePage.test.tsx`
Expected: FAIL — vẫn render bảng.

- [ ] **Step 3: Sửa page**

Bỏ import `Table`, `TableColumn`, `pixel`, `proportional`, `Badge`, `formatDateTime`, `EmptyState` nếu không còn dùng; thêm import `WeeklyScheduleGrid`. Xoá `columns`; nhánh success render:

```tsx
<WeeklyScheduleGrid
  items={listQuery.data ?? []}
  emptyText={MSG_SCHEDULE.MY_EMPTY}
/>
```

- [ ] **Step 4: Chạy test page**

Run: `cd frontend && npx vitest run src/pages/MySchedulePage/MySchedulePage.test.tsx`
Expected: PASS.

---

### Task 5: Verify toàn bộ + chụp đối chiếu trực quan

**Files:**
- Modify (nếu cần): `docs/trang-thai-hien-tai-2026-11-26.md` — chỉ thêm 1 dòng ghi kết quả verify.
- Test: không thêm file code mới.

**Interfaces:**
- Consumes: kết quả Task 1–4.

- [ ] **Step 1: Chạy đủ bộ kiểm tra**

Run (lần lượt):
```bash
cd frontend && npm test
cd frontend && npm run lint
cd frontend && npx tsc -b --pretty false
git diff --check
```
Expected: test PASS hết, lint EXIT 0, tsc EXIT 0, `git diff --check` EXIT 0.

- [ ] **Step 2: Chụp 2 trang thật**

Dùng script Playwright có sẵn tại `C:\Users\night\AppData\Local\Temp\opencode\be-runtime\` (channel `chrome`, headless, `http://localhost:5173`) để đăng nhập lại nếu cần và chụp `/dao-tao/lich` (owner, tuần 07–13/12/2026) cùng `/dao-tao/lich-cua-toi` (`demo_student`, cùng tuần) vào `...\screenshots\06-lich-phong-ban-luoi-tuan.png` và `07-lich-ca-nhan-luoi-tuan.png`; mở cả 2 bằng `browser.preview`.

Expected: ảnh hiện lưới 7 cột, khối pastel, không có HTTP 4xx/5xx trên console.

- [ ] **Step 3: Kiểm tra git**

Run: `git rev-parse HEAD; git diff --cached --name-only; git status --short | Where-Object { $_ -match '^ D|^D ' }`
Expected: HEAD `5a4a286`, staged `0` dòng, xoá `0` dòng. Không commit/push/merge.
