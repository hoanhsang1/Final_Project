import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { formatDateTime } from '../../features/sprint4/labels';
import { sprint4ErrorMessage } from '../../features/sprint4/sprint4Api';
import {
  cancelTransfer,
  decideTransferStep,
  fetchTransferDetail,
} from '../../features/transfer/transferApi';
import type { TransferRequestItem, TransferStep } from '../../features/transfer/transferTypes';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

export const TRANSFER_STEP_LABEL: Record<TransferStep, string> = {
  SOURCE_HEAD: 'Trưởng phòng cũ',
  TARGET_HEAD: 'Trưởng phòng mới',
  HR: 'Nhân sự (HR)',
  EMPLOYEE: 'Nhân sự được chuyển',
};

const STATUS_TAG: Record<
  TransferRequestItem['status'],
  { color?: string; label: string }
> = {
  PENDING: { color: 'blue', label: 'Chờ duyệt' },
  APPROVED: { color: 'green', label: 'Đã duyệt' },
  REJECTED: { color: 'red', label: 'Bị từ chối' },
  CANCELLED: { label: 'Đã huỷ' },
};

interface Props {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function TransferDetailDrawer({ requestId, open, onClose, onChanged }: Props) {
  const userId = useAuthStore((s) => s.userId);
  const [action, setAction] = useState<{ step: TransferStep; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['transfer-request', requestId],
    queryFn: () => fetchTransferDetail(requestId as string),
    enabled: open && !!requestId,
  });
  const request = detailQuery.data;

  const decideMut = useMutation({
    mutationFn: (target: { step: TransferStep; approve: boolean; note: string }) =>
      decideTransferStep(requestId as string, target.step, target.approve, target.note),
    onSuccess: () => {
      setAction(null);
      setNote('');
      setError(null);
      void detailQuery.refetch();
      onChanged();
    },
    onError: (err) => setError(sprint4ErrorMessage(err)),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelTransfer(requestId as string),
    onSuccess: () => {
      void detailQuery.refetch();
      onChanged();
    },
    onError: (err) => setError(sprint4ErrorMessage(err)),
  });

  const steps = (request?.steps ?? []).map((step) => {
    const actionable = request?.actionableSteps.includes(step.step) ?? false;
    const status: 'finish' | 'error' | 'process' | 'wait' =
      step.decision === 'APPROVED'
        ? 'finish'
        : step.decision === 'REJECTED'
          ? 'error'
          : actionable
            ? 'process'
            : 'wait';
    return {
      title: TRANSFER_STEP_LABEL[step.step],
      status,
      description: (
        <Space direction="vertical" size={2}>
          <Text type="secondary">
            {step.decision === 'PENDING' ? 'Chưa quyết định' : decisionLabel(step.decision)}
          </Text>
          {step.decidedByName || step.decidedAt ? (
            <Text type="secondary">
              {step.decidedByName ?? step.decidedBy} · {formatDateTime(step.decidedAt)}
            </Text>
          ) : null}
          {step.note ? <Text>{step.note}</Text> : null}
        </Space>
      ),
    };
  });

  return (
    <Drawer
      title="Chi tiết chuyển phòng ban"
      width={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {detailQuery.isLoading ? (
        <Text>Đang tải…</Text>
      ) : detailQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Không tải được yêu cầu"
          description={sprint4ErrorMessage(detailQuery.error)}
        />
      ) : request ? (
        <Flex vertical gap={20}>
          {error ? <Alert type="error" showIcon message={error} /> : null}

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Nhân sự">
              {request.fullName || request.username || request.userId}
            </Descriptions.Item>
            <Descriptions.Item label="Luồng chuyển">
              {request.fromDepartmentName ?? request.fromDepartmentId} →{' '}
              {request.toDepartmentName ?? request.toDepartmentId}
            </Descriptions.Item>
            <Descriptions.Item label="Lý do">{request.reason}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={STATUS_TAG[request.status].color}>{STATUS_TAG[request.status].label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Người tạo">
              {request.requestedByName || request.requestedBy} ·{' '}
              {formatDateTime(request.requestedAt)}
            </Descriptions.Item>
            {request.appliedAt ? (
              <Descriptions.Item label="Áp dụng lúc">
                {formatDateTime(request.appliedAt)}
              </Descriptions.Item>
            ) : null}
          </Descriptions>

          <Steps direction="vertical" size="small" current={-1} items={steps} />

          {request.status === 'PENDING' && request.actionableSteps.length > 0 ? (
            <Space wrap>
              {request.actionableSteps.map((step) => (
                <Space key={step}>
                  <Button
                    type="primary"
                    onClick={() => {
                      setAction({ step, approve: true });
                      setNote('');
                      setError(null);
                    }}
                  >
                    Duyệt · {TRANSFER_STEP_LABEL[step]}
                  </Button>
                  <Button
                    danger
                    onClick={() => {
                      setAction({ step, approve: false });
                      setNote('');
                      setError(null);
                    }}
                  >
                    Từ chối · {TRANSFER_STEP_LABEL[step]}
                  </Button>
                </Space>
              ))}
            </Space>
          ) : null}

          {request.status === 'PENDING' && request.requestedBy === userId ? (
            <Popconfirm
              title="Huỷ yêu cầu chuyển phòng ban?"
              okText="Huỷ yêu cầu"
              cancelText="Không"
              onConfirm={() => cancelMut.mutate()}
            >
              <Button danger loading={cancelMut.isPending} style={{ alignSelf: 'flex-start' }}>
                Huỷ yêu cầu
              </Button>
            </Popconfirm>
          ) : null}

          {!request.actionableSteps.length && request.status === 'PENDING' ? (
            <Text type="secondary">Bạn không có bước nào cần quyết định ở yêu cầu này.</Text>
          ) : null}
        </Flex>
      ) : null}

      <Modal
        title={
          action
            ? `${action.approve ? 'Duyệt' : 'Từ chối'} bước ${TRANSFER_STEP_LABEL[action.step]}`
            : ''
        }
        open={!!action}
        onCancel={() => {
          setAction(null);
          setNote('');
        }}
        okText={action?.approve ? 'Duyệt' : 'Từ chối'}
        cancelText="Đóng"
        confirmLoading={decideMut.isPending}
        onOk={() => {
          if (!action) return;
          decideMut.mutate({ step: action.step, approve: action.approve, note });
        }}
      >
        <Input.TextArea
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ghi chú (không bắt buộc)"
          maxLength={1000}
        />
      </Modal>
    </Drawer>
  );
}

function decisionLabel(decision: string): string {
  if (decision === 'APPROVED') return 'Đã duyệt';
  if (decision === 'REJECTED') return 'Đã từ chối';
  return 'Chưa quyết định';
}
