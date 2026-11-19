import {
  TRANSFER_STEP_LABELS,
  TRANSFER_STEP_ORDER,
  type TransferStep,
} from '@/features/organization/types'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Tiến độ 4 bước theo đúng thứ tự SOURCE_HEAD → TARGET_HEAD → HR → EMPLOYEE. */
export function TransferTimeline({ steps }: { steps: TransferStep[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {TRANSFER_STEP_ORDER.map((code) => {
        const step = steps.find((item) => item.step === code)
        const decision = step?.decision ?? 'PENDING'
        return (
          <li key={code} className="flex items-start gap-2 text-xs">
            <span
              className={cn(
                'mt-1 size-2 shrink-0 rounded-full',
                decision === 'APPROVED'
                  ? 'bg-success-500'
                  : decision === 'REJECTED'
                    ? 'bg-danger-500'
                    : 'bg-ink-300',
              )}
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-ink-700">
                {TRANSFER_STEP_LABELS[code]}
                {decision !== 'PENDING' ? (
                  <span className="ml-2 font-normal text-ink-400">
                    {decision === 'APPROVED' ? 'đã duyệt' : 'từ chối'}
                    {step?.decidedByName ? ` · ${step.decidedByName}` : ''}
                    {step?.decidedAt ? ` · ${formatDateTime(step.decidedAt)}` : ''}
                  </span>
                ) : (
                  <span className="ml-2 font-normal text-ink-400">đang chờ</span>
                )}
              </p>
              {step?.note ? <p className="text-ink-500">“{step.note}”</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
