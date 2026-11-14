# MEMS FE — Lớp 6 (Audit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `PageHeader` (presentation-only) cho `AuditLogPage`, `OrganizationAuditPage`. Giữ query/filter/export/permission/D-22 logic.

**Spec:** `frontend/docs/superpowers/specs/2026-11-10-mems-fe-professional-layer6-design.md`.

## Constraints
- Không đổi contract/route/guard/URL/IA/logic. Không commit/push/merge.
- Giữ `D-22` `isEndpointMissing` 404 collection, `useAuditLogsPage`/`useOrganizationAudit`/`useOrganizationDetail`, URL params & handlers, `AuditLogTable` props, `backToListPath`. **Không đổi** `AuditLogTable`.

## Tasks
### Task 1: `AuditLogPage`
- [ ] Add `PageHeader` (title/subtitle) + filters in `children`. Giữ `isEndpointMissing` branch, handlers, `AuditLogTable`.
- [ ] `npx tsc -b` exit 0.
### Task 2: `OrganizationAuditPage`
- [ ] Add `PageHeader` breadcrumb `[{title:'Tổ chức',href:backPath},{title:MSG_HIS.TITLE}]` (hoặc kèm tên org) + subtitle org name. Giữ `page` state, queries, `isEndpointMissing` D-22, `AuditLogTable`.
- [ ] `tsc -b` exit 0.
### Task 3: Verify
- [ ] `tsc -b` + `npm run build` OK. Vitest hồi quy `LoginPage/AuthCard/RegisterPage/PageHeader/ConsoleShell` xanh. Grep `D-22`/`isEndpointMissing`/`backToListPath`. (skip commit)