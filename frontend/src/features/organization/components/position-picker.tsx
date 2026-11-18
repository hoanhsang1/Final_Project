import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/cn'
import type { Position } from '@/features/organization/types'

export function PositionPicker({
  positions,
  selected,
  onChange,
  canAssignOrgScope,
  error,
  disabled = false,
}: {
  positions: Position[]
  selected: string[]
  onChange: (ids: string[]) => void
  canAssignOrgScope: boolean
  error?: string
  disabled?: boolean
}) {
  const orgPositions = positions.filter((position) => position.scope === 'ORGANIZATION')
  const deptPositions = positions.filter((position) => position.scope !== 'ORGANIZATION')

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id])
  }

  const renderGroup = (label: string, items: Position[]) => {
    if (items.length === 0) return null
    return (
      <div>
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-400">
          {label}
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((position) => {
            const isSelected = selected.includes(position.id)
            const locked = position.scope === 'ORGANIZATION' && !canAssignOrgScope
            return (
              <li key={position.id}>
                <label
                  key={position.id}
                  htmlFor={`position-${position.id}`}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-sm border px-2.5 py-2 transition-colors',
                    isSelected ? 'border-jade-200 bg-jade-50/60' : 'border-transparent hover:bg-ink-50',
                    (locked || disabled) && 'cursor-not-allowed opacity-60',
                  )}
                  title={locked ? 'Chỉ Chủ tổ chức được gán chức vụ cấp tổ chức' : undefined}
                >
                  <Checkbox
                    id={`position-${position.id}`}
                    checked={isSelected}
                    disabled={locked || disabled}
                    onCheckedChange={() => toggle(position.id)}
                    className="mt-0.5"
                    aria-label={position.name}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-ink-800">{position.name}</span>
                      {position.profileType === 'TEACHER' ? (
                        <Badge tone="info" size="sm">
                          Giáo viên
                        </Badge>
                      ) : null}
                      {position.bundleCodes.length > 0 ? (
                        <Badge tone="neutral" size="sm">
                          {position.bundleCodes.length} bundle
                        </Badge>
                      ) : null}
                    </span>
                    {position.description ? (
                      <span className="mt-0.5 block text-2xs leading-relaxed text-ink-500">
                        {position.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {positions.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong px-3 py-4 text-sm text-ink-500">
          Tổ chức chưa có chức vụ nào. Hãy tạo chức vụ trước khi thêm nhân sự.
        </p>
      ) : (
        <>
          {renderGroup('Chức vụ cấp tổ chức', orgPositions)}
          {renderGroup('Chức vụ theo phòng ban', deptPositions)}
        </>
      )}
      {error ? (
        <p className="text-xs font-medium text-danger-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
