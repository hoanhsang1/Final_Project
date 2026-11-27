> ✅ **Trạng thái thực tế 2026-11-26:** FE shell `/dao-tao/tu-dong-xep-lich` đã hoàn tất trong worktree `C:\Users\night\.local\share\opencode\worktree\fab303\auto-schedule-fe-shell` (27 file / 182 unit test pass, `tsc`/`eslint` sạch), **chưa commit**. Các ô `[ ]` trong plan giữ nguyên để đối chiếu bản gốc. P4 BE/solver vẫn BLOCKED, nút submit vẫn disabled. Nguồn chuẩn: `D:\Final_Project\docs\trang-thai-hien-tai-2026-11-26.md`.

# Tự động xếp lịch FE shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo màn `/dao-tao/tu-dong-xep-lich` dạng shell: hiện phần nghiệp vụ đã chốt, ghi rõ phần chưa chốt là “Cần xác nhận”, dùng API danh sách lớp có sẵn, nút tạo nháp bị disabled và không gọi BE.

**Architecture:** Page React/Astryx mới trong `src/pages/AutoSchedulePage`, messages riêng trong `src/features/schedule`, nối vào route/menu khu Đào tạo hiện có. Không có module API/DTO auto-schedule mới; chỉ đọc `fetchClasses` bằng `useQuery` với query key riêng. Form dùng `useFormState` có sẵn.

**Tech Stack:** TypeScript, React 19, Vite, Astryx `@astryxdesign/core`, TanStack Query, Zustand, Vitest + React Testing Library.

**Spec:** `frontend/docs/superpowers/specs/2026-11-25-auto-schedule-fe-shell-design.md`

## Global Constraints

- Chạy mọi lệnh tại `D:\Final_Project\frontend`.
- Không có `node`/`npm` trong PATH. Dùng:
  `$Node = 'D:\AI skill\SEO\.venv\Lib\site-packages\playwright\driver\node.exe'`
- Lệnh test: `& $Node node_modules/vitest/vitest.mjs run <file>`
- Lệnh typecheck: `& $Node node_modules/typescript/bin/tsc -b`
- Lệnh lint: `& $Node node_modules/eslint/bin/eslint.js .`
- T1: Astryx/ConsoleShell; không Tailwind/shadcn/antd.
- T2: không copy nguyên FE `origin/main`.
- T3: không port BE auto-schedule.
- T4: không đổi build/lint/CI, không thêm thư viện.
- T5: không đụng DB/production migration.
- T6: điểm chưa chốt phải ghi chữ **“Cần xác nhận”**; không tự chọn 45'/90' hay phạm vi phòng.
- BR-08: không dùng màu làm tín hiệu duy nhất; BR-04 dùng “Vô hiệu hoá”, không “Xoá”.
- 5 trạng thái UI: loading / empty / error / success / no-permission.
- NFR-REL-001: không hiện success giả; nút submit.disabled trong slice này.
- **Không commit/push/merge** theo yêu cầu hiện tại (thay step commit bằng step xác nhận diff).

## Review Focus

| Input / điều kiện | Hành vi mong đợi | Test ở |
|---|---|---|
| `fetchClasses` trả 500 | Hiện `Banner status="error"` + “Thử lại”, **không** hiện form success | Task 2 Step 1 |
| Thiếu `CLASS_VIEW` | Hiện `ForbiddenNotice`, **không gọi** `fetchClasses` | Task 2 Step 1 |
| Chuyển nguồn sang “Nhập tay” | Hiện 2 trường số có chữ “Cần xác nhận”; chuyển lại thì ẩn | Task 3 Step 1 |
| Bấm/focus nút “Tạo nháp lịch” | `toBeDisabled()` thật, không chỉ mờ CSS; không có request auto-generate | Task 1 Step 1 + Task 3 Step 1 |
| `Banner` chưa chốt | Luôn mở (`collapsible={false}`), có chữ “Cần xác nhận”, không chỉ màu | Task 1 Step 1 |

---

### Task 1: Messages và shell tĩnh

**Files:**
- Create: `frontend/src/features/schedule/autoScheduleMessages.ts`
- Create: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.tsx`
- Test: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx`

**Interfaces:**
- Consumes: Astryx `Heading`, `Banner`, `Button`, `HStack`, `Stack`, `Text`.
- Produces:
  - `MSG_AUTO` với các key: `TITLE`, `CLASS_LABEL`, `SOURCE_LABEL`, `SOURCE_CURRICULUM`, `SOURCE_MANUAL`, `DATE_LABEL`, `DAYS_LABEL`, `SESSIONS_LABEL`, `MINUTES_LABEL`, `ROOM_INFO`, `UNRESOLVED_D8`, `UNRESOLVED_D9_D10`, `BANNER_TITLE`, `BANNER_DESCRIPTION`, `AUTO_TOGGLE_LABEL`, `AUTO_TOGGLE_HELP`, `SUBMIT_LABEL`, `SUBMIT_DISABLED_HELP`, `EMPTY_TITLE`, `EMPTY_DESCRIPTION`, `ERROR_TITLE`, `ERROR_DESCRIPTION`, `RETRY_LABEL`, `NO_PERMISSION_MESSAGE`, `LOADING_LABEL`.
  - `DAYS_OPTIONS`: mảng `{ value, label }` cho `mon`…`sun`, nhãn `Thứ Hai`…`Chủ Nhật`.
  - `classOptionLabel(c: { classCode?: string | null; name?: string | null; id: string }): string` trả `${classCode || id} — ${name || 'Chưa có tên'}`.
  - `export default function AutoSchedulePage(): React.JSX.Element`.

- [ ] **Step 1: Write the failing test**

Trong `AutoSchedulePage.test.tsx`, setup chung:

```tsx
vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return { ...actual, fetchClasses: vi.fn() };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AutoSchedulePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
```

Thêm ca:

```tsx
it('shell: hiện phần chốt, phần chưa chốt và nút disabled', () => {
  renderPage();
  expect(screen.getByRole('heading', { name: MSG_AUTO.TITLE })).toBeInTheDocument();
  expect(screen.getByText(MSG_AUTO.ROOM_INFO)).toBeInTheDocument();
  expect(screen.getAllByText(/Cần xác nhận/).length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_LABEL })).toBeDisabled();
  expect(screen.queryByText('Đã xếp xong')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: FAIL — không resolve được `autoScheduleMessages` / `AutoSchedulePage`.

- [ ] **Step 3: Implement messages + static page**

`autoScheduleMessages.ts`: export đúng các key/value ở Interfaces; `BANNER_DESCRIPTION` phải chứa cụm `Bảng tiết chưa chốt (D11/D10)` và `chưa gửi yêu cầu xếp lịch`; `SUBMIT_DISABLED_HELP = 'Chờ chốt D11/D10 và BE.'`.

`AutoSchedulePage.tsx`: `PageHeader title={MSG_AUTO.TITLE}`; `Text` chứa `MSG_AUTO.ROOM_INFO`; `Banner status="warning" title={MSG_AUTO.BANNER_TITLE} description={MSG_AUTO.BANNER_DESCRIPTION} collapsible={false}`; `Button label={MSG_AUTO.SUBMIT_LABEL} isDisabled` kèm `{...{ disabled: true }}` (Astryx chỉ set `aria-disabled`; `toBeDisabled()` cần thuộc tính gốc) và `<Text type="supporting">{MSG_AUTO.SUBMIT_DISABLED_HELP}</Text>` làm chú thích hiển thị. **Không dùng `tooltip`**: nút disable gốc không nhận hover/focus nên tooltip Astryx không mở; chữ chú thích cạnh nút đã thoả design §83 và BR-08. Cũng không dùng `disabledMessage` (Astryx `Button` không có prop này). Chưa gọi API, chưa dùng form state.

- [ ] **Step 4: Run test to verify it passes**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: PASS (1 test).

- [ ] **Step 5: Confirm diff, no commit**

```powershell
git status --short
```

Expected: chỉ 3 file của Task 1 + 2 file docs đã modified từ trước. Không commit.

### Task 2: Tải danh sách lớp và 5 trạng thái

**Files:**
- Modify: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.tsx`
- Test: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx`

**Interfaces:**
- Consumes: `fetchClasses` từ `../../features/sprint4/sprint4Api`; `useAuthStore`; `canViewClasses` từ `../../features/auth/permissions`; `ForbiddenNotice`; `EmptyState`; Astryx `Skeleton` + `Text` (không dùng `PageLoading` để kiểm soát đúng chữ “Đang tải…”).
- Produces: `const classes = listQuery.data?.items ?? []` dùng cho `Selector` ở Task 3; query key cố định `['auto-schedule', 'classes', { page: 1, size: 100 }]`.

- [ ] **Step 1: Write the failing tests**

Giữ setup Task 1. Thêm mock data:

```tsx
const LOP_01 = {
  id: 'c1', classCode: 'LOP-01', name: 'Toán 10A1',
  startDate: '2025-09-05', endDate: '2026-05-30', version: 1,
  academicYear: '2025-2026', status: 'DANG_DIEN_RA', closeState: 'NONE',
  teacher: null, studentCount: 42,
} satisfies ClassListItem;
const paged = (items: ClassListItem[]) => ({ items, total: items.length, page: 1, size: 20, pages: 1 });
```

Trước mỗi ca: `mockFetch.mockReset()` rồi `mockFetch.mockResolvedValue(paged([LOP_01]))` làm default (để ca shell của Task 1 vẫn xanh); set `useAuthStore` với `permissions: ['CLASS_VIEW']`, `isAuthenticated: true`.

```tsx
it('loading: hiện "Đang tải…"', () => {
  mockFetch.mockReturnValue(new Promise(() => {}));
  renderPage();
  expect(screen.getByText(MSG_AUTO.LOADING_LABEL)).toBeInTheDocument();
});

it('success: Selector lớp hiện option từ fetchClasses', async () => {
  mockFetch.mockResolvedValue(paged([LOP_01]));
  renderPage();
  const selector = await screen.findByRole('combobox', { name: MSG_AUTO.CLASS_LABEL });
  expect(selector).toBeInTheDocument();
  expect(screen.getAllByText(classOptionLabel(LOP_01)).length).toBeGreaterThan(0);
  expect(mockFetch).toHaveBeenCalledWith({ page: 1, size: 100 });
});

it('empty: hiện EmptyState khi không có lớp', async () => {
  mockFetch.mockResolvedValue(paged([]));
  renderPage();
  expect(await screen.findByText(MSG_AUTO.EMPTY_TITLE)).toBeInTheDocument();
});

it('error: hiện Banner error và nút Thử lại', async () => {
  mockFetch.mockRejectedValue(new Error('500'));
  renderPage();
  expect(await screen.findByText(MSG_AUTO.ERROR_TITLE)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: MSG_AUTO.RETRY_LABEL })).toBeInTheDocument();
});

it('no-permission: không gọi fetchClasses', () => {
  useAuthStore.setState({ permissions: [] });
  renderPage();
  expect(screen.getByText(MSG_AUTO.NO_PERMISSION_MESSAGE)).toBeInTheDocument();
  expect(mockFetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: 4 ca mới FAIL do page chưa gọi API / chưa có Selector.

- [ ] **Step 3: Implement query + 5 states**

Trong `AutoSchedulePage.tsx`:

```tsx
const permissions = useAuthStore((s) => s.permissions);
const canView = canViewClasses(false, permissions);
const listQuery = useQuery({
  queryKey: ['auto-schedule', 'classes', { page: 1, size: 100 }],
  queryFn: () => fetchClasses({ page: 1, size: 100 }),
  enabled: canView,
});
```

Render: `PageHeader` luôn render. `!canView` → `<ForbiddenNotice title={MSG_AUTO.NO_PERMISSION_MESSAGE} />` thay khung shell. Với `canView=true`, giữ nguyên khung shell Task 1 (`ROOM_INFO`, warning `Banner`, submit `HStack`) trong **mọi** trạng thái, chỉ vùng dữ liệu lớp đổi theo: `isPending` → khối có chữ `MSG_AUTO.LOADING_LABEL` + `role="status"`/`aria-busy`; `isError` → `Banner status="error"` + nút “Thử lại” gọi `listQuery.refetch()`; `items.length === 0` → `<EmptyState description={MSG_AUTO.EMPTY_TITLE} />`; còn lại → `Selector label={MSG_AUTO.CLASS_LABEL} options={classes.map(c => ({ value: c.id, label: classOptionLabel(c) }))}`. Lý do (ruling): ca shell Task 1 dùng `getBy*` đồng bộ, nên khung shell phải có mặt ngay từ render đầu (`isPending`); mock resolve mặc định không đủ nếu khung chỉ render ở success. Submit luôn disabled ở mọi trạng thái (NFR-REL-001).

Không dùng `useAuthStore` role để tính `isOwner` — màn này dùng chung `canViewClasses(false, permissions)` theo design.

- [ ] **Step 4: Run tests to verify they pass**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: PASS (6 tests).

- [ ] **Step 5: Confirm diff, no commit**

```powershell
git status --short
```

Expected: chỉ file page/test của task này thêm vào diff; không commit.

### Task 3: Form controls và chuyển nguồn đầu vào

**Files:**
- Modify: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.tsx`
- Modify only if a new key is needed: `frontend/src/features/schedule/autoScheduleMessages.ts` (all Task 3 keys already exist from Task 1 — **no diff expected**)
- Test: `frontend/src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx`

**Interfaces:**
- Consumes: `useFormState` từ `../../hooks/useFormState`; Astryx `SegmentedControl` + `SegmentedControlItem`, `DateRangeInput`, `CheckboxList` + `CheckboxListItem`, `NumberInput`, `Switch`, `Field`.
- Produces:

```ts
type AutoScheduleSource = 'curriculum' | 'manual';
type AutoScheduleValues = {
  classId: string | null;
  source: AutoScheduleSource;
  dateRange: DateRange | null;
  days: string[];
  sessionsPerWeek: number | null;
  minutesPerSession: number | null;
  auto: boolean;
};
```

Initial values: `{ classId: null, source: 'curriculum', dateRange: null, days: [], sessionsPerWeek: null, minutesPerSession: null, auto: true }`.

- [ ] **Step 1: Write the failing tests**

Thêm vào `describe` hiện có, mock `paged([LOP_01])` cho mỗi ca:

```tsx
it('mặc định: nguồn chương trình, 2 option, switch bật, nút vẫn disabled', () => {
  mockFetch.mockResolvedValue(paged([LOP_01]));
  renderPage();
  // SegmentedControlItem để value trên data-value (xem SEGMENT_SELECTOR của core).
  expect(screen.getAllByRole('radio').map((el) => el.getAttribute('data-value')))
    .toEqual(['curriculum', 'manual']);
  expect(screen.getByRole('radio', { name: MSG_AUTO.SOURCE_CURRICULUM })).toBeChecked();
  expect(screen.getByRole('switch', { name: MSG_AUTO.AUTO_TOGGLE_LABEL })).toBeChecked();
  expect(screen.queryByRole('spinbutton', { name: MSG_AUTO.SESSIONS_LABEL })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_LABEL })).toBeDisabled();
});

it('chuyển sang nhập tay: hiện trường D8/D9 rồi ẩn khi chuyển lại', async () => {
  mockFetch.mockResolvedValue(paged([LOP_01]));
  renderPage();
  await userEvent.click(screen.getByRole('radio', { name: MSG_AUTO.SOURCE_MANUAL }));
  expect(screen.getByRole('spinbutton', { name: MSG_AUTO.SESSIONS_LABEL })).toBeInTheDocument();
  expect(screen.getByText(MSG_AUTO.UNRESOLVED_D8)).toBeInTheDocument();
  expect(screen.getByText(MSG_AUTO.UNRESOLVED_D9_D10)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('radio', { name: MSG_AUTO.SOURCE_CURRICULUM }));
  expect(screen.queryByRole('spinbutton', { name: MSG_AUTO.SESSIONS_LABEL })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: 2 ca mới FAIL do chưa có `SegmentedControl`/`Switch`/trường nhập tay.

- [ ] **Step 3: Implement form state và controls**

Dùng `useFormState<AutoScheduleValues>(initialValues)`. Nối:

- `Selector` lớp → `setValue('classId', value)`; value là `string | null`.
- `SegmentedControl label={MSG_AUTO.SOURCE_LABEL}` với 2 `SegmentedControlItem` (`value="curriculum"` / `value="manual"`, `label` lấy từ `MSG_AUTO`), `onChange` ghi `source`.
- `DateRangeInput label={MSG_AUTO.DATE_LABEL} value={values.dateRange} onChange={(v) => setValue('dateRange', v)}`.
- `CheckboxList` collection mode: `value={values.days}`; mỗi `CheckboxListItem` có `value` trùng một phần tử `DAYS_OPTIONS`.
- Chỉ khi `values.source === 'manual'`: render `NumberInput label={MSG_AUTO.SESSIONS_LABEL}` và `NumberInput label={MSG_AUTO.MINUTES_LABEL}` kèm chữ `MSG_AUTO.UNRESOLVED_D8` / `MSG_AUTO.UNRESOLVED_D9_D10`.
- `Switch label={MSG_AUTO.AUTO_TOGGLE_LABEL} description={MSG_AUTO.AUTO_TOGGLE_HELP} value={values.auto}`.
- `Button` giữ nguyên `isDisabled` từ Task 1; **không** thêm `onClick`/mutation.

Không thay đổi initial values khi chuyển nguồn (giữ `sessionsPerWeek`/`minutesPerSession` nếu đã nhập).

- [ ] **Step 4: Run tests to verify they pass**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: PASS (8 tests).

- [ ] **Step 5: Confirm diff, no commit**

```powershell
git status --short
```

Expected: không có file `api.ts`, không có thay đổi package/lockfile/build/CI. Không commit.

### Task 4: Nối route/menu và verification toàn slice

**Files:**
- Modify: `frontend/src/router.tsx`
- Modify: `frontend/src/features/sprint4/academicMenu.ts`
- Modify: `frontend/src/router.test.tsx`
- Create: `frontend/src/features/sprint4/academicMenu.test.ts`

**Interfaces:**
- Consumes: `AutoSchedulePage` default export; `canViewClasses`; `getAcademicMenu`; `activeAcademicMenuKey`.
- Produces: route path `dao-tao/tu-dong-xep-lich`, menu key `'tu-dong-xep-lich'`, path `/dao-tao/tu-dong-xep-lich`.

- [ ] **Step 1: Write the failing tests**

Thêm vào `router.test.tsx`:

```tsx
it('chưa đăng nhập vào /dao-tao/tu-dong-xep-lich thì bị đưa về /dang-nhap', () => {
  const router = renderAt('/dao-tao/tu-dong-xep-lich');
  expect(router.state.location.pathname).toBe('/dang-nhap');
});
```

Tạo `academicMenu.test.ts`:

```tsx
it('menu hiện mục xếp lịch khi có CLASS_VIEW và active đúng key', () => {
  const items = getAcademicMenu(['CLASS_VIEW'], false);
  expect(items.some((i) => i.key === 'tu-dong-xep-lich')).toBe(true);
  expect(activeAcademicMenuKey('/dao-tao/tu-dong-xep-lich')).toBe('tu-dong-xep-lich');
});

it('không hiện mục xếp lịch khi thiếu CLASS_VIEW', () => {
  expect(getAcademicMenu([], false).some((i) => i.key === 'tu-dong-xep-lich')).toBe(false);
  // Khớp gate của page: OWNER thiếu CLASS_VIEW cũng không thấy link (ruling Task 4).
  expect(getAcademicMenu([], true).some((i) => i.key === 'tu-dong-xep-lich')).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/router.test.tsx src/features/sprint4/academicMenu.test.ts
```

Expected: 3 ca mới FAIL do route/menu chưa có.

- [ ] **Step 3: Implement route + menu**

`router.tsx`: thêm `const AutoSchedulePage = lazy(() => import('./pages/AutoSchedulePage/AutoSchedulePage'));` cạnh các lazy của Sprint 4; thêm child trong `dao-tao`:

```tsx
{
  path: 'tu-dong-xep-lich',
  element: <AutoSchedulePage />,
  handle: { title: 'Tự động xếp lịch' },
},
```

`academicMenu.ts`: dùng lại `ClassIcon` (không thêm file icon), push item cho mục mới khi `canViewClasses(false, permissions)` — **khác với 2 mục cũ dùng `isOwner` thật**. Lý do (ruling): page chặn bằng `canViewClasses(false, permissions)`; nếu menu dùng `isOwner` thật, OWNER thiếu `CLASS_VIEW` thấy link rồi dẫm vào `ForbiddenNotice`. `key: 'tu-dong-xep-lich'`, `path: '/dao-tao/tu-dong-xep-lich'`, `label: MSG_AUTO.TITLE`, `exact: false`. `activeAcademicMenuKey`: thêm dòng `if (pathname.startsWith('/dao-tao/tu-dong-xep-lich')) return 'tu-dong-xep-lich';` **trước** dòng `lop-hoc` để khớp prefix riêng.

Không đổi `permissions.ts`, không thêm mã `SCHEDULE_*` (quyết định của design).

- [ ] **Step 4: Run targeted tests**

```powershell
& $Node node_modules/vitest/vitest.mjs run src/router.test.tsx src/features/sprint4/academicMenu.test.ts src/pages/AutoSchedulePage/AutoSchedulePage.test.tsx
```

Expected: PASS (11 tests).

- [ ] **Step 5: Full verification**

```powershell
& $Node node_modules/vitest/vitest.mjs run
& $Node node_modules/typescript/bin/tsc -b
& $Node node_modules/eslint/bin/eslint.js .
git status --short
```

Expected: vitest 0 failed; tsc exit 0; eslint 0 error; git status chỉ có các file đã liệt kê + 2 docs + design/plan mới. Không commit/push/merge.

- [ ] **Step 6: Confirm no forbidden changes**

```powershell
git diff --name-only
```

Expected: KHÔNG có `frontend/playwright.config.ts`, `frontend/package.json`, `frontend/package-lock.json`, file trong `.github/`, `frontend/src/**permissions*`, `backend/`, file SQL nào. Nếu có → dừng và báo lại.

---

## Self-review

- Spec coverage: mọi mục trong design đều có task: route/menu (Task 4), `fetchClasses` (Task 2), phần chốt / “Cần xác nhận” / nút disabled (Task 1 + 3), 5 state (Task 2), BR-08 & NFR-REL-001 (Review Focus + Task 1/3), không BE/solver (Global Constraints + Task 3 Step 3).
- Type consistency: `MSG_AUTO` keys dùng thống nhất ở 4 task; `AutoScheduleValues.source` là `'curriculum' | 'manual'`; route/menu key là `'tu-dong-xep-lich'` ở cả 2 file.
- Review Focus: 5 dòng đều có test trong Task 1–3.
- Proportion: plan dài hơn spec nhưng chỉ chứa tên file, signature, assert và lệnh — không chép body component.
