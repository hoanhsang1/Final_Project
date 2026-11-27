# Lịch gọn 3 buổi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Thêm chế độ lịch gọn Sáng/Chiều/Tối cho học sinh và nhân viên, giữ lưới theo giờ cho giáo viên, không đổi BE hay quyền.

**Architecture:** Tách phép tính lịch gọn thành helper thuần (`compactSchedule.ts`) và helper chọn chế độ theo `backendRoles` (`scheduleViewMode.ts`); component `CompactScheduleGrid` render 3×7 và dùng lại `pastelFor`/tuần từ `weeklyGrid.ts`. Hai trang lịch chọn component và giữ nguyên filter/dialog/mutation.

**Tech Stack:** React + TypeScript + Vitest + Testing Library + Astryx `@astryxdesign/core` + dayjs; Node portable `C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64`.

**Spec:** `docs/superpowers/specs/2026-11-27-lich-gon-3-buoi-design.md`

## Global Constraints

- Không commit/push/merge; HEAD phải vẫn là `5a4a286c7c097ffc046a04413e23630d9379b975`, staged `0`, deleted `0`.
- Không đổi BE/contract/seed/migration; không thêm dependency; không đổi build/lint/CI.
- FE giữ Astryx; chạm thử chỉ dùng `http://localhost:5173` (không `127.0.0.1`).
- Không copy FE `origin/main`; không dùng từ “VIP”; không đụng worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell`; không tạo worktree mới; không sửa `07_people_department_access.sql`.
- Self pages chỉ đọc, gate bằng `backendRoles`, không dùng permission quản lý cho quyết định chế độ xem.
- Màu ô = `pastelFor(item)` (môn học); không dùng màu cho trạng thái.
- Mọi lệnh kiểm tra đặt Node portable lên `PATH` trước; dùng `npx.cmd vitest run`, `npm.cmd run lint`, `npx.cmd tsc -b --pretty false` (không phải `npx run lint`).

## Review Focus

- TEACHER và STUDENT có cùng self-permission → phân loại sai làm lộ lưới giờ cho HS hoặc công tắc cho GV; test Task 3 + Task 4 với `backendRoles` khác nhau.
- Buổi hủy phải vẫn nhận ra ở chế độ gọn (mờ + gạch + dải “Đã hủy” + `aria-label` có status); test Task 2.
- Hai buổi cùng ngày cùng buổi (07:30 và 09:00) phải cùng hiện, không bị đè; test Task 2.
- Ranh giới `11:59/12:00/17:59/18:00` và buổi qua nửa đêm phải xếp đúng buổi theo giờ bắt đầu; test Task 1.
- Đổi chế độ không được đổi filter/API/phân quyền dialog; test Task 3 giữ nguyên `fetchSchedules` args và dialog theo permission.

---

### Task 1: Helper lịch gọn và chọn chế độ

**Files:**
- Modify: `frontend/src/features/schedule/weeklyGrid.ts`
- Modify: `frontend/src/components/WeeklyScheduleGrid/WeeklyScheduleGrid.tsx`
- Modify: `frontend/src/features/schedule/weeklyGrid.test.ts`
- Create: `frontend/src/features/schedule/compactSchedule.ts`
- Create: `frontend/src/features/schedule/compactSchedule.test.ts`
- Create: `frontend/src/features/schedule/scheduleViewMode.ts`
- Create: `frontend/src/features/schedule/scheduleViewMode.test.ts`

**Interfaces:**
- Consumes: `ScheduleItem` (`features/schedule/types.ts`), `pastelFor`, `weekKeyOf`, `shiftWeek` từ `weeklyGrid.ts`.
- Produces:
  - `export type BuoiKey = 'SANG' | 'CHIEU' | 'TOI'`
  - `export interface CompactSession { item: ScheduleItem; buoi: BuoiKey; timeLabel: string; color: string; cancelled: boolean }`
  - `export interface CompactBuoi { key: BuoiKey; label: string; sessions: CompactSession[] }`
  - `export interface CompactDay { key: string; label: string; dateLabel: string; buoi: CompactBuoi[] }`
  - `export interface CompactWeekLayout { days: CompactDay[]; weekStart: string; weekEnd: string }`
  - `export function buoiOf(startTime: string): BuoiKey`
  - `export function layoutCompactWeek(items: ScheduleItem[], weekStart: string): CompactWeekLayout`
  - `export function isCancelledStatus(status: string): boolean` (export mới từ `weeklyGrid.ts`)
  - `export type ScheduleMode = 'hourly' | 'compact'`
  - `export function initialScheduleMode(backendRoles: string[]): ScheduleMode`
  - `export function canToggleScheduleMode(backendRoles: string[]): boolean`

- [x] **Step 1: Viết test failing cho ranh giới buổi và xếp lịch gọn**

Trong `compactSchedule.test.ts`, dùng item mẫu có `startTime/endTime` tháng 12/2026 và assert:

```ts
expect(buoiOf('2026-12-01T11:59:00')).toBe('SANG');
expect(buoiOf('2026-12-01T12:00:00')).toBe('CHIEU');
expect(buoiOf('2026-12-01T17:59:00')).toBe('CHIEU');
expect(buoiOf('2026-12-01T18:00:00')).toBe('TOI');
expect(buoiOf('2026-12-01T23:30:00')).toBe('TOI');

const a = item({ id: 'a', startTime: '2026-12-01T07:30:00', endTime: '2026-12-01T09:00:00' });
const b = item({ id: 'b', startTime: '2026-12-01T09:00:00', endTime: '2026-12-01T10:30:00' });
const e = item({ id: 'e', startTime: '2026-12-01T19:00:00', endTime: '2026-12-01T20:30:00' });
const layout = layoutCompactWeek([a, b, e], '2026-11-30');
expect(layout.days.map((d) => d.label)).toEqual(['T2','T3','T4','T5','T6','T7','CN']);
expect(layout.days[1].buoi[0].sessions.map((s) => s.item.id)).toEqual(['a', 'b']);
expect(layout.days[1].buoi[2].sessions.map((s) => s.item.id)).toEqual(['e']);
expect(layout.days[1].buoi[0].sessions[0].timeLabel).toBe('07:30–09:00');
```

- [x] **Step 2: Viết test failing cho chế độ xem và trạng thái hủy**

```ts
// scheduleViewMode.test.ts
expect(initialScheduleMode(['TEACHER'])).toBe('hourly');
expect(initialScheduleMode(['STUDENT'])).toBe('compact');
expect(initialScheduleMode([])).toBe('compact');
expect(canToggleScheduleMode(['TEACHER'])).toBe(false);
expect(canToggleScheduleMode(['STUDENT'])).toBe(false);
expect(canToggleScheduleMode([])).toBe(true);

// thêm vào weeklyGrid.test.ts
expect(isCancelledStatus('cancelled')).toBe(true);
expect(isCancelledStatus('ĐÃ HỦY')).toBe(true);
expect(isCancelledStatus('scheduled')).toBe(false);
```

- [x] **Step 3: Chạy test để thấy fail**

Run (từ `frontend/`): `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/features/schedule/compactSchedule.test.ts src/features/schedule/scheduleViewMode.test.ts src/features/schedule/weeklyGrid.test.ts`

Expected: FAIL — module `compactSchedule`/`scheduleViewMode` và export `isCancelledStatus` chưa tồn tại.

- [x] **Step 4: Implement helper**

Trong `weeklyGrid.ts`, đổi hàm private `isCancelled` thành `export function isCancelledStatus(status: string): boolean`, giữ nguyên rule `cancel`/`huỷ`/`huy`; cập nhật `WeeklyScheduleGrid.tsx` import và gọi hàm mới. `compactSchedule.ts`: `buoiOf` đọc giờ local của `startTime` (`dayjs(startTime).hour()`), `layoutCompactWeek` lấy Monday từ `weekKeyOf(weekStart)`, tạo 7 ngày, mỗi ngày 3 buổi theo thứ tự `SANG, CHIEU, TOI`, lọc item theo `YYYY-MM-DD` local, sort theo `startTime`, `timeLabel = ${HH:mm}–${HH:mm}`, `color = pastelFor(item)`, `cancelled = isCancelledStatus(item.status)`. `scheduleViewMode.ts`: TEACHER thắng trước → `hourly`; STUDENT và còn lại → `compact`; `canToggleScheduleMode` chỉ true khi không có TEACHER và không có STUDENT.

- [x] **Step 5: Chạy lại test**

Run: lệnh như Step 3. Expected: PASS.

- [x] **Step 6: Không commit** — chỉ đảm bảo 5 file mới/test được ghi; không chạy `git add`/`git commit`.

---

### Task 2: Component CompactScheduleGrid

**Files:**
- Create: `frontend/src/components/CompactScheduleGrid/CompactScheduleGrid.tsx`
- Create: `frontend/src/components/CompactScheduleGrid/CompactScheduleGrid.css`
- Create: `frontend/src/components/CompactScheduleGrid/CompactScheduleGrid.test.tsx`

**Interfaces:**
- Consumes: `layoutCompactWeek`, `buoiOf`, `isCancelledStatus`, `weekKeyOf`, `shiftWeek` (Task 1), `ScheduleItem`.
- Produces: `export interface CompactScheduleGridProps { items: ScheduleItem[]; initialWeek?: string; onSelect?: (item: ScheduleItem) => void; emptyText: string }`, default export component.

- [x] **Step 1: Viết test failing cho cấu trúc 3×7 và dữ liệu**

```tsx
render(<CompactScheduleGrid items={[a, b, e]} emptyText="rỗng" />);
expect(screen.getAllByRole('columnheader')).toHaveLength(7);
expect(screen.getByRole('rowheader', { name: 'Sáng' })).toBeInTheDocument();
expect(screen.getByRole('rowheader', { name: 'Chiều' })).toBeInTheDocument();
expect(screen.getByRole('rowheader', { name: 'Tối' })).toBeInTheDocument();
expect(screen.getAllByRole('button', { name: /07:30–09:00/ })).toHaveLength(1);
expect(screen.getByText('Tuần 30/11–06/12/2026')).toBeInTheDocument();
```

- [x] **Step 2: Viết test failing cho hủy, click và điều hướng tuần**

```tsx
const cancelled = item({ status: 'cancelled', subjectName: 'Java cơ bản', className: '12A1', teacherName: 'Võ Thị Vy', roomCode: 'P201' });
render(<CompactScheduleGrid items={[cancelled]} emptyText="rỗng" onSelect={onSelect} />);
const btn = screen.getByRole('button', { name: /07:30–09:00, Java cơ bản, 12A1, Võ Thị Vy, P201, cancelled/ });
expect(btn).toHaveClass('compact-session--cancelled');
expect(within(btn).getByText('Đã hủy')).toBeInTheDocument();
await userEvent.click(btn);
expect(onSelect).toHaveBeenCalledWith(cancelled);

await userEvent.click(screen.getByRole('button', { name: 'Tuần sau' }));
expect(screen.getByText('Tuần 07/12–13/12/2026')).toBeInTheDocument();
```

- [x] **Step 3: Chạy test để thấy fail**

Run (từ `frontend/`): `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/components/CompactScheduleGrid/CompactScheduleGrid.test.tsx`

Expected: FAIL — component chưa tồn tại.

- [x] **Step 4: Implement component và CSS**

Dùng `<section className="compact-grid" aria-label="Lịch tuần gọn">` với toolbar giống `WeeklyScheduleGrid` (`Tuần trước`, `.compact-grid__week-label`, `Tuần sau`) và `<table className="compact-grid__table">`: `<thead>` 7 `columnheader` T2–CN, `<tbody>` 3 hàng có `rowheader` Sáng/Chiều/Tối. Mỗi session là `<button type="button" className="compact-session">` với class `compact-session--cancelled` khi hủy, `backgroundColor: color`, `aria-label` dạng `T2 01/12, buổi Sáng, 07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT`. Nội dung 3 dòng: `.compact-session__time` (`giờ · phòng`), `.compact-session__title` (`môn · lớp`), `.compact-session__teacher`. Khi hủy thêm `.compact-session__ribbon` chữ `Đã hủy`, `opacity` thấp + `text-decoration: line-through` cho nội dung. CSS ribbon: `#B42318`, chữ trắng, cao ~16px, `transform: rotate(-28deg)`, `left/right: -20%`, ô có `overflow: hidden`. Ô trống hiện `—` mờ. `items.length === 0` → chỉ `<EmptyState description={emptyText} />`, không render table. `initialWeek` mặc định `weekKeyOf(items[0]?.startTime ?? new Date().toISOString())`.

- [x] **Step 5: Chạy lại test**

Run: lệnh Step 3. Expected: PASS.

---

### Task 3: Ghép công tắc vào SchedulePage

**Files:**
- Modify: `frontend/src/features/schedule/scheduleMessages.ts`
- Modify: `frontend/src/pages/SchedulePage/SchedulePage.tsx`
- Modify: `frontend/src/pages/SchedulePage/SchedulePage.test.tsx`

**Interfaces:**
- Consumes: `CompactScheduleGrid` (Task 2), `WeeklyScheduleGrid`, `initialScheduleMode`, `canToggleScheduleMode`, `ScheduleMode` (Task 1).
- Produces: không export mới; trang `/dao-tao/lich` render đúng grid theo chế độ.

- [x] **Step 1: Cập nhật helper test để giữ kỳ vọng cũ**

Trong `SchedulePage.test.tsx`, đổi `renderPage(permissions, departmentId, backendRoles = ['TEACHER'])` và truyền `backendRoles` đó vào `useAuthStore.setState`. Các test cũ vì vậy vẫn thấy lưới giờ. Thêm 4 test failing:

```tsx
it('nhân viên mở trang mặc định là lịch gọn và công tắc 3 buổi được chọn', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(FULL_PERMISSIONS, 'd1', []);
  expect(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '3 buổi' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Theo giờ' })).toHaveAttribute('aria-pressed', 'false');
});

it('bấm Theo giờ thì hiện lưới giờ, filter vẫn gửi như cũ', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(FULL_PERMISSIONS, 'd1', []);
  await userEvent.click(await screen.findByRole('button', { name: 'Theo giờ' }));
  expect(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT/ })).toBeInTheDocument();
  await userEvent.type(screen.getByRole('textbox', { name: 'Mã lớp' }), 'c2');
  await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));
  await waitFor(() => expect(mockFetch).toHaveBeenLastCalledWith({
    departmentId: 'd1', from: undefined, to: undefined, classId: 'c2',
  }));
});

it('TEACHER không thấy công tắc và luôn dùng lưới giờ', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(FULL_PERMISSIONS, 'd1', ['TEACHER']);
  await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1, Nguyễn Văn A, P101, DRAFT/ });
  expect(screen.queryByRole('button', { name: '3 buổi' })).not.toBeInTheDocument();
});

it('click ô trong lịch gọn vẫn mở dialog sửa', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(FULL_PERMISSIONS, 'd1', []);
  await userEvent.click(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

- [x] **Step 2: Chạy test để thấy fail**

Run (từ `frontend/`): `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/pages/SchedulePage/SchedulePage.test.tsx`

Expected: FAIL — chưa có nút `3 buổi`/`Theo giờ`, chưa render compact cho `backendRoles: []`.

- [x] **Step 3: Implement trang**

Thêm `VIEW_HOURLY: 'Theo giờ'`, `VIEW_COMPACT: '3 buổi'` vào `MSG_SCHEDULE`. Trong `SchedulePage`, giữ `canView/canCreate/canUpdate/canCancel/canDelete` nguyên vẹn; thêm `const [mode, setMode] = useState<ScheduleMode>(() => initialScheduleMode(backendRoles));`. Khi `canToggleScheduleMode(backendRoles)`, render trong `PageHeader` hoặc ngay dưới filter một `HStack role="group" aria-label="Chế độ xem lịch"` gồm 2 Astryx `Button` với `aria-pressed={mode === 'hourly'|'compact'}`, `onClick={() => setMode(...)}`. Nhánh success: `mode === 'compact' ? <CompactScheduleGrid items={data} emptyText={MSG_SCHEDULE.EMPTY} onSelect={openEdit} /> : <WeeklyScheduleGrid ... />` — truyền cùng `initialWeek`/`onSelect` như hiện tại cho `WeeklyScheduleGrid`. Không đổi query, mutation, dialog.

- [x] **Step 4: Chạy lại test trang**

Run: lệnh Step 2. Expected: PASS, các test cũ vẫn PASS.

---

### Task 4: Ghép chế độ vào MySchedulePage + kiểm tra toàn_branch

**Files:**
- Modify: `frontend/src/pages/MySchedulePage/MySchedulePage.test.tsx`
- Modify: `frontend/src/pages/MySchedulePage/MySchedulePage.tsx`

**Interfaces:**
- Consumes: cùng helper và component Task 1–3.
- Produces: `/dao-tao/lich-cua-toi` render đúng grid theo vai trò; nhân viên có công tắc như Task 3.

- [x] **Step 1: Giữ test cũ và thêm test failing theo vai trò**

Trong `MySchedulePage.test.tsx`, đổi `renderPage(permissions = ['schedule.self_view'], backendRoles = ['TEACHER'])` và truyền `backendRoles` vào store. Thêm:

```tsx
it('STUDENT thấy lịch gọn, không có công tắc', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(['schedule.self_view'], ['STUDENT']);
  expect(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '3 buổi' })).not.toBeInTheDocument();
});

it('nhân viên thấy công tắc, mặc định 3 buổi, bấm Theo giờ thì đổi lưới', async () => {
  mockFetch.mockResolvedValue([SESSION]);
  renderPage(['schedule.self_view'], []);
  expect(screen.getByRole('button', { name: '3 buổi' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'Theo giờ' }));
  expect(await screen.findByRole('button', { name: /07:30–09:00, Toán, 10A1, Tôi, P101, CONFIRMED/ })).toBeInTheDocument();
  expect(mockFetch).toHaveBeenCalledWith({ from: undefined, to: undefined });
});
```

- [x] **Step 2: Chạy test để thấy fail**

Run (từ `frontend/`): `$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH; npx.cmd vitest run src/pages/MySchedulePage/MySchedulePage.test.tsx`

Expected: FAIL — chưa có công tắc/compact cho STUDENT và nhân viên.

- [x] **Step 3: Implement trang cá nhân**

Giữ `canView` và 5 state nguyên vẹn. Thêm `mode` như Task 3; chỉ render công tắc khi `canToggleScheduleMode(backendRoles)`. Nhánh success: TEACHER/mode `hourly` → `WeeklyScheduleGrid` (không `onSelect`); còn lại → `CompactScheduleGrid` (không `onSelect`). Không gọi API khác, không thêm hành động ghi.

- [x] **Step 4: Chạy lại test trang**

Run: lệnh Step 2. Expected: PASS.

- [x] **Step 5: Kiểm tra toàn bộ và chụp ảnh thật**

Từ `frontend/`:
```powershell
$env:PATH='C:\Users\night\AppData\Local\Temp\node-v22.20.0-win-x64;'+$env:PATH
npx.cmd vitest run
npm.cmd run lint
npx.cmd tsc -b --pretty false
```

Rồi từ gốc repo:
```powershell
git diff --check
git rev-parse HEAD
git diff --cached --stat
git status --short
```

Expected: `vitest` PASS (56 files trở lên), lint/tsc/diff-check exit `0`, HEAD vẫn `5a4a286c7c097ffc046a04413e23630d9379b975`, staged `0`.

Chụp qua Playwright/Chrome tại `http://localhost:5173` (không đổi DB): `vyvy` → `/dao-tao/lich-cua-toi` H1 `Lịch cá nhân` phải là lưới giờ; `demo_student` → cùng route phải là lịch gọn 3 buổi; `demo_owner` → `/dao-tao/lich` H1 `Lịch đào tạo` mặc định 3 buổi + công tắc. Mỗi ảnh assert URL/H1/dữ liệu và `0` console error, `0` HTTP ≥400, `0` page error.

- [x] **Step 6: Kiểm tra invariant cuối, không commit**

Xác nhận không có `git add/commit/push/merge`, không file bị xoá, không đụng file SQL bị cấm hay worktree FE shell.
