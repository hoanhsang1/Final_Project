# MEMS FE Professional Redesign — Layer 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Layer 1 of the MEMS FE professional redesign: a blue enterprise (PowerSchool/Odoo-quality) design system foundation and an Odoo-style app shell/navigation, plus shared page patterns applied to 1–2 representative pages, while keeping the app working and BE contracts/behavior intact.

**Architecture:** Evolve on the existing React 19 + Vite + Ant Design 5 stack (approach A). Centralize all visual decisions in `ConfigProvider` tokens/component tokens (`src/theme.ts`) and shared primitives (`ConsoleShell`, `ConsoleMenu`, new `PageHeader`). Keep routes, guards, URLs/IA, API modules, stores, and BE-facing behavior unchanged; restyle and restructure presentation incrementally. Preserve `vi_VN`, keyboard/a11y fundamentals (skip link, focus, labels, `aria-current`), and 5-state awareness.

**Tech Stack:** React 19, TypeScript, Vite, Ant Design 5 (`ConfigProvider`, `theme.useToken`), `@ant-design/icons` (added, declared), React Router 7, TanStack Query, Zustand, Axios, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-08-mems-fe-professional-layer1-design.md` (approved 2026-11-08; decisions 8.1a blue enterprise, 8.2 Odoo-style header/module, 8.3 foundation+shell+patterns+1–2 representative pages).

## Global Constraints

- Keep **BE contracts and behavior intact**: no endpoint/DTO/field/logic invention; routing, RBAC/guards, and Sprint 4 flows (`version`, `409`/`SPECIALTY_MISMATCH` confirm, stale-409 handling, NFR-REL-001 no false success) remain functionally identical (presentation may change).
- **Layered, app always working**: Layer 1 touches foundation + shell + shared patterns + 1–2 representative pages only; do not rewrite all screens.
- **Approach A / AntD 5**: evolve on AntD 5 via tokens/components; do not add Tailwind or a parallel UI framework in Layer 1.
- **Primary = blue enterprise** (8.1a), AA contrast with white for primary actions; semantic colors always paired with text/icon/label (not color-only). **Shell = Odoo-style** header/module feel (8.2), responsive (desktop + mobile drawer), while preserving URLs/IA/guards.
- Preserve **`vi_VN`** locale, existing a11y behaviors (skip link to `#noi-dung-chinh`, focus, `aria-label`s, `aria-current="page"` on active menu item, keyboard-operable controls), and existing test contracts unless intentionally updated for new, approved UI structure.
- **Source of truth for visuals = tokens/ConfigProvider** (`src/theme.ts` and theme modules). Avoid scattering new hardcoded hex/px; migrate local `loginFigma`-style constants only in Layer 2 (LoginPage keeps working in Layer 1; its imported `color` values may shift with the new brand — acceptable if behavior/tests pass).
- **Do not commit/branch/push/merge** unless explicitly told. Run commands from `D:\Final_Project\frontend` (app root).

## Review Focus

Five uncovered/fragile areas most likely to bite a user (a spec is a vision; silence is not permission to break behavior):

1. **Logout & session safety through the redesigned shell** — a user clicking Đăng xuất (desktop or mobile drawer) must still call the logout API, clear session, and navigate to `/dang-nhap` even if the API errors (existing contract). *Test pinned to Task 5 (keep/extend `ConsoleShell.test.tsx`).*
2. **Active menu + `aria-current` across all 3 consoles after shell/menu refactor** — the selected route must highlight correctly and expose `aria-current="page"` for the active item (Admin, Owner, Academic, including Admin detail `?from=` behavior owned by menu-key functions). *Tests pinned to Tasks 4–6 (ConsoleMenu/Shell + layout/menu-key smoke where present).*
3. **Mobile navigation still reachable (Odoo header, <1024px)** — hamburger/drawer must open, show the same menu, select/navigate, and close; no hidden-only navigation. *Test pinned to Task 5 (responsive behavior note + manual/RTL where feasible; `use-media-query`/matchMedia is jsdom-limited — add an explicit verification step).*
4. **BE-dependent flows unaffected by presentation changes** — representative pages (Overview, Departments) must still fetch, render loading/error/empty/success, and perform actions (navigate, create/edit/delete flows) with the same handlers/contracts. *Tests/verification pinned to Task 7 (run existing page tests + targeted assertions).*
5. **Primary contrast & non-color status** — blue enterprise primary against white, and status/alerts/tags remain understandable without relying on color alone (text/icon). *Verification pinned to Task 2/8 (token values chosen for AA; status components keep labels/icons; visual spot-check step).*

---

## File Structure

App root for all paths below: `D:\Final_Project\frontend` (run `npm`/`npx` here). Workspace config/skills live in `D:\mems-frontend`.

**Modify (foundation/shell/patterns):**
- `package.json`, `package-lock.json` — declare/add `@ant-design/icons`.
- `src/theme.ts` — redesign `color`/tokens/component tokens to blue enterprise, Odoo-clean (source of truth). Keep exported names (`color`, `fontFamily`, `typeScale`, `themeToken`, `themeComponents`, `layoutBackground`, `cardStyle`) compatible where feasible.
- `src/main.tsx` — no structural change expected; confirm theme wiring remains correct.
- `src/components/ConsoleMenu/ConsoleMenu.tsx` — keep `ConsoleMenuProps` contract; support optional icon per item (backward compatible) and Odoo-clean styling.
- `src/features/admin/consoleMenu.ts` — extend `ConsoleMenuItem` with optional `icon?: ReactNode` (or string key) without breaking existing items/functions.
- `src/features/sprint4/academicMenu.ts` — compatible with extended `ConsoleMenuItem` (no behavior change).
- `src/components/ConsoleShell/ConsoleShell.tsx` (+ `use-media-query.ts` unchanged unless needed) — Odoo-style app header/module shell, responsive; preserve behaviors/a11y tested.
- `src/components/ConsoleShell/ConsoleShell.test.tsx` — keep existing assertions passing; add coverage for new shell semantics (product/area identity) without removing logout/aria-current/content contracts.
- `src/components/AdminConsoleLayout/AdminConsoleLayout.tsx` — pass richer area identity (and icons where helpful).
- `src/components/OwnerConsoleLayout/OwnerConsoleLayout.tsx` — same.
- `src/components/AcademicConsoleLayout/AcademicConsoleLayout.tsx` — same.
- `src/pages/OverviewPage/OverviewPage.tsx` — representative page 1, adopt `PageHeader` + refreshed pattern.
- `src/pages/DepartmentsPage/DepartmentsPage.tsx` — representative page 2, adopt `PageHeader` + refreshed list pattern (behavior intact).

**Create:**
- `src/components/PageHeader/PageHeader.tsx` — shared page header primitive (title/breadcrumb/extra/actions), token-driven.
- `src/components/PageHeader/PageHeader.test.tsx` — RTL tests for render/a11y/structure.
- (Optional, if cleaner) `src/components/PageHeader/index.ts` — re-export; only if used.

**Do not modify (Layer 1):** `src/router.tsx`, `src/features/auth/*`, `src/features/sprint4/sprint4Api.ts` logic, `src/stores/*`, `src/lib/api.ts`, Login/Register/Forgot/Reset pages (Layer 2), non-representative console pages (Layer 3) — except unavoidable import/type ripple from `ConsoleMenuItem` extension (must remain backward compatible).

## Task 1: Declare and install `@ant-design/icons`

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)

**Interfaces:**
- Consumes: existing deps; AntD 5 compatible icon package.
- Produces: `@ant-design/icons` available for import in shell/menu/pages.

- [ ] **Step 1: Add the dependency (declared, no phantom import)**
  Run from `D:\Final_Project\frontend`:
  ```bash
  npm install @ant-design/icons
  ```

- [ ] **Step 2: Verify resolution**
  Run: `node -e "require.resolve('@ant-design/icons/package.json')"`
  Expected: prints a resolved path (exit 0).

- [ ] **Step 3: Sanity typecheck touchpoint**
  Run: `npx tsc -b --pretty false`
  Expected: exits 0 (or shows pre-existing unrelated issues only — record them; do not “fix” unrelated failures).

- [ ] **Step 4: Commit (only if explicitly told to commit)**
  Skip committing unless the user explicitly asks.

## Task 2: Blue enterprise theme tokens (foundation)

**Files:**
- Modify: `src/theme.ts`
- (Verify): `src/main.tsx` (no change unless wiring broken)

**Interfaces:**
- Consumes: AntD `ThemeConfig` types; existing export names consumed by app (`color`, `fontFamily`, `typeScale`, `themeToken`, `themeComponents`, `layoutBackground`, `cardStyle`).
- Produces: blue enterprise, Odoo-clean token set (8.1a) with AA-leaning contrast for primary-on-white and clear semantic tokens; component tokens tuned for enterprise data UI (Table/Button/Input/Select/Menu/Layout/Card/Tag/Modal/Alert/Form). Keep export shape/name compatibility to avoid wide breakage.

- [ ] **Step 1: Capture current export contract**
  Run: `npx tsc -b --pretty false`
  Expected: baseline pass/fail noted (Task 1 step 3). Keep it green relative to baseline.

- [ ] **Step 2: Implement token redesign in `src/theme.ts`**
  - Set `color.brand/brandHover/brandActive` (and `colorInfo/colorLink`) to a **blue enterprise** palette (primary usable as solid button bg with white text at AA contrast). Replace warm `brandSoft` with a cool/neutral soft tint for selection/hover.
  - Keep neutrals professional (`canvas/surface/border/borderInput/text/textSecondary`) and semantics (`success/warning/error`) distinct; `borderInput` remains >= 3:1 against white/canvas.
  - Retune `themeToken`/`themeComponents` for Odoo-clean feel: restrained radii/elevation, disciplined Menu selected/hover states, Table header/row hover/density, consistent control heights — without breaking component behavior.
  - Preserve exported identifiers: `color`, `fontFamily`, `typeScale`, `themeToken`, `themeComponents`, `layoutBackground`, `cardStyle`. If a value is repurposed, keep meaning safe for existing consumers.

- [ ] **Step 3: Run typecheck and existing fast tests**
  Run: `npx tsc -b --pretty false`
  Expected: PASS (relative to baseline).
  Run: `npx vitest run src/components/ConsoleShell/ConsoleShell.test.tsx src/router.test.tsx src/pages/LoginPage/LoginPage.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx`
  Expected: PASS (these guard shell behavior and auth entry text/flows that Layer 1 must not break; Login/Register visuals may shift due to imported `color` — tests assert behavior/text).

- [ ] **Step 4: Record a contrast/status sanity note (Review Focus 5)**
  Verify in code: primary button token color vs white text meets AA for normal text (use AntD’s primary button defaults with chosen `colorPrimary`); semantic Alert/Tag usage in codebase keeps labels. (Full visual check in Task 8.)

- [ ] **Step 5: Commit (only if explicitly told)**
  Skip unless explicitly asked.

## Task 3: `PageHeader` shared primitive (TDD)

**Files:**
- Create: `src/components/PageHeader/PageHeader.tsx`
- Create: `src/components/PageHeader/PageHeader.test.tsx`

**Interfaces:**
- Consumes: AntD `Typography`/`Flex`/`Breadcrumb`/`Space`/`theme.useToken` (token-driven); React nodes.
- Produces: `PageHeader` component with props (exact names finalized in Step 1/3, e.g.):
  - `title: ReactNode` (rendered as the page’s primary heading, default `<h1>` semantics via AntD `Title level={1}` or equivalent — must not create a second competing page H1 when used as intended),
  - `subtitle?: ReactNode`,
  - `breadcrumb?: { title: ReactNode; href?: string }[]` (optional),
  - `extra?: ReactNode` (primary actions),
  - `children?: ReactNode` (optional secondary row/filters area) — keep minimal.
  Used by representative pages (Task 7) and later Layer 2/3.

- [ ] **Step 1: Write the failing test** (`src/components/PageHeader/PageHeader.test.tsx`)
  ```tsx
  import { render, screen } from '@testing-library/react';
  import { ConfigProvider } from 'antd';
  import { MemoryRouter } from 'react-router-dom';
  import { describe, expect, it } from 'vitest';
  import PageHeader from './PageHeader';

  describe('PageHeader', () => {
    it('renders the page title as a level-1 heading and optional subtitle/actions', () => {
      render(
        <ConfigProvider>
          <MemoryRouter>
            <PageHeader
              title="Phòng ban"
              subtitle="Quản lý cơ cấu"
              extra={<button type="button">Tạo mới</button>}
            />
          </MemoryRouter>
        </ConfigProvider>,
      );

      expect(screen.getByRole('heading', { level: 1, name: 'Phòng ban' })).toBeInTheDocument();
      expect(screen.getByText('Quản lý cơ cấu')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Tạo mới' })).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/components/PageHeader/PageHeader.test.tsx`
  Expected: FAIL (module/component not found or missing behavior).

- [ ] **Step 3: Implement `PageHeader` in `src/components/PageHeader/PageHeader.tsx`**
  Implement the props from the test (and keep extensible per spec 5.3/5.4): token-driven layout (flex, gap via `theme.useToken()`), `title` as `Typography.Title level={1}` (no margin that breaks layouts; consistent enterprise sizing), optional `subtitle`, optional `extra` aligned to the end, optional breadcrumb. No hardcoded hex. Keep markup accessible (real heading).

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/components/PageHeader/PageHeader.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit (only if explicitly told)**
  Skip unless explicitly asked.

## Task 4: `ConsoleMenuItem`/`ConsoleMenu` compatibility for Odoo header (TDD/compat)

**Files:**
- Modify: `src/features/admin/consoleMenu.ts` (extend type, keep functions’ behavior)
- Modify: `src/features/sprint4/academicMenu.ts` (type-compatible, behavior unchanged)
- Modify: `src/components/ConsoleMenu/ConsoleMenu.tsx`
- (Verify): any other files importing `ConsoleMenuItem` (type ripple must compile)

**Interfaces:**
- Consumes: `ConsoleMenuItem[]`, `selectedKey`, `menuAriaLabel`, `onSelect`; AntD `Menu`/`Link`.
- Produces: backward-compatible `ConsoleMenuItem` supporting optional icon for Odoo-style nav, e.g. `icon?: ReactNode`; `ConsoleMenu` renders items with `aria-current="page"` on the active link (existing contract) and preserves `nav[aria-label]` + `Menu` behavior.

- [ ] **Step 1: Write/adjust a failing-then-passing contract test**
  Extend `src/components/ConsoleShell/ConsoleShell.test.tsx` only if needed later, OR add a focused test `src/components/ConsoleMenu/ConsoleMenu.test.tsx` (create) that asserts: renders a `nav` with the given `menuAriaLabel`, renders links, sets `aria-current="page"` only on `selectedKey`. Run it to confirm current behavior passes (baseline), then keep it green through refactor.
  Run: `npx vitest run src/components/ConsoleMenu/ConsoleMenu.test.tsx` (after creating).

- [ ] **Step 2: Extend `ConsoleMenuItem` type compatibly**
  In `src/features/admin/consoleMenu.ts`, add `icon?: import('react').ReactNode` (or equivalent) optional field. Do **not** change `activeMenuKey`/`backToListPath` logic or existing item definitions.

- [ ] **Step 3: Update `ConsoleMenu` to render optional icons**
  Map `item.icon` into AntD `Menu` items (icon prop) while keeping the `Link` label + `aria-current={selectedKey === item.key ? 'page' : undefined}` behavior exactly. Keep token-driven styling (no hardcoded hex).

- [ ] **Step 4: Run typecheck + menu/shell tests**
  Run: `npx tsc -b --pretty false`
  Run: `npx vitest run src/components/ConsoleMenu/ConsoleMenu.test.tsx src/components/ConsoleShell/ConsoleShell.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit (only if explicitly told)**
  Skip unless explicitly asked.

## Task 5: Odoo-style `ConsoleShell` (responsive, behavior-preserving)

**Files:**
- Modify: `src/components/ConsoleShell/ConsoleShell.tsx`
- Modify: `src/components/ConsoleShell/ConsoleShell.test.tsx`
- (Verify): `src/components/ConsoleShell/use-media-query.ts`

**Interfaces:**
- Consumes: `ConsoleShellProps` (extend **backward-compatibly** with optional Odoo identity props, e.g. `productName?: string` default `"MEMS"`, `areaKey`/visual hints not required if `title`+icons suffice; choose minimal additions that let layouts pass module context). Uses `ConsoleMenu`, auth store, logout API, router.
- Produces: Odoo-style shell (8.2): prominent **app header** with product identity + active area/module context + user/logout; navigation presented with module/enterprise feel (desktop) and **mobile drawer** (<1024px) still functional. Preserves: skip link to `#noi-dung-chinh` (WCAG 2.4.1), `Content id/tabIndex`, logout calls `logout()` then clears session + navigates `/dang-nhap` even on error, nav `aria-label`/`aria-current` via `ConsoleMenu`, renders `<Outlet/>` content.

- [ ] **Step 1: Write failing/extended tests for preserved + new semantics**
  In `ConsoleShell.test.tsx`, keep all existing tests. Add:
  ```tsx
  it('shows app/product identity in the Odoo-style header', () => {
    renderShell();
    expect(screen.getByText(/MEMS/i)).toBeInTheDocument();
    expect(screen.getByText('Khu vực tổ chức')).toBeInTheDocument();
  });
  ```
  (Adjust the exact identity text to match the implemented, accessible header copy; the key contract is product + area context visible.) Run to see it fail against the old header if text differs.

- [ ] **Step 2: Run to verify RED/GREEN status as appropriate**
  Run: `npx vitest run src/components/ConsoleShell/ConsoleShell.test.tsx`
  Expected: existing 6 tests PASS; new test FAIL until Step 3 (or PASS if you align text — then ensure it asserts a real new element).

- [ ] **Step 3: Implement Odoo-style shell in `ConsoleShell.tsx`**
  - Restructure header to an Odoo-like app bar: product name (MEMS) + area/module title + (optional) compact context + user + logout; token-driven colors (blue enterprise primary/neutral surfaces), restrained elevation.
  - Keep responsive behavior: `useMediaQuery('(min-width: 1024px)')` drives desktop nav vs hamburger+`Drawer` (width/placement unchanged or improved accessibly). Drawer must still render the same `ConsoleMenu` and close on select.
  - Keep accessibility: skip link first, `main`/Content target `MAIN_CONTENT_ID` with `tabIndex={-1}`, icon-only buttons have `aria-label`/`aria-expanded` where applicable.
  - Keep props backward compatible so `Admin/Owner/AcademicConsoleLayout` compile unchanged; add optional props only if needed.

- [ ] **Step 4: Run tests to verify pass (Review Focus 1,2,3)**
  Run: `npx vitest run src/components/ConsoleShell/ConsoleShell.test.tsx src/components/ConsoleMenu/ConsoleMenu.test.tsx`
  Expected: PASS, including logout-on-error and `aria-current` cases.

- [ ] **Step 5: Manual responsive sanity (jsdom cannot fully prove breakpoints)**
  Run: `npm run dev` (from `D:\Final_Project\frontend`) and check at ~375px, 768px, 1024px, 1440px: header visible, hamburger opens drawer <1024px, menu navigates, content reachable, skip link works on keyboard. Stop dev server after. (If services/ports are occupied, note it; do not disturb unrelated services beyond what’s needed.)

- [ ] **Step 6: Commit (only if explicitly told)**
  Skip unless explicitly asked.

## Task 6: Wire console layouts to the Odoo shell

**Files:**
- Modify: `src/components/AdminConsoleLayout/AdminConsoleLayout.tsx`
- Modify: `src/components/OwnerConsoleLayout/OwnerConsoleLayout.tsx`
- Modify: `src/components/AcademicConsoleLayout/AcademicConsoleLayout.tsx`
- (Optionally modify): `src/features/admin/consoleMenu.ts`, `src/features/owner/ownerMenu.ts`, `src/features/sprint4/academicMenu.ts` to add icons (backward compatible)

**Interfaces:**
- Consumes: existing menu/message/role stores and `ConsoleShell` (now Odoo-style).
- Produces: each console passes clear area identity (and icons if added) so the app header/module nav reads as Odoo-like; no route/guard/IA change.

- [ ] **Step 1: Add nav icons (optional but recommended for Odoo feel)**
  Import icons from `@ant-design/icons` into menu definitions where `ConsoleMenuItem.icon` is supported. Keep labels/keys/paths/exact flags and `active*MenuKey` logic unchanged.

- [ ] **Step 2: Pass any new optional shell props from layouts**
  If `ConsoleShell` gained optional identity props, set them per area (Admin/Owner/Đào tạo) using existing message constants (`MSG_ADM`, `MSG_OWNER`, `MSG_S4`).

- [ ] **Step 3: Run typecheck + targeted tests**
  Run: `npx tsc -b --pretty false`
  Run: `npx vitest run src/components/ConsoleShell/ConsoleShell.test.tsx src/router.test.tsx src/components/OwnerGuard/OwnerGuard.test.tsx`
  Expected: PASS.

- [ ] **Step 4: Commit (only if explicitly told)**
  Skip unless explicitly asked.

## Task 7: Apply patterns to representative pages (Overview, Departments)

**Files:**
- Modify: `src/pages/OverviewPage/OverviewPage.tsx`
- Modify: `src/pages/DepartmentsPage/DepartmentsPage.tsx`
- (Verify, no behavior change): their hooks/APIs remain untouched

**Interfaces:**
- Consumes: `PageHeader`; existing data hooks (`useOverview`, `useDepartmentsPage`), messages, router links, AntD Table/Alert/Empty/Card/Skeleton/App.
- Produces: same user-facing behaviors and data flows (Review Focus 4) with Layer 1 visual pattern: `PageHeader` (H1 + context/actions), structured content surface, Odoo-clean table/toolbar treatment via tokens/components. Keep action handlers, confirmations, error messages (`ownerErrorMessage`, `NFR-REL-001`-style no-false-success in forms), and navigation targets identical.

- [ ] **Step 1: Refactor `OverviewPage` to use `PageHeader`**
  Replace the ad-hoc title block with `<PageHeader title={MSG_OVW.TITLE} subtitle={MSG_OVW.SUBTITLE} />` (or equivalent). Keep stats/links/queries/error-retry logic identical.

- [ ] **Step 2: Refactor `DepartmentsPage` to use `PageHeader`**
  Move title/subtitle/primary “Tạo phòng ban” action into `PageHeader` `extra` (respecting the existing `!isEmpty`/empty-state affordance — do not hide the only create path). Keep table columns, row actions (edit/popconfirm delete with `aria-label`s), modal/form handlers, and empty/error/loading states intact.

- [ ] **Step 3: Run existing/related tests (Review Focus 4)**
  Run: `npx vitest run src/pages/DepartmentsPage/DepartmentsPage.test.tsx src/router.test.tsx`
  Expected: PASS. If `DepartmentsPage` tests assert specific heading structure/text, update assertions to match the same meaning (not weakened behavior).

- [ ] **Step 4: Manual smoke on representative routes**
  With dev server: `/quan-tri` (Overview), `/to-chuc` (Departments) render with new header/shell, actions work, empty/error states still reachable via normal conditions/mocks as applicable. No BE contract changes.

- [ ] **Step 5: Commit (only if explicitly told)**
  Skip unless explicitly asked.

## Task 8: Layer 1 verification

**Files:**
- (No new files; verify touched set)

**Interfaces:**
- Produces: evidence Layer 1 meets spec goals without breaking baseline behavior.

- [ ] **Step 1: Typecheck**
  Run: `npx tsc -b --pretty false`
  Expected: PASS (relative to known baseline; report any pre-existing failures separately).

- [ ] **Step 2: Run focused test suite**
  Run: `npx vitest run src/components/PageHeader/PageHeader.test.tsx src/components/ConsoleMenu/ConsoleMenu.test.tsx src/components/ConsoleShell/ConsoleShell.test.tsx src/components/OwnerGuard/OwnerGuard.test.tsx src/pages/DepartmentsPage/DepartmentsPage.test.tsx src/pages/LoginPage/LoginPage.test.tsx src/pages/RegisterPage/RegisterPage.test.tsx src/router.test.tsx`
  Expected: PASS.

- [ ] **Step 3: Production build**
  Run: `npm run build`
  Expected: PASS (tsc -b + vite build). Fix only issues caused by Layer 1 changes.

- [ ] **Step 4: Visual/responsive/a11y spot-check (manual)**
  Check shell + representative pages at 320/375, 768, 1024, 1440: Odoo-style header/module feel, blue enterprise primary, readable table/header, no broken mobile nav, focus/skip link usable, status not color-only. Record notes.

- [ ] **Step 5: Summarize outcomes & remaining Layer 2/3**
  Report: what changed, verification evidence, known follow-ups (auth `loginFigma` migration = Layer 2; full-page rollout = Layer 3; any pre-existing baseline issues).

- [ ] **Step 6: Commit (only if explicitly told)**
  Skip unless explicitly asked.
