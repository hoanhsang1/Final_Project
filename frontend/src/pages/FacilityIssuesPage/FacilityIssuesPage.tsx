import {
  Badge,
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  pixel,
  proportional,
  Stack,
  Table,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLink, linkWithDepartmentId } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import {
  canAccessFacilityArea,
  hasAnyPermissionWithAliases,
  isOwnerRole,
} from '../../features/auth/permissions';
import {
  facilityErrorMessage,
  fetchFacilityIssues,
  reportFacilityIssue,
  resolveFacilityIssue,
} from '../../features/facility/facilityApi';
import { MSG_FACILITY_ISSUES } from '../../features/facility/facilityMessages';
import type { FacilityIssue } from '../../features/facility/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

type IssueRow = FacilityIssue & Record<string, unknown>;

type ReportFormValues = {
  equipmentId: string;
  description: string;
  photoUrl: string;
};

const EMPTY_REPORT_FORM: ReportFormValues = {
  equipmentId: '',
  description: '',
  photoUrl: '',
};

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/** Màn sự cố (`/co-so-vat-chat/su-co`) — lọc status, báo cáo, xử lý. */
export default function FacilityIssuesPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId') ?? '';

  const permissions = useAuthStore((s) => s.permissions);
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const isOwner = isOwnerRole(backendRoles);
  // KHÔNG có `facility.issue.view` — dùng chung gate khu vực CSVC (đã gồm
  // OWNER/FACILITY_VIEW/MANAGE và alias report/resolve). FACILITY_READ chỉ cho đọc;
  // canReport/canResolve vẫn giữ gate riêng.
  const canView = canAccessFacilityArea({ backendRoles, permissions });
  const canReport = isOwner || hasAnyPermissionWithAliases(permissions, ['facility.issue.report']);
  const canResolve =
    isOwner || hasAnyPermissionWithAliases(permissions, ['facility.issue.resolve']);

  const [statusInput, setStatusInput] = useState('');
  const [status, setStatus] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const reportForm = useFormState<ReportFormValues>(EMPTY_REPORT_FORM, {
    equipmentId: (value) =>
      value.trim() ? undefined : MSG_FACILITY_ISSUES.REQUIRED_EQUIPMENT_ID,
    description: (value) => (value.trim() ? undefined : MSG_FACILITY_ISSUES.REQUIRED_DESCRIPTION),
  });

  const issuesQuery = useQuery({
    queryKey: ['facility-issues', departmentId, status],
    queryFn: () => fetchFacilityIssues({ departmentId, status: status || undefined }),
    enabled: canView && Boolean(departmentId),
  });

  const invalidateIssues = () => queryClient.invalidateQueries({ queryKey: ['facility-issues'] });

  const reportMut = useMutation({
    mutationFn: (payload: {
      equipmentId: string;
      description: string;
      photoUrl: string | null;
    }) => reportFacilityIssue(departmentId, payload),
    onSuccess: () => {
      notify.success(MSG_FACILITY_ISSUES.REPORTED);
      closeReport();
      invalidateIssues();
    },
    onError: (error) => {
      const message = facilityErrorMessage(error);
      setReportError(message);
      notify.error(message);
    },
  });

  const resolveMut = useMutation({
    mutationFn: (issueId: string) => resolveFacilityIssue(departmentId, issueId),
    onSuccess: () => {
      notify.success(MSG_FACILITY_ISSUES.RESOLVED);
      invalidateIssues();
    },
    onError: (error) => notify.error(facilityErrorMessage(error)),
  });

  function closeReport() {
    setReportOpen(false);
    setReportError(null);
    reportForm.reset(EMPTY_REPORT_FORM);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reportForm.validate()) return;
    reportMut.mutate({
      equipmentId: reportForm.values.equipmentId.trim(),
      description: reportForm.values.description.trim(),
      photoUrl: reportForm.values.photoUrl.trim() || null,
    });
  };

  const columns: TableColumn<IssueRow>[] = [
    {
      key: 'equipmentName',
      header: MSG_FACILITY_ISSUES.EQUIPMENT_ID,
      width: proportional(1, { minWidth: 160 }),
      renderCell: (row) => row.equipmentName || row.equipmentId,
    },
    {
      key: 'description',
      header: MSG_FACILITY_ISSUES.DESCRIPTION,
      width: proportional(2, { minWidth: 220 }),
      renderCell: (row) => row.description,
    },
    {
      key: 'status',
      header: MSG_FACILITY_ISSUES.STATUS,
      width: pixel(150),
      renderCell: (row) => <Badge variant="neutral" label={row.status || '—'} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày báo',
      width: pixel(190),
      renderCell: (row) => formatTimestamp(row.createdAt),
    },
    {
      key: 'resolvedAt',
      header: 'Ngày xử lý',
      width: pixel(190),
      renderCell: (row) => formatTimestamp(row.resolvedAt),
    },
  ];

  if (canResolve) {
    columns.push({
      key: 'actions',
      header: MSG_FACILITY_ISSUES.ACTIONS,
      width: pixel(190),
      renderCell: (row) => (
        <HStack gap={2}>
          <Button
            variant="ghost"
            size="sm"
            label={MSG_FACILITY_ISSUES.RESOLVE}
            aria-label={MSG_FACILITY_ISSUES.RESOLVE}
            isDisabled={row.status === 'resolved' || resolveMut.isPending}
            onClick={() => resolveMut.mutate(row.id)}
          />
        </HStack>
      ),
    });
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_FACILITY_ISSUES.TITLE}
        subtitle={MSG_FACILITY_ISSUES.SUBTITLE}
        extra={
          <AppLink to={linkWithDepartmentId('/co-so-vat-chat', departmentId)}>
            {MSG_FACILITY_ISSUES.BACK_TO_FACILITY}
          </AppLink>
        }
      >
        {canView ? (
          <HStack gap={3} wrap="wrap" align="end">
            <TextInput
              label={MSG_FACILITY_ISSUES.DEPARTMENT}
              value={departmentId}
              onChange={(value) =>
                setSearchParams(value.trim() ? { departmentId: value.trim() } : {}, {
                  replace: true,
                })
              }
              placeholder="d1"
              width={180}
            />
            <TextInput
              label={MSG_FACILITY_ISSUES.STATUS}
              value={statusInput}
              onChange={setStatusInput}
              placeholder="open"
              width={160}
            />
            <Button
              variant="secondary"
              size="lg"
              label={MSG_FACILITY_ISSUES.SEARCH}
              onClick={() => setStatus(statusInput.trim())}
            />
            {canReport ? (
              <Button
                variant="primary"
                size="lg"
                label={MSG_FACILITY_ISSUES.ADD}
                onClick={() => {
                  setReportError(null);
                  reportForm.reset(EMPTY_REPORT_FORM);
                  setReportOpen(true);
                }}
              />
            ) : null}
          </HStack>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : !departmentId ? (
        <Banner
          status="warning"
          title={MSG_FACILITY_ISSUES.DEPARTMENT_HINT}
          description={MSG_FACILITY_ISSUES.DEPARTMENT}
          collapsible={false}
          role="status"
        />
      ) : issuesQuery.isError ? (
        <Banner
          status="error"
          title={MSG_FACILITY_ISSUES.LOAD_ERROR}
          description={facilityErrorMessage(issuesQuery.error)}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_FACILITY_ISSUES.RETRY}
              onClick={() => issuesQuery.refetch()}
            />
          }
        />
      ) : issuesQuery.isLoading ? (
        <PageLoading />
      ) : (
        <Table<IssueRow>
          data={(issuesQuery.data ?? []) as IssueRow[]}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          emptyState={<EmptyState description={MSG_FACILITY_ISSUES.EMPTY} compact />}
        />
      )}

      <Dialog
        isOpen={reportOpen}
        onOpenChange={(open) => {
          if (!open) closeReport();
        }}
        purpose="form"
        width={640}
      >
        <DialogHeader
          title={MSG_FACILITY_ISSUES.ADD}
          onOpenChange={(open) => {
            if (!open) closeReport();
          }}
        />
        {reportOpen ? (
          <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
            <VStack gap={4}>
              {reportError ? (
                <Banner status="error" title={reportError} collapsible={false} role="alert" />
              ) : null}
              <TextInput
                label={MSG_FACILITY_ISSUES.EQUIPMENT_ID}
                value={reportForm.values.equipmentId}
                onChange={(value) => reportForm.setValue('equipmentId', value)}
                isDisabled={reportMut.isPending}
                width={240}
                status={
                  reportForm.errorOf('equipmentId')
                    ? { type: 'error', message: reportForm.errorOf('equipmentId') }
                    : undefined
                }
              />
              <TextInput
                label={MSG_FACILITY_ISSUES.DESCRIPTION}
                value={reportForm.values.description}
                onChange={(value) => reportForm.setValue('description', value)}
                isDisabled={reportMut.isPending}
                status={
                  reportForm.errorOf('description')
                    ? { type: 'error', message: reportForm.errorOf('description') }
                    : undefined
                }
              />
              <TextInput
                label={MSG_FACILITY_ISSUES.PHOTO_URL}
                value={reportForm.values.photoUrl}
                onChange={(value) => reportForm.setValue('photoUrl', value)}
                isDisabled={reportMut.isPending}
              />
              <HStack justify="end" gap={2}>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  label={MSG_FACILITY_ISSUES.CANCEL}
                  onClick={closeReport}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  label={MSG_FACILITY_ISSUES.SUBMIT}
                  isLoading={reportMut.isPending}
                />
              </HStack>
            </VStack>
          </form>
        ) : null}
      </Dialog>
    </Stack>
  );
}
